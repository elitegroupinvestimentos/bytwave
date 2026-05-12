import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useBinanceBalance } from '../hooks/useBinanceBalance';
import {
  Settings,
  Key,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Shield,
  Flame,
  HelpCircle,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { ApiError, api } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Navigate } from 'react-router-dom';
import {
  computeParams,
  validateBanca,
  validateParams,
  MIN_BANCA_USDT,
  type RiskMode,
} from '../lib/management';
import { HowItWorksModal } from '../components/config/HowItWorksModal';

const STORAGE_KEY = 'bytwave:config:mode';
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT'];

export default function Config() {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  const userId = session.user_id;

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [mode, setMode] = useState<RiskMode>('agressivo');
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [savingCfg, setSavingCfg] = useState(false);
  const [cfgFeedback, setCfgFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const bin = useBinanceBalance(userId);
  const banca = bin.total;
  const loadingBalance = bin.loading;

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

  // Carrega: 1) localStorage (modo + ativo) 2) estratégia salva (ativo)
  useEffect(() => {
    let alive = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
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
        if (alive) setSymbol(data.symbol ?? 'BTCUSDT');
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

  // Persiste só modo + ativo (banca é auto da Binance)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, symbol }));
    } catch {
      // ignore
    }
  }, [mode, symbol]);

  const fetchBalance = bin.refetch;

  const bancaCheck = useMemo(() => validateBanca(banca), [banca]);
  const paramsCheck = useMemo(() => validateParams(params), [params]);
  const canSave = bancaCheck.ok && paramsCheck.ok;

  async function saveStrategy(e: FormEvent) {
    e.preventDefault();
    if (!bancaCheck.ok) {
      setCfgFeedback({ ok: false, msg: bancaCheck.msg ?? 'Banca inválida.' });
      return;
    }
    if (!paramsCheck.ok) {
      setCfgFeedback({ ok: false, msg: paramsCheck.msg ?? 'Parâmetros inválidos.' });
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
                  — chaves criptografadas e prontas pra operar.
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
        {/* Modalidade */}
        <form
          onSubmit={saveStrategy}
          className="rounded-2xl border border-border bg-card/40 p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Settings className="w-4 h-4 text-primary" />
              Modalidade do bot
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
              Como funciona
            </button>
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

          {/* Banca auto-detectada */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                Banca detectada (Binance)
              </div>
              <button
                type="button"
                onClick={fetchBalance}
                disabled={!binStatus?.connected || loadingBalance}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingBalance ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
            <div className="text-2xl font-mono font-semibold text-foreground">
              ${banca.toFixed(2)} <span className="text-xs text-muted-foreground">USDT</span>
            </div>
            {!binStatus?.connected ? (
              <p className="mt-1 text-[11px] text-yellow-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Conecte a Binance pra detectar a banca automaticamente.
              </p>
            ) : !bancaCheck.ok ? (
              <p className="mt-1 text-[11px] text-yellow-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Banca abaixo do mínimo (${MIN_BANCA_USDT} USDT). Deposite mais saldo na Binance.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                O sistema usa esse valor pra dimensionar todas as ordens.
              </p>
            )}
          </div>

          {/* Mode cards (sem números) */}
          <div className="space-y-2">
            <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground">
              Escolha a modalidade
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <ModeCard
                active={mode === 'conservador'}
                onClick={() => setMode('conservador')}
                kind="conservador"
              />
              <ModeCard
                active={mode === 'agressivo'}
                onClick={() => setMode('agressivo')}
                kind="agressivo"
              />
            </div>
          </div>

          {!paramsCheck.ok && bancaCheck.ok && (
            <Feedback ok={false} msg={paramsCheck.msg ?? 'Parâmetros inválidos pra esse ativo.'} />
          )}
          {cfgFeedback && <Feedback ok={cfgFeedback.ok} msg={cfgFeedback.msg} />}

          <button
            type="submit"
            disabled={loadingCfg || savingCfg || !canSave}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed box-glow flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {savingCfg ? 'Aplicando...' : 'Aplicar modalidade'}
          </button>
        </form>

        <HowItWorksModal open={helpOpen} onClose={() => setHelpOpen(false)} />

        {/* Binance keys */}
        <form
          onSubmit={saveKeys}
          className="rounded-2xl border border-border bg-card/40 p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Key className="w-4 h-4 text-primary" />
              Chaves Binance
            </div>
            {binStatus?.connected && (
              <span className="text-[10px] font-display font-semibold tracking-[0.2em] uppercase px-2 py-1 rounded-md border border-accent/40 bg-accent/10 text-accent flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Salva
              </span>
            )}
          </div>

          {binStatus?.connected && binStatus.keys.length > 0 ? (
            <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-xs space-y-1">
              <div className="flex items-center gap-2 text-accent font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Chave salva e ativa
              </div>
              {binStatus.keys.map((k, i) => (
                <div key={i} className="text-muted-foreground">
                  Cadastrada em{' '}
                  <span className="font-mono text-foreground">
                    {new Date(k.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
              <div className="text-muted-foreground/70 pt-1">
                Pra trocar, cole novas chaves abaixo e salve — a anterior é substituída automaticamente.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200/90">
              ⚠️ Suas chaves são criptografadas em AES-256-GCM antes de ir para o banco.
            </div>
          )}

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

function ModeCard({
  active,
  onClick,
  kind,
}: {
  active: boolean;
  onClick: () => void;
  kind: RiskMode;
}) {
  const isCons = kind === 'conservador';
  const title = isCons ? 'Conservador' : 'Agressivo';
  const subtitle = isCons
    ? 'Mais segurança e menor exposição'
    : 'Mais rentabilidade e maior exposição';
  const tag = isCons ? 'SAFE MODE' : 'HIGHER PROFITS';
  const Icon = isCons ? Shield : Flame;

  const activeBorder = isCons ? 'border-accent bg-accent/10' : 'border-red-500 bg-red-500/10';
  const activeText = isCons ? 'text-accent' : 'text-red-300';
  const tagCls = isCons
    ? 'border-accent/40 text-accent'
    : 'border-red-500/40 text-red-300';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative rounded-xl border-2 p-4 text-left transition-all ${
        active
          ? `${activeBorder} shadow-[0_0_0_1px_rgba(255,255,255,0.05)]`
          : 'border-border bg-secondary/20 hover:border-primary/40'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-2 text-sm font-semibold ${active ? activeText : 'text-foreground'}`}>
          <Icon className="w-4 h-4" />
          {title}
        </div>
        <span
          className={`text-[9px] font-display font-semibold tracking-[0.2em] uppercase border rounded-full px-2 py-0.5 ${
            active ? tagCls : 'border-border text-muted-foreground'
          }`}
        >
          {tag}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">{subtitle}</p>
      {active && (
        <div className={`absolute top-2 right-2 ${activeText}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
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
