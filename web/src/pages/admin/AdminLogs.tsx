import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin } from '../../api/admin';

type Level = '' | 'debug' | 'info' | 'warn' | 'error';

const levelStyles: Record<string, string> = {
  debug: 'border-border bg-secondary/40 text-muted-foreground',
  info: 'border-primary/40 bg-primary/10 text-primary',
  warn: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  error: 'border-red-500/40 bg-red-500/10 text-red-400',
};

export default function AdminLogs() {
  const [level, setLevel] = useState<Level>('');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      admin
        .logs({ level: (level || undefined) as any, limit: 200 })
        .then((d) => alive && setLogs(d))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [level]);

  return (
    <AdminLayout title="Logs do Bot">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          Nível:
        </div>
        {(['', 'debug', 'info', 'warn', 'error'] as Level[]).map((l) => (
          <button
            key={l || 'all'}
            onClick={() => setLevel(l)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              level === l ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            {l === '' ? 'Todos' : l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
        {logs.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted-foreground">
            Sem logs nesta seleção.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="px-6 py-3 grid grid-cols-12 gap-3 text-sm items-start">
                <span className="col-span-2 text-xs text-muted-foreground font-mono">
                  {new Date(l.created_at).toLocaleString('pt-BR')}
                </span>
                <span
                  className={`col-span-1 text-[10px] font-display tracking-wider px-2 py-0.5 rounded-md border w-fit h-fit ${
                    levelStyles[l.level] ?? 'border-border bg-secondary/40 text-muted-foreground'
                  }`}
                >
                  {l.level.toUpperCase()}
                </span>
                <span className="col-span-2 text-xs font-mono text-muted-foreground">
                  {l.scope ?? '—'}
                </span>
                <span className="col-span-7">{l.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
