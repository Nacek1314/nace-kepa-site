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

function estimateEUR(state: WizardState, stats: Stats | null): number {
  let total = 0;
  if (state.services.includes('3d-design')) {
    const hours = state.complexity === 'complex' ? 8 : state.complexity === 'medium' ? 4 : 2;
    total += hours * 25;
  }
  if (state.services.includes('3d-printing')) {
    // material price ~0.05 €/cm³ for PLA, machine time ~1 €/hour, plus a small handling fee
    const vol = stats?.volumeCm3 ?? 30;
    const matFactor = state.material === 'flexible' ? 0.18 : state.material === 'petg' ? 0.08 : 0.05;
    const qty = Math.max(1, state.qty || 1);
    const post = (state.post.includes('paint') ? 8 : 0) + (state.post.includes('sand') ? 3 : 0) + (state.post.includes('assemble') ? 6 : 0);
    total += (vol * matFactor + 4 + post) * qty;
  }
  if (state.services.includes('embedded-iot')) {
    let hours = 6;
    if ((state.connectivity || []).includes('ble')) hours += 4;
    if ((state.connectivity || []).includes('wifi')) hours += 4;
    hours += Math.min(8, (state.sensors?.split(',').filter(Boolean).length || 0) * 1.5);
    if (state.enclosure) hours += 3;
    total += hours * 25;
  }
  if (state.services.includes('full-builds')) {
    let hours = 20;
    if (state.scope.includes('cad'))   hours += 6;
    if (state.scope.includes('print')) hours += 4;
    if (state.scope.includes('pcb'))   hours += 12;
    if (state.scope.includes('fw'))    hours += 10;
    if (state.scope.includes('assy'))  hours += 6;
    hours *= Math.max(1, Math.log2(Math.max(1, state.units || 1)) + 1);
    total += hours * 25;
  }
  return Math.round(total / 5) * 5;
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
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
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

  async function submit() {
    setSubmitting(true); setErr(null);
    const code = makeTrackingCode();
    const summary = buildSummary(state, estimate, code, lang);
    const fileNote = state.files.length
      ? (lang === 'sl'
          ? `\n\n— Priloge za pripeti v e-pošto: ${state.files.map((f) => f.name).join(', ')}`
          : `\n\n— Files to attach to this email: ${state.files.map((f) => f.name).join(', ')}`)
      : '';
    const subject = `[${code}] ${lang === 'sl' ? 'Novo povpraševanje' : 'New project request'} — ${state.name || 'unknown'}`;
    const body = summary + fileNote + '\n\n' + (lang === 'sl'
      ? '— Poslano prek nacekepa.com'
      : '— Sent via nacekepa.com');

    try {
      // 1. Trigger a local download of the brief so the visitor always has a copy.
      const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}-brief.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // 2. Open the visitor's mail client with the brief pre-filled.
      const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      // Some browsers limit mailto length; if it is too long, the download still works.
      window.location.href = mailto;

      setDone({ code });
    } catch (e: any) {
      setErr(L.error + (e?.message ? ` (${e.message})` : ''));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const mailtoFallback = `mailto:${contactEmail}?subject=${encodeURIComponent(`[${done.code}] ${lang === 'sl' ? 'Povpraševanje' : 'Project request'}`)}`;
    return (
      <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl">✓</div>
        <h2 className="font-display text-2xl font-bold mt-4">{L.success_title}</h2>
        <p className="mt-2 text-ink-600 dark:text-ink-300 max-w-md mx-auto">{L.success_body}</p>
        <div className="mt-6 text-left max-w-md mx-auto p-4 rounded-lg bg-white dark:bg-ink-950 border border-ink-200 dark:border-ink-800 text-sm">
          <p className="font-medium mb-2">{lang === 'sl' ? 'Kaj se je pravkar zgodilo:' : 'What just happened:'}</p>
          <ol className="list-decimal pl-5 space-y-1 text-ink-600 dark:text-ink-300">
            <li>{lang === 'sl' ? `Datoteka ${done.code}-brief.txt se je prenesla na tvoj računalnik.` : `The file ${done.code}-brief.txt was downloaded to your computer.`}</li>
            <li>{lang === 'sl' ? 'Odprl se je tvoj e-poštni odjemalec z že izpolnjenim povpraševanjem.' : 'Your email client opened with the request pre-filled.'}</li>
            {state.files.length > 0 && (
              <li className="font-medium text-amber-700 dark:text-amber-300">
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
          <StlViewer
            labels={{ drop: labels.viewer_drop, loaded: labels.viewer_loaded, volume: labels.viewer_volume, size: labels.viewer_size }}
            onStats={(s) => setStlStats(s)}
          />
          <input type="file" multiple accept=".stl,.obj,.step,.stp,.iges,.igs,.3mf,.zip,image/*"
                 onChange={(e) => update('files', Array.from(e.target.files || []))}
                 className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-accent-600 file:text-white hover:file:bg-accent-700" />
          {state.files.length > 0 && (
            <ul className="text-sm text-ink-500 dark:text-ink-400">
              {state.files.map((f) => <li key={f.name}>{f.name} <span className="text-ink-400">({(f.size / 1024).toFixed(0)} KB)</span></li>)}
            </ul>
          )}
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
        <div className="space-y-3">
          <p className="font-display text-xl font-bold">{L.estimate_title}</p>
          <div className="p-6 rounded-xl bg-accent-50 dark:bg-accent-900/30 border border-accent-200 dark:border-accent-700 text-center">
            <div className="text-xs uppercase tracking-wider text-ink-500">{L.estimate_title}</div>
            <div className="font-display text-4xl font-bold text-accent-700 dark:text-accent-200 tabular-nums">€{estimate}</div>
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
{buildSummary(state, estimate, '(generated on submit)', lang)}
          </pre>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={state.agree} onChange={(e) => update('agree', e.target.checked)} className="mt-0.5" />
            <span>{labels.agree}</span>
          </label>
          {err && <p className="text-sm text-amber-600 dark:text-amber-400">{err}</p>}
        </div>
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

function buildSummary(s: WizardState, estimate: number, code: string, lang: Lang): string {
  const lines: string[] = [];
  lines.push(`Tracking code: ${code}`);
  lines.push(`Language: ${lang}`);
  lines.push(`Indicative estimate: €${estimate}`);
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
