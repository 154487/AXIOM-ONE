# PRD — Módulo de Investimentos + Financial Journal

> Gerado por `/pesquisar-feature` em 2026-03-19
> Baseado em: axiom_one_readme.md (visão do produto) + exploração do codebase + pesquisa de mercado

---

## Objetivo

Transformar o Axiom ONE de um tracker de despesas em um **sistema operacional financeiro completo**, adicionando:

1. **Módulo de Investimentos** — cadastro manual de ativos, carteira consolidada, rentabilidade vs benchmarks BR
2. **Cotações Realtime** — APIs gratuitas (BCB, AwesomeAPI) + brapi.dev (B3/FIIs)
3. **Financial Journal** — diário em Markdown com frontmatter para registrar eventos e mapear padrões ao longo do tempo
4. **Sobra Sustentável → Ação** — conectar o conceito central do Axiom com sugestões práticas de alocação

---

## Contexto do Produto

A visão do Axiom ONE é ser um **"sistema operacional financeiro pessoal"** que vai além do controle de gastos.

O conceito central é a **Sobra Sustentável** — não é Receita − Despesa, mas uma análise realista que considera variação de renda, despesas recorrentes e margem de segurança. Esse valor deve ser a **base para o investimento mensal**.

**Gap atual:** A v0.6 (Reports) já calcula Health Score, Projeção FIRE e Tendências — mas o usuário não sabe *onde* colocar o dinheiro da sobra. O módulo de investimentos fecha esse ciclo.

**Gap do mercado:** Kinvo, Gorila e Status Invest são **retrospectivos** (mostram o que foi investido). O Axiom ONE pode ser **prospectivo** — usando a Sobra Sustentável + Health Score para guiar a alocação futura.

---

## Arquivos Relevantes do Codebase

| Arquivo | Relevância |
|---------|-----------|
| `prisma/schema.prisma` | Adicionar models: Asset, InvestmentEntry, JournalEntry |
| `src/app/(dashboard)/reports/page.tsx` | Padrão de Server Component com force-dynamic para nova página |
| `src/components/reports/ReportsShell.tsx` | Padrão de tabs + fetch por aba (copiar para InvestmentsShell) |
| `src/components/reports/patrimonio/FireProjection.tsx` | Reusar lógica de projeção + sliders |
| `src/app/api/reports/networth/route.ts` | Padrão de cálculo patrimonial — integrar com carteira |
| `src/lib/utils.ts` | formatCurrency, formatDate — reusar |
| `src/components/shared/PeriodFilter.tsx` | Reusar em InvestmentsShell (callback mode) |
| `src/components/reports/types.ts` | Extender com InvestmentData, JournalData |

---

## Padrões a Reaproveitar

### 1. API Route com Auth + Prisma
```typescript
// Todos os novos endpoints seguem:
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// validação → 400, ownership → 403, lógica → retorno serializado
```

### 2. Chart.js com Mounted Guard
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
// animation: { duration: 1000, easing: "easeOutQuart" }
return mounted ? <Line data={...} /> : <Skeleton />;
```

### 3. Server Component com force-dynamic
```typescript
export const dynamic = "force-dynamic";
const session = await auth();
if (!session?.user?.id) redirect("/login");
// Prisma fetch → serializar → passar ao Client Component
```

### 4. Estado Local após Mutações
```typescript
const [assets, setAssets] = useState(initialAssets);
// create → setAssets(prev => [newAsset, ...prev])
// update → setAssets(prev => prev.map(a => a.id === updated.id ? updated : a))
// delete → setAssets(prev => prev.filter(a => a.id !== id))
```

---

## Pesquisa de APIs Externas

### APIs Gratuitas (Zero Custo)

#### BCB SGS — Banco Central do Brasil
- **URL:** `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json`
- **Sem autenticação**, sem rate limit documentado, dados oficiais do governo
- **Códigos essenciais:**
  - `11` → SELIC diária (% ao dia)
  - `12` → CDI diário
  - `433` → IPCA mensal (%)
  - `189` → IGP-M mensal
  - `226` → Taxa de câmbio USD → BRL (diária)
- **Exemplo de resposta:**
```json
[{ "data": "19/03/2026", "valor": "0.042271" }]
```
- **Uso no Axiom:** Benchmark CDI/SELIC/IPCA para comparar rentabilidade da carteira

#### AwesomeAPI — Câmbio e Cripto
- **URL:** `https://economia.awesomeapi.com.br/json/last/{moedas}`
- **Sem autenticação**, gratuita, sem rate limit documentado
- **Exemplo:** `GET /json/last/USD-BRL,EUR-BRL,BTC-BRL`
- **Resposta:** `{ USDBRL: { bid: "5.7423", ask: "5.7500", timestamp: "..." } }`
- **Uso no Axiom:** Converter ativos dolarizados (BDRs, ETFs internacionais, cripto) para BRL

