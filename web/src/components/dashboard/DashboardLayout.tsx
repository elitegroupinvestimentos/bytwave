import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LowTokensBanner } from './LowTokensBanner';
import { useSession } from '../../hooks/useSession';
import { useBinanceBalance } from '../../hooks/useBinanceBalance';

interface DashboardLayoutProps {
  title: string;
  /** @deprecated — DashboardLayout agora puxa saldo Binance sozinho */
  balance?: number;
  children: ReactNode;
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const bin = useBinanceBalance(session?.user_id ?? null);
  if (!session) return <Navigate to="/login" replace />;

  const initials =
    (session.name ?? session.email)
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  // Hook é a fonte de verdade. Prop antiga continua aceita só pra
  // não quebrar callers que ainda passem (mas o valor é ignorado).
  const balance = bin.total;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={props.title}
          userId={session.user_id}
          balance={balance}
          userName={session.name ?? session.email}
          userInitials={initials}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
          <LowTokensBanner userId={session.user_id} />
          {props.children}
        </main>
      </div>
    </div>
  );
}
