# SPEC — v0.6 Reports (Central de Inteligência Financeira)

> Gerado por `/planejar-feature` em 2026-03-19
> Revisado por `/revisar-spec` em 2026-03-19 — 4 críticos corrigidos
> Baseado em estudo de mercado comparativo (Monarch, Copilot, PocketSmith, YNAB, Empower)

---

## Resumo

Implementar o módulo de Relatórios completo em `/reports` com 4 abas: **Visão Geral** (Health Score + Insights + Spending Velocity), **Fluxo de Caixa** (Cash Flow Chart + Sankey Diagram + Detector de Recorrências), **Tendências** (Category Trend Explorer + Merchant Spotlight + Análise Sazonal) e **Patrimônio** (Net Worth Chart + Taxa de Poupança + Projeção FIRE). Toda a lógica pesada é server-side via API Routes; componentes Chart.js seguem o padrão mounted-guard já estabelecido no projeto.

---

## Arquitetura

```
/reports (Server Component, force-dynamic)
  ↓ auth + fetch moeda padrão + locale
  ↓
<ReportsShell> — "use client" — controla aba ativa + período selecionado
  │   Quando aba muda → faz fetch da API correspondente → distribui via props
  │
  ├── <PeriodFilter>            — ADAPTAR de DashboardFilters.tsx existente
  │                               (mover para src/components/shared/PeriodFilter.tsx)
  │
  ├── ABA: Visão Geral
  │     ReportsShell faz fetch GET /api/reports/overview e distribui overviewData via props:
  │     ├── <HealthScoreCard overviewData={} />
  │     ├── <InsightsCard overviewData={} />
  │     └── <SpendingVelocityCard overviewData={} />
  │
  ├── ABA: Fluxo de Caixa
  │     ReportsShell faz fetch GET /api/reports/cashflow:
  │     ├── <CashFlowChart cashflowData={} />
  │     ├── <SankeyDiagram cashflowData={} />   ← consome sankeyNodes/Links da mesma API
  │     └── <RecurringList />                   ← fetch próprio (all-time, sem período)
  │
  ├── ABA: Tendências
  │     ├── <CategoryTrendChart />  ← fetch próprio (controla categorias selecionadas)
  │     ├── <MerchantSpotlight />   ← fetch próprio por período
  │     └── <SeasonalAnalysis />    ← fetch próprio (all-time)
  │
  └── ABA: Patrimônio
        ReportsShell faz fetch GET /api/reports/networth:
        ├── <NetWorthChart networthData={} />
        ├── <SavingsRateChart networthData={} />
        └── <FireProjection />   ← fetch próprio ao mover slider

API Routes (todas com auth + ownership)
  GET /api/reports/overview?start=&end=      → healthScore, pillars[], insights[], velocity
  GET /api/reports/cashflow?start=&end=      → monthlyBars[], sankeyNodes[], sankeyLinks[]
  GET /api/reports/recurring                 → recurring[] (heurística, all-time)
  GET /api/reports/trends?cats=&start=&end=  → categories[], series[]
  GET /api/reports/merchants?start=&end=     → merchants[], periodLabel
  GET /api/reports/seasonal                  → months[], hasEnoughData
  GET /api/reports/networth                  → months[], currentNetWorth, avgSavingsRate
  GET /api/reports/fire?patrimony=&income=&expenses=&rate=  → fiNumber, projectedMonths, series[]

Prisma (sem migration) — lê Transaction, Category, UserCurrency existentes
Utilitários reutilizados: src/lib/import/cleanDescription.ts (normalização de descriptions)
```

---

## Stack de Referência

