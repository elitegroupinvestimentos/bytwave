import { Calendar, X } from 'lucide-react';
import { useState } from 'react';

export type DateRange = {
  start: string | null; // ISO yyyy-mm-dd ou null
  end: string | null;
  label: string;
};

const PRESETS: Array<{ key: string; label: string; build: () => DateRange }> = [
  { key: 'today', label: 'Hoje', build: today },
  { key: '7d', label: '7 dias', build: () => lastN(7) },
  { key: '30d', label: '30 dias', build: () => lastN(30) },
  { key: 'all', label: 'Tudo', build: () => ({ start: null, end: null, label: 'Tudo' }) },
];

function today(): DateRange {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: t.toISOString(), end: end.toISOString(), label: 'Hoje' };
}

function lastN(n: number): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (n - 1));
  start.setHours(0, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString(), label: `${n} dias` };
}

function fmtInput(d: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

interface Props {
  range: DateRange;
  onChange: (r: DateRange) => void;
}

export function DateFilter({ range, onChange }: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const isPreset = PRESETS.some((p) => p.build().label === range.label);

  function applyCustom(start: string, end: string) {
    if (!start && !end) {
      onChange({ start: null, end: null, label: 'Tudo' });
      return;
    }
    const s = start ? new Date(start + 'T00:00:00').toISOString() : null;
    const e = end ? new Date(end + 'T23:59:59').toISOString() : null;
    onChange({ start: s, end: e, label: `${start || '…'} → ${end || '…'}` });
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-3 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-[11px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mr-2 px-2">
        <Calendar className="w-3.5 h-3.5 text-primary" />
        Período
      </div>

      <div className="flex flex-wrap gap-1.5 flex-1">
        {PRESETS.map((p) => {
          const r = p.build();
          const active = isPreset && range.label === r.label;
          return (
            <button
              key={p.key}
              onClick={() => {
                setShowCustom(false);
                onChange(r);
              }}
              className={`text-[11px] font-mono px-3 py-1.5 rounded-md border transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className={`text-[11px] font-mono px-3 py-1.5 rounded-md border transition-colors ${
            !isPreset || showCustom
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40'
          }`}
        >
          Personalizado
        </button>

        {!isPreset && (
          <span className="text-[11px] font-mono px-2 py-1.5 text-muted-foreground flex items-center gap-1">
            {range.label}
            <button
              onClick={() => onChange(PRESETS[3].build())}
              className="text-muted-foreground hover:text-primary"
              aria-label="limpar"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {showCustom && (
        <div className="w-full flex flex-wrap items-center gap-2 mt-1 pt-2 border-t border-border">
          <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            De
            <input
              type="date"
              defaultValue={fmtInput(range.start)}
              onChange={(e) =>
                applyCustom(e.target.value, fmtInput(range.end))
              }
              className="bg-secondary/30 border border-border rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-primary/50"
            />
          </label>
          <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            Até
            <input
              type="date"
              defaultValue={fmtInput(range.end)}
              onChange={(e) =>
                applyCustom(fmtInput(range.start), e.target.value)
              }
              className="bg-secondary/30 border border-border rounded-md px-2 py-1 text-xs font-mono outline-none focus:border-primary/50"
            />
          </label>
        </div>
      )}
    </div>
  );
}

export const ALL_TIME: DateRange = { start: null, end: null, label: 'Tudo' };
