import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(220 33% 4%)',
        foreground: 'hsl(0 0% 98%)',
        muted: {
          DEFAULT: 'hsl(220 12% 14%)',
          foreground: 'hsl(220 8% 65%)',
        },
        border: 'hsl(220 12% 18%)',
        card: 'hsl(220 20% 7%)',
        primary: {
          DEFAULT: 'hsl(185 80% 50%)',
          foreground: 'hsl(220 33% 4%)',
        },
        accent: {
          DEFAULT: 'hsl(165 80% 45%)',
          foreground: 'hsl(220 33% 4%)',
        },
        secondary: {
          DEFAULT: 'hsl(220 15% 10%)',
          foreground: 'hsl(0 0% 90%)',
        },
        'brand-gray': '#1A1A1A',
      },
      fontFamily: {
        display: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        body: ['"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
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
