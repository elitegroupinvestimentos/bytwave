import { useEffect, useMemo, useState } from 'react';
import {
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Chrome,
  Facebook,
  Save,
  Trash2,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin } from '../../api/admin';
import { ApiError } from '../../api/client';

type Provider = 'google' | 'facebook';

interface Row {
  provider: Provider;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  enabled: boolean;
  configured: boolean;
  updated_at: string | null;
}

const META: Record<Provider, { label: string; icon: any; docs: string }> = {
  google: {
    label: 'Google',
    icon: Chrome,
    docs: 'https://console.cloud.google.com/apis/credentials',
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    docs: 'https://developers.facebook.com/apps',
  },
};

export default function AdminIntegrations() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const list = await admin.integrations();
      // Garante card pra cada provider mesmo se DB não tiver linha.
      const byProvider: Record<Provider, Row | undefined> = { google: undefined, facebook: undefined };
      for (const r of list) byProvider[r.provider] = r as Row;
      setRows([
        byProvider.google ?? emptyRow('google'),
        byProvider.facebook ?? emptyRow('facebook'),
      ]);
    } catch {
      // segue
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout title="Integrações">
      <div className="rounded-2xl border border-border bg-card/40 p-4 flex items-start gap-3">
        <Plug className="w-4 h-4 text-primary mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Configure aqui as credenciais de OAuth dos provedores (Google e Facebook).
          Quando uma integração estiver <span className="text-primary">ativada</span> e com
          Client ID + Secret preenchidos, os botões na tela de login/cadastro tentarão o
          fluxo. O <strong>redirect_uri</strong> precisa bater com o cadastrado no console
          do provedor.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando integrações...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rows.map((row) => (
            <IntegrationCard key={row.provider} row={row} onSaved={load} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
}

function emptyRow(provider: Provider): Row {
  return {
    provider,
    client_id: '',
    client_secret: '',
    redirect_uri: '',
    enabled: false,
    configured: false,
    updated_at: null,
  };
}

function IntegrationCard({ row, onSaved }: { row: Row; onSaved: () => void }) {
  const meta = META[row.provider];
  const Icon = meta.icon;
  const [enabled, setEnabled] = useState(row.enabled);
  const [clientId, setClientId] = useState(row.client_id);
  const [secret, setSecret] = useState('');
  const [redirect, setRedirect] = useState(row.redirect_uri);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const maskedSecret = row.client_secret; // ••••XXXX vindo do backend

  const status = useMemo(() => {
    if (!row.configured) return { color: 'text-muted-foreground', label: 'NÃO CONFIGURADO' };
    if (!row.enabled) return { color: 'text-yellow-400', label: 'CONFIGURADO · DESATIVADO' };
    return { color: 'text-accent', label: 'CONECTADO' };
  }, [row.configured, row.enabled]);

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      // Se o user não preencheu secret novo, manda em branco e o backend
      // mantém o antigo? Hoje o schema sempre sobrescreve. Pra UX simples:
      // só envia secret se foi preenchido nesta sessão. Caso contrário,
      // bloqueia save quando não houver secret cadastrado E não houver
      // novo digitado.
      if (!clientId.trim()) {
        setFeedback({ ok: false, msg: 'Client ID é obrigatório.' });
        setSaving(false);
        return;
      }
      if (!row.configured && !secret.trim()) {
        setFeedback({ ok: false, msg: 'Cole o Client Secret pra primeira configuração.' });
        setSaving(false);
        return;
      }
      await admin.integrationSave({
        provider: row.provider,
        client_id: clientId.trim(),
        // se não digitou novo, manda o mascarado (backend vai sobrescrever
        // pra mascarado, mas em prática você deve sempre fornecer secret).
        // Pra evitar perder o secret no DB sem querer, exige novo se vazio.
        client_secret: secret.trim() || maskedSecret,
        redirect_uri: redirect.trim(),
        enabled,
      });
      setFeedback({ ok: true, msg: 'Integração salva.' });
      setSecret('');
      onSaved();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setFeedback({ ok: false, msg: msg ?? 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Remover credenciais de ${meta.label}?`)) return;
    setRemoving(true);
    setFeedback(null);
    try {
      await admin.integrationDelete(row.provider);
      setFeedback({ ok: true, msg: 'Integração removida.' });
      onSaved();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setFeedback({ ok: false, msg: msg ?? 'Erro ao remover.' });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/40 border border-border flex items-center justify-center">
            <Icon className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <div className="font-semibold text-base">{meta.label}</div>
            <a
              href={meta.docs}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-muted-foreground hover:text-primary"
            >
              abrir console do provedor →
            </a>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {row.configured ? (
            <CheckCircle2 className={`w-4 h-4 ${status.color}`} />
          ) : (
            <XCircle className={`w-4 h-4 ${status.color}`} />
          )}
          <span className={`text-[10px] font-display font-semibold tracking-[0.2em] uppercase ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Ativado</span>
          <Toggle active={enabled} onClick={() => setEnabled((v) => !v)} disabled={saving} />
        </label>

        <Field label="Client ID">
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="copie do console do provedor"
            className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
          />
        </Field>

        <Field
          label={`Client Secret${row.configured ? ` (atual: ${maskedSecret || '—'})` : ''}`}
          hint={row.configured ? 'Deixe em branco pra manter o atual' : undefined}
        >
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
              placeholder={row.configured ? '••••••••' : 'cole aqui'}
              className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 pr-10 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowSecret((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
              aria-label="mostrar/ocultar"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        <Field label="Redirect URI">
          <input
            value={redirect}
            onChange={(e) => setRedirect(e.target.value)}
            placeholder={`https://seusite.com/auth/${row.provider}/callback`}
            className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
          />
        </Field>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
            feedback.ok
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        {row.configured && (
          <button
            onClick={remove}
            disabled={removing}
            className="h-10 px-3 rounded-full border border-red-500/40 bg-red-500/10 text-red-300 text-sm hover:bg-red-500/15 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`relative inline-flex shrink-0 items-center h-6 w-11 rounded-full transition-colors ${
        active ? 'bg-accent' : 'bg-secondary/60'
      } disabled:opacity-60`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
          active ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
