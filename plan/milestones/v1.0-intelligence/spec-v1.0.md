# SPEC — v1.0 Intelligence Layer

> Gerado por `/planejar-feature` em 2026-03-19
> Escopo: plan/milestones/v1.0-intelligence/scope-v1.0.md

## Resumo

Nova aba **Inteligência** dentro de `/investments` com 3 funcionalidades:
(1) Pattern Mapping — linha de Health Score ao longo do tempo marcada com aportes/resgates do Diário;
(2) Allocation Suggestion — sugere onde alocar a Sobra Sustentável com base no histórico de aportes;
(3) Simulação "E se...?" — slider client-side que projeta impacto de mudar o aporte mensal no patrimônio e data FIRE.

---

## Arquitetura

```
/investments  (InvestmentsShell)
  ├── aba Carteira         (existente)
  ├── aba Lançamentos      (existente)
  └── aba Inteligência     ← nova
        ├── PatternMapping          → GET /api/intelligence/patterns
        ├── AllocationSuggestion    → GET /api/intelligence/allocation
        └── WhatIfSimulator         → cálculo client-side (sem API)
                                       usa dados de allocation + portfolioData
```

```
GET /api/intelligence/patterns
  auth() → JournalEntry[] (com healthScoreAtTime) → { points[], insight }

GET /api/intelligence/allocation
  auth() → getHealthSnapshot() + InvestmentEntry history → { availableMonthly, monthlyIncome, monthlyExpenses, suggestions[] }
```

---

## Mudanças por Arquivo

### CREATE: `src/app/api/intelligence/patterns/route.ts`

**Responsabilidade:** Retorna série temporal de Health Score + marcadores de aportes/resgates do Diário.

**Implementar:**
- [ ] Auth check (padrão do projeto)
- [ ] Buscar todas as `JournalEntry` do usuário onde `healthScoreAtTime IS NOT NULL`, ordenadas por `date ASC`
- [ ] Calcular insight textual: separar entries com `entryType IN ("APORTE","RESGATE")` — se houver ≥3, calcular variação média de score nos 30 dias após cada aporte vs. base
- [ ] Retornar `{ points: PatternPoint[], insight: string | null }`

**Response type (exportar da rota para uso nos componentes):**
```ts
// Exportar para que PatternMapping.tsx importe via:
// import type { PatternPoint } from "@/app/api/intelligence/patterns/route";
export interface PatternPoint {
  date: string;       // ISO "2026-01-15"
  score: number;      // healthScoreAtTime
  entryType: string;  // "NOTE"|"APORTE"|"RESGATE"|"REFLEXAO"|"META"
  title: string;
}

export interface PatternsResponse {
  points: PatternPoint[];
  insight: string | null; // "Após aportes, seu score subiu em média X pts"
}
```

**Referência de padrão de export de tipos:** `src/app/api/investments/portfolio/route.ts:7` — `export interface AssetPosition`

**Referência de auth:** seguir `src/app/api/journal/route.ts:34-37`

**Snippet base:**
```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.journalEntry.findMany({
    where: { userId: session.user.id, healthScoreAtTime: { not: null } },
    orderBy: { date: "asc" },
    select: { date: true, healthScoreAtTime: true, entryType: true, title: true },
  });

  const points = entries.map((e) => ({
    date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10),
    score: e.healthScoreAtTime!,
    entryType: e.entryType,
    title: e.title,
  }));

  // Insight: média de score após aportes vs média geral
  // ...calcular e retornar string ou null

  return NextResponse.json({ points, insight: null });
}
```

---

### CREATE: `src/app/api/intelligence/allocation/route.ts`

**Responsabilidade:** Calcula sobra sustentável do mês atual + sugestão de alocação baseada no histórico de aportes.

**Implementar:**
- [ ] Auth check
- [ ] Chamar `getHealthSnapshot(userId)` para obter `sustainableSurplus` (sobra = income - expenses)
- [ ] Buscar income/expenses do mês atual via `prisma.transaction.findMany` (mesmo padrão de `healthSnapshot.ts:16-22`)
- [ ] Buscar `InvestmentEntry` dos últimos 12 meses com `type = "PURCHASE"`, agrupados por `asset.type`
- [ ] Calcular distribuição histórica de aportes por `AssetType`
- [ ] Se sem histórico → usar perfil padrão balanceado: `{ FIXED_INCOME: 40, FII: 30, STOCK: 20, ETF: 10 }`
- [ ] Retornar `{ availableMonthly, monthlyIncome, monthlyExpenses, currentAllocation, suggestions }`

