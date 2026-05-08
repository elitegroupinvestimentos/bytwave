/**
 * Logo Bytwave: símbolo (onda binária) + wordmark.
 */
export function LogoMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1AD5E6" />
          <stop offset="100%" stopColor="#17CFA1" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="hsl(220 33% 6%)" />
      <path
        d="M 8 38 Q 16 18 24 38 T 40 38 T 56 38"
        stroke="url(#lg-grad)"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="3" fill="#1AD5E6" />
    </svg>
  );
}

export function LogoWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="w-9 h-9 drop-shadow-[0_0_18px_rgba(26,213,230,0.45)]" />
      <span className="font-display font-bold tracking-tight text-2xl text-foreground">
        Byt<span className="gradient-text-primary">wave</span>
      </span>
    </div>
  );
}
