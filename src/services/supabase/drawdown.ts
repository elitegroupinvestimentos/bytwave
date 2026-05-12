import { supabase } from './client';

export type DrawdownType = 'percent' | 'fixed';

export interface DrawdownState {
  enabled: boolean;
  type: DrawdownType;
  limit_pct: number;       // ex: 10 = 10%
  limit_usd: number;       // ex: 50 = $50
  baseline_usd: number | null;
  triggered_at: string | null;
  triggered_equity: number | null;
}

export async function getDrawdownState(user_id: string): Promise<DrawdownState | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'drawdown_enabled, drawdown_type, drawdown_limit_pct, drawdown_limit_usd, drawdown_baseline_usd, drawdown_triggered_at, drawdown_triggered_equity',
    )
    .eq('id', user_id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    enabled: Boolean(data.drawdown_enabled),
    type: (data.drawdown_type ?? 'percent') as DrawdownType,
    limit_pct: Number(data.drawdown_limit_pct ?? 10),
    limit_usd: Number(data.drawdown_limit_usd ?? 50),
    baseline_usd:
      data.drawdown_baseline_usd != null ? Number(data.drawdown_baseline_usd) : null,
    triggered_at: data.drawdown_triggered_at ?? null,
    triggered_equity:
      data.drawdown_triggered_equity != null ? Number(data.drawdown_triggered_equity) : null,
  };
}

export interface SaveDrawdownInput {
  user_id: string;
  enabled: boolean;
  type: DrawdownType;
  limit_pct: number;
  limit_usd: number;
  baseline_usd?: number | null;
}

export async function saveDrawdownConfig(input: SaveDrawdownInput) {
  const patch: any = {
    drawdown_enabled: input.enabled,
    drawdown_type: input.type,
    drawdown_limit_pct: input.limit_pct,
    drawdown_limit_usd: input.limit_usd,
  };
  // Quando o usuário ativa proteção, baseline é capturado no momento da
  // ativação (vem do equity atual). Quando desativa, baseline e gatilho
  // são limpos pra começar do zero na próxima ativação.
  if (input.enabled) {
    if (input.baseline_usd != null) patch.drawdown_baseline_usd = input.baseline_usd;
  } else {
    patch.drawdown_baseline_usd = null;
    patch.drawdown_triggered_at = null;
    patch.drawdown_triggered_equity = null;
  }
  const { error } = await supabase.from('users').update(patch).eq('id', input.user_id);
  if (error) throw error;
}

export async function markDrawdownTriggered(user_id: string, equity: number) {
  const { error } = await supabase
    .from('users')
    .update({
      drawdown_triggered_at: new Date().toISOString(),
      drawdown_triggered_equity: equity,
    })
    .eq('id', user_id);
  if (error) throw error;
}

export async function resetDrawdownTrigger(user_id: string, baseline_usd: number) {
  // Reativa após trigger: limpa flag de disparo, atualiza baseline pro
  // equity atual e mantém enabled=true.
  const { error } = await supabase
    .from('users')
    .update({
      drawdown_enabled: true,
      drawdown_baseline_usd: baseline_usd,
      drawdown_triggered_at: null,
      drawdown_triggered_equity: null,
    })
    .eq('id', user_id);
  if (error) throw error;
}

/** Lista todos os user_id com proteção ativa e ainda não disparada. */
export async function listUsersWithActiveDrawdown(): Promise<string[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('drawdown_enabled', true)
    .is('drawdown_triggered_at', null);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.id);
}
