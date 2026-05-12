import { Target } from 'lucide-react';

interface CycleCardProps {
  cycleNumber: number;
  changePct: number;
  pnlAccount: number;
  status: 'running' | 'paused' | 'stopped';
}

export function CycleCard({
  cycleNumber,
  changePct,
  pnlAccount,
  status,
}: CycleCardProps) {
  const positive = changePct >= 0;
  const statusLabel =
    status === 'running' ? 'ATIVO' : status === 'paused' ? 'PAUSADO' : 'PARADO';
  const statusColor =
    status === 'running'
      ? 'text-accent border-accent/30 bg-accent/10'
      : status === 'paused'
      ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
      : 'text-muted-foreground border-border bg-card/40';

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="w-4 h-4 text-primary" />
          Byts #{cycleNumber}
        </div>
        <span
          className={`text-[10px] font-display font-semibold tracking-wider px-2.5 py-1 rounded-md border ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      <div>
        <div
          className={`text-4xl md:text-5xl font-display font-bold tracking-tight ${
            positive ? 'text-accent' : 'text-red-400'
          }`}
        >
          {positive ? '+' : ''}
          {changePct.toFixed(3)}<span className="text-2xl">%</span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          PnL conta:{' '}
          <span className={pnlAccount >= 0 ? 'text-accent' : 'text-red-400'}>
            {pnlAccount >= 0 ? '+' : ''}${pnlAccount.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
