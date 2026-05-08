import { ListOrdered, ArrowUpRight, ArrowDownRight, Target, Layers } from 'lucide-react';

interface Order {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  position_side: 'LONG' | 'SHORT';
  type: string;
  role: 'BASE' | 'SAFETY' | 'TAKE_PROFIT' | 'MANUAL';
  price: number | null;
  stop_price: number | null;
  qty: number;
  filled_qty: number;
  status: string;
  created_at: string;
}

export function OpenOrdersTable({ orders }: { orders: Order[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListOrdered className="w-4 h-4 text-primary" />
          Ordens Abertas
        </div>
        <span className="text-xs text-muted-foreground">{orders.length} ativas</span>
      </div>

      {orders.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nenhuma ordem aberta no momento.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-6 py-3">Tipo</th>
                <th className="text-left font-medium px-4 py-3">Lado</th>
                <th className="text-left font-medium px-4 py-3">Símbolo</th>
                <th className="text-right font-medium px-4 py-3">Preço</th>
                <th className="text-right font-medium px-4 py-3">Qty</th>
                <th className="text-right font-medium px-4 py-3">Filled</th>
                <th className="text-right font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const isLong = o.position_side === 'LONG';
                const RoleIcon =
                  o.role === 'BASE'
                    ? Target
                    : o.role === 'SAFETY'
                    ? Layers
                    : Target;
                const filledPct = o.qty > 0 ? (o.filled_qty / o.qty) * 100 : 0;
                return (
                  <tr
                    key={o.id}
                    className="border-b border-border/60 hover:bg-card/60 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <RoleIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-display tracking-wider">
                          {o.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-display tracking-wider px-2 py-1 rounded-md ${
                          isLong
                            ? 'bg-accent/10 text-accent border border-accent/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isLong ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {o.position_side}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{o.symbol}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {o.price ? `$${formatPrice(Number(o.price))}` :
                       o.stop_price ? `$${formatPrice(Number(o.stop_price))} (SL)` :
                       '— Mercado'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(o.qty).toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${filledPct}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs text-muted-foreground w-8 text-right">
                          {filledPct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span
                        className={`text-[10px] font-display tracking-wider px-2 py-1 rounded-md border ${
                          o.status === 'NEW'
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : o.status === 'PARTIALLY_FILLED'
                            ? 'border-accent/30 bg-accent/10 text-accent'
                            : 'border-border bg-secondary/40 text-muted-foreground'
                        }`}
                      >
                        {o.status}
                      </span>
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
