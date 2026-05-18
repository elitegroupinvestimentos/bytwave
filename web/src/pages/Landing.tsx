import { ArrowRight, Menu, X, Globe, Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LANGUAGES, useI18n, type Lang } from '../lib/i18n';

const BG_VIDEO =
  'https://stream.mux.com/BuGGTsiXq1T00WUb8qfURrHkTCbhrkfFLSv4uAOZzdhw.m3u8';

const NAV_ITEM_KEYS = ['Plataforma', 'Como funciona', 'Defesa IA', 'Conexões', 'Insights'] as const;

function HamburgerButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300"
      style={{ backgroundColor: open ? '#1a1a1a' : 'transparent' }}
      aria-label="Toggle menu"
    >
      <span
        className="absolute transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          opacity: open ? 0 : 1,
          transform: open ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
        }}
      >
        <Menu size={20} color="white" strokeWidth={1.5} />
      </span>
      <span
        className="absolute transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)',
        }}
      >
        <X size={20} color="white" strokeWidth={1.5} />
      </span>
    </button>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <div
        className="fixed inset-0 z-30 lg:hidden transition-all duration-500"
        style={{
          backdropFilter: open ? 'blur(12px)' : 'blur(0px)',
          backgroundColor: open ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      <div
        className="fixed top-0 left-0 right-0 z-40 lg:hidden overflow-hidden"
        style={{
          maxHeight: open ? '420px' : '0px',
          transition: 'max-height 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div
          className="pt-20 pb-6 px-5"
          style={{
            backgroundColor: 'rgba(8,8,8,0.97)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEM_KEYS.map((item, i) => (
              <a
                key={item}
                href="#"
                onClick={onClose}
                className="text-white/70 hover:text-white text-base py-3 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 flex items-center justify-between group"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateY(0)' : 'translateY(-8px)',
                  transition: `opacity 0.4s cubic-bezier(0.23,1,0.32,1) ${i * 50 + 80}ms, transform 0.4s cubic-bezier(0.23,1,0.32,1) ${i * 50 + 80}ms, color 0.2s, background 0.2s`,
                }}
              >
                {t(item)}
                <ArrowRight
                  size={14}
                  className="opacity-0 group-hover:opacity-40 -translate-x-1 group-hover:translate-x-0 transition-all duration-200"
                />
              </a>
            ))}
          </div>

          <div
            className="mt-5 pt-5"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0)' : 'translateY(-8px)',
              transition: `opacity 0.4s cubic-bezier(0.23,1,0.32,1) 360ms, transform 0.4s cubic-bezier(0.23,1,0.32,1) 360ms`,
            }}
          >
            <Link
              to="/register"
              onClick={onClose}
              className="block w-full text-center py-3 rounded-full text-black text-sm font-medium transition-all duration-300 hover:opacity-80"
              style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#ffffff' }}
            >
              {t('Entrar na lista')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function Navbar() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 lg:px-10 lg:py-6">
        <Link
          to="/"
          className="text-white text-xl font-semibold tracking-tight"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          bytwave
        </Link>
        <div
          className="hidden lg:flex items-center gap-1 rounded-full px-2 py-1.5"
          style={{ backgroundColor: '#0C0C0C' }}
        >
          {NAV_ITEM_KEYS.map((item) => (
            <a
              key={item}
              href="#"
              className="text-white/80 hover:text-white text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-all duration-200"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {t(item)}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <HamburgerButton open={open} onClick={() => setOpen((v) => !v)} />
          <Link
            to="/register"
            className="hidden lg:block text-sm font-medium px-5 py-2 rounded-full text-black transition-all duration-300 hover:opacity-80"
            style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#ffffff' }}
          >
            {t('Entrar na lista')}
          </Link>
        </div>
      </nav>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function LangPicker() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div className="mt-6 relative z-30" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-white/70 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full border border-white/15 hover:border-white/30 bg-black/40 backdrop-blur-md transition-all"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <Globe size={14} />
        <span>{current.flag}</span>
        <span className="uppercase tracking-wider">{current.code}</span>
      </button>
      {open && (
        <div
          className="absolute left-1/2 -translate-x-1/2 mt-2 w-44 rounded-xl border border-white/15 bg-black/95 backdrop-blur-md shadow-2xl py-1 z-40"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code as Lang);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors ${
                  active ? 'text-white' : 'text-white/70'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                </span>
                {active && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Safari toca HLS nativo via src direto.
    if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = BG_VIDEO;
      v.play().catch(() => undefined);
      return;
    }

    // Chrome/Firefox/etc → hls.js (dynamic import pra não inchar o bundle)
    let hls: any = null;
    let cancelled = false;
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported() || !videoRef.current) return;
      hls = new Hls({ enableWorker: true });
      hls.loadSource(BG_VIDEO);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current?.play().catch(() => undefined);
      });
    });
    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, []);

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-black"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />

      <Navbar />

      <div className="relative z-20 flex flex-col items-center text-center pt-[90px] md:pt-[120px] px-5 sm:px-8">
        <h1
          className="text-white font-normal leading-[1.12] tracking-tight max-w-3xl"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 'clamp(1.75rem, 5vw, 2.6rem)',
          }}
        >
          {t('Onde a precisão encontra seu limite')}
          <br className="hidden sm:block" />
          {' '}{t('e a visão reescreve o que vem a seguir')}
        </h1>

        <p
          className="mt-5 md:mt-6 text-white/60 text-sm md:text-base leading-relaxed max-w-xs sm:max-w-sm md:max-w-md"
          style={{ fontFamily: "'Courier New', Courier, monospace", letterSpacing: '0.01em' }}
        >
          {t('uma ponte fluida — onde ambição bruta')}
          <br className="hidden sm:block" />
          {' '}{t('e a clareza da máquina convergem como uma só')}
        </p>

        <Link
          to="/register"
          className="mt-7 md:mt-8 flex items-center gap-2.5 px-5 py-2.5 rounded-full text-black text-sm font-medium transition-all duration-300 hover:opacity-80 group"
          style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#ffffff' }}
        >
          {t('Veja em ação')}
          <ArrowRight
            size={15}
            className="group-hover:translate-x-0.5 transition-transform duration-200"
          />
        </Link>

        <LangPicker />
      </div>
    </div>
  );
}
