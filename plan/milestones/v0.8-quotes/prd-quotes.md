# PRD - Cotações + Benchmarks Realtime (v0.8)

> Gerado por `/pesquisar-feature` em 2026-03-19

## Objetivo

Integrar cotações em tempo real de ações/FIIs/ETFs via brapi.dev e benchmarks macroeconômicos
via BCB (SELIC/CDI/IPCA) e AwesomeAPI (USD/EUR), com cache in-memory de 1h. O P&L da
carteira passa a ser calculado com o preço atual de mercado (não mais apenas o valor salvo no
banco). O usuário vê comparativos de rentabilidade vs. benchmarks na tela de investimentos.

---

## Contexto do Projeto

### Arquivos Relevantes

| Arquivo | Por que é relevante |
|---------|---------------------|
| `src/app/api/investments/portfolio/route.ts` | MODIFICAR — usar live prices na hora do cálculo |
| `src/app/api/investments/ticker-search/route.ts` | REFERÊNCIA — já chama brapi.dev sem token |
| `src/components/investments/InvestmentsShell.tsx` | MODIFICAR — fetch benchmarks + pass live prices |
| `src/components/investments/portfolio/PortfolioSummaryCards.tsx` | REFERÊNCIA — padrão de cards animados |
| `src/components/investments/portfolio/AssetList.tsx` | REFERÊNCIA — exibe currentPrice por ativo |
| `prisma/schema.prisma` — model Asset | REFERÊNCIA — campo `currentPrice Decimal?` |
| `src/lib/utils.ts` | REFERÊNCIA — `formatCurrency()` para formatar valores |

### Padrões a Reaproveitar

#### 1. Chamada brapi.dev (ticker-search)
- **Arquivo:** `src/app/api/investments/ticker-search/route.ts:30-35`
- **Descrição:** Usa `fetch()` nativo com `{ next: { revalidate: 60 } }` — padrão Next.js ISR
- **Snippet:**
```ts
const res = await fetch(
  `https://brapi.dev/api/quote/list?search=${encodeURIComponent(q)}&limit=8`,
  { next: { revalidate: 60 } }
);
const data = await res.json();
```
- **Aplicar em:** `src/lib/quotes.ts` — ao chamar `GET /api/quote/{tickers}`

#### 2. Padrão de API Route com auth
- **Arquivo:** `src/app/api/investments/portfolio/route.ts:22-24`
- **Snippet:**
```ts
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```
- **Aplicar em:** `/api/investments/quotes` e `/api/investments/benchmarks`

#### 3. Serialização Decimal → number
- **Arquivo:** `src/app/api/investments/portfolio/route.ts:37`
- **Snippet:** `parseFloat(String(e.quantity))`
- **Aplicar em:** Qualquer lugar que receba Decimal do Prisma

#### 4. Cards animados com count-up
- **Arquivo:** `src/components/investments/portfolio/PortfolioSummaryCards.tsx`
- **Aplicar em:** Valores de benchmark (mostrar % SELIC, CDI com animação)

#### 5. Padrão de design tokens (cores por tipo)
- **Arquivo:** `src/components/investments/portfolio/PortfolioDonut.tsx`
- **Aplicar em:** BenchmarkBar (verde para retornos positivos, laranja para SELIC/CDI)

---

## Dependências Externas

### 1. brapi.dev — Cotações B3 (ações, FIIs, ETFs)

**Base URL:** `https://brapi.dev/api`

**Endpoint de cotação:**
```
GET /quote/{tickers}          # ex: /quote/MXRF11,BOVA11
GET /quote/{tickers}?token=X  # com token para produção
```

**Response relevante:**
```json
{
  "results": [
    {
      "symbol": "MXRF11",
      "regularMarketPrice": 10.35,
      "regularMarketChange": 0.05,
      "regularMarketChangePercent": 0.48
    }
  ]
}
```

**⚠️ RESTRIÇÃO DO PLANO FREE:**
- **Apenas 1 ativo por requisição** — sem multi-ticker (`/quote/MXRF11,BOVA11` NÃO funciona)
- 15.000 requisições/mês no total
- Dados atualizados a cada 30 minutos (não realtime puro)
- Acesso: Ações, ETFs e FIIs (dados básicos)

