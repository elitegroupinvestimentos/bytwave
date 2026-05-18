import { motion } from 'framer-motion';
import {
  Circle,
  Chrome,
  Facebook,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, setSession } from '../api/client';

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4';

const FONT = 'Inter, ui-sans-serif, system-ui, sans-serif';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError('Informe e-mail e senha.');
    setLoading(true);
    try {
      const res = await api.authLogin({ email: email.trim(), password });
      setSession({
        user_id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        token: res.token,
      });
      navigate('/dashboard');
    } catch (err: any) {
      if (err instanceof ApiError && err.body?.error === 'invalid_credentials') {
        setError('E-mail ou senha inválidos.');
      } else {
        setError(err?.message ?? 'Erro ao entrar.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4 text-white antialiased"
      style={{ fontFamily: FONT }}
    >
      {/* ─── LEFT (Hero + video) ─── */}
      <aside className="hidden lg:flex relative w-[52%] flex-col items-center justify-center px-12 rounded-3xl overflow-hidden shadow-2xl h-full">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
          }}
          className="relative z-10 w-full max-w-xs space-y-8"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
            className="flex items-center gap-2"
          >
            <Circle className="w-5 h-5 fill-white text-white" />
            <span className="text-xl font-semibold tracking-tight">Bytwave</span>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
            className="space-y-3"
          >
            <h1 className="text-4xl font-medium tracking-tight whitespace-nowrap">
              Bem-vindo de volta
            </h1>
            <p className="text-white/60 text-sm leading-relaxed px-4">
              Entre pra acompanhar seus ciclos e operar 24/7.
            </p>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
            className="space-y-2"
          >
            <Highlight icon={<Activity className="w-4 h-4" />} text="Bot rodando enquanto você dorme" />
            <Highlight icon={<ShieldCheck className="w-4 h-4" />} text="Proteção de drawdown ativa" />
            <Highlight icon={<Zap className="w-4 h-4" />} text="Hedge cycle automático" />
          </motion.div>
        </motion.div>
      </aside>

      {/* ─── RIGHT (Form) ─── */}
      <section className="flex-1 flex flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto lg:overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-xl space-y-8 lg:space-y-6 sm:space-y-10"
        >
          {/* Logo mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <Circle className="w-5 h-5 fill-white text-white" />
            <span className="text-lg font-semibold tracking-tight">Bytwave</span>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-3xl font-medium tracking-tight">Entrar</h2>
            <p className="text-white/40 text-sm">
              Acesse sua conta pra ver os ciclos abertos.
            </p>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-4">
            <SocialButton icon={<Chrome className="w-4 h-4" />} label="Google" />
            <SocialButton icon={<Facebook className="w-4 h-4" />} label="Facebook" />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">
                Ou
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <InputGroup
              label="E-mail"
              placeholder="voce@example.com"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              required
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-white">Senha</label>
                <a
                  href="#"
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  Esqueceu?
                </a>
              </div>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-brand-gray border-none rounded-xl h-11 px-4 pr-10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  aria-label="mostrar/ocultar senha"
                >
                  {show ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-14 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] mt-4 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <p className="text-center text-sm text-white/50 pt-2">
              Não tem conta?{' '}
              <Link to="/register" className="text-white hover:underline">
                Cadastrar
              </Link>
            </p>
          </form>
        </motion.div>
      </section>
    </main>
  );
}

// ─── Reusable components ─────────────────────────────────────

function Highlight({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white">
        {icon}
      </div>
      <span className="text-sm font-medium text-white/90">{text}</span>
    </div>
  );
}

function SocialButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 h-11 bg-black border border-white/10 rounded-xl hover:bg-white/5 text-sm font-medium transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function InputGroup({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-white">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full bg-brand-gray border-none rounded-xl h-11 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/20 focus:outline-none transition-shadow"
      />
    </div>
  );
}