**Response type (exportar da rota para uso nos componentes):**
```ts
// Exportar para que AllocationSuggestion.tsx importe via:
// import type { AllocationResponse } from "@/app/api/intelligence/allocation/route";
export interface AllocationSuggestionItem {
  type: string;       // AssetType
  label: string;      // "Renda Fixa", "FIIs", etc.
  pct: number;        // percentual sugerido (0-100)
  amount: number;     // availableMonthly * (pct / 100)
}

export interface AllocationResponse {
  availableMonthly: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  suggestions: AllocationSuggestionItem[];
}
```

**Labels por AssetType** (usar objeto constante no arquivo):
```ts
const TYPE_LABELS: Partial<Record<string, string>> = {
  FIXED_INCOME: "Renda Fixa",
  FII: "Fundos Imobiliários",
  STOCK: "Ações BR",
  ETF: "ETF",
  BDR: "BDR",
  CRYPTO: "Criptomoedas",
  STOCK_INT: "Ações Internacionais",
  OTHER: "Outros",
};
```

**Referência:** padrão de cálculo em `src/lib/healthSnapshot.ts:16-31`

---

### CREATE: `src/components/investments/intelligence/IntelligenceTab.tsx`

**Responsabilidade:** Container da aba — faz fetch dos 2 endpoints e distribui dados aos 3 sub-componentes.

**Implementar:**
- [ ] `"use client"` — fetch de `/api/intelligence/patterns` e `/api/intelligence/allocation` via `useEffect`
- [ ] Estados: `patternsData`, `patternsLoading`, `allocationData`, `allocationLoading`
- [ ] Receber como props: `portfolioTotalValue: number`, `currency: string`
- [ ] Renderizar sequencialmente: `PatternMapping`, `AllocationSuggestion`, `WhatIfSimulator`
- [ ] Skeleton enquanto carrega (padrão: `animate-pulse bg-axiom-hover rounded-xl h-48`)

**Props interface:**
```ts
interface IntelligenceTabProps {
  portfolioTotalValue: number;
  currency: string;
}
```

---

### CREATE: `src/components/investments/intelligence/PatternMapping.tsx`

**Responsabilidade:** Gráfico Chart.js — linha de Health Score ao longo do tempo com marcadores em aportes/resgates.

**Implementar:**
- [ ] `"use client"` + mounted guard (`useState(false)` + `useEffect(() => setMounted(true), [])`)
- [ ] Chart.js `Line` com dataset único de score ao longo do tempo
- [ ] Pontos coloridos por `entryType`: APORTE → verde (`#10B981`), RESGATE → vermelho (`#EF4444`), outros → laranja (`#FF6B35`)
- [ ] Tooltip customizado mostrando `title` da entrada
- [ ] Exibir `insight` textual abaixo do gráfico se não-null (badge estilo `InsightsCard`)
- [ ] Se `points.length < 2` → empty state: "Crie entradas no Diário para visualizar seu histórico"

**Referência de mounted guard:** `src/components/dashboard/MonthlyChart.tsx`
**Referência de cores:** tokens axiom no CLAUDE.md

---

### CREATE: `src/components/investments/intelligence/AllocationSuggestion.tsx`

**Responsabilidade:** Cards de sugestão de alocação da sobra mensal.

**Implementar:**
- [ ] Exibir `availableMonthly` formatado como moeda no topo (badge destacado)
- [ ] Se `availableMonthly <= 0` → empty state: "Sem sobra disponível para alocar este mês"
- [ ] Grid de cards (1 por sugestão): ícone por tipo + label + percentual + valor em R$
- [ ] Cards apenas visuais por enquanto (sem `onAllocate` — adicionar quando houver integração real com o modal de novo aporte)
- [ ] Usar `formatCurrency(amount, "pt-BR", currency)` de `@/lib/utils`

**Referência de formatCurrency:** `src/lib/utils.ts`

---

### CREATE: `src/components/investments/intelligence/WhatIfSimulator.tsx`

**Responsabilidade:** Slider interativo projetando impacto de mudar aporte mensal.

**Implementar:**
- [ ] `"use client"` + mounted guard para Chart.js
- [ ] Receber props: `currentPatrimony: number`, `monthlyIncome: number`, `monthlyExpenses: number`, `currency: string`
- [ ] Estado: `slider` (número de 0 a 300, default 100 = aporte atual = `monthlyIncome - monthlyExpenses`)
- [ ] `sliderPMT = (monthlyIncome - monthlyExpenses) * (slider / 100)` — 0% = não aporta, 100% = atual, 300% = 3x mais
- [ ] Calcular 3 cenários inline (sem API), mesma fórmula de `src/app/api/reports/fire/route.ts:31-46`:
  - **Conservador:** `annualRate = 0.06`
  - **Moderado:** `annualRate = 0.08`
  - **Agressivo:** `annualRate = 0.10`
