import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin } from '../../api/admin';

type Status = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

interface PaymentRow {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  provider: string;
  payment_id: string;
  credits: number;
  usd_amount: number;
  status: Status;
  confirmed_at: string | null;
  created_at: string;
}

interface Stats {
  today: { count: number; usd: number; credits: number };
  last_7d: { count: number; usd: number; credits: number };
  month: { count: number; usd: number; credits: number };
  pending: { count: number; usd: number; credits: number };
  failed_month: { count: number; usd: number; credits: number };
}

export default function AdminPayments() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [marking, setMarking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [list, st] = await Promise.all([
        admin.payments({
          status: statusFilter || undefined,
          search: search.trim() || undefined,
          start: start ? new Date(start + 'T00:00:00').toISOString() : undefined,
          end: end ? new Date(end + 'T23:59:59').toISOString() : undefined,
          limit: 300,
        }),
        admin.paymentsStats(),
      ]);
      setRows(list);
      setStats(st);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mark(id: string, status: string) {
    const note = prompt('Observação (opcional):') ?? undefined;
    if (status === 'CONFIRMED') {
      if (!confirm('Marcar como CONFIRMED vai creditar os tokens. Confirma?')) return;
    }
    setMarking(id);
    try {
      await admin.paymentMark(id, { status, note });
      await load();
    } catch (err: any) {
      alert('Erro: ' + (err?.message ?? 'falha ao marcar'));
    } finally {
      setMarking(null);
    }
  }

  return (
    <AdminLayout title="Pagamentos">
      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            icon={Calendar}
            color="primary"
            label="Hoje (confirmados)"
            value={`$${stats.today.usd.toFixed(2)}`}
            subtitle={`${stats.today.count} pagamento(s) · +${stats.today.credits} créditos`}
          />
          <StatCard
            icon={TrendingUp}
            color="primary"
            label="Últimos 7 dias"
            value={`$${stats.last_7d.usd.toFixed(2)}`}
            subtitle={`${stats.last_7d.count} pagamento(s)`}
          />
          <StatCard
            icon={CreditCard}
            color="primary"
            label="Mês atual"
            value={`$${stats.month.usd.toFixed(2)}`}
            subtitle={`${stats.month.count} confirmado(s) · +${stats.month.credits} créditos`}
          />
          <StatCard
            icon={Clock}
            color="yellow"
            label="Pendentes"
            value={`${stats.pending.count}`}
            subtitle={`$${stats.pending.usd.toFixed(2)} em aberto`}
          />
          <StatCard
            icon={XCircle}
            color="red"
            label="Falha / expirado (mês)"
            value={`${stats.failed_month.count}`}
            subtitle={`$${stats.failed_month.usd.toFixed(2)}`}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-2xl border border-border bg-card/40 p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Email, nome ou payment ID..."
            className="w-full bg-secondary/40 border border-border rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary/50"
          >
            <option value="">Todos</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">De</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Até</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-secondary/40 border border-border rounded-md px-2 py-1.5 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={load}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aplicar
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pagamento encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-4 py-3">Quando</th>
                  <th className="text-left font-medium px-4 py-3">Usuário</th>
                  <th className="text-left font-medium px-4 py-3">Provedor</th>
                  <th className="text-left font-medium px-4 py-3">Payment ID</th>
                  <th className="text-right font-medium px-4 py-3">Valor</th>
                  <th className="text-right font-medium px-4 py-3">Créditos</th>
                  <th className="text-center font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/10 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString('pt-BR')}
                      {r.confirmed_at && (
                        <div className="text-[10px] text-accent">
                          ✓ {new Date(r.confirmed_at).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-medium">{r.user_name ?? '—'}</div>
                      <div className="text-muted-foreground">{r.user_email ?? r.user_id.slice(0, 8)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase">{r.provider}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground">
                      {r.payment_id?.slice(0, 16)}…
                    </td>
                    <td className="px-4 py-3 text-right font-mono">${Number(r.usd_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">+{r.credits}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        row={r}
                        onMark={(status) => mark(r.id, status)}
                        loading={marking === r.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon: Icon,
  color,
  label,
  value,
  subtitle,
}: {
  icon: any;
  color: 'primary' | 'yellow' | 'red';
  label: string;
  value: string;
  subtitle: string;
}) {
  const cls =
    color === 'yellow'
      ? 'text-yellow-400'
      : color === 'red'
      ? 'text-red-400'
      : 'text-primary';
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        <Icon className={`w-3.5 h-3.5 ${cls}`} />
        {label}
      </div>
      <div className="font-display font-bold text-2xl tracking-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
    </div>
  );
}

function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    PENDING: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
    CONFIRMED: 'border-accent/40 bg-accent/10 text-accent',
    EXPIRED: 'border-border bg-secondary/40 text-muted-foreground',
    FAILED: 'border-red-500/40 bg-red-500/10 text-red-300',
    REFUNDED: 'border-primary/40 bg-primary/10 text-primary',
  };
  return (
    <span
      className={`inline-block text-[10px] font-display tracking-wider px-2 py-0.5 rounded-md border ${map[status]}`}
    >
      {status}
    </span>
  );
}

function RowActions({
  row,
  onMark,
  loading,
}: {
  row: PaymentRow;
  onMark: (status: string) => void;
  loading: boolean;
}) {
  const can = useMemo(() => {
    if (row.status === 'PENDING') return ['CONFIRMED', 'EXPIRED', 'FAILED'];
    if (row.status === 'CONFIRMED') return ['REFUNDED'];
    if (row.status === 'EXPIRED' || row.status === 'FAILED') return ['CONFIRMED'];
    return [];
  }, [row.status]);

  if (!can.length) return <span className="text-xs text-muted-foreground/60">—</span>;
  if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin inline" />;

  return (
    <div className="inline-flex items-center gap-1">
      {can.map((status) => (
        <button
          key={status}
          onClick={() => onMark(status)}
          className={`text-[10px] font-display tracking-wider px-2 py-1 rounded-md border ${
            status === 'CONFIRMED'
              ? 'border-accent/40 text-accent hover:bg-accent/10'
              : status === 'REFUNDED'
              ? 'border-primary/40 text-primary hover:bg-primary/10'
              : 'border-red-500/40 text-red-300 hover:bg-red-500/10'
          }`}
          title={`Marcar como ${status}`}
        >
          → {status}
        </button>
      ))}
    </div>
  );
}
