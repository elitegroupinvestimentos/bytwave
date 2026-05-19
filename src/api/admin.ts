import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { supabase } from '../services/supabase/client';
import { grantTokens } from '../services/supabase/tokens';
import { getBinanceClient, invalidateBinanceClient } from '../services/binance/factory';
import { botLog } from '../services/logs/logger';
import {
  listOAuthProviders,
  upsertOAuthProvider,
  deleteOAuthProvider,
} from '../services/supabase/oauth';
import {
  listPaymentGateways,
  upsertPaymentGateway,
  deletePaymentGateway,
} from '../services/supabase/paymentGateways';

export const adminRouter = Router();

// ─────────────────────────────────────────────────────────────────────
// Auth: header x-admin-password === env.ADMIN_PASSWORD
// MVP simples — em produção: trocar por JWT + role admin.
// ─────────────────────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const provided = req.headers['x-admin-password'];
  if (typeof provided !== 'string' || provided !== env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

adminRouter.use(requireAdmin);

function ah(fn: (req: Request, res: Response) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ─────────────────────────────────────────────────────────────────────
// Login check (devolve 200 se senha bater)
// ─────────────────────────────────────────────────────────────────────
adminRouter.post('/login', (_req, res) => {
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────
// Overview (KPIs)
// ─────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/overview',
  ah(async (_req, res) => {
    const [users, cycles, tx, packs, snap] = await Promise.all([
      supabase.from('users').select('id, token_balance', { count: 'exact' }),
      supabase.from('cycles').select('id, status, realized_pnl_usdt', { count: 'exact' }),
      supabase.from('token_transactions').select('delta, reason'),
      supabase.from('token_packs').select('id', { count: 'exact' }).eq('active', true),
      supabase.from('account_snapshots').select('total_balance').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const totalUsers = users.count ?? 0;
    const totalTokensInCirculation = (users.data ?? []).reduce(
      (sum: number, u: any) => sum + Number(u.token_balance ?? 0),
      0,
    );
    const totalCycles = cycles.count ?? 0;
    const openCycles = (cycles.data ?? []).filter((c: any) => c.status === 'open').length;
    const closedCycles = (cycles.data ?? []).filter((c: any) => c.status === 'closed').length;
    const realizedPnl = (cycles.data ?? []).reduce(
      (s: number, c: any) => s + Number(c.realized_pnl_usdt ?? 0),
      0,
    );

    const purchases = (tx.data ?? []).filter((t: any) => t.reason === 'pack_purchase');
    const totalTokensPurchased = purchases.reduce((s: number, t: any) => s + Number(t.delta), 0);

    const consumptions = (tx.data ?? []).filter((t: any) => t.delta < 0);
    const totalTokensConsumed = consumptions.reduce(
      (s: number, t: any) => s + Math.abs(Number(t.delta)),
      0,
    );

    res.json({
      total_users: totalUsers,
      total_cycles: totalCycles,
      open_cycles: openCycles,
      closed_cycles: closedCycles,
      realized_pnl_usdt: realizedPnl,
      total_tokens_in_circulation: totalTokensInCirculation,
      total_tokens_purchased: totalTokensPurchased,
      total_tokens_consumed: totalTokensConsumed,
      active_packs: packs.count ?? 0,
      last_balance_snapshot: snap.data ?? null,
    });
  }),
);

// ─────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/users',
  ah(async (req, res) => {
    const search = (req.query.search as string | undefined)?.trim();
    let q = supabase
      .from('users')
      .select('id, email, name, token_balance, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (search) {
      q = q.ilike('email', `%${search}%`);
    }
    const { data, error } = await q;
    if (error) throw error;

    // Conta ciclos por usuário (1 query simples)
    const userIds = (data ?? []).map((u: any) => u.id);
    const { data: cycleCounts } = await supabase
      .from('cycles')
      .select('user_id, status')
      .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);

    const counts = new Map<string, { open: number; closed: number; total: number }>();
    for (const c of cycleCounts ?? []) {
      const cur = counts.get((c as any).user_id) ?? { open: 0, closed: 0, total: 0 };
      cur.total++;
      if ((c as any).status === 'open') cur.open++;
      if ((c as any).status === 'closed') cur.closed++;
      counts.set((c as any).user_id, cur);
    }

    res.json(
      (data ?? []).map((u: any) => ({
        ...u,
        cycles: counts.get(u.id) ?? { open: 0, closed: 0, total: 0 },
      })),
    );
  }),
);

adminRouter.get(
  '/users/:id',
  ah(async (req, res) => {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'not found' });

    const [keys, configs, cycles, txs] = await Promise.all([
      supabase.from('binance_keys').select('id, mode, label, created_at').eq('user_id', user.id),
      supabase.from('strategy_configs').select('*').eq('user_id', user.id),
      supabase
        .from('cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false })
        .limit(50),
      supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    res.json({
      user,
      binance_keys: keys.data ?? [],
      strategy_configs: configs.data ?? [],
      recent_cycles: cycles.data ?? [],
      recent_token_transactions: txs.data ?? [],
    });
  }),
);

const grantSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(1).default('admin_grant'),
  note: z.string().optional(),
});

adminRouter.post(
  '/users/:id/grant',
  ah(async (req, res) => {
    const body = grantSchema.parse(req.body);
    const result = await grantTokens({
      user_id: req.params.id,
      amount: body.amount,
      reason: body.reason,
      metadata: body.note ? { note: body.note, by: 'admin' } : { by: 'admin' },
    });
    await botLog({
      level: 'info',
      scope: 'admin',
      user_id: req.params.id,
      message: `Admin granted +${body.amount} tokens (reason=${body.reason}). Saldo: ${result.balance_after}`,
    });
    res.json(result);
  }),
);

// ─────────────────────────────────────────────────────────────────────
// Cycles (todos)
// ─────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/cycles',
  ah(async (req, res) => {
    const status = req.query.status as string | undefined;
    let q = supabase
      .from('cycles')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(200);
    if (status === 'open' || status === 'closed' || status === 'error') {
      q = q.eq('status', status);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  }),
);

// ─────────────────────────────────────────────────────────────────────
// Token transactions (todos)
// ─────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/transactions',
  ah(async (req, res) => {
    const reason = req.query.reason as string | undefined;
    const limit = Number(req.query.limit ?? 200);
    let q = supabase
      .from('token_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (reason) q = q.eq('reason', reason);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  }),
);

// ─────────────────────────────────────────────────────────────────────
// Packs (CRUD)
// ─────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/packs',
  ah(async (_req, res) => {
    const { data, error } = await supabase
      .from('token_packs')
      .select('*')
      .order('tokens', { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  }),
);

const packCreateSchema = z.object({
  name: z.string().min(1),
  tokens: z.number().int().positive(),
  price_brl: z.number().nonnegative(),
  active: z.boolean().default(true),
  highlight: z.boolean().default(false),
});

adminRouter.post(
  '/packs',
  ah(async (req, res) => {
    const body = packCreateSchema.parse(req.body);
    const { data, error } = await supabase.from('token_packs').insert(body).select('*').single();
    if (error) throw error;
    res.json(data);
  }),
);

const packUpdateSchema = packCreateSchema.partial();

adminRouter.patch(
  '/packs/:id',
  ah(async (req, res) => {
    const body = packUpdateSchema.parse(req.body);
    const { data, error } = await supabase
      .from('token_packs')
      .update(body)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  }),
);

adminRouter.delete(
  '/packs/:id',
  ah(async (req, res) => {
    const { error } = await supabase.from('token_packs').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  }),
);

// ─────────────────────────────────────────────────────────────────────
// Strategies (todos os configs)
// ─────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/strategies',
  ah(async (_req, res) => {
    const { data, error } = await supabase
      .from('strategy_configs')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  }),
);

// ─────────────────────────────────────────────────────────────────────
// Logs do bot
// ─────────────────────────────────────────────────────────────────────
adminRouter.get(
  '/logs',
  ah(async (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    const level = req.query.level as string | undefined;
    let q = supabase
      .from('bot_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (level) q = q.eq('level', level);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data ?? []);
  }),
);

// ─────────────────────────────────────────────────────────────────────
// Wipe — cancela ordens + fecha posições + apaga dados
// ─────────────────────────────────────────────────────────────────────
const wipeSchema = z.object({
  confirm: z.literal('YES_WIPE_EVERYTHING'),
});

adminRouter.post(
  '/wipe',
  ah(async (req, res) => {
    wipeSchema.parse(req.body);

    const report: any = {
      binance: { canceled: [], closed: [], errors: [] },
      db: { deleted_users: 0 },
    };

    // 1) Para cada user, cancela e fecha tudo na Binance (se tiver chave)
    const { data: users } = await supabase.from('users').select('id');
    for (const u of users ?? []) {
      try {
        const client = await getBinanceClient(u.id).catch(() => null);
        if (!client) continue;

        // Cancela todas as ordens abertas (varre por símbolo único)
        const open = await client.openOrders().catch(() => [] as any[]);
        const symbols = new Set<string>(open.map((o: any) => o.symbol));
        for (const sym of symbols) {
          await client.cancelAllOpen(sym).catch((e) =>
            report.binance.errors.push({ user: u.id, sym, err: String(e) }),
          );
          report.binance.canceled.push({ user: u.id, sym });
        }

        // Fecha posições (quantity > 0 → manda mercado oposto reduce-only)
        const positions = await client.positions().catch(() => [] as any[]);
        for (const p of positions) {
          const amt = Number(p.positionAmt ?? 0);
          if (amt === 0) continue;
          const isLong = p.positionSide === 'LONG' || (p.positionSide === 'BOTH' && amt > 0);
          const closingSide = isLong ? 'SELL' : 'BUY';
          const qty = Math.abs(amt);
          try {
            await client.placeOrder({
              symbol: p.symbol,
              side: closingSide,
              positionSide: p.positionSide,
              type: 'MARKET',
              quantity: qty,
            });
            report.binance.closed.push({ user: u.id, sym: p.symbol, side: p.positionSide, qty });
          } catch (e) {
            report.binance.errors.push({ user: u.id, sym: p.symbol, err: String(e) });
          }
        }

        invalidateBinanceClient(u.id);
      } catch (e) {
        report.binance.errors.push({ user: u.id, err: String(e) });
      }
    }

    // 2) Apaga TUDO do banco. ON DELETE CASCADE leva cycles, orders, logs, etc.
    // token_packs e configs ficam (são "catálogo").
    const { data: deleted, error: delErr } = await supabase
      .from('users')
      .delete()
      .gte('created_at', '1900-01-01')
      .select('id');
    if (delErr) throw delErr;
    report.db.deleted_users = (deleted ?? []).length;

    res.json({ ok: true, report });
  }),
);

// ── Integrações OAuth ──────────────────────────────────────────────────────
// GET lista provedores (senha aparece mascarada).
// PUT upsert (provider + client_id/secret/redirect/enabled).
// DELETE remove credencial.

adminRouter.get(
  '/integrations',
  ah(async (_req, res) => {
    const items = await listOAuthProviders();
    res.json(
      items.map((i) => ({
        ...i,
        client_secret: i.client_secret ? `••••${i.client_secret.slice(-4)}` : '',
        configured: Boolean(i.client_id && i.client_secret),
      })),
    );
  }),
);

const integrationSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  client_id: z.string().max(500),
  client_secret: z.string().max(500),
  redirect_uri: z.string().max(500),
  enabled: z.boolean(),
});

adminRouter.put(
  '/integrations',
  ah(async (req, res) => {
    const body = integrationSchema.parse(req.body);
    await upsertOAuthProvider(body);
    await botLog({
      level: 'info',
      scope: 'admin',
      message: `OAuth ${body.provider} ${body.enabled ? 'ativado' : 'desativado'} (admin)`,
      data: {
        provider: body.provider,
        enabled: body.enabled,
        has_client_id: Boolean(body.client_id),
        has_secret: Boolean(body.client_secret),
      },
    });
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  '/integrations/:provider',
  ah(async (req, res) => {
    const p = z.enum(['google', 'facebook']).parse(req.params.provider);
    await deleteOAuthProvider(p);
    await botLog({
      level: 'info',
      scope: 'admin',
      message: `OAuth ${p} removido (admin)`,
    });
    res.json({ ok: true });
  }),
);

// ── Marketing overrides (multiplicadores) ──────────────────────────────────
// PATCH /admin/users/:id/overrides — define os FATORES de display da conta.
// Cada fator multiplica o valor real (1 = sem alteração). Envia null/undef
// nos campos pra REMOVER aquele override.

const overridesSchema = z.object({
  balance_factor: z.number().min(0).max(1_000_000).nullable().optional(),
  realized_factor: z.number().min(0).max(1_000_000).nullable().optional(),
  today_pnl_factor: z.number().min(0).max(1_000_000).nullable().optional(),
});

adminRouter.patch(
  '/users/:id/overrides',
  ah(async (req, res) => {
    const body = overridesSchema.parse(req.body);
    const overrides: Record<string, number> = {};
    if (typeof body.balance_factor === 'number') overrides.balance_factor = body.balance_factor;
    if (typeof body.realized_factor === 'number') overrides.realized_factor = body.realized_factor;
    if (typeof body.today_pnl_factor === 'number') overrides.today_pnl_factor = body.today_pnl_factor;

    const valueToStore = Object.keys(overrides).length ? overrides : null;
    const { error } = await supabase
      .from('users')
      .update({ marketing_overrides: valueToStore })
      .eq('id', req.params.id);
    if (error) throw error;

    await botLog({
      level: 'info',
      scope: 'admin',
      user_id: req.params.id,
      message: `Marketing overrides ${valueToStore ? 'atualizados' : 'limpos'} (admin)`,
      data: valueToStore ?? {},
    });
    res.json({ ok: true, marketing_overrides: valueToStore });
  }),
);

// ── Payment gateways (PIX etc.) ────────────────────────────────────────────
// GET lista (secret mascarado).
// PUT upsert.
// DELETE remove.

adminRouter.get(
  '/payment-gateways',
  ah(async (_req, res) => {
    const items = await listPaymentGateways();
    res.json(
      items.map((i) => ({
        ...i,
        client_secret: i.client_secret ? `••••${i.client_secret.slice(-4)}` : '',
        configured: Boolean(i.client_id && i.client_secret),
      })),
    );
  }),
);

const pgSchema = z.object({
  provider: z.enum(['zyropay']),
  client_id: z.string().max(500),
  client_secret: z.string().max(500),
  webhook_url: z.string().max(500).default(''),
  base_url: z.string().max(500).default(''),
  enabled: z.boolean(),
});

adminRouter.put(
  '/payment-gateways',
  ah(async (req, res) => {
    const body = pgSchema.parse(req.body);
    await upsertPaymentGateway(body);
    await botLog({
      level: 'info',
      scope: 'admin',
      message: `Gateway ${body.provider} ${body.enabled ? 'ativado' : 'desativado'} (admin)`,
      data: { provider: body.provider, enabled: body.enabled },
    });
    res.json({ ok: true });
  }),
);

adminRouter.delete(
  '/payment-gateways/:provider',
  ah(async (req, res) => {
    const p = z.enum(['zyropay']).parse(req.params.provider);
    await deletePaymentGateway(p);
    await botLog({ level: 'info', scope: 'admin', message: `Gateway ${p} removido (admin)` });
    res.json({ ok: true });
  }),
);

// ── Payments admin ─────────────────────────────────────────────────────────
// Lista todos os intents, com filtros opcionais (status, user search, datas).
// PATCH /admin/payments/:id/mark muda o status manualmente.

adminRouter.get(
  '/payments',
  ah(async (req, res) => {
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string | undefined)?.trim();
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 200), 500);

    let q = supabase
      .from('payment_intents')
      .select(
        'id, user_id, provider, payment_id, mov_id, external_id, credits, usd_amount, status, confirmed_at, created_at, updated_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && ['PENDING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'REFUNDED'].includes(status)) {
      q = q.eq('status', status);
    }
    if (start) q = q.gte('created_at', start);
    if (end) q = q.lte('created_at', end);

    const { data, error } = await q;
    if (error) throw error;

    // Junta info do user (email/nome) com 1 query simples.
    const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
    let users: Array<{ id: string; email: string; name: string | null }> = [];
    if (userIds.length) {
      const { data: u } = await supabase
        .from('users')
        .select('id, email, name')
        .in('id', userIds);
      users = (u as any[]) ?? [];
    }
    const byId = new Map(users.map((u) => [u.id, u]));
    let rows = (data ?? []).map((r: any) => ({
      ...r,
      user_email: byId.get(r.user_id)?.email ?? null,
      user_name: byId.get(r.user_id)?.name ?? null,
    }));
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.user_email ?? '').toLowerCase().includes(s) ||
          (r.user_name ?? '').toLowerCase().includes(s) ||
          (r.payment_id ?? '').toLowerCase().includes(s),
      );
    }
    res.json(rows);
  }),
);

