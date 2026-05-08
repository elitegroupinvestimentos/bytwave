import { Layers, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Position {
  symbol: string;
  position_side: 'LONG' | 'SHORT' | 'BOTH';
  qty: number;
  entry_price: number;
  mark_price: number;
  unrealized_pnl: number;
  leverage: number;
  isolated: boolean;
  notional: number;
}

export function OpenPositionsTable({ positions }: { positions: Position[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Layers className="w-4 h-4 text-primary" />
          Posições Abertas (Binance)
        </div>
        <span className="text-xs text-muted-foreground">{positions.length} aberta(s)</span>
      </div>

      {positions.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nenhuma posição aberta no momento.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-6 py-3">Símbolo</th>
                <th className="text-left font-medium px-4 py-3">Lado</th>
                <th className="text-right font-medium px-4 py-3">Qty</th>
                <th className="text-right font-medium px-4 py-3">Entrada</th>
                <th className="text-right font-medium px-4 py-3">Mark</th>
                <th className="text-right font-medium px-4 py-3">Notional</th>
                <th className="text-right font-medium px-4 py-3">Alav.</th>
                <th className="text-right font-medium px-6 py-3">PnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const isLong = p.position_side === 'LONG' || (p.position_side === 'BOTH' && p.qty > 0);
                const positivePnl = p.unrealized_pnl >= 0;
                return (
                  <tr key={`${p.symbol}-${p.position_side}-${i}`} className="border-b border-border/60 last:border-0 hover:bg-card/60 transition-colors">
                    <td className="px-6 py-3 font-medium">{p.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-display tracking-wider px-2 py-1 rounded-md ${
                          isLong
                            ? 'bg-accent/10 text-accent border border-accent/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {p.position_side === 'BOTH' ? (isLong ? 'LONG' : 'SHORT') : p.position_side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{p.qty.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono">${formatPrice(p.entry_price)}</td>
                    <td className="px-4 py-3 text-right font-mono">${formatPrice(p.mark_price)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      ${p.notional.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {p.leverage}x {p.isolated ? 'Iso' : 'Cross'}
                    </td>
                    <td className={`px-6 py-3 text-right font-mono font-semibold ${positivePnl ? 'text-accent' : 'text-red-400'}`}>
                      {positivePnl ? '+' : ''}${p.unrealized_pnl.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}
