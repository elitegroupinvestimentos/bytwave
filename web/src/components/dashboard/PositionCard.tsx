import { TrendingUp, TrendingDown } from 'lucide-react';

export interface PositionData {
  side: 'LONG' | 'SHORT';
  leverage: number;
  marginType: 'Cross' | 'Isolated';
  qty: number;
  avgPrice: number;
  entry: number;
  pnlPct: number;
  unrealizedPnl: number;
  dca: number;
}

export function PositionCard({ data }: { data: PositionData }) {
  const isLong = data.side === 'LONG';
  const accent = isLong ? 'accent' : 'red';
  const Icon = isLong ? TrendingUp : TrendingDown;

  return (
    <div
      className={`relative rounded-2xl border p-6 ${
        isLong
          ? 'border-accent/20 bg-gradient-to-b from-accent/[0.03] to-card/40'
          : 'border-red-500/20 bg-gradient-to-b from-red-500/[0.03] to-card/40'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isLong ? 'bg-accent/10 text-accent' : 'bg-red-500/10 text-red-400'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div
              className={`font-display font-bold tracking-wider text-sm ${
                isLong ? 'text-accent' : 'text-red-400'
              }`}
            >
              {data.side}
            </div>
            <div className="text-xs text-muted-foreground">
              {data.leverage}x {data.marginType}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-display tracking-wider px-2.5 py-1 rounded-md border border-border bg-secondary/40 text-muted-foreground">
          {data.dca} DCA
        </span>
      </div>

      {/* Grid de métricas */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Metric label="QUANTIDADE" value={data.qty.toFixed(4)} />
        <Metric label="PREÇO MÉDIO" value={`$${formatPrice(data.avgPrice)}`} />
        <Metric label="ENTRADA" value={`$${formatPrice(data.entry)}`} />
        <Metric
          label="PNL %"
          value={`${data.pnlPct >= 0 ? '+' : ''}${data.pnlPct.toFixed(2)}%`}
          accent={accent}
        />
      </div>

      {/* PnL não realizado */}
      <div
        className={`rounded-xl p-4 flex items-center justify-between border ${
          isLong
            ? 'border-accent/20 bg-accent/[0.04]'
            : 'border-red-500/20 bg-red-500/[0.04]'
        }`}
      >
        <span className="text-sm text-muted-foreground">PnL Não Realizado</span>
        <span
          className={`font-mono font-semibold ${
            data.unrealizedPnl >= 0
              ? isLong ? 'text-accent' : 'text-red-400'
              : 'text-red-400'
          }`}
        >
          {data.unrealizedPnl >= 0 ? '+' : ''}${data.unrealizedPnl.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'accent' | 'red';
}) {
  const color =
    accent === 'accent' ? 'text-accent' : accent === 'red' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="rounded-xl bg-secondary/30 border border-border px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`font-display font-semibold text-base ${color}`}>{value}</div>
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}
