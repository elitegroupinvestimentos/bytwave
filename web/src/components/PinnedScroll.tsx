import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { FloatingIcons, pinnedIcons } from './FloatingIcons';
import { WaveArt } from './WaveArt';

const slides = [
  {
    n: '01 — 03',
    title: 'Trading Automatizado',
    text: 'Nossa IA analisa o mercado em tempo real e executa trades com precisão, eliminando emoções e maximizando oportunidades.',
  },
  {
    n: '02 — 03',
    title: 'Gestão de Risco Inteligente',
    text: 'Safety orders dinâmicas e take profit variável protegem seu capital enquanto buscam o máximo de rentabilidade.',
  },
  {
    n: '03 — 03',
    title: 'Resultados Consistentes',
    text: 'Estratégias testadas e otimizadas para diferentes condições de mercado, buscando lucros consistentes no longo prazo.',
  },
];

/**
 * Seção pinned com 3 slides — idêntica ao modelo Whalbyt.
 * Inclui wave art GIGANTE de fundo (faded, parallax) + floating icons + 3 dots indicador.
 */
export function PinnedScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Wave gigante de fundo: aparece no meio e desaparece nas pontas
  const bgOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 0.18, 0.18, 0]);
  const bgScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 1.05]);
  const bgY = useTransform(scrollYProgress, [0, 1], [-60, 60]);

  return (
    <section ref={ref} className="relative bg-background" style={{ height: '240vh' }}>
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        {/* Glows decorativos */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full bg-primary/[0.04] blur-[80px] md:blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[200px] md:w-[400px] h-[200px] md:h-[400px] rounded-full bg-accent/[0.04] blur-[60px] md:blur-[100px]" />
        </div>

        {/* Floating icons */}
        <FloatingIcons icons={pinnedIcons} />

        {/* Wave gigante de fundo (parallax) */}
        <motion.div
          style={{ opacity: bgOpacity, scale: bgScale, y: bgY }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <WaveArt className="w-[280px] md:w-[500px] lg:w-[800px] drop-shadow-[0_0_80px_hsla(185,80%,50%,0.15)]" />
        </motion.div>

        {/* Slides */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12">
          {slides.map((s, i) => {
            const start = i / slides.length;
            const end = (i + 1) / slides.length;
            const opacity = useTransform(
              scrollYProgress,
              [start - 0.05, start + 0.05, end - 0.05, end + 0.05],
              [0, 1, 1, 0],
            );
            const y = useTransform(
              scrollYProgress,
              [start, start + 0.1, end - 0.1, end],
              [60, 0, 0, -60],
            );
            const blurValue = useTransform(
              scrollYProgress,
              [start - 0.02, start + 0.05, end - 0.05, end + 0.02],
              [10, 0, 0, 10],
            );
            const filter = useTransform(blurValue, (b) => `blur(${b}px)`);

            return (
              <motion.div
                key={i}
                style={{ opacity, y, filter }}
                className="absolute inset-0 flex items-center justify-center px-6 md:px-12"
              >
                <div className="max-w-3xl text-center">
                  <span className="inline-block text-xs font-body font-bold tracking-[0.3em] uppercase text-primary/70 mb-5">
                    {s.n}
                  </span>
                  <h2 className="text-2xl md:text-5xl lg:text-7xl font-display font-bold tracking-tight mb-4 md:mb-6">
                    <span className="gradient-text-primary">{s.title}</span>
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-lg lg:text-xl font-body leading-relaxed max-w-2xl mx-auto">
                    {s.text}
                  </p>
                  <div className="mt-8 mx-auto h-[2px] w-32 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Indicador de scroll lateral */}
        <div className="absolute right-3 md:right-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 md:gap-3">
          {slides.map((_, i) => {
            const active = useTransform(
              scrollYProgress,
              [(i - 0.3) / slides.length, i / slides.length, (i + 0.7) / slides.length, (i + 1) / slides.length],
              [0.3, 1, 1, 0.3],
            );
            return (
              <motion.div
                key={i}
                style={{ opacity: active, scale: active }}
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-primary"
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