- [ ] Para cada cenário: patrimônio projetado por ano (até 30 anos) + `projectedYear` FIRE
- [ ] Chart.js `Line` com 3 datasets (3 cores distintas) + linha horizontal do FI Number
- [ ] Cards abaixo do gráfico: "Com aporte atual → FIRE em XXXX", "Com 2x mais → FIRE em XXXX"
- [ ] `basePMT = Math.max(0, monthlyIncome - monthlyExpenses)` → `sliderPMT = basePMT * (slider / 100)`
- [ ] Se `sliderPMT <= 0` → mostrar aviso em vez do gráfico: "Aumente sua renda ou reduza gastos para projetar"

**Referência da fórmula FIRE:** `src/app/api/reports/fire/route.ts:24-46` — copiar a lógica, não chamar a API
**Referência de Chart.js Line:** `src/components/reports/patrimonio/NetWorthChart.tsx`

---

### MODIFY: `src/components/investments/InvestmentsShell.tsx`

**Alterar:**
- [ ] Adicionar `"intelligence"` ao tipo de tab: `"portfolio" | "entries" | "intelligence"`
- [ ] Adicionar `TabsTrigger` para Inteligência (linha ~92): `{t("tabs.intelligence")}`
- [ ] Adicionar `TabsContent value="intelligence"` com `<IntelligenceTab portfolioTotalValue={portfolioData?.totals.totalCurrentValue ?? 0} currency={initialCurrency} />`
- [ ] Importar `IntelligenceTab` de `./intelligence/IntelligenceTab`

**Linha de referência:** TabsTrigger existente em `InvestmentsShell.tsx:89-94`

---

### MODIFY: `messages/pt-BR.json`

**Adicionar** dentro de `"Investments" > "tabs"`:
```json
"intelligence": "Inteligência"
```

---

### MODIFY: `messages/en.json`, `es.json`, `fr.json`, `ar.json`, `hi.json`, `zh.json`

**Adicionar** `"intelligence"` em `Investments.tabs` em cada arquivo:
- en: `"Intelligence"`
- es: `"Inteligencia"`
- fr: `"Intelligence"`
- ar: `"الذكاء"`
- hi: `"बुद्धिमत्ता"`
- zh: `"智能分析"`

---

## Ordem de Implementação

