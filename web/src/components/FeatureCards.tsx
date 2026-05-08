import { motion } from 'framer-motion';
import { BarChart3, Bell, Shield } from 'lucide-react';
import { FloatingIcons, featureIcons } from './FloatingIcons';

const features = [
  {
    icon: BarChart3,
    title: 'IA Avançada',
    desc: 'Algoritmos de machine learning analisam o mercado 24/7 e tomam decisões baseadas em dados em tempo real.',
    tags: ['Análise em tempo real', 'Decisões autônomas', 'Aprendizado contínuo'],
    color: 'primary',
  },
  {
    icon: Bell,
    title: 'Alertas Inteligentes',
    desc: 'Receba notificações personalizadas sobre oportunidades, mudanças de tendência e status das suas operações.',
    tags: ['Notificações push', 'Alertas de tendência', 'Status em tempo real'],
    color: 'accent',
  },
  {
    icon: Shield,
    title: 'Segurança Máxima',
    desc: 'Seus fundos e dados protegidos com os mais altos padrões de segurança do mercado de criptomoedas.',
    tags: ['AES-256-GCM', '2FA obrigatório', 'Auditoria contínua'],
    color: 'primary',
  },
] as const;

export function FeatureCards() {
  return (
    <section id="features" className="relative py-28 md:py-36 bg-background overflow-hidden">
      {/* Floating icons */}
      <FloatingIcons icons={featureIcons} />

      {/* Glows decorativos */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.04] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-accent/[0.03] blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 md:mb-24"
        >
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-5">
            <span className="gradient-text-primary">Tecnologia de Ponta</span>{' '}
            <span className="text-foreground">para seu Trading</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto font-body">
            Tudo que você precisa para automatizar seus trades com segurança e eficiência.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 60, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative rounded-3xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-primary/50 hover:bg-card/60"
            >
              {/* Hover gradient */}
              <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${
                  f.color === 'primary'
                    ? 'bg-gradient-to-b from-primary/15 to-transparent'
                    : 'bg-gradient-to-b from-accent/15 to-transparent'
                }`}
              />
              {/* Top glow */}
              <div
                className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                  background:
                    f.color === 'primary'
                      ? 'radial-gradient(circle, rgba(26,213,230,0.3), transparent)'
                      : 'radial-gradient(circle, rgba(23,207,161,0.3), transparent)',
                }}
              />

              <div className="relative z-10 p-8 md:p-10 flex flex-col h-full min-h-[400px] md:min-h-[440px]">
                <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-7 md:mb-8 group-hover:bg-primary/20 transition-all duration-500">
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 box-glow" />
                  <f.icon className="w-7 h-7 md:w-8 md:h-8 text-primary transition-transform duration-500 group-hover:scale-110 relative" />
                </div>

                <h3 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-3 md:mb-4 tracking-tight">
                  {f.title}
                </h3>

                <p className="text-muted-foreground text-sm md:text-base font-body leading-relaxed mb-7 md:mb-8 flex-grow">
                  {f.desc}
                </p>

                <div className="flex flex-wrap gap-2">
                  {f.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 text-xs font-body font-medium px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-secondary-foreground group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors duration-500"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                      {t}
                    </span>
                  ))}
                </div>

                {/* Bottom line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-transparent via-primary/60 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-1000" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
