import { useEffect, useRef, useState } from 'react';
import {
  Lock,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { ApiError, api, DrawdownState } from '../../api/client';

interface Props {
  userId: string;
}

export function DrawdownProtection({ userId }: Props) {
  const [state, setState] = useState<DrawdownState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [limitPct, setLimitPct] = useState<number>(10);
  const [limitUsd, setLimitUsd] = useState<number>(50);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = async (hydrateForm: boolean) => {
      try {
        const s = await api.drawdownGet(userId);
        if (!alive) return;
        if (s) {
          setState(s);
          // Só sobrescreve campos do form na 1ª carga (ou após reset manual
          // via reload), pra não interromper edição do usuário entre polls.
          if (hydrateForm) {
            setEnabled(s.enabled);
            setType(s.type);
            setLimitPct(s.limit_pct);
            setLimitUsd(s.limit_usd);
          }
        }
      } catch {
        // ignora
      } finally {
        if (alive) setLoading(false);
      }
    };
    load(!hydratedRef.current).then(() => {
      hydratedRef.current = true;
    });
    const id = setInterval(() => load(false), 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId]);

  const triggered = !!state?.triggered_at;

  async function save() {
    setSaving(true);
    setFeedback(null);
    try {
      await api.drawdownSave({
        user_id: userId,
        enabled,
        type,
        limit_pct: limitPct,
        limit_usd: limitUsd,
      });
      const fresh = await api.drawdownGet(userId);
      setState(fresh);
      setFeedback({
        ok: true,
        msg: enabled
          ? 'Proteção ativada. Baseline registrado a partir do equity atual.'
          : 'Proteção desativada.',
      });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setFeedback({ ok: false, msg: msg ?? 'Falha ao salvar.' });
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setResetting(true);
    setFeedback(null);
    try {
      await api.drawdownReset({ user_id: userId });
      const fresh = await api.drawdownGet(userId);
      setState(fresh);
      setFeedback({ ok: true, msg: 'Proteção re-armada com novo baseline.' });
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.body?.message ?? err.message : err?.message;
      setFeedback({ ok: false, msg: msg ?? 'Falha ao reativar.' });
    } finally {
      setResetting(false);
    }
  }

  // Statusline visual
  const statusBox = triggered ? (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-start gap-2">
      <ShieldAlert className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
      <div className="text-[12px] text-red-200 leading-relaxed">
        <strong>🔴 Bot pausado por proteção de Drawdown</strong>
        <br />
        Equity no disparo: $
        {Number(state?.triggered_equity ?? 0).toFixed(2)} · Baseline: $
        {Number(state?.baseline_usd ?? 0).toFixed(2)} · Disparado em{' '}
        {state?.triggered_at
          ? new Date(state.triggered_at).toLocaleString('pt-BR')
          : '—'}
      </div>
    </div>
  ) : state?.enabled ? (
    <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 flex items-start gap-2">
      <ShieldCheck className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
      <div className="text-[12px] text-accent/90 leading-relaxed">
        <strong>🟢 Operando normalmente</strong>
        <br />
        Baseline: ${Number(state.baseline_usd ?? 0).toFixed(2)}. Disparo automático quando
        a perda atingir{' '}
        <span className="font-mono">
          {type === 'percent' ? `${limitPct}%` : `$${limitUsd}`}
        </span>
        .
      </div>
    </div>
  ) : (
    <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 flex items-start gap-2">
      <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="text-[12px] text-muted-foreground leading-relaxed">
        Proteção desativada. Ative pra fechar posições e pausar o bot
        automaticamente quando a perda atingir o limite definido.
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-secondary/15 p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lock className="w-4 h-4 text-primary" />
          Limite de Drawdown
        </div>
        <ToggleButton
          active={enabled}
          onClick={() => setEnabled((v) => !v)}
          disabled={loading || saving}
        />
      </div>

      {statusBox}

      {/* Controles */}
      <div className={`space-y-3 transition-opacity ${enabled ? '' : 'opacity-60'}`}>
        <div>
          <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            Tipo
          </label>
          <div className="grid grid-cols-2 gap-2">
            <TypeBtn
              active={type === 'percent'}
              onClick={() => setType('percent')}
              disabled={!enabled}
              label="Percentual"
            />
            <TypeBtn
              active={type === 'fixed'}
              onClick={() => setType('fixed')}
              disabled={!enabled}
              label="Valor Fixo"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
            Limite
          </label>
          <div className="relative">
            <input
              type="number"
              step={type === 'percent' ? 0.1 : 1}
              min={0.1}
              max={type === 'percent' ? 100 : 1_000_000}
              value={type === 'percent' ? limitPct : limitUsd}
              onChange={(e) => {
                const v = Number(e.target.value) || 0;
                if (type === 'percent') setLimitPct(v);
                else setLimitUsd(v);
              }}
              disabled={!enabled}
              className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 pr-16 outline-none focus:border-primary/50 transition-colors text-sm font-mono disabled:opacity-60"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
              {type === 'percent' ? '%' : 'USDT'}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm flex items-center gap-2 ${
            feedback.ok
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-red-500/40 bg-red-500/10 text-red-300'
          }`}
        >
          {feedback.ok ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className="flex-1 h-10 rounded-full bg-primary/90 text-primary-foreground text-sm font-medium hover:bg-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Salvando...' : 'Salvar proteção'}
        </button>
        {triggered && (
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className="h-10 px-4 rounded-full border border-accent/40 bg-accent/10 text-accent text-sm font-medium hover:bg-accent/15 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Re-armar
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleButton({
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
      className={`relative w-14 h-7 rounded-full transition-colors ${
        active ? 'bg-accent' : 'bg-secondary/60'
      } disabled:opacity-60`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-foreground transition-transform ${
          active ? 'translate-x-7' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function TypeBtn({
  active,
  onClick,
  disabled,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-secondary/20 text-muted-foreground hover:border-primary/40'
      } disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
}
