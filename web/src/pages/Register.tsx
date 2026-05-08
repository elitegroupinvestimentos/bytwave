import { motion } from 'framer-motion';
import { UserPlus, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthBackground } from '../components/AuthBackground';
import { LogoMark } from '../components/Logo';
import { WaveArt } from '../components/WaveArt';
import { api, ApiError, setSession } from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não conferem.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.authRegister({
        email: email.trim(),
        name: name.trim() || undefined,
        password,
      });
      setSession({
        user_id: res.user.id,
        email: res.user.email,
        name: res.user.name,
        token: res.token,
      });
      navigate('/onboarding/binance');
    } catch (err: any) {
      if (err instanceof ApiError && err.body?.error === 'email_in_use') {
        setError('Já existe uma conta com esse e-mail. Faça login.');
      } else if (err instanceof ApiError && err.body?.details) {
        setError(err.body.details.map((d: any) => d.message).join(', '));
      } else {
        setError(err?.message ?? 'Erro ao criar conta.');
      }
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
        className="relative z-10 w-full max-w-md"
      >
        <div className="absolute -top-px left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-primary rounded-full blur-md opacity-80" />

        <div className="relative rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-8 md:p-10">
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2 mb-3">
              <LogoMark className="w-7 h-7 drop-shadow-[0_0_18px_rgba(26,213,230,0.5)]" />
              <span className="font-display font-bold text-xl tracking-tight">
                Byt<span className="gradient-text-primary">wave</span>
              </span>
            </div>
            <WaveArt className="w-20 -mt-1 -mb-2 opacity-90" />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-2">
              Criar sua conta
            </h1>
            <p className="text-sm text-muted-foreground">
              Cadastro grátis. Você ganha <span className="text-primary font-semibold">100 tokens</span> para começar.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Nome">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como prefere ser chamado"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none px-1 py-2 text-foreground placeholder:text-muted-foreground/60 transition-colors"
              />
            </Field>

            <Field label="E-mail">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none px-1 py-2 text-foreground placeholder:text-muted-foreground/60 transition-colors"
              />
            </Field>

            <Field label="Senha (mín. 8 caracteres)">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border-b border-border focus:border-primary outline-none px-1 py-2 pr-9 text-foreground placeholder:text-muted-foreground/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  aria-label="mostrar/ocultar senha"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field label="Confirmar senha">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-border focus:border-primary outline-none px-1 py-2 text-foreground placeholder:text-muted-foreground/60 transition-colors"
              />
            </Field>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password || !confirm}
              className="w-full flex items-center justify-center gap-2 font-display font-semibold text-sm tracking-wider rounded-full bg-primary text-primary-foreground py-3.5 transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed box-glow"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {loading ? 'Criando...' : 'Criar conta'}
            </button>

            <p className="text-center text-sm text-muted-foreground pt-2">
              Já tem conta?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
