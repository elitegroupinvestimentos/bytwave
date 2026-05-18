import axios, { AxiosInstance } from 'axios';
import { getPaymentGateway } from '../supabase/paymentGateways';

const DEFAULT_BASE = 'https://gateway-zyropay-api.rancher.codefabrik.dev';

// Cache do token JWT. Re-autentica quando expira (≤ ~8h pela doc) ou
// quando recebemos 401 do gateway.
let cached: { token: string; expiresAt: number } | null = null;

interface AuthResponse {
  success: boolean;
  data: { clientId: string; name: string; token: string };
}

interface GeneratePixResponse {
  success: boolean;
  data: {
    pix: string;
    value: number;
    clientId: string;
    paymentId: string;
    movId: string;
  };
}

async function http(): Promise<AxiosInstance> {
  const cfg = await getPaymentGateway('zyropay');
  if (!cfg) throw new Error('Gateway ZyroPay não configurado.');
  if (!cfg.enabled) throw new Error('Gateway ZyroPay está desativado.');
  if (!cfg.client_id || !cfg.client_secret) {
    throw new Error('Credenciais ZyroPay incompletas (client_id/password).');
  }
  return axios.create({
    baseURL: cfg.base_url || DEFAULT_BASE,
    timeout: 20_000,
    headers: { 'content-type': 'application/json', accept: '*/*' },
  });
}

async function authenticate(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
  const cfg = await getPaymentGateway('zyropay');
  if (!cfg) throw new Error('Gateway ZyroPay não configurado.');
  const client = await http();
  const r = await client.post<AuthResponse>('/cli/client/authenticate', {
    clientId: cfg.client_id,
    password: cfg.client_secret,
  });
  const token = r.data?.data?.token;
  if (!token) throw new Error('Falha ao autenticar na ZyroPay.');
  // JWT padrão tem ~8h. Cacheamos por 7h pra ter folga.
  cached = { token, expiresAt: Date.now() + 7 * 60 * 60 * 1000 };
  return token;
}

export interface GeneratePixInput {
  /** Valor em BRL (ex: 50.00). 1 USDT credit = 1 BRL no MVP. */
  value: number;
  /** Tempo de expiração em segundos. 0 = padrão 24h. */
  expirationSeconds?: number;
  /** ID externo do nosso lado (ex: payment_intent id). */
  externalId: string;
}

export interface GeneratePixResult {
  pix: string;        // BR code copia-e-cola
  paymentId: string;
  movId: string;
  value: number;
}

export async function generatePix(input: GeneratePixInput): Promise<GeneratePixResult> {
  const client = await http();
  let token = await authenticate();

  async function call(t: string) {
    return client.post<GeneratePixResponse>(
      '/cli/payment/pix/generate-pix',
      {
        value: input.value,
        expiration: input.expirationSeconds ?? 0,
        externalId: input.externalId,
      },
      { headers: { Authorization: `Bearer ${t}` } },
    );
  }

  let r;
  try {
    r = await call(token);
  } catch (err: any) {
    // Se 401, força re-auth e tenta de novo.
    if (err?.response?.status === 401) {
      cached = null;
      token = await authenticate();
      r = await call(token);
    } else {
      throw err;
    }
  }

  const d = r.data?.data;
  if (!d?.pix) throw new Error('ZyroPay não retornou PIX.');
  return {
    pix: d.pix,
    paymentId: d.paymentId,
    movId: d.movId,
    value: d.value,
  };
}
