import { motion } from 'framer-motion';

export type IconShape = 'coin' | 'diamond';

export interface FloatingIcon {
  left: string;
  top: string;
  size: number;
  type: IconShape;
  accent: boolean;
  delay?: number;
}

// Posições que vêm do modelo Whalbyt (uma para cada seção).
export const heroIcons: FloatingIcon[] = [
  { left: '8%',  top: '15%', size: 64, type: 'coin',    accent: false, delay: 0 },
  { left: '85%', top: '25%', size: 48, type: 'diamond', accent: true,  delay: 0.4 },
  { left: '75%', top: '70%', size: 40, type: 'coin',    accent: false, delay: 1.2 },
  { left: '12%', top: '65%', size: 56, type: 'diamond', accent: true,  delay: 0.8 },
  { left: '50%', top: '80%', size: 32, type: 'coin',    accent: false, delay: 1.6 },
  { left: '35%', top: '10%', size: 36, type: 'diamond', accent: true,  delay: 0.2 },
];

export const pinnedIcons: FloatingIcon[] = [
  { left: '5%',  top: '20%', size: 72, type: 'diamond', accent: true,  delay: 0   },
  { left: '90%', top: '35%', size: 56, type: 'coin',    accent: false, delay: 0.6 },
  { left: '80%', top: '75%', size: 44, type: 'diamond', accent: true,  delay: 1.0 },
  { left: '15%', top: '70%', size: 60, type: 'coin',    accent: false, delay: 0.4 },
  { left: '45%', top: '5%',  size: 36, type: 'coin',    accent: false, delay: 1.4 },
];

export const featureIcons: FloatingIcon[] = [
  { left: '3%',  top: '10%', size: 80, type: 'coin',    accent: false, delay: 0   },
  { left: '92%', top: '15%', size: 64, type: 'diamond', accent: true,  delay: 0.4 },
  { left: '8%',  top: '80%', size: 48, type: 'diamond', accent: true,  delay: 0.8 },
  { left: '88%', top: '75%', size: 52, type: 'coin',    accent: false, delay: 1.2 },
  { left: '50%', top: '90%', size: 40, type: 'coin',    accent: false, delay: 1.6 },
  { left: '60%', top: '5%',  size: 44, type: 'diamond', accent: true,  delay: 0.2 },
  { left: '30%', top: '50%', size: 36, type: 'coin',    accent: false, delay: 1.0 },
];

function CoinIcon({ accent }: { accent: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={accent ? 'text-accent/30' : 'text-primary/30'}>
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1.5 14.66V18h-1v-1.34c-1.68-.18-2.93-1.12-3.04-2.53h1.52c.12.78.88 1.3 1.87 1.3 1.1 0 1.82-.6 1.82-1.44 0-.78-.56-1.2-1.76-1.46l-1.04-.22c-1.6-.34-2.38-1.2-2.38-2.46 0-1.42 1.12-2.36 2.64-2.56V6h1v1.34c1.44.2 2.56 1.1 2.62 2.44h-1.46c-.12-.72-.74-1.22-1.62-1.22-1 0-1.7.56-1.7 1.38 0 .72.52 1.12 1.68 1.38l.96.2c1.72.36 2.54 1.18 2.54 2.5 0 1.54-1.16 2.42-2.65 2.64z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

function DiamondIcon({ accent }: { accent: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={accent ? 'text-accent/30' : 'text-primary/30'}>
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <path
        d="M12 1.5l-7 10.17L12 15.72l7-4.05L12 1.5zM5 13.34L12 22.5l7-9.16-7 4.05-7-4.05z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}

export function FloatingIcons({ icons }: { icons: FloatingIcon[] }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
      {icons.map((ic, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: ic.left, top: ic.top, width: ic.size, height: ic.size }}
          animate={{
            y: [-12, 12, -12],
            rotate: [-12, 12, -12],
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{
            duration: 6 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: ic.delay ?? 0,
          }}
        >
          {ic.type === 'coin' ? <CoinIcon accent={ic.accent} /> : <DiamondIcon accent={ic.accent} />}
        </motion.div>
      ))}
    </div>
  );
}
