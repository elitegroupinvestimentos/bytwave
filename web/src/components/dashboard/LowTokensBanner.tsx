import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTokens } from '../../hooks/useTokens';

/**
 * Banner global que aparece quando o saldo está baixo ou zerado.
 * - empty: vermelho, mensagem forte, sem botão de fechar
 * - low: amarelo, mensagem amigável, dá pra fechar
 */
export function LowTokensBanner({ userId }: { userId: string }) {
  const { balance, low, empty, tokensPerCycle, loading, error } = useTokens(userId);
  const [dismissed, setDismissed] = useState(false);

  if (loading || error) return null;
  if (!low && !empty) return null;
  if (low && !empty && dismissed) return null;

  if (empty) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
        <div className="flex-1 text-sm">
          <span className="font-semibold text-red-300">Seus tokens acabaram.</span>{' '}
          <span className="text-red-200/90">
            Compre mais tokens para continuar utilizando a ferramenta. Operações automáticas estão bloqueadas.
          </span>
        </div>
        <Link
          to="/finance"
          className="shrink-0 px-4 py-1.5 rounded-full bg-red-500 hover:bg-red-400 text-white text-sm font-display font-semibold tracking-wider transition-colors"
        >
          Comprar tokens
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
      <div className="flex-1 text-sm">
        <span className="font-semibold text-yellow-300">Tokens acabando.</span>{' '}
        <span className="text-yellow-100/90">
          Você tem <span className="font-mono">{balance}</span> tokens
          {tokensPerCycle > 0 && ` (${Math.floor(balance / tokensPerCycle)} ciclos restantes)`}.
          Compre mais antes que acabe.
        </span>
      </div>
      <Link
        to="/finance"
        className="shrink-0 px-4 py-1.5 rounded-full border border-yellow-500/60 text-yellow-300 hover:bg-yellow-500/20 text-sm font-display font-semibold tracking-wider transition-colors"
      >
        Comprar
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-yellow-300/70 hover:text-yellow-300 transition-colors"
        aria-label="dispensar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
