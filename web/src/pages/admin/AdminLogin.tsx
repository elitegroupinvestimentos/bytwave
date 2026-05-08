import { FormEvent, useState } from 'react';
import { Shield, LogIn, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { admin, setAdminPassword } from '../../api/admin';
import { LogoMark } from '../../components/Logo';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Tenta login: salva temporariamente, chama /login, se falhar limpa.
      setAdminPassword(pwd);
      await admin.login(pwd);
      navigate('/admin');
    } catch {
      setError('Senha inválida.');
      setAdminPassword('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative bg-background flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-[140px] pointer-events-none" />

      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card/70 backdrop-blur-xl p-8 md:p-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <LogoMark className="w-7 h-7" />
            <span className="font-display font-bold text-xl tracking-tight">
              Byt<span className="gradient-text-primary">wave</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-3">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display font-bold text-xl tracking-tight">Painel Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Acesso restrito — senha de administrador
          </p>
        </div>

        <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
          Senha
        </label>
        <input
          type="password"
          autoFocus
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
        />

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-sm flex items-center gap-2 px-3 py-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !pwd}
          className="mt-6 w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.02] transition-all disabled:opacity-60 box-glow flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
