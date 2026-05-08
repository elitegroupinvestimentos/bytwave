import { useEffect, useState } from 'react';
import { Search, Plus, Eye, X } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin, AdminUserDetail, AdminUserRow } from '../../api/admin';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [grantAmount, setGrantAmount] = useState(100);
  const [grantNote, setGrantNote] = useState('');
  const [granting, setGranting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await admin.users(search || undefined);
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDetail(id: string) {
    setSelected(id);
    setDetail(null);
    const d = await admin.user(id);
    setDetail(d);
  }

  async function handleGrant() {
    if (!selected || grantAmount <= 0) return;
    setGranting(true);
    try {
      await admin.grant(selected, { amount: grantAmount, reason: 'admin_grant', note: grantNote || undefined });
      const d = await admin.user(selected);
      setDetail(d);
      setGrantNote('');
      load();
    } finally {
      setGranting(false);
    }
  }

  return (
    <AdminLayout title="Usuários">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Buscar por e-mail..."
            className="w-full bg-secondary/40 border border-border rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-full border border-border text-sm hover:border-primary/50"
        >
          Buscar
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-6 py-3">E-mail</th>
                <th className="text-left font-medium px-4 py-3">Nome</th>
                <th className="text-right font-medium px-4 py-3">Tokens</th>
                <th className="text-right font-medium px-4 py-3">Ciclos</th>
                <th className="text-left font-medium px-4 py-3">Cadastrado</th>
                <th className="text-right font-medium px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-card/60">
                  <td className="px-6 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={u.token_balance === 0 ? 'text-red-400' : u.token_balance < 10 ? 'text-yellow-400' : 'text-foreground'}>
                      {u.token_balance}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    <span className="text-accent">{u.cycles.open}</span> /{' '}
                    <span className="text-muted-foreground">{u.cycles.total}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => openDetail(u.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-border text-xs hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Detalhe
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de detalhe */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-display font-bold text-lg">Detalhe do usuário</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!detail ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Carregando...</div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Info label="ID" value={detail.user.id} mono />
                  <Info label="E-mail" value={detail.user.email} />
                  <Info label="Nome" value={detail.user.name ?? '—'} />
                  <Info label="Tokens" value={String(detail.user.token_balance)} mono />
                  <Info label="Cadastrado em" value={new Date(detail.user.created_at).toLocaleString('pt-BR')} />
                  <Info label="Chaves Binance" value={`${detail.binance_keys.length} cadastrada(s)`} />
                  <Info label="Estratégias" value={`${detail.strategy_configs.length}`} />
                  <Info label="Ciclos (recentes)" value={`${detail.recent_cycles.length}`} />
                </div>

                {/* Grant tokens */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Plus className="w-4 h-4 text-primary" />
                    Adicionar tokens manualmente
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(Number(e.target.value))}
                      placeholder="Quantidade"
                      className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-primary/50"
                    />
                    <input
                      value={grantNote}
                      onChange={(e) => setGrantNote(e.target.value)}
                      placeholder="Motivo (opcional)"
                      className="bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={handleGrant}
                      disabled={granting || grantAmount <= 0}
                      className="rounded-lg bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-60 hover:scale-[1.01] transition-all"
                    >
                      {granting ? 'Adicionando...' : 'Adicionar'}
                    </button>
                  </div>
                </div>

                {/* Histórico de tokens */}
                <Section title={`Últimas transações de tokens (${detail.recent_token_transactions.length})`}>
                  {detail.recent_token_transactions.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sem transações.</div>
                  ) : (
                    <ul className="space-y-1 text-xs font-mono">
                      {detail.recent_token_transactions.slice(0, 10).map((t: any) => (
                        <li key={t.id} className="flex justify-between border-b border-border/40 py-1">
                          <span className="text-muted-foreground">{new Date(t.created_at).toLocaleString('pt-BR')}</span>
                          <span>{t.reason}</span>
                          <span className={t.delta > 0 ? 'text-accent' : 'text-red-400'}>
                            {t.delta > 0 ? '+' : ''}{t.delta}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                {/* Ciclos */}
                <Section title={`Ciclos recentes (${detail.recent_cycles.length})`}>
                  {detail.recent_cycles.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nenhum ciclo.</div>
                  ) : (
                    <ul className="space-y-1 text-xs font-mono">
                      {detail.recent_cycles.slice(0, 10).map((c: any) => (
                        <li key={c.id} className="flex justify-between border-b border-border/40 py-1">
                          <span>{c.symbol} {c.side}</span>
                          <span className={c.status === 'open' ? 'text-accent' : 'text-muted-foreground'}>
                            {c.status}
                          </span>
                          <span className={c.realized_pnl_usdt >= 0 ? 'text-accent' : 'text-red-400'}>
                            ${Number(c.realized_pnl_usdt ?? 0).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono text-xs' : ''} truncate`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-display tracking-wider uppercase text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}
