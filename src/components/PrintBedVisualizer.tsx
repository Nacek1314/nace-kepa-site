import { useState } from 'react';

// Bambu Lab P1S build volume
const BED = { x: 256, y: 256, z: 256 };

interface Props { labels?: { x: string; y: string; z: string; fits: string; over: string; title: string } }

const DEFAULT_LABELS = {
  title: 'Print-bed fit check (Bambu Lab P1S, 256 × 256 × 256 mm)',
  x: 'Width X (mm)', y: 'Depth Y (mm)', z: 'Height Z (mm)',
  fits: 'Fits in one piece', over: 'Too large — will be split and bonded'
};

export default function PrintBedVisualizer({ labels = DEFAULT_LABELS }: Props) {
  const [x, setX] = useState(120);
  const [y, setY] = useState(80);
  const [z, setZ] = useState(60);
  const fits = x <= BED.x && y <= BED.y && z <= BED.z;
  const scale = 1.2; // px per mm at preview size
  const w = BED.x * scale;
  const h = BED.y * scale;
  const partW = Math.min(x, BED.x) * scale;
  const partH = Math.min(y, BED.y) * scale;

  return (
    <div className="rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900/50 p-5">
      <p className="font-display font-bold mb-4 text-base">{labels.title}</p>
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-3">
          {([['x', x, setX, labels.x, BED.x], ['y', y, setY, labels.y, BED.y], ['z', z, setZ, labels.z, BED.z]] as const).map(([key, val, set, lbl, max]) => (
            <label key={key} className="block text-sm">
              <div className="flex justify-between mb-1 text-ink-600 dark:text-ink-300">
                <span>{lbl}</span>
                <span className="tabular-nums font-medium">{val} / {max} mm</span>
              </div>
              <input type="range" min={5} max={400} value={val}
                     onChange={(e) => set(parseInt(e.target.value))}
                     className="w-full accent-accent-600" />
            </label>
          ))}
          <p className={`mt-3 text-sm font-medium ${fits ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {fits ? '✓ ' + labels.fits : '⚠ ' + labels.over}
          </p>
        </div>
        <div className="relative mx-auto" style={{ width: w + 4, height: h + 4 }}>
          <div className="absolute inset-0 border-2 border-dashed border-ink-300 dark:border-ink-700 rounded bg-ink-50 dark:bg-ink-950">
            <div className="absolute top-1 left-2 text-[10px] text-ink-400 select-none">256 × 256 mm</div>
          </div>
          <div className="absolute top-0 left-0 transition-all duration-200"
               style={{
                 width: partW, height: partH,
                 background: fits ? 'rgba(58,100,245,0.25)' : 'rgba(245,158,11,0.3)',
                 border: `2px solid ${fits ? '#3a64f5' : '#f59e0b'}`
               }}>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-ink-700 dark:text-ink-100">
              {x}×{y}×{z}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
