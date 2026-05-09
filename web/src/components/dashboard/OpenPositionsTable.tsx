import { useState } from 'react';
import { Layers, ArrowUpRight, ArrowDownRight, X, Loader2 } from 'lucide-react';
import { api } from '../../api/client';

interface Position {
  symbol: string;
  position_side: 'LONG' | 'SHORT' | 'BOTH';
  qty: number;
  entry_price: number;
  mark_price: number;
  unrealized_pnl: number;
  leverage: number;
  isolated: boolean;
  notional: number;
}

interface Props {
  positions: Position[];
  userId: string;
  onClosed?: () => void;
}

export function OpenPositionsTable({ positions, userId, onClosed }: Props) {
  const [closingAll, setClosingAll] = useState(false);
  const [closingOne, setClosingOne] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function closeOne(p: Position) {
    if (closingOne || closingAll) return;
    if (!confirm(`Fechar ${p.symbol} ${p.position_side} a mercado? PnL atual: ${p.unrealized_pnl >= 0 ? '+' : ''}$${p.unrealized_pnl.toFixed(2)}`)) {
      return;
    }
    const key = `${p.symbol}-${p.position_side}`;
    setClosingOne(key);
    setFeedback(null);
    try {
      const result = await api.closePositions({
        user_id: userId,
        symbol: p.symbol,
        position_side: p.position_side === 'BOTH' ? undefined : (p.position_side as 'LONG' | 'SHORT'),
      });
      if (result.errors.length) {
        setFeedback({ ok: false, msg: `Erro ao fechar: ${result.errors[0].err}` });
      } else {
        setFeedback({ ok: true, msg: `${p.symbol} ${p.position_side} fechada.` });
      }
      onClosed?.();
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.message ?? 'Erro' });
    } finally {
      setClosingOne(null);
    }
  }

  async function closeAll() {
    if (closingOne || closingAll) return;
    if (positions.length === 0) return;
    if (!confirm(`Fechar TODAS as ${positions.length} posições a mercado? Realiza o PnL flutuante na hora.`)) {
      return;
    }
    setClosingAll(true);
    setFeedback(null);
    try {
      const result = await api.closePositions({ user_id: userId });
      if (result.errors.length) {
        setFeedback({ ok: false, msg: `${result.closed.length} fechada(s), ${result.errors.length} falharam.` });
      } else {
        setFeedback({ ok: true, msg: `${result.closed.length} posição(ões) fechada(s).` });
      }
      onClosed?.();
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.message ?? 'Erro' });
    } finally {
      setClosingAll(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
          <Layers className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">Posições Abertas (Binance)</span>
          <span className="text-xs text-muted-foreground/70">· {positions.length}</span>
        </div>
        {positions.length > 0 && (
          <button
            onClick={closeAll}
            disabled={closingAll || !!closingOne}
            className="flex items-center gap-1.5 h-9 px-3 md:px-4 rounded-full border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors text-xs md:text-sm font-display font-semibold tracking-wider disabled:opacity-50"
          >
            {closingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Fechar tudo</span>
            <span className="sm:hidden">Fechar</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`px-6 py-2 text-sm border-b border-border ${
            feedback.ok ? 'text-accent bg-accent/5' : 'text-red-300 bg-red-500/5'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {positions.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">
          Nenhuma posição aberta no momento.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                <th className="text-left font-medium px-6 py-3">Símbolo</th>
                <th className="text-left font-medium px-4 py-3">Lado</th>
                <th className="text-right font-medium px-4 py-3">Qty</th>
                <th className="text-right font-medium px-4 py-3">Entrada</th>
                <th className="text-right font-medium px-4 py-3">Mark</th>
                <th className="text-right font-medium px-4 py-3">Notional</th>
                <th className="text-right font-medium px-4 py-3">Alav.</th>
                <th className="text-right font-medium px-4 py-3">PnL</th>
                <th className="text-right font-medium px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const isLong = p.position_side === 'LONG' || (p.position_side === 'BOTH' && p.qty > 0);
                const positivePnl = p.unrealized_pnl >= 0;
                const key = `${p.symbol}-${p.position_side}`;
                const closing = closingOne === key;
                return (
                  <tr
                    key={`${p.symbol}-${p.position_side}-${i}`}
                    className="border-b border-border/60 last:border-0 hover:bg-card/60 transition-colors"
                  >
                    <td className="px-6 py-3 font-medium">{p.symbol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-display tracking-wider px-2 py-1 rounded-md ${
                          isLong
                            ? 'bg-accent/10 text-accent border border-accent/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {p.position_side === 'BOTH' ? (isLong ? 'LONG' : 'SHORT') : p.position_side}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{p.qty.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono">${formatPrice(p.entry_price)}</td>
                    <td className="px-4 py-3 text-right font-mono">${formatPrice(p.mark_price)}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      ${p.notional.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                      {p.leverage}x {p.isolated ? 'Iso' : 'Cross'}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${positivePnl ? 'text-accent' : 'text-red-400'}`}>
                      {positivePnl ? '+' : ''}${p.unrealized_pnl.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => closeOne(p)}
                        disabled={closing || closingAll || !!closingOne}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-red-500/30 text-red-300 hover:bg-red-500/10 transition-colors text-xs disabled:opacity-50"
                        title={`Fechar ${p.symbol} ${p.position_side} a mercado`}
                      >
                        {closing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Fechar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}
