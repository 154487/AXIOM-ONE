# SPEC - Cotações + Benchmarks Realtime (v0.8)

> Gerado por `/planejar-feature` em 2026-03-19
> PRD: plan/milestones/v0.8-quotes/prd-quotes.md

## Resumo

Integrar cotações em tempo real de ativos B3 via brapi.dev (1 req por ticker, free plan) e
benchmarks macroeconômicos via BCB + AwesomeAPI. Um módulo de cache in-memory com TTL de 1h
evita requests excessivos. O endpoint `/api/investments/portfolio` passa a usar preços live,
atualizando `currentPrice` no banco de forma silenciosa. Uma `BenchmarkBar` é inserida no
topo da tela de investimentos.

---

## Arquitetura

```
InvestmentsShell (client, InvestmentsShell.tsx)
   │
   ├── fetch /api/investments/portfolio   (já existia — MODIFY)
   │       │
   │       ├── lib/quotes.ts → brapi.dev/api/quote/{ticker} (1 por vez, cache 1h)
   │       │   Atualiza DB currentPrice em background (fire-and-forget)
   │       └── Retorna AssetPosition[] com priceSource: "live" | "manual"
   │
   └── fetch /api/investments/benchmarks  (NEW)
           │
           └── lib/benchmarks.ts
               ├── BCB SGS série 12  → SELIC diária → anual
               ├── BCB SGS série 4389 → CDI anual
               ├── BCB SGS série 433  → IPCA mensal
               ├── AwesomeAPI /json/last/USD-BRL → USD/BRL
               └── AwesomeAPI /json/last/EUR-BRL → EUR/BRL

lib/cache.ts  ← singleton Map com TTL, usado por quotes.ts e benchmarks.ts
```

---

## Mudanças por Arquivo

### Issue #52 — CREATE: `src/lib/cache.ts`

**Responsabilidade:** Cache in-memory singleton com TTL por entrada.

**Implementar:**
- [ ] Interface `CacheEntry<T> = { value: T; expiresAt: number }`
- [ ] Classe `MemCache` com `Map<string, CacheEntry<unknown>>`
- [ ] Método `get<T>(key: string): T | null` — retorna null se expirado ou inexistente
- [ ] Método `set<T>(key: string, value: T, ttlMs: number): void`
- [ ] Função helper exportada `cached<T>(key, ttlMs, fetcher: () => Promise<T>): Promise<T>`
  - Se cache hit → retorna imediatamente
  - Se cache miss → chama fetcher, armazena, retorna
- [ ] Exportar `export const cache = new MemCache()` como singleton

**Snippet base:**
```ts
// src/lib/cache.ts
interface CacheEntry<T> { value: T; expiresAt: number; }

class MemCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export const cache = new MemCache();

export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== null) return hit;
  const value = await fetcher();
  cache.set(key, value, ttlMs);
  return value;
}
```

**Critério:** `npm run build` passa.

---

### Issue #53 — CREATE: `src/lib/quotes.ts` + `src/app/api/investments/quotes/route.ts`

**Responsabilidade:** Buscar preço atual de ativos B3 via brapi.dev, com cache 1h por ticker.

#### `src/lib/quotes.ts`

**Implementar:**
- [ ] Constante `CACHE_TTL = 60 * 60 * 1000` (1h em ms)
- [ ] Função `fetchQuote(ticker: string): Promise<number | null>`
  - Lê `process.env.BRAPI_TOKEN` — se ausente, loga warning e retorna `null`
  - Usa `cached(\`quote:${ticker}\`, CACHE_TTL, async () => { ... })`
  - Chama `GET https://brapi.dev/api/quote/${ticker}?token=${token}&fundamental=false`
  - Extrai `data.results[0].regularMarketPrice` — retorna null se não encontrado
  - Qualquer erro → retorna null (nunca lança)
- [ ] Função `fetchQuotes(tickers: string[]): Promise<Record<string, number>>`
  - Remove duplicatas, filtra strings vazias
  - `Promise.all(tickers.map(fetchQuote))` — paralelo, 1 req por ticker
  - Retorna `{ MXRF11: 10.35, BOVA11: 118.90 }` — omite tickers com null

