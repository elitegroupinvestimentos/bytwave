# appbinance — Hedge Cycle Bot (Binance Futures + Supabase)

Backend completo em TypeScript para rodar a estratégia **Hedge Cycle** na Binance Futures
(USDT-M), com persistência no **Supabase**, execução via REST signed e worker 24/7.

> ⚠️ **Modo seguro por padrão**: a aplicação inicia em `BINANCE_MODE=testnet`. Só
> mude para `production` depois de validar todo o fluxo.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Estratégia](#estratégia)
- [Pré-requisitos](#pré-requisitos)
- [1. Configurar Supabase](#1-configurar-supabase)
- [2. Configurar Binance API](#2-configurar-binance-api)
- [3. Variáveis de ambiente](#3-variáveis-de-ambiente)
- [4. Instalar e rodar](#4-instalar-e-rodar)
- [5. Endpoints da API](#5-endpoints-da-api)
- [6. Fluxo recomendado de teste](#6-fluxo-recomendado-de-teste)
- [Proteções](#proteções)
- [Estrutura do projeto](#estrutura-do-projeto)

---

## Arquitetura

```
HTTP API (Express)        Worker (loop 24/7)
        │                          │
        ▼                          ▼
            strategy/engine.ts
        │                          │
        ▼                          ▼
   Binance Futures REST       Supabase (Postgres)
   (testnet ou produção)      (state + logs)
```

- **API REST** (`src/api/routes.ts`): cria usuários, salva chaves, configura estratégia,
  inicia/pausa/para o bot, consulta status/ordens/PnL.
- **Worker** (`src/worker.ts`): loop assíncrono que chama `runTick()` a cada
  `WORKER_INTERVAL_MS` para todas as configs com `status='running'`.
- **Strategy engine** (`src/strategy/engine.ts`): para cada `(usuário × símbolo × lado)`
  abre/avança ciclo, recoloca take-profit, fecha quando o TP fila.
- **Binance client** (`src/services/binance/client.ts`): REST signed (HMAC-SHA256)
  com troca automática entre `testnet.binancefuture.com` e `fapi.binance.com`.
- **Supabase service** (`src/services/supabase/service.ts`): toda a persistência
  (usuários, chaves criptografadas, configs, ciclos, ordens, logs, snapshots).

---

## Estratégia

**Hedge Cycle**: o bot mantém **um ciclo LONG e um ciclo SHORT simultaneamente** no mesmo
par, em modo Hedge da Binance. Cada ciclo:

1. Abre **Base Order** a mercado (`base_order_usdt`).
2. Coloca **N Safety Orders LIMIT** afastadas do entry, escalando preço e volume:
   - distância acumulada da SO_n: soma de `initial_distance_pct × stepScale^k` (k=0..n-1).
   - volume da SO_n: `first_safety_usdt × volumeScale^(n-1)`.
3. Mantém um **TAKE_PROFIT_MARKET** com `closePosition=true` no preço médio ± `target_profit_pct`.
4. Sempre que uma SO é preenchida, recalcula preço médio e reposiciona o TP.
5. Quando o TP é executado, marca o ciclo como `closed`, registra o PnL realizado,
   cancela SOs pendentes e (se a config seguir `running`) abre um novo ciclo.

### Defaults

| Parâmetro              | Padrão |
| ---------------------- | ------ |
| Alavancagem            | 12x    |
| Distância inicial      | 0.6%   |
| Step Scale             | 1.5    |
| Volume Scale           | 1.8    |
| Target Profit          | 0.6%   |
| Max Safety Orders      | 5      |

### Presets de capital sugeridos

| Capital  | BO   | 1ª SO | Max SO |
| -------- | ---- | ----- | ------ |
| 1.000    | 4    | 8     | 5      |
| 5.000    | 20   | 40    | 5      |

---

## Pré-requisitos

- Node.js 18+
- Conta Supabase (free tier basta)
- Conta Binance Futures Testnet: https://testnet.binancefuture.com
- (Opcional, depois) Conta Binance produção com Futures habilitado e modo Hedge

---

## 1. Configurar Supabase

1. Crie um projeto em https://app.supabase.com.
2. Em **Project Settings → API**, copie:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`
   > A `service_role` key bypassa RLS. **Use somente no backend.** Nunca exponha em frontend.
3. Em **SQL Editor**, abra `supabase/migrations/001_init.sql` deste repo, cole e clique em **Run**.
   Isso cria todas as tabelas: `users`, `binance_keys`, `strategy_configs`, `cycles`,
   `orders`, `bot_logs`, `account_snapshots`.

---

## 2. Configurar Binance API

### Testnet (recomendado para começar)

1. Crie/login em https://testnet.binancefuture.com.
2. No painel inferior **API Key**, gere `API Key` + `Secret Key`.
3. Não precisa habilitar nada extra — testnet libera trading por default.

### Produção

1. Em https://www.binance.com → **API Management** → **Create API**.
2. Habilite apenas **Enable Futures**. Não habilite withdraw.
3. Recomendado: restringir por IP.
4. Em **Futures → Preferences → Position Mode** garanta **Hedge Mode**.
   (O bot tenta ativar automaticamente, mas se houver posições/ordens abertas
   a Binance rejeita a troca; precisa zerar a conta antes.)

---

## 3. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

Gere um `ENCRYPTION_KEY` válido (64 caracteres hex):

```bash
openssl rand -hex 32
```

Cole o resultado em `ENCRYPTION_KEY`. **Não troque** essa chave depois de salvar
credenciais — você não conseguirá decriptar as keys já gravadas.

| Variável                      | O que é                                                 |
| ----------------------------- | ------------------------------------------------------- |
| `PORT`                        | porta HTTP (default 3000)                               |
| `NODE_ENV`                    | `development` / `production`                            |
| `SUPABASE_URL`                | URL do projeto Supabase                                 |
| `SUPABASE_SERVICE_ROLE_KEY`   | service-role key                                        |
| `BINANCE_MODE`                | `testnet` (default) ou `production`                     |
| `ENCRYPTION_KEY`              | 32 bytes hex (gerado com openssl)                       |
| `WORKER_INTERVAL_MS`          | intervalo do tick do motor (default 5000)               |
| `LOG_LEVEL`                   | `debug` / `info` / `warn` / `error`                     |
| `MAX_EXPOSURE_USDT`           | exposição máxima total por usuário (0 desliga o limite) |

---

## 4. Instalar e rodar

```bash
npm install
npm run dev          # API + worker juntos (hot reload)
# ou em produção:
npm run build
npm start
```

A API sobe em `http://localhost:3000/api`. O worker é iniciado junto.

> Quer rodar **só** o motor (sem API)? `npm run worker`.

Verifique se está vivo:

```bash
curl http://localhost:3000/api/health
# → {"ok":true,"mode":"testnet"}
```

---

## 5. Endpoints da API

Base: `http://localhost:3000/api`. Todos aceitam/retornam JSON.

### Usuário

```http
POST /users          { email, name? }
GET  /users/:id
```

### Chaves Binance (criptografadas com AES-256-GCM)

```http
POST /binance/keys   { user_id, mode: 'testnet'|'production', api_key, api_secret, label? }
GET  /binance/test/:user_id            # valida credenciais buscando o saldo USDT
```

### Configuração da estratégia

```http
POST /strategy
{
  "user_id": "<uuid>",
  "symbol": "BTCUSDT",
  "capital_usdt": 1000,
  "leverage": 12,
  "base_order_usdt": 4,
  "first_safety_usdt": 8,
  "max_safety_orders": 5,
  "initial_distance_pct": 0.6,
  "step_scale": 1.5,
  "volume_scale": 1.8,
  "target_profit_pct": 0.6
}

GET  /strategy/:user_id/:symbol
```

### Controle do bot

```http
POST /bot/start   { user_id, symbol }
POST /bot/pause   { user_id, symbol }
POST /bot/stop    { user_id, symbol }
```

`start` muda `status` da config para `running` — o worker passa a operá-la a cada tick.

### Status / ordens / PnL

```http
GET /status/:user_id                # ciclos abertos
GET /orders/open/:user_id           # ordens NEW/PARTIALLY_FILLED
GET /orders/history/:user_id?limit=200
GET /pnl/:user_id                   # PnL realizado + último snapshot
```

---

## 6. Fluxo recomendado de teste

```bash
# 1) Cria usuário
curl -s -X POST http://localhost:3000/api/users \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com","name":"me"}'
# → { "id": "<USER_ID>", ... }

# 2) Salva chaves de TESTNET
curl -s -X POST http://localhost:3000/api/binance/keys \
  -H 'content-type: application/json' \
  -d '{"user_id":"<USER_ID>","mode":"testnet","api_key":"...","api_secret":"..."}'

# 3) Valida credenciais (deve devolver saldo)
curl -s http://localhost:3000/api/binance/test/<USER_ID>

# 4) Cria config para BTCUSDT (preset 1000 USDT)
curl -s -X POST http://localhost:3000/api/strategy \
  -H 'content-type: application/json' \
  -d '{"user_id":"<USER_ID>","symbol":"BTCUSDT","capital_usdt":1000,"leverage":12,"base_order_usdt":4,"first_safety_usdt":8,"max_safety_orders":5}'

# 5) Inicia
curl -s -X POST http://localhost:3000/api/bot/start \
  -H 'content-type: application/json' \
  -d '{"user_id":"<USER_ID>","symbol":"BTCUSDT"}'

# 6) Acompanha
curl -s http://localhost:3000/api/status/<USER_ID>
curl -s http://localhost:3000/api/orders/open/<USER_ID>
curl -s http://localhost:3000/api/pnl/<USER_ID>

# 7) Pausa / para
curl -s -X POST http://localhost:3000/api/bot/pause \
  -H 'content-type: application/json' \
  -d '{"user_id":"<USER_ID>","symbol":"BTCUSDT"}'
```

Acompanhe também a tabela `bot_logs` no Supabase — todo evento da estratégia
fica registrado lá com `level`, `scope`, `message` e `data` (JSON).

---

## Proteções

Implementadas em [src/strategy/engine.ts](src/strategy/engine.ts) e
[src/strategy/orderManager.ts](src/strategy/orderManager.ts):

- **Sem ordens duplicadas**: lock em memória por `(user × symbol × side)` durante o tick;
  `client_order_id` único por ordem (UNIQUE no Postgres) → idempotência mesmo em retry.
- **Validação de saldo**: pré-checagem do `availableBalance` USDT antes de abrir ciclo.
- **Limite de exposição**: `MAX_EXPOSURE_USDT` corta o tick se a exposição (notional
  somado de todas as posições do par) ultrapassar o teto.
- **Validação de símbolo / quantidade / preço**: `getSymbolFilters()` aplica
  `tickSize`, `stepSize`, `minQty`, `minNotional` antes de mandar ordem.
- **Tratamento de erro Binance**: erros REST são embrulhados em `BinanceApiError`
  (com `code`, `status`, `msg`). O motor loga no Supabase e segue para a próxima config.
- **Reconexão automática**: o worker re-tenta a cada `WORKER_INTERVAL_MS` mesmo após
  falhas; `uncaughtException` / `unhandledRejection` não derrubam o processo.
- **Logs detalhados**: tudo grava em `bot_logs` (Supabase) e em stdout (`pino`).

---

## Estrutura do projeto

```
src/
├── index.ts                 # bootstrap (API + worker)
├── worker.ts                # loop 24/7 da estratégia
├── config/
│   ├── env.ts               # validação de env vars com zod
│   └── constants.ts         # endpoints + defaults da estratégia
├── api/
│   └── routes.ts            # todos os endpoints REST
├── services/
│   ├── binance/
│   │   ├── client.ts        # REST signed para Futures (testnet/prod)
│   │   └── factory.ts       # cache por usuário
│   ├── supabase/
│   │   ├── client.ts        # @supabase/supabase-js
│   │   └── service.ts       # CRUD de todas as entidades
│   └── logs/
│       └── logger.ts        # pino + persistência em bot_logs
├── strategy/
│   ├── engine.ts            # orquestração do tick
│   ├── orderManager.ts      # placeAndRecordOrder + refresh
│   ├── safetyOrderManager.ts # escada de SOs + média ponderada
│   └── profitManager.ts     # cálculo do TP
├── utils/
│   ├── crypto.ts            # AES-256-GCM (encrypt/decrypt)
│   ├── precision.ts         # rounding por tickSize/stepSize
│   └── validators.ts        # schemas zod das rotas
└── types/
    └── index.ts             # tipos compartilhados

supabase/
└── migrations/
    └── 001_init.sql
```

---

## Notas finais

- **Sempre comece em `testnet`.** O `.env.example` força `BINANCE_MODE=testnet` por
  padrão; mude apenas quando estiver confiante.
- O bot **não usa modo isolado** automaticamente — assume Cross. Se quiser Isolated,
  ajuste manualmente na conta Binance.
- O TP só é reajustado se o drift de preço for > 0.05% (evita spam de cancel/replace).
- Para escalar (vários usuários ou muitos pares por usuário), separe o `worker`
  do `index` (`npm run worker`) e suba múltiplas instâncias com locks distribuídos
  (Redis) — o lock atual é em memória do processo.