| Item | Padrão |
|------|--------|
| Gráficos | Chart.js + react-chartjs-2 — sempre `"use client"` + mounted guard |
| Sankey | `chartjs-chart-sankey` (npm install — Issue #9) |
| Auth | `auth()` de `@/lib/auth` — server-side |
| Serialização | `parseFloat(String(tx.amount))` + `.toISOString()` |
| Moeda | `formatCurrency(value, locale, currency)` de `@/lib/utils` |
| Tokens | Apenas classes `axiom-*` — sem hex hardcoded no JSX/Tailwind |
| Hex em Chart.js | **Exceção controlada**: Chart.js não aceita classes Tailwind. Usar as constantes dos tokens do CLAUDE.md: `#10B981` (income), `#EF4444` (expense), `#FF6B35` (primary), `#AAB2BD` (muted) |
| Cards | `h-full flex flex-col` + área interna `flex-1 min-h-0` (padrão v0.6) |
| i18n | `useTranslations("Reports")` no client, `getTranslations` no server |
| Normalização | `cleanDescription(text)` de `@/lib/import/cleanDescription.ts` |
| Cor de aviso | `text-yellow-400` (sem token axiom-warning — usar Tailwind direto) |

---

## Mudanças por Arquivo

---

### MODIFY: `src/app/(dashboard)/reports/page.tsx`

**Responsabilidade:** Server Component raiz — auth, fetch moeda/locale, renderiza ReportsShell

**Substituir placeholder por:**
- [ ] `export const dynamic = "force-dynamic"`
- [ ] `auth()` + redirect se não autenticado
- [ ] Buscar `UserCurrency.isDefault` e locale via `getLocale()`
- [ ] Renderizar `<ReportsShell initialCurrency={} initialLocale={} />`

**Referência:** `src/app/(dashboard)/dashboard/page.tsx:1-30`

---

### MODIFY: `src/components/dashboard/DashboardFilters.tsx` → mover para `src/components/shared/PeriodFilter.tsx`

**Responsabilidade:** Extrair o seletor de período existente para componente compartilhado. O Dashboard passará a importar de `shared/`. Reports usará o mesmo componente.

**Implementar:**
- [ ] Mover arquivo `DashboardFilters.tsx` para `src/components/shared/PeriodFilter.tsx`
- [ ] Atualizar import no `src/app/(dashboard)/dashboard/page.tsx`
- [ ] Adaptar props: aceitar `onChange(start: string, end: string)` além do comportamento via URL (Reports usará `onChange`, Dashboard continua usando URL)
- [ ] Manter os 4 modos: Dia / Mês / Ano / Período

**Nota:** Reports usa `onChange` callback (estado local no ReportsShell); Dashboard continua usando `router.push` (URL).

---

### CREATE: `src/components/reports/ReportsShell.tsx`

**Responsabilidade:** `"use client"` — container central. Gerencia `activeTab`, `period` e os dados de cada aba. Faz fetch das APIs quando a aba é ativada ou o período muda. Distribui dados via props — sem fetch duplicado nos componentes filhos.

**Implementar:**
- [ ] Estado `activeTab: "overview" | "cashflow" | "trends" | "patrimonio"`
- [ ] Estado `period: { start: string; end: string }` — inicializado com mês atual
- [ ] Estado por aba: `overviewData`, `cashflowData`, `networthData` — cada um com `data | null` e `loading: boolean`
- [ ] Tabs estilizadas com pill ativo em `bg-axiom-primary` (custom, sem shadcn Tabs)
- [ ] `<PeriodFilter>` persistente acima das tabs chamando `setPeriod`
- [ ] Quando aba ativa ou período muda → fetch da API correspondente → atualiza estado
- [ ] Repassa dados via props para os componentes da aba ativa

**Snippet base:**
```tsx
const TABS = [
  { key: "overview",   label: t("tabOverview") },
  { key: "cashflow",   label: t("tabCashflow") },
  { key: "trends",     label: t("tabTrends") },
  { key: "patrimonio", label: t("tabPatrimonio") },
] as const;
```

---

### CREATE: `src/app/api/reports/overview/route.ts`

**Responsabilidade:** Calcula Health Score, Insights e Spending Velocity para o período

**Implementar:**
- [ ] `GET` com `?start=&end=` — validar que são datas ISO válidas
- [ ] Buscar transações do período + 6 meses anteriores (para comparativos e média)
- [ ] **Health Score (0-100):** 4 pilares somados:
  - Poupança: `(income - expenses) / income * 100 >= 20%` → 40pts, proporcional abaixo
  - Trend patrimônio: saldo líquido do período positivo → 30pts, negativo → 0pts
  - Renda presente: `income > 0` no período → 20pts (substitui "diversidade" — schema não separa categorias por tipo)
  - Controle: despesas do período < média dos 3 meses anteriores → 10pts
- [ ] **Insights (array de 3):** regras determinísticas:
  1. Categoria EXPENSE com maior variação vs. média histórica 6m (`%` de variação)
  2. Description mais frequente do período (top merchant por valor)
  3. Taxa de poupança vs. meta 20%: positivo se ≥ 20%, alerta se < 0%
- [ ] **Spending Velocity** (sempre calculado para o mês atual, independente do filtro):
  - `budget` = média de expenses dos últimos 3 meses completos
  - `spent` = expenses do mês atual até hoje
  - `dayOfMonth` = dia atual, `daysInMonth` = dias no mês
  - `projectedEnd = spent / dayOfMonth * daysInMonth`
  - `projectedOverrun = (projectedEnd - budget) / budget * 100`
- [ ] Retornar: `{ healthScore, pillars[], insights[], velocity }`
- [ ] Se `income = 0` no período: `healthScore = null`, `insights` ainda funciona com expenses

**Referência:** auth pattern em `src/app/api/transactions/route.ts`

---

### CREATE: `src/components/reports/visao-geral/HealthScoreCard.tsx`

**Responsabilidade:** `"use client"` — exibe score com animação count-up + 4 mini-pilares

**Implementar:**
- [ ] Recebe `overviewData` via props do `ReportsShell` (sem fetch próprio)
- [ ] Skeleton `animate-pulse bg-axiom-hover` enquanto `loading`
- [ ] Score central animado com count-up (padrão de `KPICard.tsx`)
- [ ] Cor do score: `text-axiom-income` se `>= 70`, `text-yellow-400` se `>= 40`, `text-axiom-expense` se `< 40`
- [ ] 4 barras de progresso CSS puro para os pilares
- [ ] Se `healthScore === null`: exibir "N/A — sem renda no período"
- [ ] Card: `h-full flex flex-col`

---

### CREATE: `src/components/reports/visao-geral/InsightsCard.tsx`

**Responsabilidade:** `"use client"` — 3 insights automáticos com ícone, texto e badge

**Implementar:**
- [ ] Recebe `overviewData` via props do `ReportsShell` (sem fetch próprio)
- [ ] Cada insight: ícone lucide (TrendingUp / TrendingDown / AlertTriangle), texto, badge de variação
- [ ] Badge: `bg-axiom-income/20 text-axiom-income` (positivo) ou `bg-axiom-expense/20 text-axiom-expense` (negativo)
- [ ] Skeleton enquanto loading

---

### CREATE: `src/components/reports/visao-geral/SpendingVelocityCard.tsx`

**Responsabilidade:** `"use client"` — velocidade de gasto no mês atual

**Implementar:**
- [ ] Recebe `overviewData` via props do `ReportsShell`
- [ ] Barra de progresso: `spent / budget * 100%`
- [ ] Cores: `< 70%` → `bg-axiom-income`, `70-90%` → `bg-yellow-400`, `> 90%` → `bg-axiom-expense`
- [ ] Texto: "Hoje é dia X — você usou Y% do orçamento estimado"
- [ ] Projeção: "No ritmo atual, terminará o mês Z% acima/abaixo do estimado"
- [ ] Quando período ≠ mês atual: exibir card com nota "Velocidade disponível apenas para o mês atual" em vez dos dados

---

### CREATE: `src/app/api/reports/cashflow/route.ts`

**Responsabilidade:** Dados para CashFlowChart + SankeyDiagram (uma única API para as duas visualizações)

**Implementar:**
- [ ] `GET` com `?start=&end=`
- [ ] **monthlyBars:** últimos 12 meses relativos a `end` (contexto histórico, independente do filtro)
  - Array de `{ month: string, income: number, expenses: number, net: number }`
- [ ] **sankeyData:** para o período filtrado (`start` → `end`)
  - `sankeyNodes`: array de `{ id: string, label: string }` — receita por categoria + despesa por categoria
  - `sankeyLinks`: array de `{ from: string, to: string, value: number }` — receita → "Disponível" → categoria de despesa
  - Agrupar categorias com < 3% do total em "Outros"
- [ ] Retornar: `{ monthlyBars[], sankeyNodes[], sankeyLinks[] }`

**Nota:** `sankeyNodes/Links` serão consumidos pelo `SankeyDiagram.tsx` na Issue #9. Implementar aqui mas o componente virá depois.

---

### CREATE: `src/components/reports/fluxo-caixa/CashFlowChart.tsx`

**Responsabilidade:** `"use client"` — Bar Chart misto com receita/despesa e linha de saldo líquido

**Implementar:**
- [ ] Recebe `cashflowData` via props do `ReportsShell`
- [ ] Chart.js `Bar` com datasets: income (`#10B981`), expenses (`#EF4444`)
- [ ] Terceiro dataset tipo `'line'` para `net` — cor dinâmica: `#10B981` se net positivo, `#EF4444` se negativo
- [ ] Mixed chart: `type: 'bar'` nos datasets de barra, `type: 'line'` no net (Chart.js suporta nativamente)
- [ ] Mounted guard + animação `duration: 1000, easing: "easeOutQuart"`
- [ ] Tooltip com `formatCurrency(value, locale, currency)`
- [ ] `h-full flex flex-col` + gráfico em `flex-1 min-h-0`

---

### CREATE: `src/components/reports/fluxo-caixa/RecurringList.tsx`

**Responsabilidade:** `"use client"` — lista de assinaturas/recorrências detectadas

**Implementar:**
- [ ] Fetch próprio `GET /api/reports/recurring` no `useEffect` (sem filtro de período — all-time)
- [ ] Tabela: Descrição | Valor | Frequência | Último pagamento | Badge "Nova"
- [ ] Total mensal equivalente no rodapé
- [ ] Agrupamento por seções: Mensais / Semanais / Anuais
- [ ] Máximo 20 itens exibidos (sem paginação — top 20 por valor)

---

### CREATE: `src/app/api/reports/recurring/route.ts`

**Responsabilidade:** Detecta transações recorrentes por heurística — sem estado persistido

**Heurística:**
- [ ] Buscar todas as transações EXPENSE do usuário (all-time)
- [ ] Normalizar descriptions: `cleanDescription(tx.description).toLowerCase()` — **reusar `src/lib/import/cleanDescription.ts`**
- [ ] Agrupar por description normalizada
- [ ] Manter grupos com ≥ 3 ocorrências
- [ ] Calcular intervalo médio entre ocorrências (ordenar por data, calcular diff em dias)
- [ ] Classificar: `7±2 dias` → semanal, `30±5 dias` → mensal, `365±15 dias` → anual; fora disso → ignorar
- [ ] `isNew`: **primeira ocorrência do grupo tem ≤ 90 dias** (assinatura recente, não depende de estado persistido)
- [ ] `monthlyEquivalent`: semanal × 4.33, mensal × 1, anual / 12
- [ ] Retornar: `{ description, amount, frequency, lastDate, isNew, monthlyEquivalent }[]` ordenado por `monthlyEquivalent` DESC
- [ ] Limitar a 20 itens

---

### CREATE: `src/app/api/reports/trends/route.ts`

**Responsabilidade:** Séries temporais por categoria para o Category Trend Explorer

**Implementar:**
- [ ] `GET` com `?cats=id1,id2,id3&start=&end=`
- [ ] Buscar todas as categorias EXPENSE do usuário (para popular o select no frontend)
- [ ] Para cada `categoryId` solicitado (máximo 3): agrupar expenses por mês no range
- [ ] Calcular `mean` e `stdDev` histórico dos últimos 12 meses por categoria (independente do range filtrado — contexto)
- [ ] Retornar: `{ categories[], series: { categoryId, categoryName, color, monthly: { month, value, mean, stdDev }[] }[] }`

---

### CREATE: `src/components/reports/tendencias/CategoryTrendChart.tsx`

**Responsabilidade:** `"use client"` — Line Chart multi-categoria com banda de desvio padrão

**Implementar:**
- [ ] Fetch próprio `GET /api/reports/trends` — controlado por estado local de categorias selecionadas
- [ ] Select múltiplo (até 3 categorias) — checkboxes estilizados com a cor da categoria
- [ ] Chart.js `Line` com um dataset por categoria
- [ ] Para cada categoria: linha principal + área de `mean ± stdDev` (`fill: true, borderWidth: 0, backgroundColor: corDaCategoria + '33'`)
- [ ] Linha pontilhada para `mean` histórico (borderDash)
- [ ] Pontos com valor `> mean + stdDev`: `pointBackgroundColor: '#EF4444'`
- [ ] Mounted guard + animação padrão

---

### CREATE: `src/app/api/reports/merchants/route.ts`

**Responsabilidade:** Top merchants por valor total no período

**Implementar:**
- [ ] `GET` com `?start=&end=`
- [ ] Agrupar transações EXPENSE por description normalizada — **reusar `cleanDescription` de `src/lib/import/cleanDescription.ts`**
- [ ] Para cada merchant: `{ name, total, count, avgTicket, trendPct }`
- [ ] `trendPct`: comparar `total` com mesmo período anterior de igual duração
- [ ] Ordenar por `total` DESC, retornar top 15
- [ ] Retornar: `{ merchants[], periodLabel }`

---

### CREATE: `src/components/reports/tendencias/MerchantSpotlight.tsx`

**Responsabilidade:** `"use client"` — tabela de top merchants com trend

**Implementar:**
- [ ] Fetch próprio `GET /api/reports/merchants?start=&end=` quando `period` muda
- [ ] Tabela: # | Merchant | Total | Vezes | Ticket Médio | Tendência
- [ ] Coluna Tendência: `↑ text-axiom-expense` se `trendPct > 10%`, `↓ text-axiom-income` se `< -10%`, `—` neutro
- [ ] Badge numérico `#1, #2...` com `bg-axiom-primary/20 text-axiom-primary`
- [ ] Top 10 visíveis; botão "Ver mais" expande para 15

---

### CREATE: `src/app/api/reports/networth/route.ts`

**Responsabilidade:** Evolução do patrimônio líquido mês a mês (all-time)

**Implementar:**
- [ ] Buscar todas as transações do usuário ordenadas por `date ASC`
- [ ] Calcular saldo acumulado progressivamente por mês: `cumulativeBalance += (income - expenses)`
- [ ] Agrupar: `{ month: string, cumulativeBalance: number, monthIncome: number, monthExpenses: number, savingsRate: number }`
- [ ] `savingsRate = monthIncome > 0 ? (monthIncome - monthExpenses) / monthIncome * 100 : 0`
- [ ] Retornar: `{ months[], currentNetWorth, avgSavingsRate, bestSavingsMonth }`

---

### CREATE: `src/components/reports/patrimonio/NetWorthChart.tsx`

**Responsabilidade:** `"use client"` — Line Chart com área preenchida (patrimônio acumulado)

**Implementar:**
- [ ] Recebe `networthData` via props do `ReportsShell`
- [ ] Chart.js `Line` com `fill: 'origin'`
- [ ] Cores (exceção controlada — Chart.js não aceita classes Tailwind): constantes dos tokens do CLAUDE.md
  - Área positiva: `rgba(16, 185, 129, 0.15)` (axiom-income com alpha)
  - Área negativa: `rgba(239, 68, 68, 0.15)` (axiom-expense com alpha)
  - Linha: `#10B981` se último valor positivo, `#EF4444` se negativo
- [ ] Tooltip: valor em moeda + `savingsRate` do mês
- [ ] Mounted guard + animação padrão

---

### CREATE: `src/components/reports/patrimonio/SavingsRateChart.tsx`

**Responsabilidade:** `"use client"` — Bar Chart de taxa de poupança mensal vs. meta de 20%

**Implementar:**
- [ ] Recebe `networthData` via props do `ReportsShell`
- [ ] Chart.js `Bar` com cores dinâmicas por barra: `>= 20%` → `#10B981`, `< 0%` → `#EF4444`, demais → `#F59E0B`
- [ ] Linha de meta em 20%: **usar dataset tipo `'line'` com valor fixo** — `data: Array(n).fill(20), borderDash: [4,4], borderColor: '#AAB2BD'` — **não usar `chartjs-plugin-annotation`** (não está instalado)
- [ ] Tooltip: "Taxa: X% | Poupado: R$ Y"
- [ ] Mounted guard + animação padrão

---

### CREATE: `src/app/api/reports/fire/route.ts`

**Responsabilidade:** Cálculo puro de projeção FIRE — sem acesso a DB, recebe parâmetros

**Implementar:**
- [ ] `GET` com `?patrimony=&monthlyIncome=&monthlyExpenses=&rate=conservador|moderado|agressivo`
- [ ] Validar: se `monthlyIncome <= monthlyExpenses` → retornar `{ projectable: false, reason: "despesas_maiores_que_renda" }`
- [ ] Taxas anuais: `conservador = 0.06`, `moderado = 0.08`, `agressivo = 0.10`
- [ ] FI Number = `monthlyExpenses * 12 * 25` (regra dos 4%)
- [ ] Projeção mês a mês (máx 600 iterações = 50 anos):
  ```
  r = annualRate / 12
  PV = patrimony
  PMT = monthlyIncome - monthlyExpenses
  FV(n) = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
  ```
- [ ] Iterar até `FV >= fiNumber` ou 600 meses
- [ ] `projectionSeries`: snapshot a cada 12 meses (50 pontos máx)
- [ ] Retornar: `{ projectable: true, fiNumber, projectedMonths, projectedYear, projectionSeries[] }`

---

### CREATE: `src/components/reports/patrimonio/FireProjection.tsx`

**Responsabilidade:** `"use client"` — projeção FIRE interativa com slider de poupança extra

**Implementar:**
- [ ] Fetch próprio `GET /api/reports/fire` — recebe patrimônio atual e médias de income/expense dos dados de networthData (recebe via props)
- [ ] Slider HTML nativo `<input type="range" min="0" max="20" step="1">` para `extraSavings %`
- [ ] Select para `rate`: Conservador / Moderado / Agressivo
- [ ] Re-fetch ao mover slider/select — debounce 300ms
- [ ] Se `projectable === false`: exibir card "Seus gastos superam sua renda — ajuste o orçamento para iniciar a projeção"
- [ ] Se `projectable === true`: exibir FI Number, Ano projetado, Meses até IF
- [ ] Chart.js `Line` com série de projeção + linha horizontal do FI Number (`borderDash: [4,4]`)
- [ ] Nota legal discreta: "Projeção educacional. Não constitui assessoria financeira."
- [ ] Mounted guard + animação padrão

---

### CREATE: `src/app/api/reports/seasonal/route.ts`

**Responsabilidade:** Padrão sazonal histórico — médias de gasto por mês do ano (all-time)

**Implementar:**
- [ ] Buscar todas as transações EXPENSE do usuário (all-time)
- [ ] `hasEnoughData`: requer ≥ 12 meses distintos de histórico
- [ ] Se `!hasEnoughData`: retornar `{ hasEnoughData: false, months: [] }`
- [ ] Para cada mês do calendário (Jan=1 … Dez=12): calcular média de gastos totais nos anos disponíveis
- [ ] `overallMean` = média global entre os 12 meses
- [ ] `variationPct = (monthAvg - overallMean) / overallMean * 100`
- [ ] Para cada mês: `topCategories` = top 2 categorias por valor naquele mês (histórico)
- [ ] Retornar: `{ hasEnoughData: true, months: { monthIndex, name, avg, variationPct, topCategories[] }[] }`

---

### CREATE: `src/components/reports/tendencias/SeasonalAnalysis.tsx`

**Responsabilidade:** `"use client"` — heatmap de sazonalidade com destaque do mês atual

**Implementar:**
- [ ] Fetch próprio `GET /api/reports/seasonal` no `useEffect` (all-time, sem filtro de período)
- [ ] Se `!hasEnoughData`: placeholder "Disponível após 12 meses de uso"
- [ ] Grid 12 cards (Jan–Dez) com fundo colorido por `variationPct`:
  - `> 20%` → `bg-axiom-expense/10 border-axiom-expense/30 text-axiom-expense`
  - `-10% a 20%` → `bg-axiom-hover border-axiom-border`
  - `< -10%` → `bg-axiom-income/10 border-axiom-income/30 text-axiom-income`
- [ ] Card do mês atual: `ring-2 ring-axiom-primary`
- [ ] Cada card: nome do mês, variação (`+34%` / `-12%`), top 2 categorias como badges

---

### MODIFY: `messages/pt-BR.json` (+ en, es, fr, zh, hi, ar)

**Adicionar bloco `"Reports"` em todos os 7 arquivos:**

```json
"Reports": {
  "tabOverview": "Visão Geral",
  "tabCashflow": "Fluxo de Caixa",
  "tabTrends": "Tendências",
  "tabPatrimonio": "Patrimônio",
  "healthScore": "Saúde Financeira",
  "insights": "Principais Insights",
  "spendingVelocity": "Velocidade de Gasto",
  "cashFlow": "Fluxo de Caixa",
  "sankey": "Onde Vai o Dinheiro",
  "recurring": "Assinaturas e Recorrências",
  "categoryTrend": "Tendência por Categoria",
  "merchantSpotlight": "Top Merchants",
  "seasonal": "Padrão Sazonal",
  "netWorth": "Evolução do Patrimônio",
  "savingsRate": "Taxa de Poupança",
  "fire": "Projeção de Independência Financeira",
  "fireDisclaimer": "Projeção educacional. Não constitui assessoria financeira.",
  "fireNotProjectable": "Seus gastos superam sua renda — ajuste o orçamento para projetar.",
  "noData": "Sem dados para o período selecionado",
  "insufficientHistory": "Disponível após 12 meses de uso",
  "periodLast30": "Últimos 30 dias",
  "periodCurrentMonth": "Mês atual",
  "periodLastMonth": "Mês anterior",
  "periodCurrentQuarter": "Trimestre atual",
  "periodLast6Months": "Últimos 6 meses",
  "periodLastYear": "Último ano",
  "periodCustom": "Personalizado"
}
```

---

## Ordem de Implementação (por Issue)

| # | Issue | Arquivos-chave | Complexidade | Impacto |
|---|-------|---------------|-------------|---------|
| 1 | Infraestrutura: page, ReportsShell, PeriodFilter (mover DashboardFilters), i18n | 3 + 7 msg | Média | Base |
| 2 | Fluxo de Caixa — Cash Flow Chart | `cashflow/route`, `CashFlowChart` | Baixa | Alto |
| 3 | Patrimônio — Net Worth + Savings Rate | `networth/route`, `NetWorthChart`, `SavingsRateChart` | Baixa | Alto |
| 4 | Visão Geral — Health Score + Insights | `overview/route`, `HealthScoreCard`, `InsightsCard` | Alta | Alto |
| 5 | Visão Geral — Spending Velocity | `SpendingVelocityCard` | Baixa | Médio |
| 6 | Detector de Recorrências | `recurring/route`, `RecurringList` | Média | Alto |
| 7 | Tendências — Category Trend Explorer | `trends/route`, `CategoryTrendChart` | Média | Alto |
| 8 | Tendências — Merchant Spotlight | `merchants/route`, `MerchantSpotlight` | Baixa | Médio |
| 9 | Sankey Diagram | `npm install chartjs-chart-sankey`, `SankeyDiagram` | Alta | Diferencial |
| 10 | Análise Sazonal | `seasonal/route`, `SeasonalAnalysis` | Média | Diferencial |
| 11 | Projeção FIRE | `fire/route`, `FireProjection` | Alta | Diferencial |

**Sequência:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

---

## Issues Detalhadas

---

### Issue 1: Infraestrutura Base
**Arquivos:**
- `src/app/(dashboard)/reports/page.tsx` (MODIFY)
- `src/components/dashboard/DashboardFilters.tsx` → mover para `src/components/shared/PeriodFilter.tsx` (MODIFY/MOVE)
- `src/components/reports/ReportsShell.tsx` (CREATE)
- `messages/pt-BR.json` + 6 outros (MODIFY x7)

**Tasks:**
- [ ] Mover `DashboardFilters.tsx` para `src/components/shared/PeriodFilter.tsx`; atualizar import no dashboard; adaptar para aceitar `onChange` callback além do modo URL
- [ ] MODIFY `reports/page.tsx`: force-dynamic, auth, UserCurrency, `<ReportsShell>`
- [ ] CREATE `ReportsShell.tsx`: 4 tabs, estado `activeTab` + `period`, fetch por aba, distribui dados via props
- [ ] MODIFY 7 `messages/*.json`: adicionar bloco `"Reports"` com 27 chaves

**Critério:** `/reports` carrega com tabs funcionais e PeriodFilter; trocar aba e período não quebra; `npm run build` passa

---

### Issue 2: Fluxo de Caixa — Cash Flow Chart
**Arquivos:**
- `src/app/api/reports/cashflow/route.ts` (CREATE)
- `src/components/reports/fluxo-caixa/CashFlowChart.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `cashflow/route.ts`: auth, query 12 meses, agrupa por mês, retorna `monthlyBars[]` + `sankeyNodes[]` + `sankeyLinks[]`
- [ ] CREATE `CashFlowChart.tsx`: Chart.js mixed Bar+Line, mounted guard, animação 1000ms, tooltip formatCurrency

**Nota:** `sankeyNodes/Links` são retornados agora mas consumidos apenas na Issue #9 (SankeyDiagram).

**Critério:** aba Fluxo de Caixa exibe Bar Chart com 12 meses; `npm run build` passa

---

### Issue 3: Patrimônio — Net Worth + Savings Rate
**Arquivos:**
- `src/app/api/reports/networth/route.ts` (CREATE)
- `src/components/reports/patrimonio/NetWorthChart.tsx` (CREATE)
- `src/components/reports/patrimonio/SavingsRateChart.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `networth/route.ts`: acumula saldo mês a mês, calcula `savingsRate` por mês
- [ ] CREATE `NetWorthChart.tsx`: Line com fill, área verde/vermelha (hex dos tokens com alpha — exceção documentada), mounted guard
- [ ] CREATE `SavingsRateChart.tsx`: Bar com cores dinâmicas, linha de meta via dataset tipo 'line' com borderDash (sem chartjs-plugin-annotation)

**Critério:** aba Patrimônio exibe dois gráficos com dados reais; `npm run build` passa

---

### Issue 4: Visão Geral — Health Score + Insights
**Arquivos:**
- `src/app/api/reports/overview/route.ts` (CREATE)
- `src/components/reports/visao-geral/HealthScoreCard.tsx` (CREATE)
- `src/components/reports/visao-geral/InsightsCard.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `overview/route.ts`: Health Score (4 pilares) + insights[] (3 regras) + velocity
- [ ] CREATE `HealthScoreCard.tsx`: recebe `overviewData` via props, score animado, 4 barras de progresso
- [ ] CREATE `InsightsCard.tsx`: recebe `overviewData` via props, 3 insights com ícone + badge

**Critério:** aba Visão Geral mostra dados reais ao trocar período; `npm run build` passa

---

### Issue 5: Visão Geral — Spending Velocity
**Arquivos:**
- `src/components/reports/visao-geral/SpendingVelocityCard.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `SpendingVelocityCard.tsx`: recebe `overviewData.velocity` via props, barra de progresso com cor dinâmica, texto e projeção
- [ ] Quando período ≠ mês atual: exibir aviso em vez dos dados

**Critério:** card mostra ritmo de gasto correto para mês atual; aviso aparece para outros períodos

---

### Issue 6: Detector de Recorrências
**Arquivos:**
- `src/app/api/reports/recurring/route.ts` (CREATE)
- `src/components/reports/fluxo-caixa/RecurringList.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `recurring/route.ts`: heurística com `cleanDescription`, grupos ≥ 3 ocorrências, `isNew` baseado em idade da primeira ocorrência (≤ 90 dias), top 20
- [ ] CREATE `RecurringList.tsx`: tabela com agrupamento Mensais/Semanais/Anuais, badge "Nova", total mensal no rodapé

**Critério:** recorrências detectadas corretamente; `isNew` funciona sem estado persistido; `npm run build` passa

---

### Issue 7: Tendências — Category Trend Explorer
**Arquivos:**
- `src/app/api/reports/trends/route.ts` (CREATE)
- `src/components/reports/tendencias/CategoryTrendChart.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `trends/route.ts`: séries mensais por categoria com `mean` e `stdDev` histórico
- [ ] CREATE `CategoryTrendChart.tsx`: select múltiplo (até 3), Line Chart com banda de desvio, pontos de anomalia destacados

**Critério:** selecionar categorias e ver linhas aparecerem; `npm run build` passa

---

### Issue 8: Tendências — Merchant Spotlight
**Arquivos:**
- `src/app/api/reports/merchants/route.ts` (CREATE)
- `src/components/reports/tendencias/MerchantSpotlight.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `merchants/route.ts`: agrupa com `cleanDescription`, calcula trend vs. período anterior
- [ ] CREATE `MerchantSpotlight.tsx`: tabela top 10 + "Ver mais" para 15, setas de trend coloridas

**Critério:** top merchants com trend calculado; `npm run build` passa

---

### Issue 9: Sankey Diagram
**Arquivos:**
- `package.json` (MODIFY — `npm install chartjs-chart-sankey`)
- `src/components/reports/fluxo-caixa/SankeyDiagram.tsx` (CREATE)

**Tasks:**
- [ ] `npm install chartjs-chart-sankey` — verificar compatibilidade com Chart.js versão atual antes de prosseguir
- [ ] CREATE `SankeyDiagram.tsx`: registrar `SankeyController` + `Flow`, mounted guard, nós coloridos (receita → `#10B981`, despesa → cor da categoria do DB), tooltip formatCurrency
- [ ] Fallback: se `sankeyLinks.length === 0` → placeholder "Sem dados para o período"
- [ ] Se incompatível: implementar tabela de fluxo simples (receita → categorias de despesa)

**Critério:** Sankey renderiza com período que tenha receitas e despesas; `npm run build` passa

---

### Issue 10: Análise Sazonal
**Arquivos:**
- `src/app/api/reports/seasonal/route.ts` (CREATE)
- `src/components/reports/tendencias/SeasonalAnalysis.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `seasonal/route.ts`: média por mês do calendário (all-time), `variationPct`, `hasEnoughData` (≥ 12 meses)
- [ ] CREATE `SeasonalAnalysis.tsx`: grid 12 cards com intensidade de cor, destaque do mês atual com `ring-axiom-primary`, placeholder se `!hasEnoughData`

**Critério:** grade sazonal renderiza; cores corretas por variação; placeholder aparece quando < 12 meses de dados; `npm run build` passa

---

### Issue 11: Projeção FIRE
**Arquivos:**
- `src/app/api/reports/fire/route.ts` (CREATE)
- `src/components/reports/patrimonio/FireProjection.tsx` (CREATE)

**Tasks:**
- [ ] CREATE `fire/route.ts`: cálculo FV mês a mês com juros compostos + aporte, `projectable: false` quando despesas ≥ renda
- [ ] CREATE `FireProjection.tsx`: slider extra-savings, select de taxa, Line Chart projeção vs. FI Number, nota legal

**Critério:** slider atualiza projeção; `projectable: false` exibe mensagem correta; `npm run build` passa

---

## Estrutura Final de Pastas

```
src/
├── app/
│   ├── (dashboard)/reports/page.tsx           ← MODIFY
│   └── api/reports/
│       ├── overview/route.ts                  ← CREATE
│       ├── cashflow/route.ts                  ← CREATE
│       ├── recurring/route.ts                 ← CREATE
│       ├── trends/route.ts                    ← CREATE
│       ├── merchants/route.ts                 ← CREATE
│       ├── seasonal/route.ts                  ← CREATE
│       ├── networth/route.ts                  ← CREATE
│       └── fire/route.ts                      ← CREATE
├── components/
│   ├── shared/
│   │   └── PeriodFilter.tsx                   ← MOVE de dashboard/DashboardFilters.tsx
│   └── reports/
│       ├── ReportsShell.tsx                   ← CREATE
│       ├── visao-geral/
│       │   ├── HealthScoreCard.tsx            ← CREATE
│       │   ├── InsightsCard.tsx               ← CREATE
│       │   └── SpendingVelocityCard.tsx       ← CREATE
│       ├── fluxo-caixa/
│       │   ├── CashFlowChart.tsx              ← CREATE
│       │   ├── SankeyDiagram.tsx              ← CREATE
│       │   └── RecurringList.tsx              ← CREATE
│       ├── tendencias/
│       │   ├── CategoryTrendChart.tsx         ← CREATE
│       │   ├── MerchantSpotlight.tsx          ← CREATE
│       │   └── SeasonalAnalysis.tsx           ← CREATE
│       └── patrimonio/
│           ├── NetWorthChart.tsx              ← CREATE
│           ├── SavingsRateChart.tsx           ← CREATE
│           └── FireProjection.tsx             ← CREATE
```

**Totais:**
- 8 API Routes (CREATE)
- 13 Componentes reports (CREATE)
- 1 Componente shared (MOVE + adapt)
- 1 page.tsx (MODIFY)
- 7 arquivos de mensagens (MODIFY)
- 1 `package.json` (MODIFY — Issue #9)

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `chartjs-chart-sankey` incompatível com Chart.js atual | Issue #9: testar npm install primeiro; fallback: tabela de fluxo simples |
| Usuários com poucos dados (< 3 meses) | Todos os componentes têm empty state explícito |
| `cleanDescription` pode não normalizar bem todos os bancos | Aceitar falsos positivos — é heurística, não precisa ser perfeito |
| FIRE: PMT negativo (despesas > renda) | API retorna `{ projectable: false }` — frontend trata com mensagem específica |
| Health Score `null` (sem renda no período) | API retorna `healthScore: null` — HealthScoreCard exibe "N/A" |
| Mover DashboardFilters quebra dashboard | Issue #1 inclui atualizar o import no dashboard |
