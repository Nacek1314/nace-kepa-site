import { useMemo, useState } from 'react';
import StlViewer from './StlViewer';
import AiAssistant from './AiAssistant';

type Lang = 'en' | 'sl';

interface Dict { [k: string]: any }

interface Props {
  lang: Lang;
  dict: Dict;
  contactEmail: string;
}

interface Stats { volumeCm3: number; sizeMm: [number, number, number] }

const SERVICES = ['3d-design', '3d-printing', 'embedded-iot', 'full-builds'] as const;
type Service = typeof SERVICES[number];

const SERVICE_TITLES: Record<Service, { en: string; sl: string }> = {
  '3d-design':    { en: '3D Design / CAD',         sl: '3D oblikovanje / CAD' },
  '3d-printing':  { en: '3D Printing',              sl: '3D tisk' },
  'embedded-iot': { en: 'Embedded / IoT',           sl: 'Vgrajeni / IoT' },
  'full-builds':  { en: 'Full custom build',        sl: 'Celostna izdelava' }
};

function makeTrackingCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `NK-${s}`;
}

interface EstimateLine { label: string; eur: number; note?: string }
interface EstimateResult { lines: EstimateLine[]; subtotal: number; rushPct: number; total: number; low: number; high: number }

const HOURLY = 25;        // €/h shop rate
const MIN_ORDER = 35;     // minimum chargeable amount

function rushFactor(deadline: string, flexible: boolean): number {
  if (flexible || !deadline) return 0;
  const days = (new Date(deadline).getTime() - Date.now()) / 86400000;
  if (days <= 3) return 0.4;   // +40 %
  if (days <= 7) return 0.2;   // +20 %
  return 0;
}

