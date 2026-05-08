import { useEffect, useState } from 'react';
import { Users, Activity, Coins, ShoppingCart, TrendingUp, Wallet, Layers, Package } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin, AdminOverview } from '../../api/admin';

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => admin.overview().then((d) => alive && setData(d)).catch(() => undefined);
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <AdminLayout title="Visão Geral">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={Users}        label="Usuários cadastrados" value={data?.total_users ?? 0} accent="primary" />
        <Kpi icon={Activity}     label="Ciclos abertos"        value={data?.open_cycles ?? 0} accent="accent" />
        <Kpi icon={Layers}       label="Ciclos fechados"       value={data?.closed_cycles ?? 0} />
        <Kpi icon={TrendingUp}   label="PnL realizado total" value={fmtUsdt(data?.realized_pnl_usdt ?? 0)} accent={(data?.realized_pnl_usdt ?? 0) >= 0 ? 'accent' : 'red'} />

        <Kpi icon={Coins}        label="Tokens em circulação" value={data?.total_tokens_in_circulation ?? 0} accent="primary" />
        <Kpi icon={ShoppingCart} label="Tokens vendidos"      value={data?.total_tokens_purchased ?? 0} />
        <Kpi icon={Coins}        label="Tokens consumidos"    value={data?.total_tokens_consumed ?? 0} accent="red" />
        <Kpi icon={Package}      label="Pacotes ativos"        value={data?.active_packs ?? 0} />
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Wallet className="w-4 h-4 text-primary" />
          Snapshot mais recente da Binance
        </div>
        {data?.last_balance_snapshot ? (
          <div className="font-mono text-2xl font-display font-bold">
            ${Number(data.last_balance_snapshot.total_balance).toFixed(2)}{' '}
            <span className="text-sm text-muted-foreground font-sans font-normal">
              em saldo total dos usuários
            </span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Sem snapshots ainda. Snapshots são criados pelo worker a cada tick.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
  label: string;
  value: number | string;
  accent?: 'primary' | 'accent' | 'red';
}) {
  const color =
    accent === 'primary'
      ? 'text-primary'
      : accent === 'accent'
      ? 'text-accent'
      : accent === 'red'
      ? 'text-red-400'
      : 'text-foreground';
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`font-display font-bold text-2xl md:text-3xl tracking-tight ${color}`}>
        {value}
      </div>
    </div>
  );
}

function fmtUsdt(v: number) {
  return `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`;
}