adminRouter.get(
  '/payments/stats',
  ah(async (_req, res) => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data, error } = await supabase
      .from('payment_intents')
      .select('credits, usd_amount, status, created_at, confirmed_at')
      .gte('created_at', startOfMonth.toISOString());
    if (error) throw error;

    const rows = (data ?? []) as Array<{
      credits: number;
      usd_amount: number;
      status: string;
      created_at: string;
      confirmed_at: string | null;
    }>;

    function sum(filter: (r: typeof rows[number]) => boolean) {
      const matched = rows.filter(filter);
      return {
        count: matched.length,
        usd: matched.reduce((s, r) => s + Number(r.usd_amount ?? 0), 0),
        credits: matched.reduce((s, r) => s + Number(r.credits ?? 0), 0),
      };
    }

    const confirmedToday = sum(
      (r) =>
        r.status === 'CONFIRMED' &&
        r.confirmed_at != null &&
        new Date(r.confirmed_at) >= startOfDay,
    );
    const confirmed7d = sum(
      (r) =>
        r.status === 'CONFIRMED' &&
        r.confirmed_at != null &&
        new Date(r.confirmed_at) >= sevenDaysAgo,
    );
    const confirmedMonth = sum((r) => r.status === 'CONFIRMED');
    const pending = sum((r) => r.status === 'PENDING');
    const failedMonth = sum((r) => r.status === 'FAILED' || r.status === 'EXPIRED');

    res.json({
      today: confirmedToday,
      last_7d: confirmed7d,
      month: confirmedMonth,
      pending,
      failed_month: failedMonth,
    });
  }),
);

