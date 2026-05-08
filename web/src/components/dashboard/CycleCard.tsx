import { Target } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CycleCardProps {
  cycleNumber: number;
  changePct: number;
  pnlAccount: number;
  status: 'running' | 'paused' | 'stopped';
  startedAt?: number; // timestamp ms
}

export function CycleCard({
  cycleNumber,
  changePct,
  pnlAccount,
  status,
  startedAt,
}: CycleCardProps) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsed(formatElapsed(Date.now() - startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

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

      <div className="flex items-end justify-between gap-6">
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

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
            Última atualização
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums">{elapsed}</div>
        </div>
      </div>
    </div>
  );
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
