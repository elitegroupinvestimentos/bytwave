import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';

/**
 * Navbar idêntica ao Whalbyt:
 *  - mobile: logo na esquerda, botões à direita
 *  - desktop: spacer fantasma à esquerda, LOGO CENTRALIZADO, botões à direita
 */
export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-20 w-full px-4 md:px-12 py-4 md:py-6 flex items-center justify-between"
    >
      {/* Mobile: logo esquerda */}
      <div className="flex-shrink-0 md:hidden">
        <BrandText className="text-xl drop-shadow-[0_0_18px_rgba(168,85,247,0.45)]" />
      </div>

      {/* Desktop: spacer fantasma à esquerda (mantém o logo central) */}
      <div className="hidden md:block w-40" />

      {/* Desktop: logo no CENTRO */}
      <div className="hidden md:flex flex-1 justify-center">
        <BrandText className="text-3xl drop-shadow-[0_0_24px_rgba(168,85,247,0.5)]" />
      </div>

      {/* Botões à direita */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          aria-label="Idioma"
          className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-muted-foreground transition-all duration-300 hover:scale-110 hover:border-primary/50 hover:text-primary"
        >
          <Globe className="w-3.5 h-3.5" />
        </button>
        <Link
          to="/login"
          className="font-display font-semibold text-[10px] md:text-sm tracking-wider px-3 md:px-5 py-2 md:py-2.5 rounded-full border border-border text-foreground transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:bg-primary/5"
        >
          Login
        </Link>
        <Link
          to="/register"
          className="font-display font-semibold text-[10px] md:text-sm tracking-wider px-3 md:px-5 py-2 md:py-2.5 rounded-full bg-primary text-primary-foreground transition-all duration-300 hover:scale-105 box-glow"
        >
          Cadastrar
        </Link>
      </div>
    </motion.nav>
  );
}

/**
 * Wordmark "Bytwave" com símbolo de onda + texto gradient.
 * Tudo SVG inline para escalar fácil e ter glow.
 */
function BrandText({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="w-9 h-9" />
      <span className="font-display font-bold tracking-tight text-foreground">
        Byt<span className="gradient-text-primary">wave</span>
      </span>
    </div>
  );
}