→ **Solução:** Fazer `Promise.all()` de requests individuais por ticker. Para uma carteira
  pessoal com 2-10 ativos, com cache 1h, o consumo mensal fica bem abaixo de 15k req.
→ `BRAPI_TOKEN` já configurado em `.env.local`.

### 2. BCB SGS API — SELIC, CDI, IPCA

**Base URL:** `https://api.bcb.gov.br`

**Sem autenticação — público e gratuito.**

```
GET /dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json    # SELIC daily
GET /dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json  # CDI anual %
GET /dados/serie/bcdata.sgs.433/dados/ultimos/1?formato=json   # IPCA mensal %
```

**Response:**
```json
[{"data":"18/03/2026","valor":"14.90"}]
```

Campos: `data` (DD/MM/YYYY), `valor` (string numérica).
- CDI: taxa anual em % (ex: "14.90" = 14.90% ao ano)
- SELIC daily: valor decimal diário (ex: "0.055131" = 0.055131% ao dia)
- IPCA: variação mensal % (ex: "0.70" = 0.70% no mês)

### 3. AwesomeAPI — Câmbio USD/EUR

**Base URL:** `https://economia.awesomeapi.com.br`

**Sem autenticação necessária para uso básico.**

```
GET /json/last/USD-BRL,EUR-BRL
```

**Response:**
```json
{
  "USDBRL": { "bid": "5.73", "ask": "5.74", "pctChange": "-0.21", "high": "5.76", "low": "5.71" },
  "EURBRL": { "bid": "6.21", "ask": "6.22", "pctChange": "0.15" }
}
```

---

## Componentes Reutilizáveis

- `formatCurrency(value, locale, currency)` em `src/lib/utils.ts` — para formatar preços
- `useCountUp` (padrão de `PortfolioSummaryCards.tsx`) — para animar valores de benchmark
- `KPICard` padrão do dashboard — referência visual para BenchmarkBar

---

## Arquitetura Proposta

```
InvestmentsShell (client)
   │
   ├── fetchPortfolio() → GET /api/investments/portfolio
   │                          │
   │                          ├── lib/quotes.ts → brapi.dev (cache 1h)
   │                          ├── Atualiza DB currentPrice (fire-and-forget)
   │                          └── Retorna AssetPosition[] com live prices
   │
   └── fetchBenchmarks() → GET /api/investments/benchmarks
                               │
                               ├── lib/benchmarks.ts → BCB (SELIC/CDI/IPCA, cache 1h)
                               └── lib/benchmarks.ts → AwesomeAPI (USD/EUR, cache 1h)
```

```
src/lib/
├── cache.ts         # NEW — in-memory Map com TTL (singleton)
├── quotes.ts        # NEW — cliente brapi.dev (usa cache.ts)
└── benchmarks.ts    # NEW — cliente BCB + AwesomeAPI (usa cache.ts)

src/app/api/investments/
├── portfolio/route.ts       # MODIFY — chama quotes.ts internamente
├── quotes/route.ts          # NEW — GET ?tickers=A,B (wrapper do quotes.ts)
└── benchmarks/route.ts      # NEW — GET (wrapper do benchmarks.ts)

src/components/investments/
├── benchmarks/
│   └── BenchmarkBar.tsx     # NEW — faixa com SELIC/CDI/IPCA/USD/EUR
└── InvestmentsShell.tsx     # MODIFY — busca benchmarks + exibe BenchmarkBar
```

---

## Regras e Constraints

- [x] Cache in-memory (Map singleton) — **não usar Redis** (sem infra de cache disponível)
- [x] TTL de 1h (3600s) para cotações e benchmarks
- [x] Brapi.dev via `BRAPI_TOKEN` env var — se ausente, logar warning e retornar null gracefully
- [x] Portfolio continua funcionando mesmo sem brapi (fallback para `currentPrice` do DB)
- [x] Nunca bloquear o response de portfolio esperando atualização do DB — sempre fire-and-forget
- [x] Não criar abstração de `HttpClient` — fetch nativo é suficiente
- [x] Cores: usar apenas tokens `axiom-*` (sem hex hardcoded)

---

## Escopo

### Incluído
- Cache in-memory com TTL configurável
- Cotações B3 via brapi.dev com token
- Benchmarks BCB (SELIC, CDI, IPCA) + AwesomeAPI (USD-BRL, EUR-BRL)
- Portfolio usando live prices no cálculo de P&L
- Atualização silenciosa de `currentPrice` no banco após cotação
- UI BenchmarkBar na tela de investimentos
- `BRAPI_TOKEN` em `.env.example`