const markSchema = z.object({
  status: z.enum(['CONFIRMED', 'REFUNDED', 'FAILED', 'EXPIRED', 'PENDING']),
  note: z.string().optional(),
});

adminRouter.patch(
  '/payments/:id/mark',
  ah(async (req, res) => {
    const body = markSchema.parse(req.body);
    const { data: prev, error: getErr } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!prev) return res.status(404).json({ error: 'not_found' });

    const patch: any = { status: body.status };
    if (body.status === 'CONFIRMED' && !prev.confirmed_at) {
      patch.confirmed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('payment_intents')
      .update(patch)
      .eq('id', req.params.id);
    if (error) throw error;

    // Se transitar PENDING → CONFIRMED manualmente, credita os tokens.
    if (prev.status === 'PENDING' && body.status === 'CONFIRMED') {
      const result = await grantTokens({
        user_id: prev.user_id,
        amount: prev.credits,
        reason: 'pack_purchase',
        metadata: {
          kind: 'admin_manual_confirm',
          payment_id: prev.payment_id,
          provider: prev.provider,
          note: body.note ?? null,
        },
      });
      await botLog({
        level: 'info',
        scope: 'admin',
        user_id: prev.user_id,
        message: `Admin marcou PIX como CONFIRMED manualmente. +${prev.credits} créditos. Saldo: ${result.balance_after}`,
        data: { payment_id: prev.payment_id, note: body.note },
      });
    } else {
      await botLog({
        level: 'info',
        scope: 'admin',
        user_id: prev.user_id,
        message: `Admin mudou status pagamento ${prev.payment_id}: ${prev.status} → ${body.status}`,
        data: { note: body.note },
      });
    }

    res.json({ ok: true });
  }),
);