function estimateOrder(state: WizardState, stats: Stats | null, lang: Lang): EstimateResult {
  const t = (en: string, sl: string) => (lang === 'sl' ? sl : en);
  const lines: EstimateLine[] = [];

  // ── 3D Design / CAD ───────────────────────────────────────────────
  if (state.services.includes('3d-design')) {
    const baseHours = state.complexity === 'complex' ? 14 : state.complexity === 'medium' ? 6 : 3;
    const extras = Math.max(0, state.cadDeliverables.length - 1);
    const hours = baseHours + extras * 1; // +1h per extra deliverable
    lines.push({
      label: t('CAD modelling', 'CAD modeliranje'),
      eur: hours * HOURLY,
      note: t(`${hours} h × €${HOURLY}`, `${hours} h × ${HOURLY} €`)
    });
  }

  // ── 3D Printing ───────────────────────────────────────────────────
  if (state.services.includes('3d-printing')) {
    const vol = Math.max(5, stats?.volumeCm3 ?? 30); // cm³
    const infillFactor = 0.3 + 0.7 * (state.infill / 100); // walls + infill
    const matRate = state.material === 'flexible' ? 0.18 : state.material === 'petg' ? 0.09 : 0.05; // €/cm³ filled
    const machineRate = 0.18; // €/cm³ (printer time + electricity)
    const filledVol = vol * infillFactor;

    const material = filledVol * matRate;
    const machine  = filledVol * machineRate;
    const setup    = 6; // per job

    const post = (state.post.includes('paint') ? 12 : 0)
               + (state.post.includes('sand')  ? 4  : 0)
               + (state.post.includes('assemble') ? 8 : 0);

    const qty = Math.max(1, state.qty || 1);
    // Volume discount: 1 → 1.0, 5 → ~0.92, 10 → ~0.85, 20 → ~0.78
    const qtyDiscount = qty === 1 ? 1 : Math.max(0.7, 1 - 0.08 * Math.log2(qty));
    const perPart = material + machine + post;
    const printTotal = (setup + perPart * qty) * qtyDiscount;

    lines.push({
      label: t('3D print', '3D tisk'),
      eur: printTotal,
      note: t(
        `${qty}× · ${vol.toFixed(0)} cm³ · ${state.material.toUpperCase()} · ${state.infill}% infill`,
        `${qty}× · ${vol.toFixed(0)} cm³ · ${state.material.toUpperCase()} · ${state.infill}% polnilo`
      )
    });
  }

  // ── Embedded / IoT ────────────────────────────────────────────────
  if (state.services.includes('embedded-iot')) {
    let hours = 8; // bring-up + basic firmware
    const conn = state.connectivity || [];
    if (conn.includes('ble'))      hours += 4;
    if (conn.includes('wifi'))     hours += 4;
    if (conn.includes('cellular')) hours += 8;
    if (conn.includes('lora'))     hours += 6;
    const sensorCount = (state.sensors || '').split(',').map((s) => s.trim()).filter(Boolean).length;
    hours += Math.min(10, sensorCount * 1.5);
    if (state.power === 'battery') hours += 3;

    const bom = 30 + sensorCount * 6 + (conn.includes('cellular') ? 25 : 0); // ballpark BOM
    lines.push({
      label: t('Embedded / firmware', 'Vgrajeni sistem / firmware'),
      eur: hours * HOURLY + bom,
      note: t(
        `${hours} h × €${HOURLY} + €${bom} BOM`,
        `${hours} h × ${HOURLY} € + ${bom} € materiali`
      )
    });

    if (state.enclosure) {
      lines.push({
        label: t('Enclosure (CAD + print)', 'Ohišje (CAD + tisk)'),
        eur: 5 * HOURLY + 18,
        note: t('5 h CAD + €18 print', '5 h CAD + 18 € tisk')
      });
    }
  }

  // ── Full custom build ─────────────────────────────────────────────
  if (state.services.includes('full-builds')) {
    const sc = state.scope || [];
    const u  = Math.max(1, state.units || 1);
    let hours = 0; let bom = 0;
    if (sc.includes('cad'))   { hours += 10; }
    if (sc.includes('print')) { hours += 6;  bom += 18 * u; }
    if (sc.includes('pcb'))   { hours += 18; bom += 65 + 12 * u; }
    if (sc.includes('fw'))    { hours += 18; }
    if (sc.includes('assy'))  { hours += 4 * u; bom += 8 * u; }
    // Multi-unit scaling: dev hours grow sub-linearly with units
    const unitMul = 1 + 0.55 * Math.log2(u);
    const labour = hours * unitMul * HOURLY;
    lines.push({
      label: t('Full build — engineering', 'Celostna izdelava — inženiring'),
      eur: labour,
      note: t(`${(hours * unitMul).toFixed(0)} h · ${u} unit(s)`, `${(hours * unitMul).toFixed(0)} h · ${u} kos.`)
    });
    if (bom > 0) lines.push({
      label: t('Materials & components', 'Materiali in komponente'),
      eur: bom,
      note: t('PCB / parts / filament', 'PCB / deli / filament')
    });
  }

  let subtotal = lines.reduce((a, l) => a + l.eur, 0);
  if (subtotal > 0 && subtotal < MIN_ORDER) {
    lines.push({
      label: t('Minimum order top-up', 'Doplačilo do minimalnega naročila'),
      eur: MIN_ORDER - subtotal,
      note: `min €${MIN_ORDER}`
    });
    subtotal = MIN_ORDER;
  }

  const rushPct = rushFactor(state.deadline, state.flexible);
  if (rushPct > 0 && subtotal > 0) {
    const rushEur = subtotal * rushPct;
    lines.push({
      label: t('Rush surcharge', 'Pribitek za hitro izvedbo'),
      eur: rushEur,
      note: `+${Math.round(rushPct * 100)} %`
    });
  }

  const total = lines.reduce((a, l) => a + l.eur, 0);
  const round = (n: number) => Math.max(0, Math.round(n / 5) * 5);
  return {
    lines: lines.map((l) => ({ ...l, eur: round(l.eur) })),
    subtotal: round(subtotal),
    rushPct,
    total: round(total),
    low:   round(total * 0.85),
    high:  round(total * 1.20)
  };
}

// Backwards-compatible single-number helper (kept for the email summary).
function estimateEUR(state: WizardState, stats: Stats | null): number {
  return estimateOrder(state, stats, 'en').total;
}

interface WizardState {
  services: Service[];
  complexity: 'simple' | 'medium' | 'complex';
  cadDeliverables: string[];
  material: 'pla' | 'petg' | 'flexible';
  color: string;
  infill: number;
  post: string[];
  qty: number;
  mcu: string;
  connectivity: string[];
  sensors: string;
  power: string;
  enclosure: boolean;
  scope: string[];
  units: number;
  files: File[];
  deadline: string;
  flexible: boolean;
  description: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  agree: boolean;
}

const INITIAL: WizardState = {
  services: [],
  complexity: 'medium',
  cadDeliverables: ['step', 'drawings'],
  material: 'pla',
  color: '',
  infill: 20,
  post: [],
  qty: 1,
  mcu: 'esp32',
  connectivity: [],
  sensors: '',
  power: 'usb',
  enclosure: true,
  scope: ['cad', 'print', 'fw', 'assy'],
  units: 1,
  files: [],
  deadline: '',
  flexible: true,
  description: '',
  name: '',
  email: '',
  phone: '',
  company: '',
  agree: false
};

