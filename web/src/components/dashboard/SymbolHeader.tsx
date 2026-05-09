import { Activity, Pause, Play } from 'lucide-react';

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
    <div className="flex items-center justify-between gap-3 md:gap-4">
      <div className="flex items-center gap-2.5 md:gap-4 min-w-0 flex-1">
        <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 md:gap-3 flex-wrap">
            <h2 className="font-display font-bold text-base md:text-xl tracking-tight">{symbol}</h2>
            <span className="text-muted-foreground text-xs md:text-base">${formatPrice(price)}</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-[11px] md:text-sm flex-wrap">
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

      <StatusToggle status={status} onToggle={onToggle} />
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}

export const _icons = { Pause, Play };

/**
 * Toggle estilo switch com knob preto e label dentro:
 *  - running → fundo verde, knob à direita, "ATIVO" à esquerda
 *  - paused  → fundo amarelo, knob à esquerda, "PAUSADO" à direita
 *  - stopped → fundo escuro, knob à esquerda, "PARADO" à direita
 */
function StatusToggle({
  status,
  onToggle,
}: {
  status: 'running' | 'paused' | 'stopped';
  onToggle?: () => void;
}) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  const bgClass = isRunning
    ? 'bg-[#22c55e] shadow-[0_0_24px_-4px_rgba(34,197,94,0.55)]'
    : isPaused
    ? 'bg-[#facc15] shadow-[0_0_24px_-4px_rgba(250,204,21,0.45)]'
    : 'bg-secondary border border-border';

  const label = isRunning ? 'Ativo' : isPaused ? 'Pausado' : 'Parado';

  const labelClass =
    isRunning || isPaused
      ? 'text-[9px] font-display font-bold tracking-[0.15em] uppercase text-black/85 select-none'
      : 'text-[9px] font-display font-bold tracking-[0.15em] uppercase text-muted-foreground select-none';

  const knob = (
    <span className="w-5 h-5 rounded-full bg-black/85 shrink-0 transition-all" />
  );
  const labelNode = <span className={`flex-1 text-center px-1 ${labelClass}`}>{label}</span>;

  return (
    <button
      onClick={onToggle}
      type="button"
      className={`flex items-center gap-0.5 w-[88px] h-7 rounded-full p-1 shrink-0 transition-colors ${bgClass}`}
      title={`Clique para ${isRunning ? 'pausar' : 'iniciar'}`}
    >
      {isRunning ? (
        <>
          {labelNode}
          {knob}
        </>
      ) : (
        <>
          {knob}
          {labelNode}
        </>
      )}
    </button>
  );
}
