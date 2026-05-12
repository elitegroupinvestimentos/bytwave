import { CreditCard, Wallet, ChevronDown, LogOut, Menu, Globe, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { TokenBalancePill } from './TokenBalancePill';
import { LanguageSelector } from './LanguageSelector';
import { clearSession } from '../../api/client';
import { useI18n, LANGUAGES, type Lang } from '../../lib/i18n';

interface TopbarProps {
  title: string;
  userId: string;
  balance?: number;
  userName?: string;
  userInitials?: string;
  onOpenMenu?: () => void;
}

export function Topbar({
  title,
  userId,
  balance = 0,
  userName = 'usuário',
  userInitials = 'U',
  onOpenMenu,
}: TopbarProps) {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <header className="h-16 shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-border bg-background/60 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Hambúrguer (mobile) */}
        <button
          onClick={onOpenMenu}
          className="md:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:text-foreground"
          aria-label="abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-display font-semibold text-base md:text-xl tracking-tight truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {/* Comprar Tokens — texto só em md+ */}
        <Link
          to="/finance"
          className="hidden sm:flex items-center gap-2 px-3 md:px-4 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:scale-[1.02] transition-all box-glow"
        >
          <CreditCard className="w-4 h-4" />
          <span className="hidden md:inline">{t('Comprar Tokens')}</span>
          <span className="md:hidden">{t('Comprar')}</span>
        </Link>

        <TokenBalancePill userId={userId} />

        {/* Saldo USDT — só em md+ (no mobile fica oculto, aparece no menu) */}
        <div
          className="hidden md:flex items-center gap-2 px-4 h-10 rounded-full border border-border text-sm font-medium"
          title="Saldo USDT na Binance"
        >
          <Wallet className="w-4 h-4 text-muted-foreground" />
          ${balance.toFixed(2)}
        </div>

        {/* Idioma — só desktop. Mobile entra no dropdown do perfil. */}
        <div className="hidden md:block">
          <LanguageSelector />
        </div>

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2 md:pr-3 h-10 rounded-full border border-border hover:border-primary/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-primary-foreground">
              {userInitials}
            </div>
            <span className="hidden sm:inline text-sm font-medium max-w-[100px] md:max-w-[140px] truncate">
              {userName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-12 w-56 rounded-xl border border-border bg-card shadow-xl py-1 z-30">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-xs text-muted-foreground">Logado como</div>
                <div className="text-sm font-medium truncate">{userName}</div>
              </div>
              {/* Saldo USDT no dropdown — útil em mobile */}
              <div className="md:hidden px-4 py-2 text-sm border-b border-border flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  {t('Saldo Binance')}
                </span>
                <span className="font-mono">${balance.toFixed(2)}</span>
              </div>
              <Link
                to="/config"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-secondary/50"
              >
                {t('Configurações')}
              </Link>
              <Link
                to="/finance"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-secondary/50"
              >
                {t('Tokens')}
              </Link>

              {/* Idioma — só mobile (desktop tem botão dedicado no header) */}
              <div className="md:hidden border-t border-border mt-1">
                <button
                  onClick={() => setLangOpen((v) => !v)}
                  className="w-full px-4 py-2 text-sm hover:bg-secondary/50 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    {LANGUAGES.find((l) => l.code === lang)?.flag}{' '}
                    {LANGUAGES.find((l) => l.code === lang)?.label}
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 text-muted-foreground transition-transform ${
                      langOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {langOpen && (
                  <div className="bg-secondary/30">
                    {LANGUAGES.map((l) => {
                      const active = l.code === lang;
                      return (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLang(l.code as Lang);
                            setLangOpen(false);
                            setMenuOpen(false);
                          }}
                          className={`w-full pl-9 pr-4 py-1.5 text-sm flex items-center justify-between hover:bg-secondary/50 ${
                            active ? 'text-primary' : ''
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-base leading-none">{l.flag}</span>
                            {l.label}
                          </span>
                          {active && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="my-1 border-t border-border" />
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('Sair')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
