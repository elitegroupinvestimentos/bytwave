import { motion } from 'framer-motion';
import { Eye, EyeOff, Key, Loader2, CheckCircle2, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AuthBackground } from '../components/AuthBackground';
import { LogoMark } from '../components/Logo';
import { api, ApiError } from '../api/client';
import { useSession } from '../hooks/useSession';

/**
 * Tela de onboarding: o usuário acabou de criar conta — pede pra
 * conectar a Binance Testnet antes de entrar no dashboard.
 *
 * Salva as chaves criptografadas no backend e em seguida valida
 * batendo na Binance pra confirmar que funcionam (busca saldo).
 */
export default function OnboardingBinance() {
  const session = useSession();
  const navigate = useNavigate();

  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [mode, setMode] = useState<'testnet' | 'production'>('testnet');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'validating' | 'success'>('form');
  const [balance, setBalance] = useState<{ total: number; available: number } | null>(null);

  if (!session) return <Navigate to="/login" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('Preencha API Key e Secret Key.');
      return;
    }
    if (!session) return;
    setLoading(true);
    try {
      // 1) Salvar (já criptografa AES-256-GCM no backend)
      await api.saveBinanceKeys({
        user_id: session.user_id,
        mode,
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        label: `Onboarding ${mode}`,
      });

      // 2) Validar buscando saldo
      setStep('validating');
      const result = await api.testBinance(session.user_id);
      setBalance({ total: result.total, available: result.available });
      setStep('success');
    } catch (err: any) {
      setStep('form');
      const msg = err instanceof ApiError ? err.body?.error ?? err.body?.message ?? err.message : err?.message;
      setError(`Não conseguimos conectar: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative bg-background flex items-center justify-center px-4 py-10 overflow-hidden">
      <AuthBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-8 md:p-10">
          <div className="flex items-center gap-2 mb-2">
            <LogoMark className="w-7 h-7" />
            <span className="font-display font-bold text-xl tracking-tight">
              Byt<span className="gradient-text-primary">wave</span>
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Olá, <span className="text-foreground">{session.name ?? session.email}</span>
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-3 mt-4 mb-6">
            <Step n={1} label="Cadastro" done />
            <Connector />
            <Step n={2} label="Conectar Binance" active={step !== 'success'} done={step === 'success'} />
            <Connector />
            <Step n={3} label="Operar" upcoming={step !== 'success'} active={step === 'success'} />
          </div>

          {step === 'success' ? (
            <SuccessView balance={balance} onContinue={() => navigate('/dashboard')} />
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-2">
                Conecte sua Binance
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Suas chaves são criptografadas em <span className="text-foreground">AES-256-GCM</span> antes de serem
                salvas.
              </p>

              {/* Tutorial colapsado */}
              <details className="rounded-xl border border-border bg-secondary/20 px-4 py-3 mb-5 text-sm">
                <summary className="cursor-pointer font-medium flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Como gerar suas chaves
                </summary>
                <ol className="mt-3 space-y-2 text-muted-foreground list-decimal list-inside">
                  <li>
                    Acesse{' '}
                    <a
                      href="https://testnet.binancefuture.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      testnet.binancefuture.com <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    e faça login (GitHub ou Google).
                  </li>
                  <li>Role até embaixo no painel de trading e ache "API Key".</li>
                  <li>Clique em <strong>Generate</strong>. Anote a <strong>API Key</strong> e a <strong>Secret Key</strong>.</li>
                  <li>Cole as duas nos campos abaixo e clique em <strong>Conectar</strong>.</li>
                </ol>
              </details>

              <form onSubmit={onSubmit} className="space-y-5">
                {/* Toggle modo */}
                <div className="flex gap-2">
                  {(['testnet', 'production'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2 text-xs font-display tracking-wider uppercase rounded-full border transition-colors ${
                        mode === m
                          ? m === 'testnet'
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {m === 'testnet' ? 'Modo demo (recomendado)' : 'Produção (real)'}
                    </button>
                  ))}
                </div>
                {mode === 'production' && (
                  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200/90 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    Você está conectando uma conta REAL. Habilite somente "Enable Futures" e nunca permita saques pela API.
                  </div>
                )}

                <Field
                  label="API Key"
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder="cole aqui sua API Key"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-sm flex items-center gap-2 px-3 py-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 box-glow flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {step === 'validating' ? 'Validando saldo...' : loading ? 'Salvando...' : 'Conectar Binance'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Pular por agora (você não conseguirá operar até conectar)
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </main>
  );
}

function SuccessView({
  balance,
  onContinue,
}: {
  balance: { total: number; available: number } | null;
  onContinue: () => void;
}) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mb-5">
        <CheckCircle2 className="w-8 h-8 text-accent" />
      </div>
      <h2 className="font-display font-bold text-2xl tracking-tight mb-2">Tudo certo!</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Conectamos sua Binance com sucesso e validamos o saldo.
      </p>
      {balance && (
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-7">
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Total</div>
            <div className="font-mono text-xl font-display font-bold">${balance.total.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Disponível</div>
            <div className="font-mono text-xl font-display font-bold text-accent">${balance.available.toFixed(2)}</div>
          </div>
        </div>
      )}
      <button
        onClick={onContinue}
        className="px-7 h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.02] transition-all box-glow"
      >
        Ir para o painel →
      </button>
    </div>
  );
}

function Step({
  n,
  label,
  active,
  done,
  upcoming,
}: {
  n: number;
  label: string;
  active?: boolean;
  done?: boolean;
  upcoming?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold ${
          done
            ? 'bg-accent/20 border border-accent/50 text-accent'
            : active
            ? 'bg-primary/20 border border-primary text-primary'
            : upcoming
            ? 'border border-border text-muted-foreground'
            : 'border border-border text-muted-foreground'
        }`}
      >
        {done ? '✓' : n}
      </div>
      <span
        className={`text-xs font-display tracking-wider uppercase ${
          done ? 'text-accent' : active ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function Connector() {
  return <div className="flex-1 h-px bg-border" />;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
      />
    </div>
  );
}
