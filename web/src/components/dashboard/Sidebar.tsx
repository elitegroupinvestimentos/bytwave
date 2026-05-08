import { ChevronLeft, LayoutGrid, ArrowLeftRight, TrendingUp, Megaphone, Settings, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { LogoMark } from '../Logo';

const items = [
  { to: '/dashboard',   icon: LayoutGrid,     label: 'Menu' },
  { to: '/transactions',icon: ArrowLeftRight, label: 'Transações' },
  { to: '/finance',     icon: TrendingUp,     label: 'Finance' },
  { to: '/marketing',   icon: Megaphone,      label: 'Marketing' },
  { to: '/config',      icon: Settings,       label: 'Config' },
];

interface SidebarProps {
  /** No mobile, controla se o drawer está aberto. Desktop ignora. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const loc = useLocation();

  return (
    <>
      {/* Overlay escuro (apenas mobile, quando drawer aberto) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar:
          - Desktop: sticky lateral
          - Mobile: drawer fixo, slide-in da esquerda */}
      <aside
        className={`
          z-50 bg-card/95 md:bg-card/40 border-r border-border flex flex-col
          fixed md:sticky top-0 left-0 h-screen w-60 md:w-20
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Topo */}
        <div className="h-16 flex items-center justify-between md:justify-center px-4 md:px-0 border-b border-border md:border-0">
          <div className="flex items-center gap-2 md:gap-0">
            <LogoMark className="w-9 h-9 drop-shadow-[0_0_18px_rgba(26,213,230,0.45)]" />
            <span className="md:hidden font-display font-bold text-lg tracking-tight">
              Byt<span className="gradient-text-primary">wave</span>
            </span>
          </div>
          {/* X só no mobile */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-primary"
            aria-label="fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botão recolher (só desktop) */}
        <button
          aria-label="recolher"
          className="hidden md:block self-start ml-3 mt-1 mb-3 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Itens */}
        <nav className="flex flex-col gap-1 p-2 md:px-2 md:py-0">
          {items.map((it) => {
            const active = loc.pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={onClose}
                className={`relative flex md:flex-col items-center gap-3 md:gap-1 px-3 md:px-2 py-3 rounded-xl text-sm md:text-[10px] tracking-wider md:uppercase font-display transition-all
                  ${active
                    ? 'bg-primary/10 text-primary border border-primary/40 shadow-[0_0_24px_-6px_rgba(26,213,230,0.5)]'
                    : 'text-muted-foreground border border-transparent hover:bg-card/60 hover:text-foreground'
                  }`}
              >
                <it.icon className={`w-5 h-5 ${active ? 'text-primary' : ''}`} />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pb-4 flex justify-center">
          <span className="text-[9px] text-muted-foreground/70">v0.1</span>
        </div>
      </aside>
    </>
  );
}