export default function OrderWizard({ lang, dict, contactEmail }: Props) {
  const L = dict.order;
  const labels = L.labels;
  const [state, setState] = useState<WizardState>(INITIAL);
  const [stlStats, setStlStats] = useState<Stats | null>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ code: string; channel: 'instant' | 'mailto' } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // build dynamic step list based on services chosen
  const steps = useMemo(() => {
    const s = ['services'];
    if (state.services.length) {
      s.push('specs');
      if (state.services.includes('3d-printing') || state.services.includes('3d-design') || state.services.includes('full-builds')) s.push('files');
      s.push('timeline', 'description', 'estimate', 'contact', 'review');
    }
    return s;
  }, [state.services]);

  const stepKey = steps[step] ?? 'services';
  const update = <K extends keyof WizardState>(k: K, v: WizardState[K]) => setState((s) => ({ ...s, [k]: v }));
  const toggleArr = <K extends keyof WizardState>(k: K, v: string) => {
    setState((s) => {
      const arr = (s[k] as unknown as string[]).slice();
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1); else arr.push(v);
      return { ...s, [k]: arr as any };
    });
  };
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const estimate = useMemo(() => estimateEUR(state, stlStats), [state, stlStats]);
  const breakdown = useMemo(() => estimateOrder(state, stlStats, lang), [state, stlStats, lang]);

  async function submit() {
    setSubmitting(true); setErr(null); setProgress(null);
    const code = makeTrackingCode();
    const summary = buildSummary(state, breakdown, code, lang);
    const subject = `[${code}] ${lang === 'sl' ? 'Novo povpraševanje' : 'New project request'} — ${state.name || 'unknown'}`;

    const endpoint = (import.meta as any).env?.PUBLIC_ORDER_ENDPOINT as string | undefined;
    const base = endpoint ? endpoint.replace(/\/+$/, '') : '';

    // 1) Upload files to R2 via Worker, in sequence (XHR for progress).
    const uploaded: { name: string; size: number; url: string }[] = [];
    if (base && state.files.length > 0) {
      for (let i = 0; i < state.files.length; i++) {
        const f = state.files[i];
        try {
          setProgress(lang === 'sl'
            ? `Pošiljam ${i + 1}/${state.files.length}: ${f.name}…`
            : `Uploading ${i + 1}/${state.files.length}: ${f.name}…`);
          const res = await uploadFile(base, code, f, (pct) => {
            setProgress(lang === 'sl'
              ? `Pošiljam ${i + 1}/${state.files.length}: ${f.name} — ${pct}%`
              : `Uploading ${i + 1}/${state.files.length}: ${f.name} — ${pct}%`);
          });
          uploaded.push({ name: res.name || f.name, size: res.size || f.size, url: res.url });
        } catch (e: any) {
          setProgress(null);
          setErr(lang === 'sl'
            ? `Datoteka ${f.name} ni bila poslana (${e?.message || 'napaka'}). Poskusi znova ali odstrani datoteko.`
            : `File ${f.name} failed to upload (${e?.message || 'error'}). Retry or remove the file.`);
          setSubmitting(false);
          return;
        }
      }
    }

    const fileNote = uploaded.length
      ? '\n\n' + (lang === 'sl' ? '— Priložene datoteke (povezave veljajo 30 dni):' : '— Attached files (links expire in 30 days):') +
        '\n' + uploaded.map((a) => `• ${a.name} (${fmtSize(a.size)})\n  ${a.url}`).join('\n')
      : '';
    const body = summary + fileNote + '\n\n' + (lang === 'sl' ? '— Poslano prek nacekepa.work' : '— Sent via nacekepa.work');

    setProgress(lang === 'sl' ? 'Pošiljam povpraševanje…' : 'Sending brief…');

    try {
      // Preferred path: POST to Cloudflare Worker which emails Nace.
      if (base) {
        try {
          const res = await fetch(base + '/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              code,
              subject,
              summary: body,
              contact: state.email || state.name || '',
              lang,
              attachments: uploaded,
              website: '' // honeypot — must stay empty
            })
          });
          if (res.ok) {
            setProgress(null);
            setDone({ code, channel: 'instant' });
            return;
          }
          if (res.status === 429) {
            const retry = res.headers.get('Retry-After');
            const mins = retry ? Math.ceil(parseInt(retry, 10) / 60) : null;
            setErr(lang === 'sl'
              ? `Preveč povpraševanj s te povezave.${mins ? ` Poskusi znova čez ~${mins} min.` : ''}`
              : `Too many requests from this connection.${mins ? ` Try again in ~${mins} min.` : ''}`);
            setProgress(null);
            setSubmitting(false);
            return;
          }
          // other non-ok → fall through to mailto fallback
        } catch {
          // network error → fall through to mailto fallback
        }
      }

      // Fallback: download brief + open mail client. Always works offline.
      const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}-brief.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;

      setProgress(null);
      setDone({ code, channel: 'mailto' });
    } catch (e: any) {
      setErr(L.error + (e?.message ? ` (${e.message})` : ''));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const mailtoFallback = `mailto:${contactEmail}?subject=${encodeURIComponent(`[${done.code}] ${lang === 'sl' ? 'Povpraševanje' : 'Project request'}`)}`;
    const isInstant = done.channel === 'instant';
    return (
      <div className="rounded-2xl border border-accent-300 dark:border-accent-700 bg-accent-50 dark:bg-accent-900/30 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-accent-600 text-white flex items-center justify-center text-2xl">✓</div>
        <h2 className="font-display text-2xl font-bold mt-4">
          {isInstant
            ? (lang === 'sl' ? 'Povpraševanje poslano!' : 'Request sent!')
            : L.success_title}
        </h2>
        <p className="mt-2 text-ink-600 dark:text-ink-300 max-w-md mx-auto">
          {isInstant
            ? (lang === 'sl'
                ? 'Nace je pravkar prejel obvestilo. Odgovor ponavadi v 24 urah.'
                : 'Nace just got a notification. Reply usually within 24 hours.')
            : L.success_body}
        </p>
        <div className="mt-6 text-left max-w-md mx-auto p-4 rounded-lg bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800 text-sm">
          {isInstant ? (
            <>
              <p className="font-medium mb-2">{lang === 'sl' ? 'Kaj sledi:' : 'What happens next:'}</p>
              <ol className="list-decimal pl-5 space-y-1 text-ink-600 dark:text-ink-300">
                <li>{lang === 'sl' ? 'Nace pregleda povpraševanje in pripravi oceno.' : 'Nace reviews the brief and prepares an estimate.'}</li>
                <li>{lang === 'sl' ? 'Dobiš odgovor po e-pošti s ceno in roki.' : 'You get an email reply with price and timeline.'}</li>
                {state.files.length > 0 && (
                  <li className="font-medium text-ink-700 dark:text-ink-200">
                    {lang === 'sl'
                      ? `Imaš datoteke (${state.files.map((f) => f.name).join(', ')})? Pošlji jih kot odgovor na to e-pošto, ko prispe.`
                      : `Got files (${state.files.map((f) => f.name).join(', ')})? Send them as a reply to the confirmation email when it arrives.`}
                  </li>
                )}
                <li>{lang === 'sl' ? 'Po potrditvi se začne delo.' : 'After confirmation, work begins.'}</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-medium mb-2">{lang === 'sl' ? 'Kaj se je pravkar zgodilo:' : 'What just happened:'}</p>
              <ol className="list-decimal pl-5 space-y-1 text-ink-600 dark:text-ink-300">
                <li>{lang === 'sl' ? `Datoteka ${done.code}-brief.txt se je prenesla na tvoj računalnik.` : `The file ${done.code}-brief.txt was downloaded to your computer.`}</li>
                <li>{lang === 'sl' ? 'Odprl se je tvoj e-poštni odjemalec z že izpolnjenim povpraševanjem.' : 'Your email client opened with the request pre-filled.'}</li>
                {state.files.length > 0 && (
                  <li className="font-medium text-ink-700 dark:text-ink-200">
                    {lang === 'sl'
                      ? `Pripni svoje datoteke (${state.files.map((f) => f.name).join(', ')}) v e-pošto, preden jo pošlješ.`
                      : `Attach your files (${state.files.map((f) => f.name).join(', ')}) to the email before sending.`}
                  </li>
                )}
                <li>{lang === 'sl' ? 'Pritisni Pošlji v e-poštnem odjemalcu.' : 'Hit Send in your email client.'}</li>
              </ol>
              <p className="mt-3 text-xs text-ink-500">
                {lang === 'sl' ? 'Se e-pošta ni odprla? ' : 'Email did not open? '}
                <a href={mailtoFallback} className="text-accent-600 dark:text-accent-300 underline">
                  {lang === 'sl' ? 'Klikni tukaj' : 'Click here'}
                </a>
                {lang === 'sl' ? ' in priloži preneseno datoteko.' : ' and attach the downloaded file.'}
              </p>
            </>
          )}
        </div>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800">
          <span className="text-xs uppercase tracking-wider text-ink-500">{L.tracking_code}</span>
          <span className="font-display font-bold tabular-nums text-lg">{done.code}</span>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(done.code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="ml-2 text-xs px-2 py-1 rounded bg-accent-600 text-white hover:bg-accent-700">
            {copied ? L.copied : L.copy}
          </button>
        </div>
        <div className="mt-6">
          <button type="button" onClick={() => { setDone(null); setState(INITIAL); setStep(0); }}
                  className="text-sm text-accent-600 dark:text-accent-300 hover:underline">
            {L.new_request}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900/50 p-6 sm:p-8">
      {/* progress */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1.5 flex-wrap">
          {steps.map((s, i) => (
            <span key={s + i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-8 bg-accent-600' : i < step ? 'w-4 bg-accent-300' : 'w-4 bg-ink-200 dark:bg-ink-700'}`} />
          ))}
        </div>
        <span className="text-xs text-ink-500 tabular-nums">
          {L.step} {step + 1} {L.of} {steps.length} · {L.steps[stepKey]}
        </span>
      </div>

      {/* steps */}
      {stepKey === 'services' && (
        <div className="space-y-4">
          <p className="font-display text-xl font-bold">{labels.services_q}</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">{labels.services_help}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SERVICES.map((s) => {
              const on = state.services.includes(s);
              return (
                <button type="button" key={s}
                        onClick={() => toggleArr('services', s)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${on ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30' : 'border-ink-200 dark:border-ink-700 hover:border-ink-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">{SERVICE_TITLES[s][lang]}</span>
                    <span className={`w-5 h-5 rounded-full border-2 ${on ? 'bg-accent-600 border-accent-600' : 'border-ink-300'}`}>
                      {on && <span className="block text-white text-[11px] leading-[18px] text-center">✓</span>}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {stepKey === 'specs' && (
        <div className="space-y-6">
          {(state.services.includes('3d-design') || state.services.includes('full-builds')) && (
            <fieldset>
              <legend className="font-display font-bold mb-2">{labels.complexity}</legend>
              <div className="grid sm:grid-cols-3 gap-2">
                {(['simple', 'medium', 'complex'] as const).map((c) => (
                  <label key={c} className={`p-3 rounded-md border cursor-pointer text-sm ${state.complexity === c ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30' : 'border-ink-200 dark:border-ink-700'}`}>
                    <input type="radio" name="complexity" value={c} checked={state.complexity === c}
                           onChange={() => update('complexity', c)} className="sr-only" />
                    {labels['complexity_' + c]}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <legend className="font-display font-bold mb-2">{labels.deliverables_cad}</legend>
                <div className="flex flex-wrap gap-2">
                  {[['files', labels.step_files], ['step', labels.step_step], ['drawings', labels.step_drawings], ['fea', labels.step_fea]].map(([k, lbl]) => (
                    <label key={k} className={`text-sm px-3 py-1.5 rounded-full border cursor-pointer ${state.cadDeliverables.includes(k) ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-500' : 'border-ink-200 dark:border-ink-700'}`}>
                      <input type="checkbox" hidden checked={state.cadDeliverables.includes(k)} onChange={() => toggleArr('cadDeliverables', k)} />{lbl}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          {state.services.includes('3d-printing') && (
            <fieldset className="space-y-3">
              <legend className="font-display font-bold">3D printing</legend>
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block text-sm">
                  <span className="block mb-1 text-ink-500">{labels.material}</span>
                  <select value={state.material} onChange={(e) => update('material', e.target.value as any)}
                          className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950">
                    <option value="pla">PLA</option><option value="petg">PETG</option><option value="flexible">Flexible</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 text-ink-500">{labels.color}</span>
                  <input value={state.color} onChange={(e) => update('color', e.target.value)} placeholder="black, white, …"
                         className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 text-ink-500">{labels.qty}</span>
                  <input type="number" min={1} value={state.qty}
                         onChange={(e) => update('qty', parseInt(e.target.value) || 1)}
                         className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
                </label>
                <label className="block text-sm sm:col-span-3">
                  <span className="flex justify-between mb-1 text-ink-500"><span>{labels.infill}</span><span className="tabular-nums">{state.infill}%</span></span>
                  <input type="range" min={5} max={100} value={state.infill} onChange={(e) => update('infill', parseInt(e.target.value))} className="w-full accent-accent-600" />
                </label>
              </div>
              <div>
                <span className="block mb-1 text-sm text-ink-500">{labels.post}</span>
                <div className="flex flex-wrap gap-2">
                  {[['sand', labels.post_sand], ['paint', labels.post_paint], ['assemble', labels.post_assemble]].map(([k, lbl]) => (
                    <label key={k} className={`text-sm px-3 py-1.5 rounded-full border cursor-pointer ${state.post.includes(k) ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-500' : 'border-ink-200 dark:border-ink-700'}`}>
                      <input type="checkbox" hidden checked={state.post.includes(k)} onChange={() => toggleArr('post', k)} />{lbl}
                    </label>
                  ))}
                </div>
              </div>
            </fieldset>
          )}

          {state.services.includes('embedded-iot') && (
            <fieldset className="space-y-3">
              <legend className="font-display font-bold">Embedded / IoT</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="block mb-1 text-ink-500">{labels.mcu}</span>
                  <select value={state.mcu} onChange={(e) => update('mcu', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950">
                    <option value="esp32">ESP32</option>
                    <option value="esp32s3">ESP32-S3</option>
                    <option value="arduino">Arduino (AVR)</option>
                    <option value="rp">Raspberry Pi / Pico</option>
                    <option value="any">No preference</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 text-ink-500">{labels.power}</span>
                  <select value={state.power} onChange={(e) => update('power', e.target.value)}
                          className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950">
                    <option value="usb">USB</option><option value="battery">Battery</option><option value="mains">Mains (5/12 V adapter)</option>
                  </select>
                </label>
              </div>
              <div>
                <span className="block mb-1 text-sm text-ink-500">{labels.connectivity}</span>
                <div className="flex flex-wrap gap-2">
                  {[['wifi', 'Wi-Fi'], ['ble', 'BLE'], ['offline', 'Offline only']].map(([k, lbl]) => (
                    <label key={k} className={`text-sm px-3 py-1.5 rounded-full border cursor-pointer ${state.connectivity.includes(k) ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-500' : 'border-ink-200 dark:border-ink-700'}`}>
                      <input type="checkbox" hidden checked={state.connectivity.includes(k)} onChange={() => toggleArr('connectivity', k)} />{lbl}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block text-sm">
                <span className="block mb-1 text-ink-500">{labels.sensors}</span>
                <input value={state.sensors} onChange={(e) => update('sensors', e.target.value)} placeholder="OLED, color sensor, encoder, …"
                       className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={state.enclosure} onChange={(e) => update('enclosure', e.target.checked)} />
                {labels.enclosure}
              </label>
            </fieldset>
          )}

          {state.services.includes('full-builds') && (
            <fieldset className="space-y-3">
              <legend className="font-display font-bold">Full build scope</legend>
              <div className="flex flex-wrap gap-2">
                {[['cad', labels.scope_cad], ['print', labels.scope_print], ['pcb', labels.scope_pcb], ['fw', labels.scope_fw], ['assy', labels.scope_assy]].map(([k, lbl]) => (
                  <label key={k} className={`text-sm px-3 py-1.5 rounded-full border cursor-pointer ${state.scope.includes(k) ? 'bg-accent-50 dark:bg-accent-900/30 border-accent-500' : 'border-ink-200 dark:border-ink-700'}`}>
                    <input type="checkbox" hidden checked={state.scope.includes(k)} onChange={() => toggleArr('scope', k)} />{lbl}
                  </label>
                ))}
              </div>
              <label className="block text-sm">
                <span className="block mb-1 text-ink-500">{labels.units}</span>
                <input type="number" min={1} value={state.units}
                       onChange={(e) => update('units', parseInt(e.target.value) || 1)}
                       className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
              </label>
            </fieldset>
          )}
        </div>
      )}

      {stepKey === 'files' && (
        <div className="space-y-4">
          <p className="font-display text-xl font-bold">{labels.files_q}</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">{labels.files_help}</p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {lang === 'sl'
              ? 'Do 5 datotek · največ 100 MB na datoteko · STL, OBJ, STEP, IGES, 3MF, ZIP, PDF, slike. Datoteke se naložijo varno na zasebni Cloudflare R2 strežnik in povezave veljajo 30 dni.'
              : 'Up to 5 files · max 100 MB each · STL, OBJ, STEP, IGES, 3MF, ZIP, PDF, images. Files upload securely to a private Cloudflare R2 bucket; download links expire in 30 days.'}
          </p>
          <StlViewer
            labels={{ drop: labels.viewer_drop, loaded: labels.viewer_loaded, volume: labels.viewer_volume, size: labels.viewer_size }}
            onStats={(s) => setStlStats(s)}
            onFile={(f) => {
              if (f.size > 100 * 1024 * 1024) {
                setErr(lang === 'sl'
                  ? `Datoteka "${f.name}" je prevelika (max 100 MB).`
                  : `File "${f.name}" is too large (max 100 MB).`);
                return;
              }
              setErr(null);
              setState((prev) => {
                if (prev.files.some((x) => x.name === f.name && x.size === f.size)) return prev;
                if (prev.files.length >= 5) return prev;
                return { ...prev, files: [...prev.files, f] };
              });
            }}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <label
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border border-ink-700 bg-ink-900/50 hover:bg-ink-800 transition-colors cursor-pointer text-sm ${state.files.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span aria-hidden>＋</span>
              <span>{lang === 'sl' ? 'Dodaj datoteko' : 'Add file'}</span>
              <input
                type="file"
                multiple
                disabled={state.files.length >= 5}
                accept=".stl,.obj,.step,.stp,.iges,.igs,.3mf,.zip,.pdf,image/*"
                hidden
                onChange={(e) => {
                  const incoming = Array.from(e.target.files || []);
                  e.target.value = '';
                  const tooBig = incoming.find((f) => f.size > 100 * 1024 * 1024);
                  if (tooBig) {
                    setErr(lang === 'sl'
                      ? `Datoteka "${tooBig.name}" je prevelika (max 100 MB).`
                      : `File "${tooBig.name}" is too large (max 100 MB).`);
                    return;
                  }
                  setErr(null);
                  setState((prev) => {
                    const merged = [...prev.files];
                    for (const f of incoming) {
                      if (merged.length >= 5) break;
                      if (!merged.some((x) => x.name === f.name && x.size === f.size)) {
                        merged.push(f);
                      }
                    }
                    return { ...prev, files: merged };
                  });
                }}
              />
            </label>
            <span className="text-xs text-ink-500 dark:text-ink-400 tabular-nums">
              {state.files.length} / 5
            </span>
          </div>

          {state.files.length > 0 ? (
            <ul className="space-y-2">
              {state.files.map((f, idx) => (
                <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-ink-800 bg-ink-900/40">
                  <div className="min-w-0 flex items-center gap-2 text-sm">
                    <span aria-hidden>📎</span>
                    <span className="truncate">{f.name}</span>
                    <span className="text-xs text-ink-400 dark:text-ink-500 tabular-nums whitespace-nowrap">{fmtSize(f.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))}
                    className="text-xs text-ink-400 hover:text-accent-400 transition-colors px-2 py-1"
                    aria-label={lang === 'sl' ? `Odstrani ${f.name}` : `Remove ${f.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-500 dark:text-ink-400 italic">
              {lang === 'sl' ? 'Datoteke še niso priložene (neobvezno).' : 'No files attached yet (optional).'}
            </p>
          )}
          {err && stepKey === 'files' && <p className="text-sm text-amber-400">{err}</p>}
        </div>
      )}

      {stepKey === 'timeline' && (
        <div className="space-y-3">
          <p className="font-display text-xl font-bold">{labels.deadline}</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">{labels.deadline_help}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={state.flexible} onChange={(e) => update('flexible', e.target.checked)} />
            {labels.flexible}
          </label>
          {!state.flexible && (
            <input type="date" value={state.deadline} onChange={(e) => update('deadline', e.target.value)}
                   className="px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
          )}
        </div>
      )}

      {stepKey === 'description' && (
        <div className="space-y-3">
          <p className="font-display text-xl font-bold">{labels.description_q}</p>
          <p className="text-sm text-ink-500 dark:text-ink-400">{labels.description_help}</p>
          <AiAssistant lang={lang} onSuggest={(text) => update('description', state.description ? state.description + '\n\n' + text : text)} />
          <textarea rows={6} value={state.description} onChange={(e) => update('description', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
        </div>
      )}

      {stepKey === 'estimate' && (
        <div className="space-y-4">
          <p className="font-display text-xl font-bold">{L.estimate_title}</p>
          <div className="p-6 rounded-xl bg-accent-50 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-700">
            <div className="text-xs uppercase tracking-wider text-ink-500 dark:text-ink-300 text-center">
              {lang === 'sl' ? 'Indikativni razpon' : 'Indicative range'}
            </div>
            <div className="font-display text-3xl sm:text-4xl font-bold text-accent-700 dark:text-accent-200 tabular-nums text-center mt-1">
              €{breakdown.low}<span className="text-ink-400 dark:text-ink-500 mx-2">–</span>€{breakdown.high}
            </div>
            <div className="text-center text-xs text-ink-500 dark:text-ink-400 mt-1">
              {lang === 'sl' ? 'Srednja vrednost' : 'Midpoint'}: <span className="tabular-nums">€{breakdown.total}</span>
            </div>

            {breakdown.lines.length > 0 && (
              <ul className="mt-5 divide-y divide-accent-200/60 dark:divide-accent-700/40 text-sm">
                {breakdown.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-4 py-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.label}</div>
                      {l.note && <div className="text-xs text-ink-500 dark:text-ink-400">{l.note}</div>}
                    </div>
                    <div className="tabular-nums text-ink-700 dark:text-ink-200 whitespace-nowrap">€{l.eur}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-ink-500 dark:text-ink-400">{L.estimate_disclaimer}</p>
        </div>
      )}

      {stepKey === 'contact' && (
        <div className="space-y-3">
          <p className="font-display text-xl font-bold">{labels.name}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input placeholder={labels.name} required value={state.name} onChange={(e) => update('name', e.target.value)}
                   className="px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
            <input type="email" placeholder={labels.email} required value={state.email} onChange={(e) => update('email', e.target.value)}
                   className="px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
            <input placeholder={labels.phone} value={state.phone} onChange={(e) => update('phone', e.target.value)}
                   className="px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
            <input placeholder={labels.company} value={state.company} onChange={(e) => update('company', e.target.value)}
                   className="px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950" />
          </div>
        </div>
      )}

      {stepKey === 'review' && (
        <div className="space-y-4">
          <p className="font-display text-xl font-bold">{labels.review_q}</p>
          <pre className="text-xs whitespace-pre-wrap p-4 rounded-md bg-ink-50 dark:bg-ink-950/60 border border-ink-200 dark:border-ink-800 max-h-72 overflow-auto">
{buildSummary(state, breakdown, '(generated on submit)', lang)}
          </pre>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={state.agree} onChange={(e) => update('agree', e.target.checked)} className="mt-0.5" />
            <span>{labels.agree}</span>
          </label>
          {(!state.name || !state.email || !state.agree) && (
            <p className="text-xs text-ink-600 dark:text-ink-300">
              {lang === 'sl' ? 'Za pošiljanje:' : 'To send:'}{' '}
              {!state.name  && <span>· {lang === 'sl' ? 'vnesi ime' : 'enter name'} </span>}
              {!state.email && <span>· {lang === 'sl' ? 'vnesi email' : 'enter email'} </span>}
              {!state.agree && <span>· {lang === 'sl' ? 'potrdi soglasje' : 'tick the agreement'}</span>}
            </p>
          )}
          {err && <p className="text-sm text-ink-700 dark:text-ink-200">{err}</p>}
        </div>
      )}

      {progress && (
        <p className="mt-4 text-sm text-accent-700 dark:text-accent-300 font-medium">{progress}</p>
      )}

      {/* nav */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-ink-200 dark:border-ink-800">
        <button type="button" onClick={back} disabled={step === 0}
                className="text-sm px-4 py-2 rounded-md border border-ink-200 dark:border-ink-700 disabled:opacity-30 hover:bg-ink-100 dark:hover:bg-ink-800/50">
          {L.back}
        </button>
        {stepKey !== 'review' ? (
          <button type="button" onClick={next}
                  disabled={stepKey === 'services' && state.services.length === 0}
                  className="text-sm font-medium px-5 py-2 rounded-md bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50">
            {L.next} →
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={submitting || !state.agree || !state.name || !state.email}
                  className="text-sm font-medium px-5 py-2 rounded-md bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50">
            {submitting ? L.submitting : L.submit}
          </button>
        )}
      </div>
    </div>
  );
}

function buildSummary(s: WizardState, est: EstimateResult, code: string, lang: Lang): string {
  const lines: string[] = [];
  lines.push(`Tracking code: ${code}`);
  lines.push(`Language: ${lang}`);
  lines.push(`Indicative range: €${est.low}–€${est.high}  (mid €${est.total})`);
  if (est.lines.length) {
    lines.push('Breakdown:');
    for (const l of est.lines) {
      lines.push(`  • ${l.label}: €${l.eur}${l.note ? `  (${l.note})` : ''}`);
    }
  }
  lines.push(`Services: ${s.services.map((x) => SERVICE_TITLES[x].en).join(', ') || '—'}`);
  if (s.services.includes('3d-design') || s.services.includes('full-builds')) {
    lines.push(`Complexity: ${s.complexity}`);
    lines.push(`CAD deliverables: ${s.cadDeliverables.join(', ') || '—'}`);
  }
  if (s.services.includes('3d-printing')) {
    lines.push(`Print: ${s.material} · color "${s.color || '-'}" · ${s.infill}% infill · qty ${s.qty} · post: ${s.post.join(', ') || '—'}`);
  }
  if (s.services.includes('embedded-iot')) {
    lines.push(`Embedded: MCU ${s.mcu} · power ${s.power} · connectivity ${s.connectivity.join(', ') || 'offline'} · sensors ${s.sensors || '—'} · enclosure ${s.enclosure ? 'yes' : 'no'}`);
  }
  if (s.services.includes('full-builds')) {
    lines.push(`Full build scope: ${s.scope.join(', ')} · ${s.units} unit(s)`);
  }
  lines.push(`Deadline: ${s.flexible ? 'Flexible' : (s.deadline || '—')}`);
  lines.push(`Files: ${s.files.length ? s.files.map((f) => f.name).join(', ') : '—'}`);
  lines.push(`Contact: ${s.name} <${s.email}>${s.phone ? ' · ' + s.phone : ''}${s.company ? ' · ' + s.company : ''}`);
  lines.push('');
  lines.push('Description:');
  lines.push(s.description || '(none provided)');
  return lines.join('\n');
}

function fmtSize(n: number): string {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function uploadFile(
  base: string,
  code: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<{ name: string; size: number; url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${base}/upload?code=${encodeURIComponent(code)}&name=${encodeURIComponent(file.name)}`;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.floor((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) {
          resolve({ name: data.name || file.name, size: data.size || file.size, url: data.url });
        } else {
          reject(new Error(data && data.error ? String(data.error) : `HTTP ${xhr.status}`));
        }
      } catch (e: any) {
        reject(new Error(e?.message || 'parse_error'));
      }
    };
    xhr.onerror = () => reject(new Error('network_error'));
    xhr.ontimeout = () => reject(new Error('timeout'));
    xhr.timeout = 10 * 60 * 1000; // 10 min
    xhr.send(file);
  });
}
