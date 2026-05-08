import { LogoMark } from './Logo';

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <LogoMark className="w-8 h-8" />
              <span className="font-display font-bold text-xl">
                Byt<span className="gradient-text-primary">wave</span>
              </span>
            </div>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              A nova onda do trading automatizado.
              IA avançada para Binance Futures, 24/7.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm tracking-wider text-foreground uppercase mb-4">
              Produto
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Recursos</a></li>
              <li><a href="#how" className="hover:text-primary transition-colors">Como funciona</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Preços</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-sm tracking-wider text-foreground uppercase mb-4">
              Empresa
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bytwave. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Trading envolve risco. Resultados passados não garantem retornos futuros.
          </p>
        </div>
      </div>
    </footer>
  );
}