**Snippet base:**
```ts
// src/lib/quotes.ts
import { cached } from "./cache";

const CACHE_TTL = 60 * 60 * 1000; // 1h

export async function fetchQuote(ticker: string): Promise<number | null> {
  const token = process.env.BRAPI_TOKEN;
  if (!token) { console.warn("[quotes] BRAPI_TOKEN not set"); return null; }
  return cached(`quote:${ticker}`, CACHE_TTL, async () => {
    try {
      const res = await fetch(
        `https://brapi.dev/api/quote/${ticker}?token=${token}&fundamental=false`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data.results?.[0]?.regularMarketPrice as number) ?? null;
    } catch { return null; }
  });
}

export async function fetchQuotes(tickers: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(tickers.filter(Boolean))];
  const prices = await Promise.all(unique.map(fetchQuote));
  return Object.fromEntries(
    unique.flatMap((t, i) => prices[i] !== null ? [[t, prices[i]!]] : [])
  );
}
```

#### `src/app/api/investments/quotes/route.ts`

**Implementar:**
- [ ] Auth check (padrão)
- [ ] `const tickers = searchParams.get("tickers")?.split(",").filter(Boolean) ?? []`
- [ ] Se sem tickers → retornar `{ quotes: {} }`
- [ ] Chamar `fetchQuotes(tickers)`
- [ ] Retornar `NextResponse.json({ quotes })`

**Critério:** `GET /api/investments/quotes?tickers=MXRF11` retorna `{ quotes: { MXRF11: 10.35 } }`.

---

### Issue #54 — CREATE: `src/lib/benchmarks.ts` + `src/app/api/investments/benchmarks/route.ts`

**Responsabilidade:** Buscar SELIC/CDI/IPCA/USD/EUR de APIs públicas sem auth.

#### `src/lib/benchmarks.ts`

**Implementar:**
- [ ] Exportar interface `BenchmarkData`:
  ```ts
  export interface BenchmarkData {
    selicAnual: number | null;  // % ao ano ex: 13.65
    cdi: number | null;         // % ao ano ex: 14.90
    ipca: number | null;        // % no mês ex: 0.70
    usdBrl: number | null;      // ex: 5.73
    eurBrl: number | null;      // ex: 6.21
    updatedAt: string;          // ISO timestamp do fetch
  }
  ```
- [ ] Constante `BCB_CACHE_TTL = 60 * 60 * 1000` (1h)
- [ ] Função helper `fetchBcbSeries(series: number): Promise<number | null>`
  - URL: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados/ultimos/1?formato=json`
  - Retorna `parseFloat(data[0].valor)` ou null se erro
  - **Sem cache individual** — o caller usa cache no nível de `fetchBenchmarks`
- [ ] Função `fetchBenchmarks(): Promise<BenchmarkData>`
  - Usa `cached("benchmarks", BCB_CACHE_TTL, async () => { ... })`
  - Busca em paralelo com `Promise.allSettled`:
    - SELIC diária (série 12) → `(1 + valor/100)^252 - 1) * 100` → % ao ano
    - CDI anual (série 4389) → `parseFloat(valor)` direto
    - IPCA mensal (série 433) → `parseFloat(valor)` direto
    - AwesomeAPI USD + EUR em **1 request**: `GET https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL`
      → `parseFloat(data.USDBRL.bid)` e `parseFloat(data.EURBRL.bid)`
  - Resultado de cada `allSettled`: extrair com `.status === "fulfilled" ? r.value : null`
  - Retornar objeto com `updatedAt: new Date().toISOString()` (sempre populado)
  - Sempre retorna objeto completo (nunca lança)
  - Sempre retorna objeto completo (nunca lança)

**Snippet base — fetchBenchmarks completo:**
```ts
export async function fetchBenchmarks(): Promise<BenchmarkData> {
  return cached("benchmarks", BCB_CACHE_TTL, async () => {
    const [selicR, cdiR, ipcaR, awesomeR] = await Promise.allSettled([
      fetchBcbSeries(12),    // SELIC diária
      fetchBcbSeries(4389),  // CDI anual
      fetchBcbSeries(433),   // IPCA mensal
      fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL")
        .then((r) => r.json()),
    ]);

    // série 12 retorna taxa diária ex: "0.052345" (decimal, não %)
    const selicDaily = selicR.status === "fulfilled" ? selicR.value : null;
    const selicAnual = selicDaily !== null
      ? ((1 + selicDaily / 100) ** 252 - 1) * 100
      : null;

    const awesome = awesomeR.status === "fulfilled" ? awesomeR.value : null;

    return {
      selicAnual,
      cdi:    cdiR.status === "fulfilled" ? cdiR.value : null,
      ipca:   ipcaR.status === "fulfilled" ? ipcaR.value : null,
      usdBrl: awesome ? parseFloat(awesome.USDBRL?.bid) : null,
      eurBrl: awesome ? parseFloat(awesome.EURBRL?.bid) : null,
      updatedAt: new Date().toISOString(),
    };
  });
}
```