#### Tesouro Nacional — Taxas do Tesouro Direto
- **URL:** `https://www.tesourodireto.com.br/json/br/com/b3/tesouro/titulos.json`
- **Sem autenticação**, atualizado diariamente (dias úteis)
- **Dados:** Títulos disponíveis, taxa de compra/venda, vencimento
- **Uso no Axiom:** Popular tipos de Renda Fixa automaticamente

### API Recomendada (Paga)

#### brapi.dev — B3, FIIs, ETFs, BDRs
- **Plano Free:** 60 req/min, dados com pequeno delay — suficiente para v0.8
- **Plano Startup:** R$25/mês, 300 req/min, sem delay
- **URL base:** `https://brapi.dev/api`
- **Endpoints principais:**
  - `GET /quote/{ticker}` → cotação atual + histórico
  - `GET /quote/list` → lista de todos os tickers disponíveis
  - `GET /v2/finance/dividends/{ticker}` → histórico de dividendos
- **Exemplo de resposta:**
```json
{
  "results": [{
    "symbol": "PETR4",
    "regularMarketPrice": 37.84,
    "regularMarketChangePercent": -1.23,
    "regularMarketDayHigh": 38.20,
    "regularMarketDayLow": 37.50,
    "logourl": "https://..."
  }]
}
```
- **Decisão:** Free tier é suficiente para MVP (v0.8) — upgrade para Startup se escalar

### Fallback — yahoo-finance2 (server-side only)
```bash
npm install yahoo-finance2
```
- **Uso:** Apenas server-side (Node.js) — jamais no cliente
- **Cobertura:** Ações BR com sufixo `.SA` (ex: `PETR4.SA`), ações US, cripto
- **Risco:** Sem SLA oficial — usar apenas como fallback quando brapi.dev falhar
- **Rate limit:** ~2000 req/hora (não documentado)

---

## Financial Journal — Padrão .md com Frontmatter

### Conceito
O usuário (ou o sistema automaticamente) registra **eventos financeiros significativos** em formato Markdown com frontmatter YAML. Isso cria um histórico rico que permite mapear **padrões comportamentais** ao longo do tempo — o que diferencia o Axiom ONE de qualquer outro app do mercado BR.

### Por que .md?
- Legível por humanos e máquinas (exportável, versionável)
- Frontmatter YAML é flexível sem schema rígido
- Parseable com `gray-matter` (bem estabelecido no ecossistema Next.js)
- Permite texto livre (raciocínio, contexto) junto com dados estruturados

