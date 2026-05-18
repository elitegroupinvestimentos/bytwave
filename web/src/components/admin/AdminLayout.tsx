import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutGrid,
  Users,
  Coins,
  Activity,
  Package,
  ScrollText,
  LogOut,
  AlertOctagon,
  Plug,
  Menu,
  X,
} from 'lucide-react';
import { LogoMark } from '../Logo';
import { clearAdminPassword } from '../../api/admin';

const items = [
  { to: '/admin',              icon: LayoutGrid, label: 'Visão geral' },
  { to: '/admin/users',        icon: Users,      label: 'Usuários' },
  { to: '/admin/transactions', icon: Coins,      label: 'Tokens' },
  { to: '/admin/cycles',       icon: Activity,   label: 'Ciclos' },
  { to: '/admin/packs',        icon: Package,    label: 'Pacotes' },
  { to: '/admin/logs',         icon: ScrollText, label: 'Logs' },
  { to: '/admin/integrations', icon: Plug,       label: 'Integrações' },
  { to: '/admin/danger',       icon: AlertOctagon, label: 'Zona de risco' },
];

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function logout() {
    clearAdminPassword();
    navigate('/admin/login');
  }

  const SidebarContent = (
    <>
      <div className="h-16 px-5 flex items-center justify-between md:justify-start gap-3 border-b border-border">
        <div className="flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <div>
            <div className="font-display font-bold text-sm leading-none">
              Byt<span className="gradient-text-primary">wave</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary/70 mt-0.5 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Admin
            </div>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(false)}
          className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-primary"
          aria-label="fechar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((it) => {
          const active = loc.pathname === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border border-transparent'
              }`}
            >
              <it.icon className="w-4 h-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        <div className="text-[9px] text-muted-foreground/60 mt-2 text-center">v0.1 admin</div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Overlay mobile */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          z-50 w-60 shrink-0 bg-card/95 md:bg-card/40 border-r border-border
          h-screen flex flex-col
          fixed md:sticky top-0 left-0
          transition-transform duration-300
          ${menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {SidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground"
              aria-label="abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-semibold text-base md:text-xl tracking-tight truncate">{title}</h1>
              <div className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">painel administrativo</div>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            ← <span className="hidden sm:inline">voltar para o app</span><span className="sm:hidden">app</span>
          </Link>
        </header>
        <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
