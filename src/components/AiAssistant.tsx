import { useState } from 'react';

interface Props {
  lang: 'en' | 'sl';
  onSuggest?: (text: string) => void;
}

export default function AiAssistant({ lang, onSuggest }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [busy, setBusy] = useState(false);

  const promptPrefix = lang === 'sl'
    ? 'Si pomočnik za pripravo briefa za inženirski studio Nace Kepa (CAD, 3D tisk, ESP32/Arduino firmware, celostne izdelave). Iz uporabnikovega kratkega vnosa pripravi konkreten brief: kaj naj izdelek počne, ključne dimenzije, materiali, napajanje, povezljivost, rok. Odgovori v slovenščini, jedrnato, do 8 vrstic.'
    : 'You are a brief-shaping assistant for Nace Kepa engineering studio (CAD, 3D printing, ESP32/Arduino firmware, full custom builds). From the user\'s short input, draft a concrete project brief: what the product does, key dimensions, materials, power, connectivity, deadline. Reply in English, concise, up to 8 lines.';

  async function ask() {
    if (!q.trim()) return;
    setBusy(true); setA('');
    try {
      // Pollinations.ai free LLM endpoint, no key required.
      const url = 'https://text.pollinations.ai/' + encodeURIComponent(`${promptPrefix}\n\nUser: ${q}\n\nBrief:`);
      const r = await fetch(url);
      const text = await r.text();
      setA(text.trim());
    } catch {
      setA(lang === 'sl' ? 'Pomočnik trenutno ni dosegljiv. Opiši projekt z lastnimi besedami spodaj.' : 'Assistant unreachable. Describe the project in your own words below.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
              className="text-xs font-medium text-accent-600 dark:text-accent-300 hover:underline">
        {lang === 'sl' ? '✦ Potrebuješ pomoč pri opisu? Poskusi AI pomočnika' : '✦ Need help describing? Try the AI assistant'}
      </button>
    );
  }
  return (
    <div className="rounded-lg border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">{lang === 'sl' ? 'AI pomočnik' : 'AI assistant'}</span>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-ink-500 hover:text-ink-900 dark:hover:text-ink-100">✕</button>
      </div>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={2}
        placeholder={lang === 'sl' ? 'npr. potrebujem držalo za telefon na kolesu' : 'e.g. I need a phone holder for my bike'}
        className="w-full px-3 py-2 rounded-md border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-950 text-sm"
      />
      <button type="button" onClick={ask} disabled={busy || !q.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50">
        {busy ? '…' : (lang === 'sl' ? 'Predlagaj' : 'Draft brief')}
      </button>
      {a && (
        <div className="space-y-2">
          <div className="p-3 rounded-md bg-white dark:bg-ink-950 text-sm whitespace-pre-wrap leading-relaxed border border-ink-200 dark:border-ink-800">{a}</div>
          {onSuggest && (
            <button type="button" onClick={() => onSuggest(a)}
                    className="text-xs font-medium text-accent-600 dark:text-accent-300 hover:underline">
              {lang === 'sl' ? '↧ Vstavi v polje opisa' : '↧ Insert into description field'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
