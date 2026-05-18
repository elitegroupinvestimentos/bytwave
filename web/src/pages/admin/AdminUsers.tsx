import { useEffect, useState } from 'react';
import { Search, Plus, Eye, X, Sparkles, Save, Trash2 } from 'lucide-react';
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

  // Marketing overrides — multiplicadores (1 = sem alteração)
  const [ovBalanceFactor, setOvBalanceFactor] = useState<string>('');
  const [ovRealizedFactor, setOvRealizedFactor] = useState<string>('');
  const [ovTodayFactor, setOvTodayFactor] = useState<string>('');
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [overridesMsg, setOverridesMsg] = useState<{ ok: boolean; msg: string } | null>(null);

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
    setOverridesMsg(null);
    const d = await admin.user(id);
    setDetail(d);
    const o = (d.user as any).marketing_overrides ?? {};
    setOvBalanceFactor(typeof o.balance_factor === 'number' ? String(o.balance_factor) : '');
    setOvRealizedFactor(typeof o.realized_factor === 'number' ? String(o.realized_factor) : '');
    setOvTodayFactor(typeof o.today_pnl_factor === 'number' ? String(o.today_pnl_factor) : '');
  }

  async function saveOverrides() {
    if (!selected) return;
    setSavingOverrides(true);
    setOverridesMsg(null);
    try {
      const body = {
        balance_factor: ovBalanceFactor === '' ? null : Number(ovBalanceFactor),
        realized_factor: ovRealizedFactor === '' ? null : Number(ovRealizedFactor),
        today_pnl_factor: ovTodayFactor === '' ? null : Number(ovTodayFactor),
      };
      await admin.setOverrides(selected, body);
      const d = await admin.user(selected);
      setDetail(d);
      setOverridesMsg({ ok: true, msg: 'Multiplicadores salvos.' });
    } catch (err: any) {
      setOverridesMsg({ ok: false, msg: err?.message ?? 'Erro ao salvar.' });
    } finally {
      setSavingOverrides(false);
    }
  }

  async function clearOverrides() {
    if (!selected) return;
    setSavingOverrides(true);
    setOverridesMsg(null);
    try {
      await admin.setOverrides(selected, {
        balance_factor: null,
        realized_factor: null,
        today_pnl_factor: null,
      });
      setOvBalanceFactor('');
      setOvRealizedFactor('');
      setOvTodayFactor('');
      const d = await admin.user(selected);
      setDetail(d);
      setOverridesMsg({ ok: true, msg: 'Multiplicadores removidos — usuário volta aos valores reais.' });
    } catch (err: any) {
      setOverridesMsg({ ok: false, msg: err?.message ?? 'Erro ao limpar.' });
    } finally {
      setSavingOverrides(false);
    }
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

                {/* Marketing overrides — display only */}
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Conta marketing · overrides de display
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    <strong>Multiplicadores</strong> aplicados aos valores reais
                    (display × fator). Os números continuam vivos e se mexem com
                    o bot, só em escala maior. <strong>1</strong> = sem alteração;
                    <strong> 100</strong> = mostra 100×. Deixe em branco pra usar
                    o valor real puro.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <OvField
                      label="Saldo banca × fator"
                      value={ovBalanceFactor}
                      onChange={setOvBalanceFactor}
                      placeholder="ex: 2 (dobra saldo)"
                    />
                    <OvField
                      label="Lucro Realizado × fator"
                      value={ovRealizedFactor}
                      onChange={setOvRealizedFactor}
                      placeholder="ex: 50"
                    />
                    <OvField
                      label="Lucro do dia × fator"
                      value={ovTodayFactor}
                      onChange={setOvTodayFactor}
                      placeholder="ex: 100"
                    />
                  </div>
                  {overridesMsg && (
                    <p
                      className={`mt-3 text-xs ${overridesMsg.ok ? 'text-accent' : 'text-red-300'}`}
                    >
                      {overridesMsg.msg}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={saveOverrides}
                      disabled={savingOverrides}
                      className="flex items-center gap-2 px-4 h-9 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60 hover:opacity-90"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingOverrides ? 'Salvando...' : 'Salvar overrides'}
                    </button>
                    <button
                      onClick={clearOverrides}
                      disabled={savingOverrides}
                      className="flex items-center gap-2 px-4 h-9 rounded-full border border-border text-sm text-muted-foreground hover:border-red-500/40 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Limpar
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

function OvField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1">
        {label}
      </label>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-primary/50"
      />
    </div>
  );
}
