import { FormEvent, useEffect, useState } from 'react';
import { Settings, Key, Sliders, Save, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ApiError, api } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Navigate } from 'react-router-dom';

interface StrategyConfig {
  id?: string;
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
  status?: string;
}

const DEFAULT_CONFIG: StrategyConfig = {
  symbol: 'BTCUSDT',
  capital_usdt: 5000,
  leverage: 12,
  base_order_usdt: 60,
  first_safety_usdt: 120,
  max_safety_orders: 5,
  initial_distance_pct: 0.6,
  step_scale: 1.5,
  volume_scale: 1.8,
  target_profit_pct: 0.6,
};

export default function Config() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;
  const [cfg, setCfg] = useState<StrategyConfig>(DEFAULT_CONFIG);
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgFeedback, setCfgFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Binance keys form
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysFeedback, setKeysFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Status atual da conexão Binance (read-only)
  const [binStatus, setBinStatus] = useState<{
    connected: boolean;
    keys: { mode: 'testnet' | 'production'; created_at: string }[];
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

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        // Carrega a estratégia MAIS RECENTE (ou a que está running).
        // Se não tiver nenhuma, mantém os defaults.
        const list = await api.listStrategies(userId);
        if (!alive) return;
        if (list.length === 0) {
          setLoadingCfg(false);
          return;
        }
        const running = list.find((s) => s.status === 'running');
        const target = running?.symbol ?? list[0].symbol;
        const data = await api.getStrategy(userId, target);
        if (alive) setCfg({ ...DEFAULT_CONFIG, ...data });
      } catch {
        // ignora
      } finally {
        if (alive) setLoadingCfg(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [userId]);

  async function saveStrategy(e: FormEvent) {
    e.preventDefault();
    setSavingCfg(true);
    setCfgFeedback(null);
    try {
      const saved = await api.saveStrategy({ ...cfg, user_id: userId });
      setCfg({ ...cfg, ...saved });
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
      {/* Status de conexão Binance (read-only) */}
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
                  ({binStatus.keys.map((k) => k.mode).join(', ')}) — chaves criptografadas e prontas pra operar.
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-yellow-300">Binance não conectada.</span>{' '}
                <span className="text-muted-foreground">
                  Cadastre suas chaves abaixo para o bot conseguir operar.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estratégia */}
        <form
          onSubmit={saveStrategy}
          className="rounded-2xl border border-border bg-card/40 p-6 space-y-5"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sliders className="w-4 h-4 text-primary" />
            Estratégia (Hedge Cycle)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
                Símbolo <span className="lowercase normal-case text-muted-foreground/70 tracking-normal">— sempre termina em USDT</span>
              </label>
              <input
                value={cfg.symbol}
                onChange={(e) => setCfg({ ...cfg, symbol: e.target.value.toUpperCase() })}
                placeholder="BTCUSDT"
                className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setCfg({ ...cfg, symbol: s })}
                    className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors ${
                      cfg.symbol === s
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <Field
              label="Capital (USDT)"
              type="number"
              value={cfg.capital_usdt}
              onChange={(v) => setCfg({ ...cfg, capital_usdt: Number(v) })}
            />
            <Field
              label="Alavancagem"
              type="number"
              value={cfg.leverage}
              onChange={(v) => setCfg({ ...cfg, leverage: Number(v) })}
            />
            <Field
              label="Max Safety Orders"
              type="number"
              value={cfg.max_safety_orders}
              onChange={(v) => setCfg({ ...cfg, max_safety_orders: Number(v) })}
            />
            <Field
              label="Base Order (USDT)"
              type="number"
              value={cfg.base_order_usdt}
              onChange={(v) => setCfg({ ...cfg, base_order_usdt: Number(v) })}
            />
            <Field
              label="1ª Safety (USDT)"
              type="number"
              value={cfg.first_safety_usdt}
              onChange={(v) => setCfg({ ...cfg, first_safety_usdt: Number(v) })}
            />
            <Field
              label="Distância inicial (%)"
              type="number"
              step={0.1}
              value={cfg.initial_distance_pct}
              onChange={(v) => setCfg({ ...cfg, initial_distance_pct: Number(v) })}
            />
            <Field
              label="Step Scale"
              type="number"
              step={0.1}
              value={cfg.step_scale}
              onChange={(v) => setCfg({ ...cfg, step_scale: Number(v) })}
            />
            <Field
              label="Volume Scale"
              type="number"
              step={0.1}
              value={cfg.volume_scale}
              onChange={(v) => setCfg({ ...cfg, volume_scale: Number(v) })}
            />
            <Field
              label="Target Profit (%)"
              type="number"
              step={0.1}
              value={cfg.target_profit_pct}
              onChange={(v) => setCfg({ ...cfg, target_profit_pct: Number(v) })}
            />
          </div>

          {cfgFeedback && (
            <Feedback ok={cfgFeedback.ok} msg={cfgFeedback.msg} />
          )}

          <button
            type="submit"
            disabled={loadingCfg || savingCfg}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 box-glow flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingCfg ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </form>

        {/* Binance keys */}
        <form
          onSubmit={saveKeys}
          className="rounded-2xl border border-border bg-card/40 p-6 space-y-5"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="w-4 h-4 text-primary" />
            Chaves Binance (Testnet)
          </div>

          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200/90">
            ⚠️ Use chaves do <strong>testnet</strong> primeiro: testnet.binancefuture.com.
            Suas chaves são criptografadas em AES-256-GCM antes de ir para o banco.
          </div>

          <Field
            label="API Key"
            value={apiKey}
            onChange={setApiKey}
            placeholder="começa com letras/números"
          />

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

          {keysFeedback && <Feedback ok={keysFeedback.ok} msg={keysFeedback.msg} />}

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
      <div className="rounded-2xl border border-border bg-card/40 p-6">
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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
  hint,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
        {label} {hint && <span className="lowercase normal-case text-muted-foreground/70 tracking-normal">— {hint}</span>}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
      />
    </div>
  );
}

function Feedback({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
        ok
          ? 'border-accent/40 bg-accent/10 text-accent'
          : 'border-red-500/40 bg-red-500/10 text-red-300'
      }`}
    >
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg}
    </div>
  );
}
