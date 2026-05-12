import { useEffect, useMemo, useState } from 'react';
import {
  Coins,
  Plus,
  Minus,
  Loader2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Smartphone,
  Wallet,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { Navigate } from 'react-router-dom';
import { api, ApiError, TokenTransaction } from '../api/client';
import { useTokens } from '../hooks/useTokens';
import { useSession } from '../hooks/useSession';

type PaymentMethod = 'stripe' | 'binance_pay' | 'pix' | 'card';

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];
const MIN_CREDITS = 1;
const MAX_CREDITS = 100000;

export default function Finance() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;
  const tokens = useTokens(userId);

  const [credits, setCredits] = useState<number>(100);
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [history, setHistory] = useState<TokenTransaction[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const h = await api.tokensHistory(userId, 200).catch(() => []);
        if (alive) setHistory(h);
      } catch {
        // ignora
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId]);

  // Estatísticas derivadas
  const stats = useMemo(() => {
    let consumed = 0;
    let topped = 0;
    let countConsumed = 0;
    let countTopped = 0;
    for (const t of history) {
      if (t.delta < 0) {
        consumed += Math.abs(t.delta);
        countConsumed++;
      } else if (t.delta > 0) {
        topped += t.delta;
        countTopped++;
      }
    }
    return { consumed, topped, countConsumed, countTopped };
  }, [history]);

  const valid = credits >= MIN_CREDITS && credits <= MAX_CREDITS;

  async function buy() {
    if (!valid || purchasing) return;
    setPurchasing(true);
    setFeedback(null);
    try {
      const r = await api.tokensTopup({ user_id: userId, credits, payment_method: method });
      setFeedback({
        type: 'success',
        msg: `+${r.credits} créditos adicionados ($${r.usd}). Saldo: ${r.balance_after}.`,
      });
      tokens.refetch();
      api.tokensHistory(userId, 200).then(setHistory).catch(() => undefined);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setFeedback({ type: 'error', msg: msg ?? 'Falha na recarga.' });
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <DashboardLayout title="Créditos">
      {/* Saldo + métricas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BalanceCard balance={tokens.balance} loading={tokens.loading} low={tokens.low} empty={tokens.empty} />
        <MetricCard
          icon={TrendingDown}
          color="red"
          label="Consumidos"
          value={stats.consumed}
          subtitle={`${stats.countConsumed} debitos · 1 crédito a cada $2 de lucro`}
        />
        <MetricCard
          icon={TrendingUp}
          color="green"
          label="Recargas"
          value={stats.topped}
          subtitle={`${stats.countTopped} recargas no histórico`}
        />
      </section>

      {/* Explicação consumo */}
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">1 crédito = $2 de lucro.</strong> A cobrança é
          automática e acumulativa no fechamento de cada ciclo. Quanto mais lucro, mais créditos
          usados. Se o saldo zerar, o bot pausa e avisa pra você recarregar.
        </div>
      </section>

      {/* Compra de créditos */}
      <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-primary" />
            Adicionar créditos
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary">
            1 USD = 1 crédito
          </span>
        </div>

        {/* Atalhos */}
        <div>
          <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            Pacotes rápidos
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCredits(amt)}
                className={`rounded-xl border px-3 py-3 text-center transition-all hover:scale-[1.02] ${
                  credits === amt
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-secondary/20 text-foreground hover:border-primary/40'
                }`}
              >
                <div className="font-mono font-semibold text-base">{amt}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">${amt}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div>
          <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            Digite a quantidade de créditos
          </label>
          <div className="relative">
            <input
              type="number"
              min={MIN_CREDITS}
              max={MAX_CREDITS}
              step={1}
              value={credits}
              onChange={(e) => setCredits(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 pr-24 outline-none focus:border-primary/50 transition-colors text-lg font-mono"
              placeholder="100"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
              créditos
            </span>
          </div>
          {!valid && credits > 0 && (
            <p className="mt-2 text-[11px] text-yellow-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Quantidade entre {MIN_CREDITS} e {MAX_CREDITS} créditos.
            </p>
          )}
        </div>

        {/* Resumo */}
        <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card/40 p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground">
              Valor total
            </div>
            <div className="font-mono font-bold text-3xl text-primary">
              ${credits.toLocaleString('en-US')}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground">
              Você recebe
            </div>
            <div className="font-mono font-bold text-2xl text-foreground">
              +{credits.toLocaleString('en-US')} <span className="text-xs text-muted-foreground">créditos</span>
            </div>
          </div>
        </div>

        {/* Método de pagamento */}
        <div>
          <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            Forma de pagamento
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <PayBtn active={method === 'pix'} onClick={() => setMethod('pix')} icon={Smartphone} label="PIX" />
            <PayBtn active={method === 'card'} onClick={() => setMethod('card')} icon={CreditCard} label="Cartão" />
            <PayBtn
              active={method === 'stripe'}
              onClick={() => setMethod('stripe')}
              icon={CreditCard}
              label="Stripe"
            />
            <PayBtn
              active={method === 'binance_pay'}
              onClick={() => setMethod('binance_pay')}
              icon={Wallet}
              label="Binance Pay"
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/70">
            Em produção, esse fluxo direciona ao gateway. Hoje credita imediatamente para teste.
          </p>
        </div>

        {feedback && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-red-500/40 bg-red-500/10 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {feedback.msg}
          </div>
        )}

        <button
          onClick={buy}
          disabled={!valid || purchasing}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed box-glow flex items-center justify-center gap-2"
        >
          {purchasing && <Loader2 className="w-4 h-4 animate-spin" />}
          {purchasing ? 'Processando...' : `Comprar ${credits} créditos por $${credits}`}
        </button>
      </section>

      {/* Histórico */}
      <section>
        <h2 className="text-lg font-display font-semibold mb-4">Histórico de créditos</h2>
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma transação ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-6 py-3">Quando</th>
                    <th className="text-left font-medium px-4 py-3">Motivo</th>
                    <th className="text-right font-medium px-4 py-3">Δ</th>
                    <th className="text-right font-medium px-4 py-3">Antes</th>
                    <th className="text-right font-medium px-6 py-3">Depois</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((t) => {
                    const positive = t.delta > 0;
                    return (
                      <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/10 transition-colors">
                        <td className="px-6 py-3 text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <ReasonChip reason={t.reason} />
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-semibold ${
                            positive ? 'text-accent' : 'text-red-400'
                          }`}
                        >
                          {positive ? (
                            <Plus className="inline w-3 h-3 -mt-0.5" />
                          ) : (
                            <Minus className="inline w-3 h-3 -mt-0.5" />
                          )}
                          {Math.abs(t.delta)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                          {t.balance_before}
                        </td>
                        <td className="px-6 py-3 text-right font-mono">{t.balance_after}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}

function BalanceCard({
  balance,
  loading,
  low,
  empty,
}: {
  balance: number;
  loading: boolean;
  low: boolean;
  empty: boolean;
}) {
  const borderCls = empty
    ? 'border-red-500/40 bg-gradient-to-br from-red-500/10 to-card/40'
    : low
    ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-card/40'
    : 'border-primary/30 bg-gradient-to-br from-primary/10 to-card/40';
  return (
    <div className={`rounded-2xl border p-6 col-span-1 md:col-span-1 transition-colors ${borderCls}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        <Coins className="w-3.5 h-3.5 text-primary" />
        Créditos disponíveis
      </div>
      <div className="font-display font-bold text-4xl md:text-5xl tracking-tight gradient-text-primary">
        {loading ? '...' : balance}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {empty
          ? 'sem saldo — operações pausadas'
          : low
          ? 'saldo baixo — recarregue em breve'
          : '1 crédito = $2 de lucro coberto'}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  color,
  label,
  value,
  subtitle,
}: {
  icon: any;
  color: 'red' | 'green';
  label: string;
  value: number;
  subtitle: string;
}) {
  const iconCls = color === 'red' ? 'text-red-400' : 'text-accent';
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        <Icon className={`w-3.5 h-3.5 ${iconCls}`} />
        {label}
      </div>
      <div className="font-display font-bold text-3xl tracking-tight">{value.toLocaleString('pt-BR')}</div>
      <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
    </div>
  );
}

function PayBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all hover:scale-[1.02] ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-secondary/20 text-muted-foreground hover:border-primary/40'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function ReasonChip({ reason }: { reason: string }) {
  const map: Record<string, { label: string; color: string }> = {
    signup_grant: { label: 'Bônus cadastro', color: 'border-primary/40 bg-primary/10 text-primary' },
    cycle_open: { label: 'Ciclo aberto', color: 'border-border bg-secondary/40 text-muted-foreground' },
    cycle_profit: { label: 'Lucro de ciclo', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' },
    pack_purchase: { label: 'Recarga', color: 'border-accent/40 bg-accent/10 text-accent' },
    admin_grant: { label: 'Crédito admin', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
    refund: { label: 'Reembolso', color: 'border-accent/40 bg-accent/10 text-accent' },
  };
  const m = map[reason] ?? {
    label: reason,
    color: 'border-border bg-secondary/40 text-muted-foreground',
  };
  return (
    <span
      className={`inline-block text-[11px] font-display tracking-wider px-2.5 py-1 rounded-md border ${m.color}`}
    >
      {m.label}
    </span>
  );
}
