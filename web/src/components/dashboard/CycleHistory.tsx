import { Layers } from 'lucide-react';

export interface CycleHistoryItem {
  id: string;
  number: number;
  side: 'LONG' | 'SHORT';
  pnl: number;
  closedAt: string; // ISO ou label
}

export function CycleHistory({ items }: { items: CycleHistoryItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Layers className="w-4 h-4 text-primary" />
        Histórico de Byts
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhum ciclo finalizado ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="font-mono text-muted-foreground">#{it.number}</span>
                <span
                  className={`text-[10px] font-display tracking-wider px-2 py-0.5 rounded-md ${
                    it.side === 'LONG'
                      ? 'bg-accent/10 text-accent border border-accent/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}
                >
                  {it.side}
                </span>
                <span className="text-xs text-muted-foreground">{it.closedAt}</span>
              </div>
              <span
                className={`font-mono font-semibold ${
                  it.pnl >= 0 ? 'text-accent' : 'text-red-400'
                }`}
              >
                {it.pnl >= 0 ? '+' : ''}${it.pnl.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
