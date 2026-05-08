import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin } from '../../api/admin';

type Filter = '' | 'open' | 'closed' | 'error';

export default function AdminCycles() {
  const [filter, setFilter] = useState<Filter>('');
  const [cycles, setCycles] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      admin
        .cycles((filter || undefined) as any)
        .then((d) => alive && setCycles(d))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [filter]);

  return (
    <AdminLayout title="Ciclos">
      <div className="flex gap-1 bg-secondary/40 p-1 rounded-full w-fit">
        {(['', 'open', 'closed', 'error'] as Filter[]).map((f) => (
          <button
            key={f || 'all'}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === '' ? 'Todos' : f === 'open' ? 'Abertos' : f === 'closed' ? 'Fechados' : 'Erro'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
        {cycles.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Nenhum ciclo ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-6 py-3">Aberto em</th>
                <th className="text-left font-medium px-4 py-3">Usuário</th>
                <th className="text-left font-medium px-4 py-3">Símbolo</th>
                <th className="text-left font-medium px-4 py-3">Lado</th>
                <th className="text-right font-medium px-4 py-3">Avg</th>
                <th className="text-right font-medium px-4 py-3">Qty</th>
                <th className="text-right font-medium px-4 py-3">SOs filled</th>
                <th className="text-right font-medium px-4 py-3">PnL</th>
                <th className="text-right font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {new Date(c.opened_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 font-medium">{c.symbol}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-display tracking-wider px-2 py-1 rounded-md ${
                        c.side === 'LONG'
                          ? 'bg-accent/10 text-accent border border-accent/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {c.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">${Number(c.avg_price ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{Number(c.total_qty ?? 0).toFixed(4)}</td>
                  <td className="px-4 py-3 text-right font-mono">{c.filled_safety_count ?? 0}</td>
                  <td className={`px-4 py-3 text-right font-mono ${Number(c.realized_pnl_usdt ?? 0) >= 0 ? 'text-accent' : 'text-red-400'}`}>
                    ${Number(c.realized_pnl_usdt ?? 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span
                      className={`text-[10px] font-display tracking-wider px-2 py-1 rounded-md border ${
                        c.status === 'open'
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : c.status === 'closed'
                          ? 'border-accent/40 bg-accent/10 text-accent'
                          : 'border-red-500/40 bg-red-500/10 text-red-400'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
