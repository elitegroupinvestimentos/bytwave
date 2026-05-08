import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { WaveArt } from './WaveArt';
import { FloatingIcons, heroIcons } from './FloatingIcons';

/**
 * Hero — estrutura idêntica ao modelo Whalbyt:
 *  - texto à esquerda (full width)
 *  - wave art fixa no canto superior direito (lg only)
 *  - mascote inline embaixo do texto em mobile (lg:hidden)
 *  - glow circle pulsando atrás
 *  - ícones flutuantes (moedas + diamantes) ao redor
 */
export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden gradient-hero">
      {/* Grid de fundo + glow */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] animate-glow-pulse pointer-events-none" />

      {/* Floating icons */}
      <FloatingIcons icons={heroIcons} />

      {/* Conteúdo */}
      <div className="relative z-10 flex-1 flex items-center w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="w-full">
          {/* Texto — largura controlada para não bater na baleia, mas sem coluna fantasma */}
          <div className="flex flex-col items-start max-w-2xl lg:max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium tracking-wider text-primary uppercase">
                Beta · Binance Futures
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-3xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.05] mb-4 md:mb-6 text-left"
            >
              <span className="text-foreground text-glow">Trade com</span>
              <br />
              <span className="gradient-text-primary">Inteligência</span>
              <br />
              <span className="text-foreground text-glow">Artificial</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-muted-foreground text-sm md:text-lg max-w-md mb-6 md:mb-10 text-left font-body"
            >
              Automatize seus trades com IA avançada. Resultados consistentes, risco controlado, disponível 24/7.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              <button className="group relative font-display font-semibold text-xs md:text-sm tracking-wider px-6 md:px-8 py-3 md:py-4 rounded-full bg-primary text-primary-foreground transition-all duration-300 hover:scale-105 box-glow">
                <span className="flex items-center gap-2">
                  Explorar Plataforma
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
              <button className="font-display font-semibold text-xs md:text-sm tracking-wider px-6 md:px-8 py-3 md:py-4 rounded-full border border-border text-foreground transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:bg-primary/5">
                Saiba Mais
              </button>
            </motion.div>
          </div>

          {/* Mobile-only: mascote inline embaixo do texto */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.0, delay: 0.3 }}
            className="flex justify-center mt-12 lg:hidden w-full"
          >
            <WaveArt className="w-64 md:w-80 drop-shadow-[0_0_50px_hsla(185,80%,50%,0.25)]" />
          </motion.div>
        </div>
      </div>

      {/* Fade bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}

/**
 * Wave art FIXA no canto superior direito — só em desktop (lg+).
 * Renderizada fora da seção Hero para que ela fique fixa enquanto o usuário rola.
 */
export function FixedWaveArt() {
  return (
    <div className="fixed top-[18%] right-[2%] z-10 pointer-events-none lg:block hidden xl:right-[5%]">
      <WaveArt className="w-[480px] xl:w-[540px] drop-shadow-[0_0_60px_hsla(185,80%,50%,0.3)] opacity-95" />
    </div>
  );
}