### Excluído
- Cotações de cripto ou ativos internacionais
- Histórico de preços / gráfico de evolução de cotação (v0.9+)
- Notificações de variação de preço
- WebSocket / push em tempo real (seria v1.0+)
- Exportação de dados
- Dashboard principal (sem mudança — já tem cards de investimento)

---

## Memory Anchors

- **Entidades-chave:** Asset (ticker, currentPrice), InvestmentEntry (type: PURCHASE/SALE/DIVIDEND/SPLIT), UserCurrency
- **Padrões críticos:** Decimal→number via `parseFloat(String(x))`, auth check em todas as rotas, `force-dynamic` nas pages
- **Avisos:** brapi.dev FREE sem token não funciona para `/quote/{ticker}` genérico — BRAPI_TOKEN obrigatório; ticker-search já usa brapi sem token via endpoint diferente (`/quote/list`)
- **Dependências externas:** brapi.dev (token), BCB SGS (sem auth), AwesomeAPI (sem auth)
- **Cache:** Node.js in-memory Map singleton — reseta ao reiniciar servidor (ok para dev, aceitável em prod Next.js stateless)

---

## Issues Sugeridas (7 issues)

### Issue #52 — [v0.8] Cache in-memory — src/lib/cache.ts
**Arquivos:** `src/lib/cache.ts` (CREATE)

**Tasks:**
- [ ] Criar `src/lib/cache.ts` com classe `MemCache` (Map + TTL por entrada)
- [ ] Exportar singleton `cache` e função `cached(key, ttlMs, fetcher)` que auto-invalida
- [ ] Testar manualmente: verificar que segunda chamada retorna valor cacheado

**Critério:** `npm run build` passa

---

### Issue #53 — [v0.8] Cliente brapi.dev — src/lib/quotes.ts
**Arquivos:** `src/lib/quotes.ts` (CREATE), `src/app/api/investments/quotes/route.ts` (CREATE)

**Tasks:**
- [ ] Criar `src/lib/quotes.ts`: função `fetchQuotes(tickers: string[]): Promise<Record<string, number>>`
  - Usa `BRAPI_TOKEN` de `process.env`
  - **1 req por ticker** (limitação free plan): usa `Promise.all` para buscar em paralelo
  - `GET https://brapi.dev/api/quote/{ticker}?token=${token}` — 1 ticker por vez
  - Cada ticker tem sua própria entrada de cache: `cached("quote:MXRF11", 3600_000, fetcher)`
  - Retorna `{ MXRF11: 10.35, BOVA11: 118.90 }` — mapa ticker→preço
  - Fallback gracioso: se erro ou sem token → retorna `{}` (log warning)
- [ ] Criar `src/app/api/investments/quotes/route.ts`: GET `?tickers=MXRF11,BOVA11`
  - Auth check
  - Extrai tickers da query param, chama `fetchQuotes()`
  - Retorna JSON `{ quotes: { MXRF11: 10.35 } }`

**Critério:** `npm run build` passa; chamada manual retorna preços válidos com token configurado

---

### Issue #54 — [v0.8] Cliente BCB + AwesomeAPI — src/lib/benchmarks.ts
**Arquivos:** `src/lib/benchmarks.ts` (CREATE), `src/app/api/investments/benchmarks/route.ts` (CREATE)

**Tasks:**
- [ ] Criar `src/lib/benchmarks.ts`:
  - Função `fetchBenchmarks(): Promise<BenchmarkData>`
  - `BenchmarkData = { selicAnual: number, cdi: number, ipca: number, usdBrl: number, eurBrl: number }`
  - Usa `cached("benchmarks", 3600_000, fetcher)` com TTL 1h
  - Busca em paralelo com `Promise.allSettled` (tolerante a falhas):
    - BCB SELIC diária → série 12 → converte para anual: `(1 + diario/100)^252 - 1`
    - BCB CDI anual → série 4389 → parseFloat direto
    - BCB IPCA mensal → série 433 → parseFloat direto
    - AwesomeAPI USD-BRL, EUR-BRL → `parseFloat(bid)`
  - Se alguma API falhar → usa `null` para aquele campo
