import { useEffect, useState } from 'react';
import { Coins, Sparkles, Check, Clock, Plus, Minus, Loader2 } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { Navigate } from 'react-router-dom';
import { api, ApiError, TokenPack, TokenTransaction } from '../api/client';
import { useTokens } from '../hooks/useTokens';
import { useSession } from '../hooks/useSession';

export default function Finance() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;
  const tokens = useTokens(userId);
  const [packs, setPacks] = useState<TokenPack[]>([]);
  const [history, setHistory] = useState<TokenTransaction[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [p, h] = await Promise.all([
          api.tokensPacks().catch(() => []),
          api.tokensHistory(userId, 100).catch(() => []),
        ]);
        if (!alive) return;
        setPacks(p);
        setHistory(h);
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

  async function buyPack(pack: TokenPack) {
    if (purchasing) return;
    setPurchasing(pack.id);
    setFeedback(null);
    try {
      const result = await api.tokensPurchase({ user_id: userId, pack_id: pack.id });
      setFeedback({
        type: 'success',
        msg: `Compra concluída! +${pack.tokens} tokens. Saldo: ${result.balance_after}`,
      });
      tokens.refetch();
      api.tokensHistory(userId, 100).then(setHistory).catch(() => undefined);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setFeedback({ type: 'error', msg: msg ?? 'Erro ao comprar' });
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <DashboardLayout title="Tokens">
      {/* Saldo + estatísticas */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BalanceCard balance={tokens.balance} loading={tokens.loading} />
        <InfoCard
          icon={Sparkles}
          label="Por ciclo"
          value={`${tokens.tokensPerCycle} token${tokens.tokensPerCycle === 1 ? '' : 's'}`}
          subtitle="custo por operação automática"
        />
        <InfoCard
          icon={Clock}
          label="Ciclos restantes"
          value={
            tokens.tokensPerCycle > 0
              ? String(Math.floor(tokens.balance / tokens.tokensPerCycle))
              : '∞'
          }
          subtitle={tokens.empty ? 'sem saldo' : 'estimativa'}
        />
      </section>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Packs disponíveis */}
      <section>
        <h2 className="text-lg font-display font-semibold mb-4">Pacotes</h2>
        {packs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
            Nenhum pacote disponível. Verifique se a migration de tokens foi aplicada no Supabase.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packs.map((p) => (
              <PackCard
                key={p.id}
                pack={p}
                onBuy={() => buyPack(p)}
                loading={purchasing === p.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Histórico */}
      <section>
        <h2 className="text-lg font-display font-semibold mb-4">Histórico de tokens</h2>
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma transação ainda.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-6 py-3">Quando</th>
                  <th className="text-left font-medium px-4 py-3">Motivo</th>
                  <th className="text-right font-medium px-4 py-3">Δ</th>
                  <th className="text-right font-medium px-4 py-3">Saldo Antes</th>
                  <th className="text-right font-medium px-6 py-3">Saldo Depois</th>
                </tr>
              </thead>
              <tbody>
                {history.map((t) => {
                  const positive = t.delta > 0;
                  return (
                    <tr key={t.id} className="border-b border-border/60 last:border-0">
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
          )}
        </div>
      </section>
    </DashboardLayout>
  );
}

function BalanceCard({ balance, loading }: { balance: number; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card/40 p-6 col-span-1 md:col-span-1">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        <Coins className="w-3.5 h-3.5 text-primary" />
        Saldo Atual
      </div>
      <div className="font-display font-bold text-4xl md:text-5xl tracking-tight gradient-text-primary">
        {loading ? '...' : balance}
      </div>
      <div className="text-xs text-muted-foreground mt-1">tokens disponíveis</div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: any;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        {label}
      </div>
      <div className="font-display font-bold text-3xl tracking-tight">{value}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

function PackCard({
  pack,
  onBuy,
  loading,
}: {
  pack: TokenPack;
  onBuy: () => void;
  loading: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 transition-colors ${
        pack.highlight
          ? 'border-primary/50 bg-gradient-to-b from-primary/10 to-card/40'
          : 'border-border bg-card/40 hover:border-primary/30'
      }`}
    >
      {pack.highlight && (
        <span className="absolute -top-3 left-6 text-[10px] font-display font-semibold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
          Mais popular
        </span>
      )}
      <h3 className="font-display font-bold text-2xl tracking-tight mb-1">{pack.name}</h3>
      <div className="text-sm text-muted-foreground mb-4">
        {pack.tokens.toLocaleString('pt-BR')} tokens
      </div>
      <div className="font-display font-bold text-3xl tracking-tight mb-5">
        R$ {Number(pack.price_brl).toFixed(2).replace('.', ',')}
      </div>

      <ul className="space-y-1.5 text-sm text-muted-foreground mb-6">
        <li className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-primary" />
          {pack.tokens.toLocaleString('pt-BR')} ciclos do bot
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-primary" />
          Não expira
        </li>
        <li className="flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-primary" />
          R$ {(Number(pack.price_brl) / pack.tokens).toFixed(3).replace('.', ',')} por token
        </li>
      </ul>

      <button
        onClick={onBuy}
        disabled={loading}
        className={`w-full h-11 rounded-full font-display font-semibold text-sm tracking-wider transition-all flex items-center justify-center gap-2 ${
          pack.highlight
            ? 'bg-primary text-primary-foreground box-glow hover:scale-[1.02]'
            : 'border border-border hover:border-primary/50 hover:bg-primary/5'
        } disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? 'Processando...' : 'Comprar'}
      </button>
    </div>
  );
}

function ReasonChip({ reason }: { reason: string }) {
  const map: Record<string, { label: string; color: string }> = {
    signup_grant:    { label: 'Bônus de cadastro', color: 'border-primary/40 bg-primary/10 text-primary' },
    cycle_open:      { label: 'Ciclo aberto',      color: 'border-border bg-secondary/40 text-muted-foreground' },
    pack_purchase:   { label: 'Compra de pacote',  color: 'border-accent/40 bg-accent/10 text-accent' },
    admin_grant:     { label: 'Crédito admin',     color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' },
    refund:          { label: 'Reembolso',         color: 'border-accent/40 bg-accent/10 text-accent' },
  };
  const m = map[reason] ?? { label: reason, color: 'border-border bg-secondary/40 text-muted-foreground' };
  return (
    <span className={`inline-block text-[11px] font-display tracking-wider px-2.5 py-1 rounded-md border ${m.color}`}>
      {m.label}
    </span>
  );
}
