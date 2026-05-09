import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  TrendingDown,
  Layers,
  Ruler,
  Sparkles,
  Shield,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  RISK_MULTIPLIERS,
  buildVolumeLadder,
  buildStepLadder,
  type RiskMode,
} from '../../lib/management';
import { HowItWorksModal } from './HowItWorksModal';

interface Props {
  banca: number;
  mode: RiskMode;
}

const fmt2 = (n: number) => Number(n.toFixed(2));

export function ManagementExplanation({ banca, mode }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const m = RISK_MULTIPLIERS[mode];
  const safeBanca = banca > 0 ? banca : 0;
  const bo = fmt2(safeBanca * m.bo);
  const so = fmt2(safeBanca * m.so);

  const volumes = buildVolumeLadder(so, m.volume_scale, m.max_safety_orders);
  const steps = buildStepLadder(m.initial_distance_pct, m.step_scale, m.max_safety_orders);
  const maxVol = Math.max(...volumes, 0.001);
  const maxStep = Math.max(...steps, 0.001);

  const isCons = mode === 'conservador';
  const accentText = isCons ? 'text-accent' : 'text-red-300';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border bg-card/40 p-6 space-y-6"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="w-4 h-4 text-primary" />
          Como o gerenciamento é calculado
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          >
            <HelpCircle className="w-3 h-3" />
            Ver explicação completa
          </button>
          <ModeBadge mode={mode} />
        </div>
      </div>
      <HowItWorksModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <ExplCard
        icon={<TrendingDown className="w-4 h-4" />}
        title="Base Order (BO)"
        subtitle="Primeira entrada da operação."
      >
        <Formula isCons={isCons}>
          BO = banca × <span className={accentText}>{m.bo}</span>
        </Formula>
        <Example>
          <span className="font-mono">${safeBanca.toLocaleString()}</span>
          <span className="text-muted-foreground"> × {m.bo} = </span>
          <span className={`font-mono font-semibold ${accentText}`}>${bo}</span>
        </Example>
      </ExplCard>

      <ExplCard
        icon={<Layers className="w-4 h-4" />}
        title="Primeira Safety Order (SO)"
        subtitle="Faz média de preço quando o mercado anda contra a posição."
      >
        <Formula isCons={isCons}>
          SO = banca × <span className={accentText}>{m.so}</span>
        </Formula>
        <Example>
          <span className="font-mono">${safeBanca.toLocaleString()}</span>
          <span className="text-muted-foreground"> × {m.so} = </span>
          <span className={`font-mono font-semibold ${accentText}`}>${so}</span>
        </Example>
      </ExplCard>

      <ExplCard
        icon={<Sparkles className="w-4 h-4" />}
        title="Volume Scale"
        subtitle="Cada nova SO multiplica a anterior — exposição cresce em progressão geométrica."
      >
        <Formula isCons={isCons}>
          Nova SO = SO anterior × <span className={accentText}>{m.volume_scale}</span>
        </Formula>
        <AnimatePresence mode="wait">
          <motion.div
            key={`vol-${mode}-${banca}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            {volumes.map((v, i) => (
              <BarRow
                key={i}
                label={`SO${i + 1}`}
                value={`$${v}`}
                pct={(v / maxVol) * 100}
                isCons={isCons}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </ExplCard>

      <ExplCard
        icon={<Ruler className="w-4 h-4" />}
        title="Step Scale"
        subtitle="Cada nova entrada fica mais distante da anterior — diluição segura do preço médio."
      >
        <Formula isCons={isCons}>
          Nova distância = distância anterior × <span className={accentText}>{m.step_scale}</span>
        </Formula>
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${mode}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-2"
          >
            {steps.map((s, i) => (
              <BarRow
                key={i}
                label={`SO${i + 1}`}
                value={`${s}%`}
                pct={(s / maxStep) * 100}
                isCons={isCons}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </ExplCard>

      <div
        className={`rounded-xl border p-4 text-xs leading-relaxed ${
          isCons
            ? 'border-accent/30 bg-accent/5'
            : 'border-red-500/30 bg-red-500/5'
        }`}
      >
        <strong
          className={`font-display tracking-wider uppercase text-[10px] ${accentText}`}
        >
          Resumo
        </strong>
        <p className="mt-1 text-muted-foreground">
          O gerenciamento utiliza entradas proporcionais à banca e aumenta gradualmente a exposição
          conforme o mercado se move contra a posição, buscando melhorar o preço médio e acelerar a
          recuperação da operação.
        </p>
      </div>
    </motion.div>
  );
}

function ExplCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/15 p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </div>
        <p className="text-[11px] text-muted-foreground/80 mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Formula({
  isCons,
  children,
}: {
  isCons: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm font-mono ${
        isCons
          ? 'border-accent/30 bg-accent/5'
          : 'border-red-500/30 bg-red-500/5'
      }`}
    >
      {children}
    </div>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[12px] text-muted-foreground">
      <span className="text-[9px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground/70 mr-2">
        Exemplo
      </span>
      {children}
    </div>
  );
}

function BarRow({
  label,
  value,
  pct,
  isCons,
}: {
  label: string;
  value: string;
  pct: number;
  isCons: boolean;
}) {
  const barCls = isCons
    ? 'bg-gradient-to-r from-accent/60 to-accent'
    : 'bg-gradient-to-r from-red-500/50 to-red-400';
  const txtCls = isCons ? 'text-accent' : 'text-red-300';
  return (
    <div className="grid grid-cols-[40px_1fr_72px] items-center gap-2 text-[11px]">
      <span className="font-mono text-muted-foreground">{label}</span>
      <div className="h-5 rounded-md bg-secondary/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(4, pct)}%` }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className={`h-full ${barCls}`}
        />
      </div>
      <span className={`font-mono text-right ${txtCls}`}>{value}</span>
    </div>
  );
}

function ModeBadge({ mode }: { mode: RiskMode }) {
  if (mode === 'conservador') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-accent">
        <Shield className="w-3 h-3" />
        Safe Mode
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-red-300">
      <Flame className="w-3 h-3" />
      Extreme Risk
    </div>
  );
}
