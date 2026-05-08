import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle?: string;
  accent?: 'accent' | 'red' | 'primary';
}

export function StatCard({ icon: Icon, label, value, subtitle, accent }: StatCardProps) {
  const valueColor =
    accent === 'accent'
      ? 'text-accent'
      : accent === 'red'
      ? 'text-red-400'
      : accent === 'primary'
      ? 'text-primary'
      : 'text-foreground';

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 md:p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        {label}
      </div>
      <div className={`font-display font-bold text-2xl md:text-3xl tracking-tight ${valueColor}`}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}
