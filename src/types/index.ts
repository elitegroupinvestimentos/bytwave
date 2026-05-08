export type Mode = 'testnet' | 'production';
export type CycleSide = 'LONG' | 'SHORT';
export type CycleStatus = 'open' | 'closed' | 'error';
export type OrderRole = 'BASE' | 'SAFETY' | 'TAKE_PROFIT' | 'MANUAL';
export type ConfigStatus = 'running' | 'paused' | 'stopped';

export interface User {
  id: string;
  email: string;
  name: string | null;
  token_balance: number;
  created_at: string;
}

export interface BinanceKeyRow {
  id: string;
  user_id: string;
  mode: Mode;
  api_key_enc: string;
  api_secret_enc: string;
  label: string | null;
  created_at: string;
}

export interface StrategyConfig {
  id: string;
  user_id: string;
  symbol: string;
  capital_usdt: number;
  leverage: number;
  base_order_usdt: number;
  first_safety_usdt: number;
  max_safety_orders: number;
  initial_distance_pct: number;
  step_scale: number;
  volume_scale: number;
  target_profit_pct: number;
  status: ConfigStatus;
  created_at: string;
  updated_at: string;
}

export interface CycleRow {
  id: string;
  user_id: string;
  config_id: string;
  symbol: string;
  side: CycleSide;
  status: CycleStatus;
  base_qty: number;
  total_qty: number;
  avg_price: number;
  invested_usdt: number;
  realized_pnl_usdt: number;
  filled_safety_count: number;
  opened_at: string;
  closed_at: string | null;
}

export interface OrderRow {
  id: string;
  user_id: string;
  cycle_id: string | null;
  symbol: string;
  side: 'BUY' | 'SELL';
  position_side: CycleSide;
  type: string;
  role: OrderRole;
  price: number | null;
  stop_price: number | null;
  qty: number;
  filled_qty: number;
  avg_fill_price: number | null;
  status: string;
  binance_order_id: number | null;
  client_order_id: string | null;
  raw: unknown;
  created_at: string;
  updated_at: string;
}