#### `src/app/api/investments/benchmarks/route.ts`

**Implementar:**
- [ ] Auth check (padrão)
- [ ] Chamar `fetchBenchmarks()`
- [ ] Retornar `NextResponse.json(data)`

**Critério:** `GET /api/investments/benchmarks` retorna objeto `BenchmarkData` com valores reais.

---

### Issue #55 — MODIFY: `src/app/api/investments/portfolio/route.ts`

**Responsabilidade:** Usar preços live do brapi.dev no cálculo do portfolio.

**Alterar (linha 22 em diante — após buscar assets):**

- [ ] Adicionar campo `priceSource: "live" | "manual"` na interface `AssetPosition` (linha 6–20)
- [ ] Após o `prisma.asset.findMany()`, extrair tickers e chamar `fetchQuotes` **antes** do `.map()` de posições (sequencial — os tickers dependem do findMany):
  ```ts
  const tickers = assets.filter((a) => a.ticker).map((a) => a.ticker!);
  const liveQuotes = await fetchQuotes(tickers); // aguarda antes do map
  ```
- [ ] Na linha 67 onde define `currentPrice`:
  ```ts
  const livePrice = asset.ticker ? liveQuotes[asset.ticker] : undefined;
  const currentPrice = livePrice ?? (asset.currentPrice ? parseFloat(String(asset.currentPrice)) : avgCost);
  const priceSource: "live" | "manual" = livePrice !== undefined ? "live" : "manual";
  ```
- [ ] Incluir `priceSource` no objeto retornado pelo map
- [ ] Fire-and-forget após montar `activePositions`:
  ```ts
  // Atualizar DB silenciosamente — não bloquear response
  const updates = activePositions
    .filter((p) => p.priceSource === "live" && p.ticker)
    .map((p) => prisma.asset.update({
      where: { userId: session.user.id, id: p.id },
      data: { currentPrice: p.currentPrice },
    }));
  Promise.all(updates).catch(() => {});
  ```

**Import a adicionar:** `import { fetchQuotes } from "@/lib/quotes";`

**Critério:** Portfolio retorna `priceSource: "live"` para ativos com ticker quando brapi disponível.

---

### Issue #56 — CREATE: `src/components/investments/benchmarks/BenchmarkBar.tsx`

**Responsabilidade:** Faixa horizontal mostrando benchmarks macroeconômicos.

**Implementar:**
- [ ] Props: `data: BenchmarkData | null; loading: boolean`
- [ ] Layout: `flex flex-wrap gap-3` com 5 cards (SELIC, CDI, IPCA, USD/BRL, EUR/BRL)
- [ ] Cada item: label pequena (uppercase, muted) + valor grande (branco)
- [ ] Container: `bg-axiom-card border border-axiom-border rounded-xl p-4`
- [ ] Estado loading: 5 skeletons `animate-pulse w-20 h-8 rounded bg-axiom-hover`
- [ ] Estado null (erro/indisponível): mostrar `—` no valor
- [ ] Formato dos valores:
  - SELIC/CDI: `valor.toFixed(2) + "% a.a."` — cor `text-axiom-primary`
  - IPCA: `valor.toFixed(2) + "% /mês"` — cor `text-axiom-expense`
  - USD/BRL, EUR/BRL: `"R$ " + valor.toFixed(2)` — cor `text-white`
- [ ] Label "Benchmarks" no topo do card (texto muted, font-semibold)
- [ ] Adicionar nota pequena: `text-axiom-muted text-xs` → "Atualizado a cada 1h"

**Snippet estrutura:**
```tsx
<div className="bg-axiom-card border border-axiom-border rounded-xl p-4">
  <p className="text-axiom-muted text-xs font-semibold uppercase mb-3">Benchmarks</p>
  <div className="flex flex-wrap gap-6">
    {/* Para cada benchmark: */}
    <div className="flex flex-col gap-1">
      <span className="text-axiom-muted text-xs">SELIC</span>
      <span className="text-axiom-primary font-semibold text-sm">13.65% a.a.</span>
    </div>
    {/* ... */}
  </div>
  <p className="text-axiom-muted text-xs mt-3">Atualizado a cada 1h</p>
</div>
```

**Critério:** `npm run build` passa; visual coerente com design system.

---

