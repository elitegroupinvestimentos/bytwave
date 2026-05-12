import { Globe, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LANGUAGES, useI18n, type Lang } from '../../lib/i18n';

export function LanguageSelector() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  function pick(code: Lang) {
    setLang(code);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-10 px-3 rounded-full border border-border hover:border-primary/40 transition-colors text-sm"
        aria-label="Idioma"
      >
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-mono uppercase">{current.code}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-44 rounded-xl border border-border bg-card shadow-xl py-1 z-30">
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-secondary/50 transition-colors ${
                  active ? 'text-primary' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                </span>
                {active && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
