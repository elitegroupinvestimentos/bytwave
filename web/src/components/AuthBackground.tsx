import { motion } from 'framer-motion';

/**
 * Fundo sutil das telas de auth: ondas senoidais finas, números/bits espalhados,
 * e um glow ciano radial central. Combina com a marca Bytwave.
 */
export function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Glow radial central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-primary/[0.04] blur-[140px]" />

      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="aWave1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0" />
            <stop offset="50%" stopColor="#A855F7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aWave2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#17CFA1" stopOpacity="0" />
            <stop offset="50%" stopColor="#17CFA1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#17CFA1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ondas de fundo (5 layers, opacidades baixas) */}
        {[
          { y: 200, amp: 22, dur: 18, period: 320, grad: 'aWave1', op: 0.25 },
          { y: 350, amp: 30, dur: 22, period: 380, grad: 'aWave2', op: 0.22 },
          { y: 500, amp: 26, dur: 16, period: 280, grad: 'aWave1', op: 0.18 },
          { y: 700, amp: 32, dur: 24, period: 360, grad: 'aWave2', op: 0.18 },
          { y: 100, amp: 18, dur: 26, period: 420, grad: 'aWave1', op: 0.12 },
        ].map((w, i) => (
          <motion.g
            key={i}
            animate={{ x: [0, -w.period] }}
            transition={{ duration: w.dur, repeat: Infinity, ease: 'linear' }}
          >
            <path
              d={buildWavePath(w.y, w.amp, w.period, 1600)}
              stroke={`url(#${w.grad})`}
              strokeWidth="1.4"
              fill="none"
              opacity={w.op}
              strokeLinecap="round"
            />
          </motion.g>
        ))}

        {/* Bits/números espalhados (texturas) */}
        {scatterBits.map((b, i) => (
          <text
            key={i}
            x={b.x}
            y={b.y}
            fontFamily="ui-monospace, Menlo, monospace"
            fontSize={b.size}
            fill="#A855F7"
            opacity={b.op}
          >
            {b.t}
          </text>
        ))}
      </svg>
    </div>
  );
}

function buildWavePath(y: number, amp: number, period: number, totalWidth: number) {
  const startX = -period;
  let d = `M ${startX} ${y} `;
  d += `Q ${startX + period / 4} ${y - amp} ${startX + period / 2} ${y} `;
  let x = startX + period / 2;
  while (x < totalWidth + period * 2) {
    x += period / 2;
    d += `T ${x} ${y} `;
  }
  return d;
}

const scatterBits = [
  { x: 120, y: 100, t: '0', size: 12, op: 0.18 },
  { x: 260, y: 150, t: '1', size: 10, op: 0.14 },
  { x: 220, y: 170, t: '0', size: 9, op: 0.12 },
  { x: 980, y: 80, t: '1', size: 11, op: 0.16 },
  { x: 1180, y: 130, t: '0', size: 13, op: 0.18 },
  { x: 1380, y: 200, t: '1', size: 10, op: 0.13 },
  { x: 80, y: 380, t: '8', size: 14, op: 0.18 },
  { x: 280, y: 460, t: '$', size: 13, op: 0.16 },
  { x: 320, y: 380, t: '0', size: 9, op: 0.12 },
  { x: 1100, y: 380, t: '$', size: 12, op: 0.14 },
  { x: 1320, y: 360, t: '≡', size: 16, op: 0.12 },
  { x: 160, y: 700, t: '0', size: 12, op: 0.16 },
  { x: 460, y: 740, t: '1', size: 10, op: 0.13 },
  { x: 1200, y: 720, t: '0', size: 12, op: 0.16 },
];
