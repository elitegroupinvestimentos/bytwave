import { motion } from 'framer-motion';

/**
 * Mascote — baleia robô (versão original).
 * Mantemos o nome do arquivo "WaveArt" para não precisar alterar imports.
 */
export function WaveArt({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -16, 0], rotateZ: [-1, 1, -1] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ filter: 'drop-shadow(0 0 60px rgba(168, 85, 247, 0.35))' }}
    >
      <svg viewBox="0 0 420 420" className="w-full h-full">
        <defs>
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5C7" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#0B7A91" />
          </linearGradient>
          <linearGradient id="bellyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E0F7FA" />
            <stop offset="100%" stopColor="#7DD3DC" />
          </linearGradient>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#0a1118" />
          </radialGradient>
          <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#17CFA1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>

        {/* Aura externa */}
        <circle cx="210" cy="210" r="190" fill="url(#bodyGrad)" opacity="0.06" />
        <circle cx="210" cy="210" r="150" fill="url(#bodyGrad)" opacity="0.08" />

        {/* Cauda */}
        <path
          d="M 90 180 Q 50 150 40 110 Q 70 130 95 165 Z"
          fill="url(#bodyGrad)"
          opacity="0.95"
        />
        <path
          d="M 90 220 Q 50 250 40 290 Q 70 270 95 235 Z"
          fill="url(#bodyGrad)"
          opacity="0.95"
        />

        {/* Corpo principal */}
        <ellipse cx="220" cy="210" rx="150" ry="100" fill="url(#bodyGrad)" />

        {/* Barriga */}
        <ellipse cx="225" cy="245" rx="115" ry="55" fill="url(#bellyGrad)" opacity="0.95" />

        {/* Linhas tech (circuitos) */}
        <g stroke="url(#accentGrad)" strokeWidth="1.5" fill="none" opacity="0.7">
          <path d="M 130 180 L 170 180 L 175 175 L 200 175" />
          <path d="M 130 200 L 160 200 L 165 195" />
          <circle cx="135" cy="180" r="2.5" fill="#17CFA1" />
          <circle cx="135" cy="200" r="2.5" fill="#A855F7" />
          <circle cx="200" cy="175" r="3" fill="#17CFA1" />
        </g>

        {/* Painel digital no peito */}
        <rect x="245" y="195" width="80" height="50" rx="8" fill="#0a1118" stroke="#A855F7" strokeWidth="1.5" opacity="0.9" />
        <g fill="#A855F7">
          <rect x="252" y="205" width="6" height="14" rx="1" />
          <rect x="263" y="210" width="6" height="9" rx="1" opacity="0.7" />
          <rect x="274" y="200" width="6" height="19" rx="1" />
          <rect x="285" y="208" width="6" height="11" rx="1" opacity="0.6" />
          <rect x="296" y="203" width="6" height="16" rx="1" />
          <rect x="307" y="212" width="6" height="7" rx="1" opacity="0.7" />
        </g>
        <text x="248" y="240" fill="#17CFA1" fontFamily="monospace" fontSize="9" fontWeight="700">
          BTC +0.6%
        </text>

        {/* Olho */}
        <circle cx="305" cy="170" r="22" fill="#0a1118" />
        <circle cx="305" cy="170" r="18" fill="url(#eyeGlow)" />
        <circle cx="312" cy="163" r="6" fill="#FFFFFF" />
        <motion.circle
          cx="305"
          cy="170"
          r="24"
          fill="none"
          stroke="#A855F7"
          strokeWidth="1.5"
          opacity="0.6"
          animate={{ r: [22, 30, 22], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        />

        {/* Boca sorrindo */}
        <path
          d="M 320 215 Q 340 230 355 220"
          stroke="#0a1118"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Barbatana */}
        <path
          d="M 200 130 Q 220 90 270 100 Q 250 130 220 145 Z"
          fill="url(#bodyGrad)"
          opacity="0.85"
        />

        {/* Bolhas de "sopro" subindo */}
        <g opacity="0.75">
          <motion.circle
            cx="180"
            cy="80"
            r="6"
            fill="#A855F7"
            animate={{ y: [-5, -25, -5], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.circle
            cx="195"
            cy="60"
            r="4"
            fill="#17CFA1"
            animate={{ y: [-3, -20, -3], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          />
          <motion.circle
            cx="170"
            cy="55"
            r="3"
            fill="#A855F7"
            animate={{ y: [-2, -15, -2], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
          />
        </g>

        {/* Mini gráfico holo sobre a cabeça */}
        <g opacity="0.85" transform="translate(225, 70)">
          <rect width="90" height="50" rx="8" fill="#0a1118" stroke="#17CFA1" strokeWidth="1" opacity="0.8" />
          <polyline
            points="6,40 18,30 28,35 38,20 48,28 60,12 72,18 84,8"
            stroke="url(#accentGrad)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="84" cy="8" r="2.5" fill="#17CFA1" />
        </g>
      </svg>
    </motion.div>
  );
}