### Estrutura de um Journal Entry
```markdown
---
date: "2026-03-19"
type: "aporte"
asset: "XPML11"
amount: 500.00
quantity: 5
price: 100.00
healthScoreAtTime: 82
sustainableSurplusAtTime: 1250.00
selic: 12.75
cdi: 12.65
ipca12m: 4.2
tags: ["FII", "renda-passiva", "meta-liberdade"]
---

Aportei em XPML11 aproveitando a queda de 3%.
O health score está em 82 — acima da meta de 75.
A sobra sustentável do mês foi R$ 1.250, usei R$ 500 (40%).

## Raciocínio
Preferi concentrar em FIIs pela distribuição mensal de dividendos.
Meta: R$ 500/mês de renda passiva até 2030.

## Contexto do Mercado
SELIC em 12,75% — renda fixa ainda competitiva, mas FIIs com yield > 14%.
```

### Biblioteca — gray-matter
```bash
npm install gray-matter
```
```typescript
// src/lib/journal.ts (server-only)
import matter from 'gray-matter';

export interface JournalFrontmatter {
  date: string;
  type: 'aporte' | 'resgate' | 'dividendo' | 'rebalanceamento' | 'nota';
  asset?: string;
  amount?: number;
  quantity?: number;
  price?: number;
  healthScoreAtTime?: number;
  sustainableSurplusAtTime?: number;
  selic?: number;
  cdi?: number;
  ipca12m?: number;
  tags?: string[];
}

export function parseJournalEntry(content: string) {
  const { data, content: body } = matter(content);
  return { frontmatter: data as JournalFrontmatter, body };
}
```

### Armazenamento
- Entries salvas como campo `TEXT` no PostgreSQL (via Prisma)
- Parsear no servidor ao servir — **nunca no cliente** (gray-matter = server-only)
- Indexar por `date`, `type` para queries eficientes

### Pattern Mapping — O Diferencial
Com `healthScoreAtTime` e `sustainableSurplusAtTime` no frontmatter, é possível:
- Correlacionar quando o usuário investe mais (health score alto vs baixo)
- Detectar se a sobra disponível influencia o tamanho dos aportes
- Gerar insights como: *"Seus melhores aportes acontecem quando o health score > 75 — você está 3x mais consistente nesses meses"*
- Identificar padrões sazonais (investe mais em determinado mês do ano?)

---

## Models Prisma Propostos

```prisma
enum AssetType {
  STOCK        // Ação BR (B3)
  FII          // Fundo Imobiliário
  ETF          // ETF nacional ou internacional
  BDR          // BDR (ação estrangeira na B3)
  CRYPTO       // Bitcoin, Ethereum, etc.
  FIXED_INCOME // Tesouro, CDB, LCI, LCA, CRI, CRA
  STOCK_INT    // Ação Internacional (ex: AAPL, MSFT)
  OTHER        // Outros
}

enum EntryType {
  PURCHASE   // Compra / Aporte
  SALE       // Venda / Resgate
  DIVIDEND   // Dividendo / Rendimento / JCP
  SPLIT      // Desdobramento ou Grupamento
}

// Ativo (instrumento de investimento)
model Asset {
  id        String    @id @default(cuid())
  userId    String
  ticker    String?   // "PETR4", "XPML11", "BTC", "IVVB11"
  name      String    // "Petrobras PN", "XP Malls FII"
  type      AssetType
  currency  String    @default("BRL")
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries   InvestmentEntry[]
  journals  JournalEntry[]
  @@unique([userId, ticker])
}

// Entrada de investimento (aporte, resgate, dividendo)
model InvestmentEntry {
  id        String    @id @default(cuid())
  assetId   String
  userId    String
  type      EntryType
  date      DateTime
  quantity  Decimal   @db.Decimal(14, 6) // pode ser fracionário (cripto)
  price     Decimal   @db.Decimal(14, 6) // preço unitário na data
  amount    Decimal   @db.Decimal(14, 2) // quantity * price
  notes     String?
  createdAt DateTime  @default(now())
  asset     Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Diário Financeiro (Markdown + Frontmatter YAML)
model JournalEntry {
  id        String    @id @default(cuid())
  userId    String
  date      DateTime
  type      String    // frontmatter.type: aporte|resgate|dividendo|nota
  content   String    @db.Text // Markdown completo (frontmatter + body)
  assetId   String?   // referência opcional ao ativo relacionado
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  asset     Asset?    @relation(fields: [assetId], references: [id])
}
```

