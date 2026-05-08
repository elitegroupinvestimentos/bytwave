import { useEffect, useState } from 'react';
import { getSession, Session } from '../api/client';

/**
 * Lê a sessão do localStorage e re-renderiza quando muda em outra aba (storage event).
 */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(() => getSession());

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'bytwave_session') setSession(getSession());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return session;
}
