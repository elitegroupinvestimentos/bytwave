import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { admin, getAdminPassword, clearAdminPassword } from '../../api/admin';

/**
 * Wrapper que protege rotas /admin/*. Se senha não bater, redireciona pra /admin/login.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    const pwd = getAdminPassword();
    if (!pwd) {
      setState('denied');
      return;
    }
    admin
      .login(pwd)
      .then(() => setState('ok'))
      .catch(() => {
        clearAdminPassword();
        setState('denied');
      });
  }, []);

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Verificando acesso...
      </div>
    );
  }
  if (state === 'denied') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