### Issue #57 — MODIFY: `src/components/investments/InvestmentsShell.tsx`

**Responsabilidade:** Buscar benchmarks e renderizar `BenchmarkBar` acima das tabs.

**Alterar:**

- [ ] Adicionar imports:
  ```ts
  import { BenchmarkBar } from "./benchmarks/BenchmarkBar";
  import type { BenchmarkData } from "@/lib/benchmarks";
  ```
- [ ] Adicionar states:
  ```ts
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [benchmarksLoading, setBenchmarksLoading] = useState(true);
  ```
- [ ] Dentro de `fetchPortfolio`, adicionar fetch paralelo de benchmarks (linha 52):
  ```ts
  const [portfolioRes, assetsRes, benchmarksRes] = await Promise.all([
    fetch("/api/investments/portfolio"),
    fetch("/api/investments/assets"),
    fetch("/api/investments/benchmarks"),
  ]);
  ```
  - Setar `setBenchmarks(await benchmarksRes.json())` após resolver
  - Setar `setBenchmarksLoading(false)` no finally
- [ ] No JSX, inserir `<BenchmarkBar data={benchmarks} loading={benchmarksLoading} />` entre `<h1>` e `<Tabs>` (linha 73–74 aproximadamente)

**Critério:** BenchmarkBar aparece na tela com dados reais; portfolio continua funcionando.

---

### Issue #58 — MODIFY: `.env.example` + `CLAUDE.md`

**Responsabilidade:** Documentar token e APIs externas.

**`.env.example`:**
- [ ] Adicionar bloco após as entradas existentes:
  ```
  # brapi.dev — cotações B3 (free: 1 ativo/req, 15k req/mês)
  # Obter em: https://brapi.dev/dashboard
  BRAPI_TOKEN=
  ```

**`CLAUDE.md`:**
- [ ] Na seção "Stack", adicionar linha para APIs externas:
  ```
  | APIs externas | brapi.dev (B3), BCB SGS (SELIC/CDI/IPCA), AwesomeAPI (câmbio) | — |
  ```
- [ ] Adicionar regra de implementação:
  `11. **BRAPI_TOKEN:** obrigatório em .env.local para cotações em tempo real; sem token o portfolio usa currentPrice do banco (fallback silencioso)`
- [ ] Na seção "Mapa de Domínio", adicionar após models:
  ```
  ### Lib — Cache e APIs externas
  - `src/lib/cache.ts` — MemCache singleton, TTL por entrada, função `cached()`
  - `src/lib/quotes.ts` — fetchQuotes(tickers[]) → Record<ticker, price>, cache 1h, brapi.dev
  - `src/lib/benchmarks.ts` — fetchBenchmarks() → BenchmarkData, cache 1h, BCB + AwesomeAPI
  ```

**Critério:** `npm run build` passa; CLAUDE.md reflete arquitetura atual.

---

## Ordem de Implementação

```
#52 → cache.ts (base de tudo)
#53 → quotes.ts + /api/quotes (depende do cache)
#54 → benchmarks.ts + /api/benchmarks (depende do cache)
#55 → portfolio/route.ts (depende do quotes.ts)
#56 → BenchmarkBar.tsx (depende da interface BenchmarkData)
#57 → InvestmentsShell.tsx (depende de BenchmarkBar + /api/benchmarks)
#58 → .env.example + CLAUDE.md (documentação, pode ser último)
```

---

## Complexidade

**Média** — 9 arquivos (5 novos, 4 modificados). Sem migrações. Sem novos models. APIs externas com fallback gracioso.

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| brapi.dev offline | `fetchQuotes` retorna `{}` → portfolio usa DB currentPrice |
| BCB/AwesomeAPI offline | `Promise.allSettled` → campos ficam `null` → BenchmarkBar mostra `—` |
| Rate limit brapi (15k/mês) | Cache 1h + 1 req/ticker → ~30 req/dia para 1 ativo = ~900/mês, seguro |
| `currentPrice` desatualizado no DB | Fire-and-forget atualiza a cada fetch de portfolio |
| SSR tentando acessar cache (Node singleton) | `src/lib/cache.ts` só roda server-side (API routes) — sem problema |

---

## Regras de Execução

- NÃO alterar arquivos fora desta lista
- NÃO criar migrations — nenhuma mudança de schema
- NÃO fazer requests de cotação no cliente — sempre via API route
- `fetchQuotes` e `fetchBenchmarks` são server-only (usam env vars)
- Sempre testar `npm run build` antes de commitar
