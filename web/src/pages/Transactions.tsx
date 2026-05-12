import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Filter } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { OpenPositionsTable } from '../components/dashboard/OpenPositionsTable';
import { api } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Navigate } from 'react-router-dom';

type Tab = 'open' | 'history';

export default function Transactions() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;
  const [tab, setTab] = useState<Tab>('open');
  const [positions, setPositions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    const [pos, h] = await Promise.all([
      api.positions(userId).catch(() => []),
      api.history(userId, 200).catch(() => []),
    ]);
    setPositions(pos as any[]);
    setHistory(h as any[]);
  }, [userId]);

  useEffect(() => {
    let alive = true;
    const tick = () => alive && load();
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [load]);

  return (
    <DashboardLayout title="Transações">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-secondary/40 p-1 rounded-full">
          {(
            [
              { v: 'open', label: 'Abertas', count: positions.length },
              { v: 'history', label: 'Histórico', count: history.length },
            ] as { v: Tab; label: string; count: number }[]
          ).map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${
                tab === t.v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label} <span className="opacity-70">({t.count})</span>
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 h-9 px-3 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/40 transition-colors">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </button>
      </div>

      {tab === 'open' ? (
        <OpenPositionsTable positions={positions} userId={userId} onClosed={load} />
      ) : (
        <HistoryTable orders={history} />
      )}
    </DashboardLayout>
  );
}

function HistoryTable({ orders }: { orders: any[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <div className="px-6 py-5 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeftRight className="w-4 h-4 text-primary" />
        Histórico de operações
      </div>
      {orders.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Sem operações registradas ainda.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-6 py-3">Quando</th>
                <th className="text-left font-medium px-4 py-3">Tipo</th>
                <th className="text-left font-medium px-4 py-3">Lado</th>
                <th className="text-left font-medium px-4 py-3">Símbolo</th>
                <th className="text-right font-medium px-4 py-3">Preço</th>
                <th className="text-right font-medium px-4 py-3">Qty</th>
                <th className="text-right font-medium px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0">
                  <td className="px-6 py-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-xs font-display tracking-wider">{o.role}</td>
                  <td className="px-4 py-3 text-xs">{o.position_side}</td>
                  <td className="px-4 py-3 font-medium">{o.symbol}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {o.avg_fill_price
                      ? `$${Number(o.avg_fill_price).toFixed(2)}`
                      : o.price
                      ? `$${Number(o.price).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{Number(o.qty).toFixed(4)}</td>
                  <td className="px-6 py-3 text-right">
                    <StatusChip status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    FILLED: 'border-accent/40 bg-accent/10 text-accent',
    NEW: 'border-primary/40 bg-primary/10 text-primary',
    PARTIALLY_FILLED: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
    CANCELED: 'border-border bg-secondary/40 text-muted-foreground',
    EXPIRED: 'border-border bg-secondary/40 text-muted-foreground',
    REJECTED: 'border-red-500/40 bg-red-500/10 text-red-300',
  };
  const cls = map[status] ?? 'border-border bg-secondary/40 text-muted-foreground';
  return (
    <span className={`text-[10px] font-display tracking-wider px-2 py-1 rounded-md border ${cls}`}>
      {status}
    </span>
  );
}
