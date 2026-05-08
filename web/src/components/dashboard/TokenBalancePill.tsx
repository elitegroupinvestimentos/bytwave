import { Coins, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTokens } from '../../hooks/useTokens';

export function TokenBalancePill({ userId }: { userId: string }) {
  const { balance, low, empty, loading, error } = useTokens(userId);

  let stateClasses = 'border-border';
  let dotClasses = 'bg-primary';
  let icon = <Coins className="w-4 h-4 text-primary" />;
  let label = `${balance} tokens`;

  if (loading) {
    label = '...';
  } else if (error) {
    stateClasses = 'border-yellow-500/40 bg-yellow-500/5';
    dotClasses = 'bg-yellow-500';
    icon = <AlertCircle className="w-4 h-4 text-yellow-500" />;
    label = 'erro';
  } else if (empty) {
    stateClasses = 'border-red-500/50 bg-red-500/10';
    dotClasses = 'bg-red-500 animate-pulse';
    icon = <AlertCircle className="w-4 h-4 text-red-400" />;
    label = '0 tokens';
  } else if (low) {
    stateClasses = 'border-yellow-500/50 bg-yellow-500/10';
    dotClasses = 'bg-yellow-500 animate-pulse';
    icon = <Coins className="w-4 h-4 text-yellow-400" />;
    label = `${balance} tokens`;
  }

  return (
    <Link
      to="/finance"
      className={`flex items-center gap-2 px-4 h-10 rounded-full border text-sm font-medium transition-all hover:scale-[1.02] ${stateClasses}`}
    >
      <span className={`w-2 h-2 rounded-full ${dotClasses}`} />
      {icon}
      <span className="font-mono tabular-nums">{label}</span>
    </Link>
  );
}
