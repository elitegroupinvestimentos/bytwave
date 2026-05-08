import { BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchKlines, Kline } from '../../api/client';

type Interval = '1h' | '4h' | '24h';

interface PriceChartProps {
  symbol: string;
}

const intervalMap: Record<Interval, { binance: '5m' | '15m' | '1h'; limit: number }> = {
  '1h':  { binance: '5m',  limit: 12 },
  '4h':  { binance: '15m', limit: 16 },
  '24h': { binance: '1h',  limit: 24 },
};

export function PriceChart({ symbol }: PriceChartProps) {
  const [interval, setInterval] = useState<Interval>('24h');
  const [data, setData] = useState<Kline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const cfg = intervalMap[interval];
    fetchKlines(symbol, cfg.binance, cfg.limit)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol, interval]);

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="w-4 h-4 text-primary" />
          Preço {symbol}
        </div>
        <div className="flex gap-1 bg-secondary/40 p-1 rounded-full">
          {(['1h', '4h', '24h'] as Interval[]).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                interval === iv
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[260px] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Sem dados
          </div>
        ) : (
          <Chart data={data} interval={interval} />
        )}
      </div>
    </div>
  );
}

function Chart({ data, interval }: { data: Kline[]; interval: Interval }) {
  const W = 800;
  const H = 260;
  const PAD_L = 50;
  const PAD_R = 16;
  const PAD_T = 12;
  const PAD_B = 28;

  const closes = data.map((d) => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = Math.max(max - min, 0.0001);

  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const points = data.map((d, i) => ({
    x: PAD_L + (i / Math.max(data.length - 1, 1)) * innerW,
    y: PAD_T + (1 - (d.close - min) / span) * innerH,
  }));

  const path = smoothPath(points);
  const area = `${path} L ${points[points.length - 1].x} ${PAD_T + innerH} L ${points[0].x} ${PAD_T + innerH} Z`;

  // Y-axis ticks
  const ticks = 4;
  const yLabels = Array.from({ length: ticks }, (_, i) => {
    const v = max - (i / (ticks - 1)) * span;
    return { y: PAD_T + (i / (ticks - 1)) * innerH, label: formatTick(v) };
  });

  // X-axis ticks (show 5 labels)
  const xCount = 5;
  const xLabels = Array.from({ length: xCount }, (_, i) => {
    const idx = Math.round(((data.length - 1) * i) / (xCount - 1));
    const t = new Date(data[idx].time);
    return {
      x: PAD_L + (idx / Math.max(data.length - 1, 1)) * innerW,
      label: formatTime(t, interval),
    };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1AD5E6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1AD5E6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid horizontal */}
      {yLabels.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={t.y}
            y2={t.y}
            stroke="hsl(220 12% 18%)"
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity="0.6"
          />
          <text x={PAD_L - 8} y={t.y + 4} fill="hsl(220 8% 50%)" fontSize="10" textAnchor="end">
            {t.label}
          </text>
        </g>
      ))}

      {/* X labels */}
      {xLabels.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={H - 8}
          fill="hsl(220 8% 50%)"
          fontSize="10"
          textAnchor="middle"
        >
          {t.label}
        </text>
      ))}

      {/* Area fill */}
      <path d={area} fill="url(#chartArea)" />
      {/* Line */}
      <path d={path} stroke="#1AD5E6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point */}
      {points.length > 0 && (
        <>
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="4"
            fill="#1AD5E6"
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="9"
            fill="#1AD5E6"
            opacity="0.25"
          />
        </>
      )}
    </svg>
  );
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  const m01 = mid(points[0], points[1]);
  d += ` L ${m01.x} ${m01.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const next = mid(points[i], points[i + 1]);
    d += ` Q ${points[i].x} ${points[i].y}, ${next.x} ${next.y}`;
  }
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}

function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function formatTick(v: number): string {
  if (v >= 1000) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

function formatTime(d: Date, iv: Interval): string {
  if (iv === '24h' || iv === '4h') {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
