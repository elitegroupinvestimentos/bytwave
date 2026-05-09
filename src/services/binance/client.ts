import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { BINANCE_ENDPOINTS } from '../../config/constants';
import type { Mode } from '../../types';
import type { SymbolFilters } from '../../utils/precision';

export interface BinanceCreds {
  apiKey: string;
  apiSecret: string;
}

export interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  type: 'MARKET' | 'LIMIT' | 'TAKE_PROFIT_MARKET' | 'STOP_MARKET';
  quantity: number;
  price?: number;
  stopPrice?: number;
  reduceOnly?: boolean;
  closePosition?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';
  newClientOrderId?: string;
  workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
}

export class BinanceFuturesClient {
  private http: AxiosInstance;
  private mode: Mode;
  private apiKey: string;
  private apiSecret: string;

  constructor(mode: Mode, creds: BinanceCreds) {
    this.mode = mode;
    this.apiKey = creds.apiKey;
    this.apiSecret = creds.apiSecret;
    this.http = axios.create({
      baseURL: BINANCE_ENDPOINTS[mode].rest,
      timeout: 15000,
      headers: { 'X-MBX-APIKEY': this.apiKey },
    });
  }

  // ── helpers ────────────────────────────────────────────────────────────────
  private sign(query: string): string {
    return crypto.createHmac('sha256', this.apiSecret).update(query).digest('hex');
  }

  private toQuery(params: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      sp.append(k, String(v));
    }
    return sp.toString();
  }

  private async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE' | 'PUT',
    path: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const ts = Date.now();
    const query = this.toQuery({ ...params, timestamp: ts, recvWindow: 5000 });
    const signature = this.sign(query);
    const url = `${path}?${query}&signature=${signature}`;
    try {
      const { data } = await this.http.request<T>({ method, url });
      return data;
    } catch (err) {
      throw normalizeBinanceError(err);
    }
  }

  private async publicRequest<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    const query = this.toQuery(params);
    const url = query ? `${path}?${query}` : path;
    try {
      const { data } = await this.http.get<T>(url);
      return data;
    } catch (err) {
      throw normalizeBinanceError(err);
    }
  }

  // ── public ─────────────────────────────────────────────────────────────────
  async exchangeInfo(): Promise<any> {
    return this.publicRequest('/fapi/v1/exchangeInfo');
  }

  async getSymbolFilters(symbol: string): Promise<SymbolFilters> {
    const info: any = await this.exchangeInfo();
    const s = info.symbols.find((x: any) => x.symbol === symbol);
    if (!s) throw new Error(`Symbol ${symbol} não encontrado em exchangeInfo`);

    const lot = s.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    const priceF = s.filters.find((f: any) => f.filterType === 'PRICE_FILTER');
    const minNotional = s.filters.find(
      (f: any) => f.filterType === 'MIN_NOTIONAL' || f.filterType === 'NOTIONAL',
    );

    return {
      pricePrecision: s.pricePrecision,
      quantityPrecision: s.quantityPrecision,
      tickSize: Number(priceF?.tickSize ?? '0'),
      stepSize: Number(lot?.stepSize ?? '0'),
      minQty: Number(lot?.minQty ?? '0'),
      minNotional: Number(minNotional?.notional ?? minNotional?.minNotional ?? '0'),
    };
  }

  async tickerPrice(symbol: string): Promise<number> {
    const data = await this.publicRequest<{ price: string }>('/fapi/v1/ticker/price', { symbol });
    return Number(data.price);
  }

  // ── account ────────────────────────────────────────────────────────────────
  async accountBalance(): Promise<Array<{ asset: string; balance: string; availableBalance: string }>> {
    return this.signedRequest('GET', '/fapi/v2/balance');
  }

  async accountInfo(): Promise<any> {
    return this.signedRequest('GET', '/fapi/v2/account');
  }

  async getUsdtBalance(): Promise<{ total: number; available: number }> {
    const balances = await this.accountBalance();
    const usdt = balances.find((b) => b.asset === 'USDT');
    return {
      total: Number(usdt?.balance ?? 0),
      available: Number(usdt?.availableBalance ?? 0),
    };
  }

  // ── settings ───────────────────────────────────────────────────────────────
  async setLeverage(symbol: string, leverage: number) {
    return this.signedRequest('POST', '/fapi/v1/leverage', { symbol, leverage });
  }

  async enableHedgeMode() {
    // dualSidePosition=true → hedge mode (long + short simultâneos).
    try {
      return await this.signedRequest('POST', '/fapi/v1/positionSide/dual', {
        dualSidePosition: 'true',
      });
    } catch (err: any) {
      // -4059: "No need to change position side." → já está em hedge.
      if (err?.code === -4059) return { msg: 'already hedge' };
      throw err;
    }
  }

  // ── orders ─────────────────────────────────────────────────────────────────
  async placeOrder(p: OrderParams): Promise<any> {
    const params: Record<string, unknown> = {
      symbol: p.symbol,
      side: p.side,
      positionSide: p.positionSide,
      type: p.type,
    };
    // closePosition=true e quantity são MUTUAMENTE EXCLUSIVOS na Binance.
    // Mandar os dois faz a Binance retornar -4120 ("Order type not supported,
    // use Algo Orders API"). Pra TP/STOP "fecha tudo", só closePosition.
    if (p.closePosition) {
      params.closePosition = 'true';
    } else {
      params.quantity = p.quantity;
    }
    if (p.price !== undefined) params.price = p.price;
    if (p.stopPrice !== undefined) params.stopPrice = p.stopPrice;
    if (p.timeInForce) params.timeInForce = p.timeInForce;
    if (p.newClientOrderId) params.newClientOrderId = p.newClientOrderId;
    if (p.workingType) params.workingType = p.workingType;

    return this.signedRequest('POST', '/fapi/v1/order', params);
  }

  async cancelOrder(symbol: string, orderId?: number, origClientOrderId?: string) {
    return this.signedRequest('DELETE', '/fapi/v1/order', {
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  async cancelAllOpen(symbol: string) {
    return this.signedRequest('DELETE', '/fapi/v1/allOpenOrders', { symbol });
  }

  async getOrder(symbol: string, orderId?: number, origClientOrderId?: string) {
    return this.signedRequest('GET', '/fapi/v1/order', { symbol, orderId, origClientOrderId });
  }

  async openOrders(symbol?: string) {
    return this.signedRequest<any[]>('GET', '/fapi/v1/openOrders', symbol ? { symbol } : {});
  }

  async positions(symbol?: string) {
    const acc: any = await this.accountInfo();
    const positions: any[] = acc.positions ?? [];
    return symbol ? positions.filter((p) => p.symbol === symbol) : positions;
  }
}

// ─── Erros normalizados ──────────────────────────────────────────────────────
export class BinanceApiError extends Error {
  code: number;
  status: number;
  raw: unknown;
  constructor(message: string, code: number, status: number, raw: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.raw = raw;
  }
}

function normalizeBinanceError(err: unknown): Error {
  if ((err as AxiosError).isAxiosError) {
    const ax = err as AxiosError<any>;
    const data = ax.response?.data;
    const code = Number(data?.code ?? 0);
    const msg = data?.msg ?? ax.message ?? 'Binance API error';
    return new BinanceApiError(msg, code, ax.response?.status ?? 0, data);
  }
  return err as Error;
}
