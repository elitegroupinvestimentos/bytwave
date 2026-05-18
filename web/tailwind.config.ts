import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "Aurora": preto + brand-gray + branco. Accent verde
        // mantido pra estados positivos (PnL); vermelho via Tailwind red-*.
        background: '#000000',
        foreground: '#FFFFFF',
        muted: {
          DEFAULT: '#1A1A1A',
          foreground: 'rgba(255,255,255,0.55)',
        },
        border: 'rgba(255,255,255,0.10)',
        card: '#0A0A0A',
        primary: {
          DEFAULT: '#FFFFFF',
          foreground: '#000000',
        },
        accent: {
          DEFAULT: 'hsl(160 84% 45%)',
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: '#1A1A1A',
          foreground: '#FFFFFF',
        },
        'brand-gray': '#1A1A1A',
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.8s ease-out forwards',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
