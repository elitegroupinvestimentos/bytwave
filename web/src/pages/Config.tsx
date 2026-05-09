import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Settings,
  Key,
  Calculator,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Flame,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ApiError, api } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Navigate } from 'react-router-dom';

type RiskMode = 'conservador' | 'agressivo';

interface ManagementParams {
  leverage: number;
  base_order_usdt: number;
  first_safety_usdt: number;
  max_safety_orders: number;
  initial_distance_pct: number;
  step_scale: number;
  volume_scale: number;
  target_profit_pct: number;
}

const BO_MIN = 0.2;
const SO_MIN = 0.4;

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function computeParams(banca: number, mode: RiskMode): ManagementParams {
  const safe = Number.isFinite(banca) && banca > 0 ? banca : 0;
  if (mode === 'conservador') {
    return {
      leverage: 10,
      base_order_usdt: Math.max(BO_MIN, round2(safe * 0.003)),
      first_safety_usdt: Math.max(SO_MIN, round2(safe * 0.006)),
      max_safety_orders: 6,
      initial_distance_pct: 0.8,
      step_scale: 1.6,
      volume_scale: 1.5,
      target_profit_pct: 0.5,
    };
  }
  return {
    leverage: 12,
    base_order_usdt: Math.max(BO_MIN, round2(safe * 0.004)),
    first_safety_usdt: Math.max(SO_MIN, round2(safe * 0.008)),
    max_safety_orders: 5,
    initial_distance_pct: 0.6,
    step_scale: 1.5,
    volume_scale: 1.8,
    target_profit_pct: 0.6,
  };
}

const STORAGE_KEY = 'bytwave:config:calculator';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT'];
const PREVIEW_BANCAS = [50, 100, 1000, 5000];

export default function Config() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [banca, setBanca] = useState<number>(1000);
  const [mode, setMode] = useState<RiskMode>('agressivo');
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgFeedback, setCfgFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Binance keys form
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysFeedback, setKeysFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [binStatus, setBinStatus] = useState<{
    connected: boolean;
    keys: { mode: 'testnet' | 'production'; created_at: string }[];
  } | null>(null);

  const params = useMemo(() => computeParams(banca, mode), [banca, mode]);

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

  // Hidrata: 1) localStorage 2) última estratégia salva (capital_usdt fica na banca)
  useEffect(() => {
    let alive = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.banca === 'number') setBanca(v.banca);
        if (v.mode === 'conservador' || v.mode === 'agressivo') setMode(v.mode);
        if (typeof v.symbol === 'string') setSymbol(v.symbol);
      }
    } catch {
      // ignore
    }

    async function load() {
      try {
        const list = await api.listStrategies(userId);
        if (!alive) return;
        if (list.length === 0) {
          setLoadingCfg(false);
          return;
        }
        const running = list.find((s) => s.status === 'running');
        const target = running?.symbol ?? list[0].symbol;
        const data: any = await api.getStrategy(userId, target);
        if (alive) {
          setSymbol(data.symbol ?? 'BTCUSDT');
          if (typeof data.capital_usdt === 'number' && data.capital_usdt > 0) {
            setBanca(data.capital_usdt);
          }
        }
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

  // Persiste localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ banca, mode, symbol }));
    } catch {
      // ignore
    }
  }, [banca, mode, symbol]);

  async function saveStrategy(e: FormEvent) {
    e.preventDefault();
    if (!banca || banca <= 0) {
      setCfgFeedback({ ok: false, msg: 'Informe um valor de banca > 0.' });
      return;
    }
    setSavingCfg(true);
    setCfgFeedback(null);
    try {
      await api.saveStrategy({
        user_id: userId,
        symbol,
        capital_usdt: banca,
        ...params,
      });
      setCfgFeedback({ ok: true, msg: 'Gerenciamento salvo. Próximo tick aplica.' });
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
        {/* Calculator */}
        <form
          onSubmit={saveStrategy}
          className="rounded-2xl border border-border bg-card/40 p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calculator className="w-4 h-4 text-primary" />
              Gerenciamento automático
            </div>
            <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary">
              Auto-calc
            </span>
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
              Ativo
            </label>
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
              className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SYMBOLS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymbol(s)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors ${
                    symbol === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Banca */}
          <div>
            <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
              Valor da banca (USDT)
            </label>
            <input
              type="number"
              step={1}
              min={0}
              value={banca}
              onChange={(e) => setBanca(Number(e.target.value))}
              placeholder="1000"
              className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PREVIEW_BANCAS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBanca(b)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors ${
                    banca === b
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  ${b}
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
              Modo de risco
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ModeButton
                active={mode === 'conservador'}
                onClick={() => setMode('conservador')}
                color="green"
                icon={<Shield className="w-4 h-4" />}
                title="Conservador"
                subtitle="menor risco · sobrevivência"
              />
              <ModeButton
                active={mode === 'agressivo'}
                onClick={() => setMode('agressivo')}
                color="red"
                icon={<Flame className="w-4 h-4" />}
                title="Agressivo"
                subtitle="maior lucro · maior risco"
              />
            </div>
          </div>

          {/* Preview cards */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Parâmetros calculados
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Alavancagem" value={`${params.leverage}x`} />
              <Stat label="Target Profit" value={`${params.target_profit_pct}%`} />
              <Stat label="Base Order" value={`$${params.base_order_usdt}`} highlight />
              <Stat label="1ª Safety" value={`$${params.first_safety_usdt}`} highlight />
              <Stat label="Max Safety" value={`${params.max_safety_orders}`} />
              <Stat label="Distância" value={`${params.initial_distance_pct}%`} />
              <Stat label="Step Scale" value={`${params.step_scale}`} />
              <Stat label="Volume Scale" value={`${params.volume_scale}`} />
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              Gerenciamento calculado automaticamente proporcional à sua banca.
              BO é tratado como margem — notional efetivo na corretora ≈ BO × alavancagem.
            </p>
          </div>

          {cfgFeedback && <Feedback ok={cfgFeedback.ok} msg={cfgFeedback.msg} />}

          <button
            type="submit"
            disabled={loadingCfg || savingCfg}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 box-glow flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingCfg ? 'Salvando...' : 'Salvar gerenciamento'}
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

function ModeButton({
  active,
  onClick,
  color,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  color: 'green' | 'red';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const cls = active
    ? color === 'green'
      ? 'border-accent/60 bg-accent/10 text-accent'
      : 'border-red-500/60 bg-red-500/10 text-red-300'
    : 'border-border bg-secondary/20 text-muted-foreground hover:border-primary/40';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-left transition-all ${cls}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="text-[11px] mt-0.5 text-muted-foreground/80">{subtitle}</div>
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-card/40'
      }`}
    >
      <div className="text-[9px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground/70">
        {label}
      </div>
      <div className={`text-sm font-mono ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </div>
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
