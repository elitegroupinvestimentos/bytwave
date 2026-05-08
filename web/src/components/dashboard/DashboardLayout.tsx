import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { LowTokensBanner } from './LowTokensBanner';
import { useSession } from '../../hooks/useSession';

interface DashboardLayoutProps {
  title: string;
  balance?: number;
  children: ReactNode;
}

export function DashboardLayout(props: DashboardLayoutProps) {
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!session) return <Navigate to="/login" replace />;

  const initials =
    (session.name ?? session.email)
      .split(/[\s@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'U';

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={props.title}
          userId={session.user_id}
          balance={props.balance}
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