---

## Endpoints de API Propostos

```
# Carteira
GET    /api/investments/assets            → lista ativos do usuário
POST   /api/investments/assets            → criar ativo
GET    /api/investments/assets/[id]       → detalhe + histórico de entradas
PATCH  /api/investments/assets/[id]       → editar ativo
DELETE /api/investments/assets/[id]       → excluir (cascade entries)

# Entradas
GET    /api/investments/entries           → lista entradas (filtrar por asset, period)
POST   /api/investments/entries           → registrar aporte/resgate/dividendo
PATCH  /api/investments/entries/[id]      → editar entrada
DELETE /api/investments/entries/[id]      → excluir entrada

# Carteira Consolidada
GET    /api/investments/portfolio         → posição atual, custo médio, P&L, % alocação

# Dados Externos (com cache 1h)
GET    /api/investments/benchmarks        → SELIC, CDI, IPCA via BCB + câmbio via AwesomeAPI
GET    /api/investments/quotes?tickers=   → cotações via brapi.dev (fallback: yahoo-finance2)

# Journal
GET    /api/journal                       → lista entries (paginado)
POST   /api/journal                       → criar entry (auto-injeta healthScore + surplus)
GET    /api/journal/[id]                  → detalhe com frontmatter parseado
PATCH  /api/journal/[id]                  → editar entry
DELETE /api/journal/[id]                  → excluir
GET    /api/journal/patterns              → análise de padrões (correlações)
```

---

## Componentes a Criar

```
src/
├── app/(dashboard)/
│   ├── investments/page.tsx              # Server Component — força dynamic, auth, shell
│   └── journal/page.tsx                 # Server Component — auth, lista + editor
├── app/api/investments/
│   ├── assets/route.ts
│   ├── assets/[id]/route.ts
│   ├── entries/route.ts
│   ├── entries/[id]/route.ts
│   ├── portfolio/route.ts
│   ├── benchmarks/route.ts              # BCB + AwesomeAPI + cache
│   └── quotes/route.ts                  # brapi.dev + yahoo fallback + cache
├── app/api/journal/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── patterns/route.ts
└── components/
    ├── investments/
    │   ├── InvestmentsShell.tsx          # "use client" — tabs: Carteira | Aportes | Benchmarks
    │   ├── portfolio/
    │   │   ├── AssetList.tsx             # Tabela: ativo, tipo, quantidade, preço médio, P&L%
    │   │   ├── AssetDialog.tsx           # Dialog criar/editar ativo + listar entradas
    │   │   ├── PortfolioDonut.tsx        # Chart.js Doughnut — alocação por tipo
    │   │   └── PerformanceCard.tsx       # Rentabilidade: carteira vs CDI vs IPCA vs SELIC
    │   └── benchmarks/
    │       └── BenchmarkBar.tsx          # Comparativo visual carteira vs benchmarks
    ├── journal/
    │   ├── JournalList.tsx              # Lista de entradas com preview do frontmatter
    │   ├── JournalEditor.tsx            # Editor Markdown + preview lateral
    │   ├── JournalFrontmatterForm.tsx   # Form dos campos YAML (tipo, ativo, valor)
    │   └── PatternInsights.tsx          # Gráficos de correlação health score × aportes
    └── shared/
        └── AllocationSuggestion.tsx     # "Sua sobra é R$X — sugestão de alocação"
```

---

## Estrutura de Milestones (Próximas v0.x)

### v0.7 — Carteira Base (sem API externa)
**Escopo:** Cadastro manual de ativos, histórico de aportes, carteira consolidada com custo médio e P&L manual. O usuário informa o preço atual — sem cotação automática ainda.
**Issues estimadas:** 8–10
**Prazo estimado:** 1 sessão

