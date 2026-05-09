import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Shield,
  Flame,
  Calculator,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Eye,
} from 'lucide-react';
import { useStrategyCalculator } from '../../hooks/useStrategyCalculator';
import { calculateStrategy, RiskMode } from '../../lib/strategyCalculator';

interface Props {
  /** Símbolo escolhido (BTCUSDT, etc.) */
  symbol: string;
  onSymbolChange: (s: string) => void;
  /** Salva a estratégia calculada no backend */
  onSave: (cfg: {
    symbol: string;
    capital_usdt: number;
    leverage: number;
    base_order_usdt: number;
    first_safety_usdt: number;
    max_safety_orders: number;
    initial_distance_pct: number;
    step_scale: number;
    volume_scale: number;
    target_profit_pct: number;
  }) => Promise<void>;
  saving?: boolean;
  feedback?: { ok: boolean; msg: string } | null;
}

const POPULAR_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'DOGEUSDT'];
const PREVIEW_BANKS = [50, 100, 1000];

export function StrategyCalculator({ symbol, onSymbolChange, onSave, saving, feedback }: Props) {
  const { bank, setBank, mode, setMode, strategy, error } = useStrategyCalculator();
  const [showPreview, setShowPreview] = useState(false);

  async function handleSave() {
    if (error) return;
    await onSave({
      symbol,
      capital_usdt: bank,
      leverage: strategy.leverage,
      base_order_usdt: strategy.base_order_usdt,
      first_safety_usdt: strategy.first_safety_usdt,
      max_safety_orders: strategy.max_safety_orders,
      initial_distance_pct: strategy.initial_distance_pct,
      step_scale: strategy.step_scale,
      volume_scale: strategy.volume_scale,
      target_profit_pct: strategy.target_profit_pct,
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5 md:p-6 space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        Gerenciamento Inteligente
      </div>

      {/* Símbolo */}
      <div>
        <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
          Símbolo <span className="lowercase normal-case text-muted-foreground/70 tracking-normal">— sempre termina em USDT</span>
        </label>
        <input
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
          placeholder="BTCUSDT"
          className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-sm font-mono"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {POPULAR_SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSymbolChange(s)}
              className={`text-[10px] font-mono px-2 py-1 rounded-md border transition-colors ${
                symbol === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Banca */}
      <div>
        <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
          Valor da banca (USDT)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">$</span>
          <input
            type="number"
            min={0}
            step={1}
            value={bank}
            onChange={(e) => setBank(Number(e.target.value))}
            className="w-full bg-secondary/30 border border-border rounded-xl pl-7 pr-3 py-2.5 outline-none focus:border-primary/50 transition-colors text-base font-mono font-semibold"
          />
        </div>
        {error && (
          <div className="mt-2 text-xs text-yellow-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </div>
        )}
      </div>

      {/* Modo de risco */}
      <div>
        <label className="block text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Modo de risco
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ModeCard
            label="Conservador"
            icon={Shield}
            color="green"
            description="Menor risco · longo prazo"
            active={mode === 'conservador'}
            onClick={() => setMode('conservador')}
          />
          <ModeCard
            label="Agressivo"
            icon={Flame}
            color="red"
            description="Maior lucro · maior risco"
            active={mode === 'agressivo'}
            onClick={() => setMode('agressivo')}
          />
        </div>
      </div>

      {/* Resultado calculado */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${bank}-${mode}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4 space-y-3"
        >
          <div className="flex items-center gap-2 text-xs text-primary">
            <Calculator className="w-3.5 h-3.5" />
            <span className="font-display font-semibold tracking-wider uppercase">
              Parâmetros calculados
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Param label="Alavancagem" value={`${strategy.leverage}x`} />
            <Param label="Base Order" value={`$${strategy.base_order_usdt.toFixed(2)}`} highlight />
            <Param label="1ª Safety" value={`$${strategy.first_safety_usdt.toFixed(2)}`} highlight />
            <Param label="Max SO" value={String(strategy.max_safety_orders)} />
            <Param label="Distância inicial" value={`${strategy.initial_distance_pct}%`} />
            <Param label="Step Scale" value={`${strategy.step_scale}x`} />
            <Param label="Volume Scale" value={`${strategy.volume_scale}x`} />
            <Param label="Target Profit" value={`${strategy.target_profit_pct}%`} />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            Gerenciamento calculado automaticamente proporcional à sua banca.
          </p>
          {strategy.base_order_usdt < 50 && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-[11px] text-yellow-200/90 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Atenção: a Binance Testnet exige <strong>$50 mínimo</strong> por
                ordem para BTC/ETH. Sua Base Order de ${strategy.base_order_usdt.toFixed(2)}{' '}
                será rejeitada nesses pares — aumente a banca para pelo menos{' '}
                <strong>${(50 / 0.004).toFixed(0)}</strong> ou opere altcoins.
              </span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Preview */}
      <button
        type="button"
        onClick={() => setShowPreview((v) => !v)}
        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        {showPreview ? 'Ocultar' : 'Ver'} preview pra outras bancas
      </button>
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2 text-xs">
              {PREVIEW_BANKS.map((b) => {
                const s = calculateStrategy(b, mode);
                return (
                  <div
                    key={b}
                    className="flex flex-wrap items-center gap-2 md:gap-3 font-mono"
                  >
                    <span className="font-semibold text-foreground w-20">${b}</span>
                    <span className="text-muted-foreground">BO ${s.base_order_usdt.toFixed(2)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">SO ${s.first_safety_usdt.toFixed(2)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{s.leverage}x</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">TP {s.target_profit_pct}%</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback do save */}
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

      {/* Salvar */}
      <button
        onClick={handleSave}
        disabled={saving || !!error}
        className="w-full h-11 rounded-full bg-primary text-primary-foreground font-display font-semibold text-sm tracking-wider hover:scale-[1.01] transition-all disabled:opacity-60 box-glow flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Salvando...' : 'Salvar configuração'}
      </button>
    </div>
  );
}

function ModeCard({
  label,
  icon: Icon,
  color,
  description,
  active,
  onClick,
}: {
  label: string;
  icon: any;
  color: 'green' | 'red';
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  const activeStyles =
    color === 'green'
      ? 'border-accent bg-accent/10 text-accent shadow-[0_0_24px_-6px_rgba(34,197,94,0.5)]'
      : 'border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_24px_-6px_rgba(239,68,68,0.5)]';
  const idleStyles = 'border-border text-muted-foreground hover:border-primary/40';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border-2 p-3 text-left transition-all ${active ? activeStyles : idleStyles}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="font-display font-bold text-sm tracking-wider uppercase">{label}</span>
      </div>
      <div className="text-[11px] opacity-80">{description}</div>
    </button>
  );
}

function Param({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary/30 border border-border px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
        {label}
      </div>
      <div
        className={`font-mono font-semibold text-sm ${
          highlight ? 'text-primary' : 'text-foreground'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// Helper só pra o componente reagir quando o usuário clicar "Iniciar" sem
// salvar antes — não usado direto aqui, mas exposto pra futuras integrações.
export type { RiskMode };
