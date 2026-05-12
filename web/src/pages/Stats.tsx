import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Trophy,
  TrendingUp,
  ArrowDown,
  Wallet,
} from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { StatCard } from '../components/dashboard/StatCard';
import { DateFilter, DateRange, ALL_TIME } from '../components/dashboard/DateFilter';
import { api } from '../api/client';
import { useSession } from '../hooks/useSession';
import { useBinanceBalance } from '../hooks/useBinanceBalance';
import { Navigate } from 'react-router-dom';

interface ClosedCycle {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  realized_pnl_usdt: number;
  closed_at: string;
  opened_at: string;
}

export default function Stats() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;
  const bin = useBinanceBalance(userId);

  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [closed, setClosed] = useState<ClosedCycle[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [unrealized, setUnrealized] = useState(0);
  const [dcas, setDcas] = useState(0);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [st, cycles, pnl, pos] = await Promise.all([
          api.status(userId).catch(() => ({ open_cycles: [] as any[] })),
          api
            .closedCycles(userId, {
              limit: 500,
              start: range.start ?? undefined,
              end: range.end ?? undefined,
            })
            .catch(() => []),
          api.pnl(userId).catch(() => null),
          api.positions(userId).catch(() => []),
        ]);
        if (!alive) return;
        setOpenCount((st.open_cycles ?? []).length);
        setClosed(cycles as any);
        if (pnl) setUnrealized(pnl.last_snapshot?.unrealized_pnl ?? 0);
        // DCAs: aproximação a partir das posições abertas (qty atual > qty base).
        // Mantemos simples: soma de aberto != 0 como proxy. Substituível por
        // um campo se quiser exatidão.
        const posArr = pos as any[];
        setDcas(posArr.filter((p) => Math.abs(Number(p.qty ?? 0)) > 0).length);
      } catch {
        // segue
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId, range.start, range.end]);

  const stats = useMemo(() => {
    const realized = closed.reduce((s, c) => s + Number(c.realized_pnl_usdt ?? 0), 0);
    const wins = closed.filter((c) => Number(c.realized_pnl_usdt ?? 0) > 0).length;
    const losses = closed.filter((c) => Number(c.realized_pnl_usdt ?? 0) < 0).length;
    const winRate = closed.length === 0 ? 0 : (wins / closed.length) * 100;
    return { realized, wins, losses, winRate, total: closed.length };
  }, [closed]);

  const periodSubtitle = range.label === 'Tudo' ? 'total encerrado' : `período: ${range.label}`;

  return (
    <DashboardLayout title="Estatísticas">
      <DateFilter range={range} onChange={setRange} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Activity}
          label="Byts"
          value={String(stats.total + openCount)}
          subtitle={`${openCount} aberto${openCount === 1 ? '' : 's'} / ${stats.total} fechado${stats.total === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={Trophy}
          label="Win Rate"
          value={`${stats.winRate.toFixed(0)}%`}
          subtitle={stats.total === 0 ? 'sem ciclos fechados' : `${stats.wins} W · ${stats.losses} L`}
        />
        <StatCard
          icon={TrendingUp}
          label="PnL Flutuante"
          value={`${unrealized >= 0 ? '+' : ''}$${unrealized.toFixed(2)}`}
          subtitle="em andamento"
          accent={unrealized >= 0 ? 'accent' : 'red'}
        />
        <StatCard
          icon={TrendingUp}
          label="Lucro Realizado"
          value={`$${stats.realized.toFixed(2)}`}
          subtitle={periodSubtitle}
          accent={stats.realized >= 0 ? 'accent' : 'red'}
        />
        <StatCard
          icon={ArrowDown}
          label="DCAs Exec."
          value={String(dcas)}
          subtitle="safety orders"
        />
        <StatCard
          icon={Wallet}
          label="Capital"
          value={`$${bin.total.toFixed(2)}`}
          subtitle="Saldo Binance"
        />
      </div>
    </DashboardLayout>
  );
}
