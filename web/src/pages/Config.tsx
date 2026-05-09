import { FormEvent, useEffect, useState } from 'react';
import { Settings, Key, Save, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { StrategyCalculator } from '../components/strategy/StrategyCalculator';
import { ApiError, api } from '../api/client';
import { useSession } from '../hooks/useSession';

const DEFAULT_SYMBOL = 'BTCUSDT';

export default function Config() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;

  const [symbol, setSymbol] = useState<string>(DEFAULT_SYMBOL);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgFeedback, setCfgFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Binance keys
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysFeedback, setKeysFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Status da conexão Binance
  const [binStatus, setBinStatus] = useState<{
    connected: boolean;
    keys: { mode: 'testnet' | 'production' }[];
  } | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      api
        .binanceStatus(userId)
        .then((d) => alive && setBinStatus({ connected: d.connected, keys: d.keys }))
        .catch(() => undefined);
    refresh();
    const id = setInterval(refresh, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId]);

  // Quando carregar, pega o símbolo da estratégia mais recente
  useEffect(() => {
    let alive = true;
    api
      .listStrategies(userId)
      .then((list) => {
        if (!alive || list.length === 0) return;
        const running = list.find((s) => s.status === 'running');
        setSymbol(running?.symbol ?? list[0].symbol);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [userId]);

  async function handleSaveStrategy(cfg: {
    symbol: string;
    capital_usdt: number;
    leverage: number;
    base_order_usdt: number;
    first_safety_usdt: number;
    max_safety_orders: number;
    initial_distance_pct: number;
    step_scale: number;
    volume_scale: number;
    target_profit_pct: number;
  }) {
    setSavingCfg(true);
    setCfgFeedback(null);
    try {
      await api.saveStrategy({ ...cfg, user_id: userId });
      setCfgFeedback({ ok: true, msg: 'Configuração salva.' });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setCfgFeedback({ ok: false, msg: msg ?? 'Erro ao salvar' });
    } finally {
      setSavingCfg(false);
    }
  }

  async function saveKeys(e: FormEvent) {
    e.preventDefault();
    if (!apiKey || !apiSecret) {
      setKeysFeedback({ ok: false, msg: 'Preencha API Key e Secret.' });
      return;
    }
    setSavingKeys(true);
    setKeysFeedback(null);
    try {
      await api.saveBinanceKeys({
        user_id: userId,
        mode: 'testnet',
        api_key: apiKey,
        api_secret: apiSecret,
      });
      setApiKey('');
      setApiSecret('');
      setKeysFeedback({ ok: true, msg: 'Chaves criptografadas e salvas.' });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setKeysFeedback({ ok: false, msg: msg ?? 'Erro ao salvar chaves' });
    } finally {
      setSavingKeys(false);
    }
  }

  return (
    <DashboardLayout title="Configurações">
      {binStatus && (
        <div
          className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
            binStatus.connected
              ? 'border-accent/40 bg-accent/10'
              : 'border-yellow-500/40 bg-yellow-500/10'
          }`}
        >
          {binStatus.connected ? (
            <CheckCircle2 className="w-5 h-5 text-accent" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          )}
          <div className="flex-1 text-sm">
            {binStatus.connected ? (
              <>
                <span className="font-semibold text-accent">Binance conectada</span>{' '}
                <span className="text-muted-foreground">
                  ({binStatus.keys.map((k) => k.mode).join(', ')})
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-yellow-300">Binance não conectada.</span>{' '}
                <span className="text-muted-foreground">Cadastre suas chaves abaixo.</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator de estratégia */}
        <StrategyCalculator
          symbol={symbol}
          onSymbolChange={setSymbol}
          onSave={handleSaveStrategy}
          saving={savingCfg}
          feedback={cfgFeedback}
        />

        {/* Binance keys */}
        <form
          onSubmit={saveKeys}
          className="rounded-2xl border border-border bg-card/40 p-5 md:p-6 space-y-5"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="w-4 h-4 text-primary" />
            Chaves Binance (Testnet)
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200/90">
            ⚠️ Use chaves do <strong>testnet</strong> primeiro: testnet.binancefuture.com.
            Suas chaves são criptografadas em AES-256-GCM antes de ir para o banco.
          </div>

          <div>
            <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
              API Key
            </label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="começa com letras/números"
              className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
              Secret Key
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 pr-10 outline-none focus:border-primary/50 transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                aria-label="mostrar/ocultar"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {keysFeedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
                keysFeedback.ok
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-red-500/40 bg-red-500/10 text-red-300'
              }`}
            >
              {keysFeedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {keysFeedback.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={savingKeys}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 box-glow flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingKeys ? 'Salvando...' : 'Salvar chaves'}
          </button>
        </form>
      </div>

      {/* Atalhos */}
      <div className="rounded-2xl border border-border bg-card/40 p-5 md:p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Settings className="w-4 h-4 text-primary" />
          Outras opções
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <a href="/finance" className="rounded-xl border border-border bg-secondary/30 px-4 py-3 hover:border-primary/40 transition-colors">
            Tokens / pacotes
          </a>
          <a href="/transactions" className="rounded-xl border border-border bg-secondary/30 px-4 py-3 hover:border-primary/40 transition-colors">
            Histórico de operações
          </a>
          <a href="/dashboard" className="rounded-xl border border-border bg-secondary/30 px-4 py-3 hover:border-primary/40 transition-colors">
            Voltar ao dashboard
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
