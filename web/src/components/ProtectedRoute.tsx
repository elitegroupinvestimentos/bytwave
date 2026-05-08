import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';

/**
 * Rotas que exigem usuário logado. Sem sessão → /login.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useSession();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
