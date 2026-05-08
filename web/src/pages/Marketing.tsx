import { Megaphone, Construction } from 'lucide-react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';

export default function Marketing() {
  return (
    <DashboardLayout title="Marketing">
      <div className="rounded-2xl border border-border bg-card/40 p-12 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Megaphone className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold tracking-tight mb-2">
          Em breve
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Aqui virão campanhas, programas de afiliados e materiais de divulgação.
          Estamos preparando os detalhes.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Construction className="w-3.5 h-3.5" />
          Funcionalidade em desenvolvimento
        </div>
      </div>
    </DashboardLayout>
  );
}
