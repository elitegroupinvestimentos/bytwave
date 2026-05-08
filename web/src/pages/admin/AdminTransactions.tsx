import { useEffect, useState } from 'react';
import { Plus, Minus, Filter } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin } from '../../api/admin';

const reasons = ['', 'signup_grant', 'pack_purchase', 'admin_grant', 'cycle_open', 'manual_test'];

export default function AdminTransactions() {
  const [reason, setReason] = useState('');
  const [tx, setTx] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      admin
        .transactions({ reason: reason || undefined, limit: 200 })
        .then((d) => alive && setTx(d))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [reason]);

  return (
    <AdminLayout title="Transações de Tokens">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filtrar:
        </div>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="bg-secondary/40 border border-border rounded-full px-4 h-9 text-sm outline-none focus:border-primary/50"
        >
          {reasons.map((r) => (
            <option key={r} value={r}>{r === '' ? 'Todos' : r}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
        {tx.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Nenhuma transação ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-6 py-3">Quando</th>
                <th className="text-left font-medium px-4 py-3">Usuário</th>
                <th className="text-left font-medium px-4 py-3">Motivo</th>
                <th className="text-right font-medium px-4 py-3">Δ</th>
                <th className="text-right font-medium px-4 py-3">Antes</th>
                <th className="text-right font-medium px-6 py-3">Depois</th>
              </tr>
            </thead>
            <tbody>
              {tx.map((t) => {
                const positive = t.delta > 0;
                return (
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {t.user_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-display tracking-wider px-2 py-1 rounded-md border border-border bg-secondary/40 text-muted-foreground">
                        {t.reason}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${positive ? 'text-accent' : 'text-red-400'}`}>
                      {positive ? <Plus className="inline w-3 h-3 -mt-0.5" /> : <Minus className="inline w-3 h-3 -mt-0.5" />}
                      {Math.abs(t.delta)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {t.balance_before}
                    </td>
                    <td className="px-6 py-3 text-right font-mono">{t.balance_after}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
