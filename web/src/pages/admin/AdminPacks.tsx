import { useEffect, useState, FormEvent } from 'react';
import { Plus, Trash, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin, AdminPack } from '../../api/admin';

const blank = { name: '', tokens: 100, price_brl: 9.9, active: true, highlight: false };

export default function AdminPacks() {
  const [packs, setPacks] = useState<AdminPack[]>([]);
  const [form, setForm] = useState(blank);
  const [creating, setCreating] = useState(false);

  async function load() {
    setPacks(await admin.packs());
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await admin.packCreate({ ...form });
      setForm(blank);
      load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(p: AdminPack) {
    await admin.packUpdate(p.id, { active: !p.active });
    load();
  }
  async function toggleHighlight(p: AdminPack) {
    await admin.packUpdate(p.id, { highlight: !p.highlight });
    load();
  }
  async function remove(p: AdminPack) {
    if (!confirm(`Excluir o pacote "${p.name}"?`)) return;
    await admin.packDelete(p.id);
    load();
  }

  return (
    <AdminLayout title="Pacotes de Tokens">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista */}
        <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-border text-sm text-muted-foreground">
            {packs.length} pacote(s)
          </div>
          {packs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Sem pacotes.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                  <th className="text-left font-medium px-6 py-3">Nome</th>
                  <th className="text-right font-medium px-4 py-3">Tokens</th>
                  <th className="text-right font-medium px-4 py-3">Preço</th>
                  <th className="text-center font-medium px-4 py-3">Ativo</th>
                  <th className="text-center font-medium px-4 py-3">Destaque</th>
                  <th className="text-right font-medium px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-6 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-right font-mono">{p.tokens.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      R$ {Number(p.price_brl).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(p)}>
                        {p.active ? (
                          <ToggleRight className="w-5 h-5 text-accent" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleHighlight(p)}>
                        <Star
                          className={`w-4 h-4 ${
                            p.highlight ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => remove(p)}
                        className="text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Form criar */}
        <form
          onSubmit={create}
          className="rounded-2xl border border-border bg-card/40 p-6 space-y-4 self-start"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plus className="w-4 h-4 text-primary" />
            Novo pacote
          </div>
          <Field label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field
            label="Tokens"
            type="number"
            value={form.tokens}
            onChange={(v) => setForm({ ...form, tokens: Number(v) })}
          />
          <Field
            label="Preço (R$)"
            type="number"
            step={0.01}
            value={form.price_brl}
            onChange={(v) => setForm({ ...form, price_brl: Number(v) })}
          />
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="accent-primary"
              />
              Ativo
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.highlight}
                onChange={(e) => setForm({ ...form, highlight: e.target.checked })}
                className="accent-primary"
              />
              Destacado
            </label>
          </div>
          <button
            type="submit"
            disabled={creating || !form.name}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 box-glow"
          >
            {creating ? 'Criando...' : 'Criar pacote'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm"
      />
    </div>
  );
}
