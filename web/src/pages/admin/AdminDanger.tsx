import { useState } from 'react';
import { AlertOctagon, AlertTriangle, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { admin } from '../../api/admin';

export default function AdminDanger() {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doWipe() {
    if (confirmText !== 'APAGAR TUDO') {
      setError('Digite "APAGAR TUDO" exatamente para confirmar.');
      return;
    }
    if (!confirm('Tem certeza? Isso é irreversível e fecha posições reais na Binance.')) return;

    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await admin.wipe();
      setReport(res.report);
      setConfirmText('');
    } catch (err: any) {
      setError(err?.message ?? 'falha no wipe');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout title="Zona de Risco">
      <div className="rounded-2xl border border-red-500/40 bg-red-500/[0.03] p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertOctagon className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display font-bold text-lg text-red-300">Apagar todos os dados</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Esta ação:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-0.5">
              <li>Cancela todas as ordens abertas de TODOS os usuários na Binance</li>
              <li>Fecha (a mercado) todas as posições abertas — realiza o PnL flutuante</li>
              <li>Apaga todos os usuários, ciclos, ordens, configs, chaves, snapshots, transações de tokens</li>
              <li>Mantém apenas o catálogo de pacotes</li>
            </ul>
            <p className="text-xs text-red-300 mt-3 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              É irreversível. Use só pra testes.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='Digite "APAGAR TUDO" para confirmar'
            className="flex-1 bg-secondary/40 border border-border rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-red-500/50"
          />
          <button
            onClick={doWipe}
            disabled={loading || confirmText !== 'APAGAR TUDO'}
            className="px-5 h-10 rounded-full bg-red-500 hover:bg-red-400 text-white font-display font-semibold text-sm tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Apagando...' : 'Apagar tudo'}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-300 text-sm px-3 py-2">
            {error}
          </div>
        )}

        {report && (
          <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 p-4">
            <div className="text-sm font-semibold text-accent mb-2">✓ Wipe concluído</div>
            <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