### v0.8 — Cotações + Benchmarks Realtime
**Escopo:** Integração BCB (SELIC/CDI/IPCA), AwesomeAPI (câmbio), brapi.dev (B3/FIIs). Cache Redis ou in-memory de 1h. P&L calculado automaticamente com cotação atual.
**Issues estimadas:** 6–8
**Prazo estimado:** 1 sessão

### v0.9 — Financial Journal
**Escopo:** Editor Markdown no browser, gray-matter no servidor, injeção automática de `healthScoreAtTime` e `sustainableSurplusAtTime`. Listagem com filtros.
**Issues estimadas:** 6–8
**Prazo estimado:** 1 sessão

### v1.0 — Intelligence Layer (Lançamento)
**Escopo:** Pattern Mapping (correlações journal × health score), AllocationSuggestion ("baseado no seu perfil, considere: X% Renda Fixa, Y% FIIs, Z% Ações"), simulações "e se eu aumentasse o aporte em 20%?". Dashboard integrado (sobra → alocação → patrimônio em um fluxo).
**Issues estimadas:** 8–12
**Prazo estimado:** 1–2 sessões

---

## Escopo Global

### Incluído (v0.7 → v1.0)
- CRUD de ativos (manual, sem importação de corretora)
- Histórico de aportes/resgates/dividendos por ativo
- Carteira consolidada: posição, custo médio, P&L, % alocação
- Benchmarks: SELIC, CDI, IPCA (BCB gratuito), câmbio (AwesomeAPI)
- Cotações B3/FIIs/ETFs (brapi.dev free tier)
- Financial Journal com Markdown + frontmatter YAML
- Pattern insights: correlação health score × aportes
- AllocationSuggestion conectado com Sobra Sustentável
- Nova rota `/investments` e `/journal` no sidebar

### Excluído (fora de escopo)
- Importação automática de notas de corretagem (PDF)
- Integração OAuth com corretoras (XP, Rico, Clear, etc.)
- Declaração de IR automática
- Análise fundamentalista de empresas
- Alertas de preço em tempo real (WebSocket)
- Gestão de opções/derivativos/contratos futuros
- Social features (comparar carteira com amigos)

---

## Regras e Constraints

- Seguir padrão de auth em todas as API routes: `auth()` → 401 se sem sessão
- Campos Decimal do Prisma: sempre `parseFloat(String(decimal))` antes de serializar
- Chart.js: sempre `mounted` guard antes de renderizar qualquer gráfico
- Nunca hardcodar hex — sempre tokens `axiom-*`
- Cache de cotações externas: **mínimo 1h** (evitar rate limit e custo)
- gray-matter e yahoo-finance2: **server-only** — jamais importar no cliente
- Journal entries: armazenar Markdown completo no banco, parsear na API

---

## Memory Anchors

> Para uso pelo `/planejar-feature` na próxima sessão.

- **Entidades-chave:** Asset, InvestmentEntry, JournalEntry, AssetType (enum), EntryType (enum)
- **APIs externas:** BCB SGS (grátis, sem auth, SELIC/CDI/IPCA), AwesomeAPI (grátis, câmbio/cripto), brapi.dev (free 60req/min ou Startup R$25/mês, B3/FIIs), yahoo-finance2 (fallback server-side, tickers `.SA`)
- **Padrões críticos:** mounted guard obrigatório em todos os charts, serializar Decimal→number em todas as APIs, cache 1h para cotações externas
- **Biblioteca nova:** `gray-matter` (journal parsing, server-only); `yahoo-finance2` (fallback cotações, server-only)
- **Diferencial:** `healthScoreAtTime` + `sustainableSurplusAtTime` injetados automaticamente no frontmatter do journal = correlação comportamental inédita no mercado BR
- **Fluxo central:** Sobra Sustentável (calculada em Reports) → AllocationSuggestion → Investment Entry → Journal Entry → Pattern Insights
