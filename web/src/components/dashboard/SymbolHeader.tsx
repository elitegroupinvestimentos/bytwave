import { Activity, Pause, Play, RefreshCw } from 'lucide-react';

interface SymbolHeaderProps {
  symbol: string;
  price: number;
  change24h: number;
  pnl: number;
  status: 'running' | 'paused' | 'stopped';
  onToggle?: () => void;
  onRefresh?: () => void;
}

export function SymbolHeader({
  symbol,
  price,
  change24h,
  pnl,
  status,
  onToggle,
  onRefresh,
}: SymbolHeaderProps) {
  const positive = change24h >= 0;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 md:gap-3 flex-wrap">
            <h2 className="font-display font-bold text-lg md:text-xl tracking-tight">{symbol}</h2>
            <span className="text-muted-foreground text-sm md:text-base">${formatPrice(price)}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm flex-wrap">
            <span className={positive ? 'text-accent' : 'text-red-400'}>
              {positive ? '+' : ''}
              {change24h.toFixed(2)}%
            </span>
            <span className="text-muted-foreground">
              PnL: <span className={pnl >= 0 ? 'text-accent' : 'text-red-400'}>
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-medium transition-all ${
            status === 'running'
              ? 'border-accent/50 bg-accent/10 text-accent'
              : status === 'paused'
              ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
              : 'border-border bg-card/40 text-muted-foreground'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${
            status === 'running' ? 'bg-accent animate-pulse' :
            status === 'paused'  ? 'bg-yellow-400' : 'bg-muted-foreground'
          }`} />
          {status === 'running' ? 'Ativo' : status === 'paused' ? 'Pausado' : 'Parado'}
        </button>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 h-10 px-4 rounded-full border border-border text-sm text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export const _icons = { Pause, Play };
