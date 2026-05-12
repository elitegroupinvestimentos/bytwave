import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Flame, BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import {
  RISK_MULTIPLIERS,
  buildVolumeLadder,
  buildStepLadder,
  MIN_BANCA_USDT,
} from '../../lib/management';

interface Props {
  open: boolean;
  onClose: () => void;
}

const fmt2 = (n: number) => Number(n.toFixed(2));
const fmt4 = (n: number) => Number(n.toFixed(4));
const SAMPLE_BANCA = 1000;

export function HowItWorksModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-border bg-card shadow-2xl"
          >
            {/* Header sticky */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-card/95 backdrop-blur">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="font-display font-semibold tracking-wider uppercase text-[11px] text-foreground">
                  Como funciona o gerenciamento
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-secondary/40"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-6">
              {/* Intro */}
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                O gerenciamento automático usa o valor total da sua banca para calcular
                o tamanho das entradas, Safety Orders, distâncias e gerenciamento de risco.
                Você só precisa informar a banca e escolher entre dois modos:
              </p>

              <ModeBlock kind="conservador" />
              <ModeBlock kind="agressivo" />

              {/* Como funciona */}
              <Section title="Fluxo de uso">
                <ol className="space-y-2 text-[13px] text-muted-foreground list-decimal list-inside">
                  <li>Informe sua banca em USDT.</li>
                  <li>Sistema valida o mínimo de ${MIN_BANCA_USDT} USDT.</li>
                  <li>
                    Escolha o modo de risco:{' '}
                    <span className="text-accent">Conservador</span> ou{' '}
                    <span className="text-red-300">Agressivo</span>.
                  </li>
                  <li>O sistema calcula automaticamente todos os parâmetros.</li>
                  <li>Veja o preview com os valores e timelines.</li>
                  <li>Clique em <strong className="text-foreground">Salvar gerenciamento</strong>.</li>
                </ol>
              </Section>

              {/* Validações */}
              <Section title="Validações">
                <ul className="space-y-2 text-[13px] text-muted-foreground">
                  <Bullet ok>Valores financeiros arredondados para 2 casas decimais.</Bullet>
                  <Bullet ok>Distâncias com até 4 casas decimais.</Bullet>
                  <Bullet ok>Banca mínima ${MIN_BANCA_USDT} USDT.</Bullet>
                  <Bullet warn>
                    Se BO × alavancagem ficar abaixo do mínimo do par na Binance, o save é
                    bloqueado e você verá:{' '}
                    <em className="text-yellow-300/90">
                      "O valor calculado ficou abaixo do mínimo permitido pela Binance para este par."
                    </em>
                  </Bullet>
                </ul>
              </Section>

              {/* Footer */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-[12px] text-muted-foreground leading-relaxed">
                <strong className="font-display tracking-wider uppercase text-[10px] text-primary">
                  Resumo
                </strong>
                <p className="mt-1">
                  Você informa a banca, escolhe o nível de risco, visualiza os cálculos e
                  salva. Sem precisar entender parâmetros técnicos complexos.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ModeBlock({ kind }: { kind: 'conservador' | 'agressivo' }) {
  const m = RISK_MULTIPLIERS[kind];
  const bo = fmt2(SAMPLE_BANCA * m.bo);
  const so = fmt2(SAMPLE_BANCA * m.so);
  const volumes = buildVolumeLadder(so, m.volume_scale, m.max_safety_orders);
  const steps = buildStepLadder(m.initial_distance_pct, m.step_scale, m.max_safety_orders);
  const isCons = kind === 'conservador';
  const accent = isCons ? 'text-accent' : 'text-red-300';
  const border = isCons ? 'border-accent/30' : 'border-red-500/30';
  const bg = isCons ? 'bg-accent/5' : 'bg-red-500/5';

  return (
    <div className={`rounded-xl border ${border} ${bg} p-4 space-y-4`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className={`flex items-center gap-2 text-sm font-semibold ${accent}`}>
          {isCons ? <Shield className="w-4 h-4" /> : <Flame className="w-4 h-4" />}
          Modo {isCons ? 'Conservador' : 'Agressivo'}
        </div>
        <span
          className={`text-[10px] font-display font-semibold tracking-[0.2em] uppercase rounded-full border px-2.5 py-0.5 ${
            isCons
              ? 'border-accent/40 text-accent'
              : 'border-red-500/40 text-red-300'
          }`}
        >
          {isCons ? 'Safe Mode' : 'Higher Profits'}
        </span>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {isCons
          ? 'Prioriza segurança e menor exposição. Base Order menor, distâncias maiores, crescimento mais lento das Safety Orders.'
          : 'Busca maior rentabilidade e crescimento mais rápido. Entradas maiores, distâncias menores, lote cresce mais rápido.'}
      </p>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <KV label="Alavancagem" value={`${m.leverage}x`} accent={accent} />
        <KV label="Target Profit" value={`${m.target_profit_pct}%`} accent={accent} />
        <KV label="BO multiplier" value={m.bo.toString()} accent={accent} />
        <KV label="SO multiplier" value={m.so.toString()} accent={accent} />
        <KV label="Volume Scale" value={m.volume_scale.toString()} accent={accent} />
        <KV label="Step Scale" value={m.step_scale.toString()} accent={accent} />
        <KV label="Distância Inicial" value={`${m.initial_distance_pct}%`} accent={accent} />
        <KV label="Max Safety" value={m.max_safety_orders.toString()} accent={accent} />
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground/80">
          Exemplo com banca ${SAMPLE_BANCA}
        </div>
        <Code>
          <span>BO = {SAMPLE_BANCA} × {m.bo} = </span>
          <span className={`font-semibold ${accent}`}>${bo}</span>
        </Code>
        <Code>
          <span>SO1 = {SAMPLE_BANCA} × {m.so} = </span>
          <span className={`font-semibold ${accent}`}>${so}</span>
        </Code>
      </div>

      <details className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-[12px]">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
          Volume Scale — escada das próximas SOs
        </summary>
        <div className="mt-2 space-y-1 font-mono text-[11px]">
          {volumes.map((v, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-muted-foreground">SO{i + 1}</span>
              <span className={accent}>${v}</span>
            </div>
          ))}
        </div>
      </details>

      <details className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-[12px]">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
          Step Scale — distâncias entre SOs
        </summary>
        <div className="mt-2 space-y-1 font-mono text-[11px]">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-muted-foreground">SO{i + 1}</span>
              <span className={accent}>{fmt4(s)}%</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function KV({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/40 px-2.5 py-1.5">
      <div className="text-[9px] font-display font-semibold tracking-[0.2em] uppercase text-muted-foreground/70">
        {label}
      </div>
      <div className={`font-mono ${accent}`}>{value}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </div>
  );
}

function Bullet({
  children,
  ok,
  warn,
}: {
  children: React.ReactNode;
  ok?: boolean;
  warn?: boolean;
}) {
  const Icon = warn ? AlertTriangle : CheckCircle2;
  const cls = warn ? 'text-yellow-400' : ok ? 'text-accent' : 'text-muted-foreground';
  return (
    <li className="flex items-start gap-2">
      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cls}`} />
      <span className="flex-1">{children}</span>
    </li>
  );
}