1. **API patterns** — `src/app/api/intelligence/patterns/route.ts`
2. **API allocation** — `src/app/api/intelligence/allocation/route.ts`
3. **PatternMapping** — componente Chart.js
4. **AllocationSuggestion** — componente cards
5. **WhatIfSimulator** — componente slider + Chart.js
6. **IntelligenceTab** — container que une os 3
7. **InvestmentsShell** — adicionar aba
8. **i18n** — messages/*.json

---

## Issues Sugeridas

### Issue 1: API patterns — série temporal Journal × Health Score
**Arquivos:** `src/app/api/intelligence/patterns/route.ts`

**Tasks:**
- [ ] CREATE `src/app/api/intelligence/patterns/route.ts`
- [ ] Auth check + query `JournalEntry` com `healthScoreAtTime NOT NULL`, ordenado por `date ASC`
- [ ] Mapear para `PatternPoint[]` com date ISO slice(0,10)
- [ ] Calcular `insight`: se ≥3 entradas APORTE, comparar score médio das entries pós-aporte vs. média geral — retornar string descritiva
- [ ] Retornar `{ points, insight }`

**Critério:** `GET /api/intelligence/patterns` retorna 200 com `{ points: [...], insight: "..." | null }`

---

### Issue 2: API allocation — sobra + sugestão de alocação
**Arquivos:** `src/app/api/intelligence/allocation/route.ts`

**Tasks:**
- [ ] CREATE `src/app/api/intelligence/allocation/route.ts`
- [ ] Auth check + buscar transações do mês atual para calcular `monthlyIncome` e `monthlyExpenses`
- [ ] `availableMonthly = monthlyIncome - monthlyExpenses` (nunca negativo: `Math.max(0, ...)`)
- [ ] Buscar `InvestmentEntry` dos últimos 12 meses (`type = "PURCHASE"`) com `include: { asset: true }`
- [ ] Agrupar por `asset.type`, calcular distribuição percentual histórica
- [ ] Se sem histórico → perfil padrão `{ FIXED_INCOME: 40, FII: 30, STOCK: 20, ETF: 10 }`
- [ ] Retornar `{ availableMonthly, monthlyIncome, monthlyExpenses, suggestions }`

**Critério:** `GET /api/intelligence/allocation` retorna 200 com suggestions[] e valores numéricos

---

### Issue 3: PatternMapping — gráfico Journal × Health Score
**Arquivos:** `src/components/investments/intelligence/PatternMapping.tsx`

**Tasks:**
- [ ] CREATE `src/components/investments/intelligence/PatternMapping.tsx`
- [ ] `"use client"` + mounted guard (ref: `MonthlyChart.tsx`)
- [ ] Chart.js `Line`: eixo X = datas, eixo Y = score (0-100), pontos coloridos por entryType
- [ ] Props: `points: PatternPoint[]`, `insight: string | null`
- [ ] Tooltip custom mostrando `title` da entrada
- [ ] Empty state se `points.length < 2`
- [ ] Exibir insight como badge colorido abaixo do gráfico

**Critério:** `npm run build` passa; componente renderiza sem erro com array vazio

---

### Issue 4: AllocationSuggestion — cards de alocação da sobra
**Arquivos:** `src/components/investments/intelligence/AllocationSuggestion.tsx`

**Tasks:**
- [ ] CREATE `src/components/investments/intelligence/AllocationSuggestion.tsx`
- [ ] Props: `data: AllocationResponse`, `currency: string`
- [ ] Header: "Sobra disponível este mês: R$ X.XXX"
- [ ] Grid de cards: um por sugestão, com label + pct% + valor formatado
- [ ] Empty state se `availableMonthly <= 0`
- [ ] Usar `formatCurrency` de `@/lib/utils`

**Critério:** `npm run build` passa; renderiza corretamente com dados mockados

---

### Issue 5: WhatIfSimulator — slider de aporte + projeção FIRE
**Arquivos:** `src/components/investments/intelligence/WhatIfSimulator.tsx`

**Tasks:**
- [ ] CREATE `src/components/investments/intelligence/WhatIfSimulator.tsx`
- [ ] `"use client"` + mounted guard para Chart.js
- [ ] Props: `currentPatrimony: number`, `monthlyIncome: number`, `monthlyExpenses: number`, `currency: string`
- [ ] Slider range 0-300 (step 10), default 100 → `sliderPMT = basePMT * (slider / 100)`
- [ ] Calcular 3 cenários inline (mesma fórmula de `fire/route.ts:31-46`), max 30 anos
- [ ] Chart.js `Line` com 3 datasets + linha horizontal FI Number
- [ ] Cards de resultado: FIRE conservador / moderado / agressivo com o slider atual
- [ ] Aviso se PMT ≤ 0: "Aumente sua renda ou reduza gastos para projetar"

**Critério:** `npm run build` passa; slider atualiza o gráfico em tempo real (sem API call)

---

### Issue 6: IntelligenceTab + InvestmentsShell + i18n
**Arquivos:**
- `src/components/investments/intelligence/IntelligenceTab.tsx`
- `src/components/investments/InvestmentsShell.tsx`
- `messages/*.json` (7 arquivos)

**Tasks:**
- [ ] CREATE `IntelligenceTab.tsx`: fetch patterns + allocation, distribui dados aos 3 componentes
- [ ] Skeleton de carregamento para PatternMapping e AllocationSuggestion
- [ ] Se qualquer fetch falhar → exibir card de erro: "Não foi possível carregar os dados. Tente novamente."
- [ ] MODIFY `InvestmentsShell.tsx`: adicionar aba Inteligência com TabsTrigger + TabsContent, passar `portfolioTotalValue`
- [ ] MODIFY todos os 7 `messages/*.json`: adicionar `Investments.tabs.intelligence` com tradução correta

**Critério:** `npm run build` passa; aba Inteligência aparece em `/investments`

---

## Complexidade

**Alta** — 8 arquivos novos, 7 arquivos de i18n, 1 arquivo modificado, Chart.js + lógica de projeção financeira

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Usuário sem entradas no Diário | Empty state explícito em PatternMapping |
| Usuário sem investimentos | WhatIfSimulator funciona só com dados de transações |
| PMT negativo (gastos > renda) | Aviso claro, não tentar projetar |
| Chart.js SSR | mounted guard obrigatório em todos os 3 componentes com gráfico |
| Cálculo FIRE diverge do Reports | Copiar exata mesma fórmula de `fire/route.ts` |

---

## Próxima Etapa

1. Executar `/revisar-spec` — validação crítica
2. Corrigir o que for apontado
3. `/clear`
4. `/publicar-milestone`
