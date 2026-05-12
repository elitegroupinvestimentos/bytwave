import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';

export interface CycleHistoryItem {
  id: string;
  number: number;
  side: 'LONG' | 'SHORT';
  pnl: number;
  closedAt: string; // ISO ou label
}

export function CycleHistory({ items }: { items: CycleHistoryItem[] }) {
  const total = items.reduce((s, it) => s + it.pnl, 0);
  const wins = items.filter((it) => it.pnl > 0).length;
  const losses = items.filter((it) => it.pnl < 0).length;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          Histórico de Lucro
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-accent flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              {wins}
            </span>
            <span className="text-red-400 flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              {losses}
            </span>
            <span
              className={`font-semibold ${total >= 0 ? 'text-accent' : 'text-red-400'}`}
            >
              {total >= 0 ? '+' : ''}${total.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhum lucro registrado ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => {
            const positive = it.pnl >= 0;
            return (
              <li key={it.id} className="py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex w-7 h-7 items-center justify-center rounded-full ${
                      positive
                        ? 'bg-accent/10 text-accent'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {positive ? (
                      <ArrowUp className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs text-foreground">
                      {it.side} <span className="text-muted-foreground">#{it.number}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">{it.closedAt}</span>
                  </div>
                </div>
                <span
                  className={`font-mono font-semibold ${
                    positive ? 'text-accent' : 'text-red-400'
                  }`}
                >
                  {positive ? '+' : ''}${it.pnl.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
