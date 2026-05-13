import { useEffect, useMemo, useState } from 'react';
import { Flame, Activity, Trophy, TrendingUp, ArrowDown, Wallet } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { SymbolHeader } from '../components/dashboard/SymbolHeader';
import { CycleCard } from '../components/dashboard/CycleCard';
import { PriceChart } from '../components/dashboard/PriceChart';
import { PositionCard, PositionData } from '../components/dashboard/PositionCard';
import { StatCard } from '../components/dashboard/StatCard';
import { BankUsage } from '../components/dashboard/BankUsage';
import { CycleHistory, CycleHistoryItem } from '../components/dashboard/CycleHistory';
import { OpenPositionsTable } from '../components/dashboard/OpenPositionsTable';
import { api, ApiError, fetchKlines, getSession } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Navigate, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const session = useSession();
  const navigate = useNavigate();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;
  const [symbol, setSymbol] = useState<string>('BTCUSDT');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [strategyStatus, setStrategyStatus] = useState<'running' | 'paused' | 'stopped' | 'missing' | 'loading'>('loading');
  const [actionMsg, setActionMsg] = useState<{ type: 'error' | 'success' | 'info'; msg: string; cta?: { label: string; to: string } } | null>(null);

  // Carrega as estratégias do user e usa a mais recente como par ativo.
  // Refazemos a cada 8s pra captar config recém-salva em outra aba.
  useEffect(() => {
    let alive = true;
    let firstLoad = true;
    const refresh = async () => {
      try {
        const list = await api.listStrategies(userId);
        if (!alive) return;
        const symbols = list.map((s) => s.symbol);
        setAvailableSymbols(symbols);
        if (symbols.length === 0) return;
        // Na 1ª carga, sempre pula pra running (ou a mais recente).
        // Em refreshes seguintes, mantém a seleção do usuário se ainda válida.
        if (firstLoad || !symbols.includes(symbol)) {
          const running = list.find((s) => s.status === 'running');
          setSymbol(running?.symbol ?? symbols[0]);
          firstLoad = false;
        }
      } catch {
        // ignora
      }
    };
    refresh();
    const id = setInterval(refresh, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  const [price, setPrice] = useState(0);
  const [change24h, setChange24h] = useState(0);
  const [balance, setBalance] = useState(0);
  const [openCycles, setOpenCycles] = useState<any[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [history, setHistory] = useState<CycleHistoryItem[]>([]);
  const [perf, setPerf] = useState({
    realized: 0,
    unrealized: 0,
    exposure: 0,
    totalBalance: 0,
  });

  // Polling do estado do bot + saldo Binance + ordens abertas
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [bal, st, closedCycles, oo, pnl, pos] = await Promise.all([
          api.testBinance(userId).catch(() => null),
          api.status(userId).catch(() => ({ open_cycles: [] })),
          api.closedCycles(userId, { limit: 20 }).catch(() => []),
          api.openOrders(userId).catch(() => []),
          api.pnl(userId).catch(() => null),
          api.positions(userId).catch(() => []),
        ]);
        if (!alive) return;
        if (bal) setBalance(bal.available);
        setOpenCycles(st.open_cycles ?? []);
        setOpenOrders(oo as any[]);
        setPositions(pos as any[]);
        if (pnl) {
          setPerf({
            realized: pnl.realized_pnl_total ?? 0,
            unrealized: pnl.last_snapshot?.unrealized_pnl ?? 0,
            exposure: pnl.last_snapshot?.exposure_usdt ?? 0,
            totalBalance: pnl.last_snapshot?.total_balance ?? 0,
          });
        }

        // Últimos ciclos fechados (limite curto pro card de histórico).
        const cs = closedCycles as any[];
        setHistory(
          cs.slice(0, 4).map((c, i) => ({
            id: c.id,
            number: cs.length - i,
            side: c.side,
            pnl: Number(c.realized_pnl_usdt ?? 0),
            closedAt: c.closed_at
              ? new Date(c.closed_at).toLocaleString('pt-BR')
              : '—',
          })),
        );
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
  }, []);

  // Auto-dismiss do feedback após 5s
  useEffect(() => {
    if (!actionMsg) return;
    const id = setTimeout(() => setActionMsg(null), 5000);
    return () => clearTimeout(id);
  }, [actionMsg]);

  // Status da estratégia (running/paused/stopped/missing)
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const cfg = await api.getStrategy(userId, symbol);
        if (alive) setStrategyStatus(cfg.status);
      } catch (err: any) {
        if (alive) {
          // 404 = sem estratégia configurada
          setStrategyStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'stopped');
        }
      }
    };
    refresh();
    const id = setInterval(refresh, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId, symbol]);

  // Handler do botão start/pause
  async function handleToggle() {
    setActionMsg(null);
    try {
      if (strategyStatus === 'missing') {
        navigate('/config');
        return;
      }
      const action = strategyStatus === 'running' ? 'botPause' : 'botStart';
      const ep = action === 'botStart' ? api.botStart : api.botPause;
      await ep({ user_id: userId, symbol });
      setStrategyStatus(action === 'botStart' ? 'running' : 'paused');
      setActionMsg({
        type: 'success',
        msg: action === 'botStart' ? 'Bot iniciado' : 'Bot pausado',
      });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 402) {
          setActionMsg({
            type: 'error',
            msg: err.body?.message ?? 'Tokens insuficientes.',
            cta: { label: 'Comprar tokens', to: '/finance' },
          });
        } else if (err.status === 404) {
          setActionMsg({
            type: 'error',
            msg: 'Estratégia não configurada para esse par.',
            cta: { label: 'Criar estratégia', to: '/config' },
          });
        } else if (err.status === 401 || err.status === 403) {
          setActionMsg({ type: 'error', msg: 'Sessão expirada — faça login novamente.' });
        } else {
          setActionMsg({ type: 'error', msg: err.body?.message ?? err.message });
        }
      } else {
        setActionMsg({ type: 'error', msg: err?.message ?? 'Erro ao acionar bot' });
      }
    }
  }

  async function handleStop() {
    setActionMsg(null);
    try {
      await api.botStop({ user_id: userId, symbol });
      setStrategyStatus('stopped');
      setActionMsg({ type: 'info', msg: 'Bot parado. Ciclos abertos continuam até o TP bater.' });
    } catch (err: any) {
      setActionMsg({ type: 'error', msg: err?.message ?? 'Erro ao parar bot' });
    }
  }

  // Preço atual + variação 24h
  useEffect(() => {
    let alive = true;
    const fetchPrice = async () => {
      try {
        const k = await fetchKlines(symbol, '1h', 24);
        if (!alive || k.length === 0) return;
        const last = k[k.length - 1].close;
        const first = k[0].close;
        setPrice(last);
        setChange24h(((last - first) / first) * 100);
      } catch {
        // ignore
      }
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [symbol]);

  const long = useMemo<PositionData>(() => {
    const c = openCycles.find((x) => x.symbol === symbol && x.side === 'LONG');
    return {
      side: 'LONG',
      leverage: 12,
      marginType: 'Cross',
      qty: Number(c?.total_qty ?? 0),
      avgPrice: Number(c?.avg_price ?? 0),
      entry: Number(c?.avg_price ?? 0),
      pnlPct: c && c.avg_price > 0 ? ((price - c.avg_price) / c.avg_price) * 100 : 0,
      unrealizedPnl: c
        ? (price - Number(c.avg_price)) * Number(c.total_qty)
        : 0,
      dca: Number(c?.filled_safety_count ?? 0),
    };
  }, [openCycles, price, symbol]);

  const short = useMemo<PositionData>(() => {
    const c = openCycles.find((x) => x.symbol === symbol && x.side === 'SHORT');
    return {
      side: 'SHORT',
      leverage: 12,
      marginType: 'Cross',
      qty: Number(c?.total_qty ?? 0),
      avgPrice: Number(c?.avg_price ?? 0),
      entry: Number(c?.avg_price ?? 0),
      pnlPct: c && c.avg_price > 0 ? ((c.avg_price - price) / c.avg_price) * 100 : 0,
      unrealizedPnl: c
        ? (Number(c.avg_price) - price) * Number(c.total_qty)
        : 0,
      dca: Number(c?.filled_safety_count ?? 0),
    };
  }, [openCycles, price, symbol]);

  // Status agora vem da estratégia (running/paused/stopped). 'missing' e 'loading'
  // só importam pra UI; aqui mapeamos pro tipo do SymbolHeader.
  const status: 'running' | 'paused' | 'stopped' =
    strategyStatus === 'running' ? 'running' :
    strategyStatus === 'paused'  ? 'paused'  : 'stopped';
  const totalUnrealized = long.unrealizedPnl + short.unrealizedPnl;

  return (
    <DashboardLayout title="Dashboard" balance={balance}>
      {/* Seletor de par (aparece se tiver mais de uma estratégia configurada) */}
      {availableSymbols.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Operando:</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-secondary/40 border border-border rounded-full px-4 py-1.5 text-sm font-mono outline-none focus:border-primary/50"
          >
            {availableSymbols.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Symbol header — clicar no status alterna iniciar/pausar; ícone parar à direita */}
      <SymbolHeader
        symbol={symbol}
        price={price}
        change24h={change24h}
        pnl={totalUnrealized}
        status={status}
        onToggle={handleToggle}
        onRefresh={handleStop}
      />


      {/* CTA quando ainda não tem estratégia */}
      {strategyStatus === 'missing' && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <span className="text-sm">
            <span className="font-semibold text-primary">Quase lá:</span>{' '}
            <span className="text-muted-foreground">
              configure sua estratégia ({symbol}) para o bot começar a operar.
            </span>
          </span>
          <button
            onClick={() => navigate('/config')}
            className="ml-auto px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-display font-semibold tracking-wider"
          >
            Configurar
          </button>
        </div>
      )}

      {/* Feedback do start/pause/stop */}
      {actionMsg && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
            actionMsg.type === 'success'
              ? 'border-accent/40 bg-accent/10 text-accent'
              : actionMsg.type === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : 'border-primary/40 bg-primary/5 text-foreground'
          }`}
        >
          <span className="text-sm flex-1">{actionMsg.msg}</span>
          {actionMsg.cta && (
            <button
              onClick={() => navigate(actionMsg.cta!.to)}
              className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-display font-semibold"
            >
              {actionMsg.cta.label}
            </button>
          )}
          <button
            onClick={() => setActionMsg(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Linha 1: Status do ciclo + gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CycleCard
          cycleNumber={openCycles.length}
          changePct={
            (long.avgPrice > 0 ? long.pnlPct : 0) +
            (short.avgPrice > 0 ? short.pnlPct : 0)
          }
          pnlAccount={totalUnrealized}
          status={status}
        />
        <PriceChart symbol={symbol} />
      </div>

      {/* Linha 2: LONG / SHORT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PositionCard data={long} />
        <PositionCard data={short} />
      </div>

      {/* 6 stat cards (totais — para filtro por período ver /stats) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Activity}
          label="Byts"
          value={String(history.length + openCycles.length)}
          subtitle={`${openCycles.length} aberto${openCycles.length === 1 ? '' : 's'} / ${history.length} fechado${history.length === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={Trophy}
          label="Win Rate"
          value={`${dashWinRate(history)}%`}
          subtitle={history.length === 0 ? 'sem ciclos fechados' : undefined}
        />
        <StatCard
          icon={TrendingUp}
          label="PnL Flutuante"
          value={`${perf.unrealized >= 0 ? '+' : ''}$${perf.unrealized.toFixed(2)}`}
          subtitle="em andamento"
          accent={perf.unrealized >= 0 ? 'accent' : 'red'}
        />
        <StatCard
          icon={TrendingUp}
          label="Lucro Realizado"
          value={`$${perf.realized.toFixed(2)}`}
          subtitle="total encerrado"
          accent={perf.realized >= 0 ? 'accent' : 'red'}
        />
        <StatCard
          icon={ArrowDown}
          label="DCAs Exec."
          value={String(long.dca + short.dca)}
          subtitle="safety orders"
        />
        <StatCard
          icon={Wallet}
          label="Capital"
          value={`$${balance.toFixed(2)}`}
          subtitle="Saldo Binance"
        />
      </div>

      {/* Posições abertas (consultadas direto da Binance) */}
      <OpenPositionsTable
        positions={positions}
        userId={userId}
        onClosed={() => {
          // Refetch imediato ao fechar pra UI atualizar sem esperar polling
          api.positions(userId).then(setPositions).catch(() => undefined);
        }}
      />

      {/* Linha 5: Banca + Histórico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BankUsage
          capitalAllocated={long.qty * long.avgPrice + short.qty * short.avgPrice}
          marginInUse={
            (long.qty * long.avgPrice + short.qty * short.avgPrice) / 12
          }
          totalCapital={balance}
        />
        <CycleHistory items={history} />
      </div>
    </DashboardLayout>
  );
}

function dashWinRate(history: CycleHistoryItem[]): string {
  if (history.length === 0) return '0';
  const wins = history.filter((h) => h.pnl > 0).length;
  return ((wins / history.length) * 100).toFixed(0);
}
