import { Wallet } from 'lucide-react';

interface BankUsageProps {
  capitalAllocated: number;
  marginInUse: number;
  totalCapital: number;
}

export function BankUsage({ capitalAllocated, marginInUse, totalCapital }: BankUsageProps) {
  const allocPct = totalCapital > 0 ? (capitalAllocated / totalCapital) * 100 : 0;
  const marginPct = totalCapital > 0 ? (marginInUse / totalCapital) * 100 : 0;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5">
        <Wallet className="w-4 h-4 text-primary" />
        Uso da Banca
      </div>

      <div className="space-y-5">
        <Bar
          label="CAPITAL ALOCADO"
          value={`$${capitalAllocated.toFixed(2)}`}
          pct={allocPct}
          color="primary"
        />
        <Bar
          label="MARGEM EM USO"
          value={`$${marginInUse.toFixed(2)}`}
          pct={marginPct}
          color="accent"
        />
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: string;
  pct: number;
  color: 'primary' | 'accent';
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-sm">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary/40 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            color === 'primary' ? 'bg-primary' : 'bg-accent'
          } transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">{pct.toFixed(1)}%</div>
    </div>
  );
}