- [ ] Criar `src/app/api/investments/benchmarks/route.ts`: GET sem parâmetros
  - Auth check
  - Chama `fetchBenchmarks()` e retorna JSON

**Critério:** `npm run build` passa; `/api/investments/benchmarks` retorna dados reais

---

### Issue #55 — [v0.8] Portfolio com cotações em tempo real
**Arquivos:** `src/app/api/investments/portfolio/route.ts` (MODIFY)

**Tasks:**
- [ ] Após buscar assets do banco, extrair tickers não-nulos com posição > 0
- [ ] Chamar `fetchQuotes(tickers)` em paralelo com o cálculo (antes do return)
- [ ] Se ticker tiver cotação live → usar no lugar de `asset.currentPrice`
- [ ] Calcular `currentValue`, `pnl`, `pnlPct` com o preço live
- [ ] Adicionar campo `priceSource: "live" | "manual"` no `AssetPosition`
- [ ] Fire-and-forget: atualizar `currentPrice` no banco para cada ticker com live price
  ```ts
  // Fora do await — não bloqueia response
  Promise.all(assetsToUpdate.map(({ id, price }) =>
    prisma.asset.update({ where: { id }, data: { currentPrice: price } })
  )).catch(() => {}); // silencioso
  ```

**Critério:** Portfolio retorna P&L calculado com preço live quando brapi disponível

---

### Issue #56 — [v0.8] UI BenchmarkBar — faixa de benchmarks
**Arquivos:** `src/components/investments/benchmarks/BenchmarkBar.tsx` (CREATE)

**Tasks:**
- [ ] Criar componente `BenchmarkBar` que recebe `BenchmarkData | null`
- [ ] Layout: linha horizontal com 5 itens — SELIC, CDI, IPCA, USD/BRL, EUR/BRL
- [ ] Cada item: label + valor formatado + ícone de tendência (↑↓ baseado em variação vs mês anterior — usar dado estático se não disponível, apenas mostrar o valor)
- [ ] Estado loading: skeleton `animate-pulse` por 3 segundos estimados
- [ ] Estado null/erro: mostrar `—` em vez de valor
- [ ] Visual: fundo `bg-axiom-card`, border `border-axiom-border`, texto branco/muted
- [ ] Cores: SELIC/CDI laranja `text-axiom-primary`, IPCA vermelho `text-axiom-expense`, moedas branco

**Critério:** `npm run build` passa; visual coerente com o design system

---

### Issue #57 — [v0.8] InvestmentsShell — integração completa
**Arquivos:** `src/components/investments/InvestmentsShell.tsx` (MODIFY)

**Tasks:**
- [ ] Adicionar state `benchmarks: BenchmarkData | null` e `benchmarksLoading: boolean`
- [ ] Fetch benchmarks em paralelo com portfolio no `useEffect` inicial: `GET /api/investments/benchmarks`
- [ ] Renderizar `<BenchmarkBar data={benchmarks} loading={benchmarksLoading} />` acima das tabs
- [ ] No `AssetList`, adicionar coluna "Fonte" ou badge `LIVE` quando `priceSource === "live"` (opcional — só se sobrar espaço visual)
- [ ] Manter comportamento de refresh: ao chamar `triggerPortfolioRefresh`, rebuscar portfolio (benchmarks não precisam ser rebuscados)

**Critério:** Tela de investimentos exibe BenchmarkBar com dados reais; portfolio mostra preços live

---

### Issue #58 — [v0.8] Env config — BRAPI_TOKEN + .env.example
**Arquivos:** `.env.example` (MODIFY), `CLAUDE.md` (MODIFY)

**Tasks:**
- [ ] Adicionar `BRAPI_TOKEN=` em `.env.example` com comentário explicativo
- [ ] Verificar se `.env.local` (git-ignored) contém token — se não, adicionar instrução
- [ ] Atualizar seção "Stack" do `CLAUDE.md` com nota sobre BRAPI_TOKEN
- [ ] Atualizar seção "APIs externas" no CLAUDE.md documentando as 3 integrações

**Critério:** `npm run build` passa; desenvolvedor novo sabe como configurar token

---

## Próxima Etapa

Sem incertezas técnicas (APIs verificadas, padrões conhecidos, sem nova infra):

1. Executar `/planejar-feature` para gerar SPEC formal
2. Depois `/publicar-milestone` e `/executar-milestone`
