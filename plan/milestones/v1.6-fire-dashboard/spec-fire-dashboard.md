# SPEC — v1.6 FIRE Dashboard: Independência Financeira

> Gerado por `/planejar-feature` em 2026-03-20
> PRD: `plan/milestones/v1.6-fire-dashboard/prd-fire-dashboard.md`

## Resumo

Transforma o `FireProjection` atual (componente simples na aba Análise) em uma aba dedicada **"Independência"** no PatrimonioShell. O dashboard integra patrimônio real (WealthItems + investimentos + transações), inputs editáveis salvos no banco, projeção com 3 cenários simultâneos no mesmo gráfico, e Coast FIRE.

---

## Arquitetura

```
PatrimonioShell (nova aba "Independência")
  └── FireDashboard (self-contained, 7 fetches paralelos)
        ├── FireStatusCard     → patrimônio atual, % caminho, savings rate
        ├── FireSettingsCard   → gasto alvo, SWR editável, slider aporte extra
        ├── FireProjectionChart → 3 linhas simultâneas + FI Number (Chart.js)
        ├── CoastFireCard      → coast FIRE number e data estimada
        └── GoalCard[]         → metas conectadas (reutiliza componente existente)

Novo fluxo de dados:
firePatrimony = currentNetWorth + itemsNet + portfolioValue
effectiveExpense = fireMonthlyExpense (salvo) ?? avgExpenses (transações)
effectiveSWR    = fireSWR (salvo) ?? 4.0
→ GET /api/reports/fire?patrimony=X&monthlyIncome=X&monthlyExpenses=X&swr=X
   retorna todos os 3 cenários + coastFireNumber em 1 chamada
```

---

## Mudanças por Arquivo

---

### MODIFY: `prisma/schema.prisma`

**Alterar:** Adicionar 2 campos opcionais ao model `User`

```prisma
// Adicionar após patrimonyGoal:
fireMonthlyExpense  Decimal?  @db.Decimal(14, 2)  // gasto mensal alvo na aposentadoria
fireSWR             Decimal?  @db.Decimal(5, 2)    // taxa de retirada segura (padrão 4.0)
```

**Após editar:** rodar `npx prisma db push --accept-data-loss && npx prisma generate`

**Referência:** campos `patrimonyGoal` (linha ~24) e `notifMonthlyReport` (mesma section)

---

### CREATE: `src/app/api/patrimonio/fire-settings/route.ts`

**Responsabilidade:** GET/PATCH das configurações FIRE do usuário (fireMonthlyExpense + fireSWR)

**Seguir exatamente o padrão de:** `src/app/api/patrimonio/goal/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface FireSettingsResponse {
  monthlyExpense: number | null;
  swr: number | null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fireMonthlyExpense: true, fireSWR: true },
  });

  return NextResponse.json({
    monthlyExpense: user?.fireMonthlyExpense ? parseFloat(String(user.fireMonthlyExpense)) : null,
    swr: user?.fireSWR ? parseFloat(String(user.fireSWR)) : null,
  } satisfies FireSettingsResponse);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { monthlyExpense, swr } = await req.json();
  // validações: monthlyExpense > 0 ou null; swr entre 0.5 e 20 ou null
  if (monthlyExpense !== null && monthlyExpense !== undefined && monthlyExpense <= 0)
    return NextResponse.json({ error: "Gasto deve ser maior que zero" }, { status: 400 });
  if (swr !== null && swr !== undefined && (swr < 0.5 || swr > 20))
    return NextResponse.json({ error: "SWR deve estar entre 0.5 e 20" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(monthlyExpense !== undefined && { fireMonthlyExpense: monthlyExpense ?? null }),
      ...(swr !== undefined && { fireSWR: swr ?? null }),
    },
  });

  return NextResponse.json({ monthlyExpense: monthlyExpense ?? null, swr: swr ?? null });
}
```

---

### MODIFY: `src/app/api/reports/fire/route.ts`

**O que muda:** retornar todos os 3 cenários em uma única chamada + parâmetro `swr` editável + `coastFireNumber`

**Novo parâmetro:** `swr` (default 4)

**Novo retorno:**
```ts
export interface FireScenario {
  rate: number;
  projectedMonths: number | null;
  projectedYear: number | null;
  projectionSeries: { year: number; value: number }[];
}

export interface FireResponse {
  projectable: boolean;
  reason?: string;
  fiNumber?: number;
  coastFireNumber?: number;   // fiNumber / (1 + 0.08)^30 (taxa moderada)
  scenarios?: {
    conservador: FireScenario;
    moderado: FireScenario;
    agressivo: FireScenario;
  };
  fiLine?: { year: number; value: number }[];
}
```

**Lógica do Coast FIRE:**
```ts
const COAST_YEARS = 30; // proxy para anos até aposentadoria
const coastFireNumber = fiNumber / Math.pow(1 + ANNUAL_RATES.moderado, COAST_YEARS);
```

**Lógica dos cenários:**
```ts
// Para cada cenário (conservador/moderado/agressivo), rodar o loop separado
// Retornar em scenarios.{conservador,moderado,agressivo}
// fiLine tem o mesmo length que projectionSeries do cenário moderado
```

**Backward compat:** manter `projectedMonths`, `projectedYear`, `projectionSeries` na raiz do response como alias do cenário moderado (para não quebrar se algo usar a API atual)

---

### CREATE: `src/components/patrimonio/FireStatusCard.tsx`

**Responsabilidade:** Card de situação atual — patrimônio, FI Number, % do caminho, savings rate

**Props:**
```ts
interface FireStatusCardProps {
  firePatrimony: number;
  fiNumber: number;
  savingsRate: number;        // % (ex: 32.5)
  avgMonthlyIncome: number;
  effectiveMonthlyExpense: number;
  currency: string;
  locale: string;
}
```

**Implementar:**
- [ ] Barra de progresso: `progress = Math.min(100, (firePatrimony / fiNumber) * 100)`
- [ ] KPIs em grid 2×2: Patrimônio Total | FI Number | Savings Rate | Falta para FI
- [ ] Badge colorido no % do caminho (verde se ≥ 50%, laranja se ≥ 25%, vermelho se < 25%)
- [ ] Sem fetch próprio — recebe tudo via props

**Referência visual:** padrão dos cards `bg-axiom-card border border-axiom-border rounded-xl p-6`

---

### CREATE: `src/components/patrimonio/FireSettingsCard.tsx`

**Responsabilidade:** Inputs editáveis do plano FIRE (gasto alvo, SWR, slider de aporte extra)

**Props:**
```ts
interface FireSettingsCardProps {
  monthlyExpense: number;      // valor atual (salvo ou calculado)
  swr: number;                 // valor atual (salvo ou 4.0)
  extraSavings: number;        // 0-20, estado local
  avgExpenses: number;         // médias das transações (placeholder)
  onMonthlyExpenseChange: (v: number) => void;
  onSWRChange: (v: number) => void;
  onExtraSavingsChange: (v: number) => void;
  currency: string;
  locale: string;
}
```

**Implementar:**
- [ ] Input numérico para "Gasto mensal na aposentadoria" — com debounce 400ms → PATCH `/api/patrimonio/fire-settings`
- [ ] Input numérico para "Taxa de retirada (SWR %)" — default 4.0, range 0.5–10 — com debounce 400ms → PATCH
- [ ] Slider "Aporte extra" 0–20% (igual ao atual FireProjection, estado local no FireDashboard)
- [ ] Texto auxiliar: "Baseado na média das suas transações" quando usando valor calculado (não editado)

**Referência:** slider em `FireProjection.tsx:172-183`; padrão de input em `WealthItemDialog.tsx`

---

### CREATE: `src/components/patrimonio/FireProjectionChart.tsx`

**Responsabilidade:** Gráfico de linha com 3 cenários simultâneos + linha do FI Number

**Props:**
```ts
interface FireProjectionChartProps {
  scenarios: { conservador: FireScenario; moderado: FireScenario; agressivo: FireScenario };
  fiNumber: number;
  currency: string;
  locale: string;
}
```

**Implementar:**
- [ ] `mounted` guard (padrão Chart.js do projeto)
- [ ] 4 datasets: conservador (azul `#3B82F6`), moderado (verde `#10B981`), agressivo (laranja `#FF6B35`), FI Number (branco tracejado `#FFFFFF`)
- [ ] Labels a partir de `scenarios.moderado.projectionSeries.map(p => "Ano " + p.year)`
- [ ] Y-axis: formatCurrency abreviado (`1.5M`, `800k`) — mesmo padrão de `FireProjection.tsx:237-244`
- [ ] Tooltip: formatCurrency completo com locale/currency
- [ ] `animation: { duration: 800, easing: "easeOutQuart" }`
- [ ] `minHeight: 220` no container

**Referência:** `src/components/reports/patrimonio/FireProjection.tsx:133-168` para opções do chart

---

### CREATE: `src/components/patrimonio/CoastFireCard.tsx`

**Responsabilidade:** Card Coast FIRE — quanto precisa ter para poder parar de aportar

**Props:**
```ts
interface CoastFireCardProps {
  coastFireNumber: number;
  firePatrimony: number;
  fiNumber: number;
  currency: string;
  locale: string;
}
```

**Implementar:**
- [ ] Progress bar: `coastProgress = Math.min(100, (firePatrimony / coastFireNumber) * 100)`
- [ ] Mensagem condicional:
  - Se `firePatrimony >= coastFireNumber` → badge verde "Você já pode parar de aportar! Continue para chegar mais rápido."
  - Senão → "Falta R$X para poder coastar. Em 30 anos sem aportes, o patrimônio atual cresceria até R$Y."
- [ ] Nota explicativa: "Coast FIRE = ponto onde o patrimônio cresce sozinho até o FI Number em 30 anos"

---

### CREATE: `src/components/patrimonio/FireDashboard.tsx`

**Responsabilidade:** Container da aba Independência — busca todos os dados e orquestra os sub-componentes

**Implementar:**
- [ ] 7 fetches paralelos via `Promise.allSettled`:
  1. `/api/reports/networth` → NetworthData
  2. `/api/patrimonio/items` → WealthItemsResponse
  3. `/api/investments/portfolio` → PortfolioForPatrimonio
  4. `/api/patrimonio/fire-settings` → FireSettingsResponse
  5. `/api/patrimonio/goals` → { goals: FinancialGoalSerialized[] }
  6. `/api/investments/benchmarks` → BenchmarkData (para GoalCards)
  - O fetch do `/api/reports/fire` é feito **separado**, com debounce 400ms, toda vez que os inputs mudam

- [ ] Calcular `firePatrimony`:
  ```ts
  const firePatrimony = (networthData?.currentNetWorth ?? 0)
    + (itemsData?.net ?? 0)
    + (portfolioData?.totals.totalCurrentValue ?? 0);
  ```

- [ ] Calcular médias de renda/despesa:
  ```ts
  const monthsWithIncome = networthData.months.filter(m => m.monthIncome > 0);
  const avgMonthlyIncome = monthsWithIncome.reduce((s, m) => s + m.monthIncome, 0) / (monthsWithIncome.length || 1);
  const avgMonthlyExpenses = networthData.months.reduce((s, m) => s + m.monthExpenses, 0) / (networthData.months.length || 1);
  ```

- [ ] Estado local gerenciado no FireDashboard:
  ```ts
  const [extraSavings, setExtraSavings] = useState(0);
  const [fireMonthlyExpense, setFireMonthlyExpense] = useState<number | null>(null); // null = usar média
  const [fireSWR, setFireSWR] = useState<number | null>(null); // null = usar 4.0
  // Quando fire-settings carrega: setFireMonthlyExpense(settings.monthlyExpense); setFireSWR(settings.swr)
  ```

- [ ] `effectiveMonthlyExpense = fireMonthlyExpense ?? avgMonthlyExpenses`
- [ ] `effectiveSWR = fireSWR ?? 4.0`
- [ ] `effectiveMonthlyIncome = avgMonthlyIncome * (1 + extraSavings / 100)`

- [ ] Debounce 400ms para chamar `/api/reports/fire` ao mudar qualquer input:
  ```ts
  // parâmetros: patrimony, monthlyIncome, monthlyExpenses, swr
  // retorna fireData com todos os 3 scenarios + coastFireNumber
  ```

- [ ] Seção "Metas conectadas": renderizar `GoalCard[]` em `grid grid-cols-2 gap-3` com todos os goals (reutilizar sem props extras — não usar "modo compacto")
  - Mostrar subtítulo com soma dos aportes mensais: `total de aportes: R$X/mês`
  - Mostrar como isso impacta o PMT do FIRE

- [ ] Loading states: SkeletonCard por seção
- [ ] Empty state se `avgMonthlyIncome === 0`

**Referência:** `PatrimonioShell.tsx` para padrão de fetches paralelos e skeleton; `GoalsList.tsx:1-152` para padrão de rendering das goals com CDI

---

### MODIFY: `src/components/patrimonio/PatrimonioShell.tsx`

**Alterar:**

1. Adicionar aba "Independência" na lista TABS (entre Análise e Bens & Passivos):
```ts
const TABS = [
  { key: "evolucao", label: "Evolução" },
  { key: "analise", label: "Análise" },
  { key: "independencia", label: "Independência" },   // ← ADD
  { key: "bens", label: "Bens & Passivos" },
  { key: "meta", label: "Meta" },
];
```

2. Adicionar `"independencia"` ao tipo `PatrimonioTab`

3. Adicionar import de `FireDashboard`:
```ts
import { FireDashboard } from "./FireDashboard";
```

4. Remover import de `FireProjection` e sua ocorrência no JSX da aba Análise

5. Adicionar bloco da nova aba:
```tsx
{activeTab === "independencia" && (
  <FireDashboard currency={initialCurrency} locale={initialLocale} />
)}
```

---

### DELETE: `src/components/reports/patrimonio/FireProjection.tsx`

Remover após PatrimonioShell não importar mais o componente.

---

## Ordem de Implementação

1. **Schema** — `prisma/schema.prisma` + `db push` + `generate`
2. **API fire-settings** — `GET/PATCH /api/patrimonio/fire-settings/route.ts`
3. **API fire expandida** — `src/app/api/reports/fire/route.ts`
4. **FireStatusCard** — card de situação
5. **FireSettingsCard** — inputs editáveis
6. **FireProjectionChart** — gráfico 3 cenários
7. **CoastFireCard** — coast FIRE
8. **FireDashboard** — container (monta todos os anteriores)
9. **PatrimonioShell** — nova aba + remoção FireProjection
10. **DELETE** `FireProjection.tsx`

---

## Issues Sugeridas

### Issue 1: Schema — fireMonthlyExpense + fireSWR no User
**Arquivos:** `prisma/schema.prisma`

**Tasks:**
- [ ] Adicionar `fireMonthlyExpense Decimal? @db.Decimal(14, 2)` ao model User (após `patrimonyGoal`)
- [ ] Adicionar `fireSWR Decimal? @db.Decimal(5, 2)` ao model User
- [ ] Rodar `npx prisma db push --accept-data-loss && npx prisma generate`

**Critério:** `npm run build` passa sem erros de tipo Prisma

---

### Issue 2: API fire-settings — GET/PATCH
**Arquivos:** `src/app/api/patrimonio/fire-settings/route.ts` (CREATE)

**Tasks:**
- [ ] Criar rota seguindo exatamente o padrão de `src/app/api/patrimonio/goal/route.ts`
- [ ] GET: `select: { fireMonthlyExpense, fireSWR }` → serializar Decimal → number
- [ ] PATCH: aceitar `{ monthlyExpense?, swr? }`, validar, `prisma.user.update`
- [ ] Exportar interface `FireSettingsResponse`

**Critério:** `npm run build` passa

---

### Issue 3: API fire expandida — 3 cenários + SWR + coastFire
**Arquivos:** `src/app/api/reports/fire/route.ts` (MODIFY)

**Tasks:**
- [ ] Adicionar param `swr` (default 4); usar `fiNumber = monthlyExpenses * 12 * (100 / swr)`
- [ ] Rodar o loop para os 3 cenários separadamente, retornar em `scenarios.{conservador,moderado,agressivo}`
- [ ] Calcular `coastFireNumber = fiNumber / Math.pow(1 + 0.08, 30)`
- [ ] Exportar interfaces `FireScenario` e `FireResponse`
- [ ] Manter campos legacy na raiz (`projectedMonths`, `projectedYear`, `projectionSeries` = moderado) para backward compat

**Critério:** `npm run build` passa; chamada com `?patrimony=100000&monthlyIncome=8000&monthlyExpenses=5000&swr=4` retorna objeto com `scenarios.conservador`, `scenarios.moderado`, `scenarios.agressivo`, `coastFireNumber`

---

### Issue 4: FireStatusCard
**Arquivos:** `src/components/patrimonio/FireStatusCard.tsx` (CREATE)

**Tasks:**
- [ ] Grid 2×2: Patrimônio Total, FI Number, Savings Rate, Falta para FI
- [ ] Barra de progresso com `progress = min(100, firePatrimony / fiNumber * 100)`
- [ ] Badge colorido no % (verde ≥50%, laranja ≥25%, vermelho <25%)
- [ ] Todos os valores monetários via `formatCurrency(v, locale, currency)`

**Critério:** `npm run build` passa

---

### Issue 5: FireSettingsCard
**Arquivos:** `src/components/patrimonio/FireSettingsCard.tsx` (CREATE)

**Tasks:**
- [ ] Input "Gasto mensal na aposentadoria" (number, step 100) com debounce 400ms → chama `onMonthlyExpenseChange`
- [ ] Input "Taxa de retirada SWR (%)" (number, step 0.5, range 0.5–10) com debounce 400ms → chama `onSWRChange`
- [ ] Slider "Aporte extra 0–20%" → chama `onExtraSavingsChange` (sem debounce, apenas estado local)
- [ ] Texto auxiliar "Baseado na média de transações" quando `monthlyExpense === avgExpenses` (não editado pelo usuário)

**Referência:** slider de `FireProjection.tsx:172-183`; inputs de `WealthItemDialog.tsx`

**Critério:** `npm run build` passa

---

### Issue 6: FireProjectionChart — 3 cenários simultâneos
**Arquivos:** `src/components/patrimonio/FireProjectionChart.tsx` (CREATE)

**Tasks:**
- [ ] `mounted` guard + `useEffect(() => setMounted(true), [])`
- [ ] 4 datasets: conservador (azul `#3B82F6`), moderado (verde `#10B981`), agressivo (laranja `#FF6B35`), FI Number (branco `#FFFFFF` tracejado `[4,4]`)
- [ ] Labels: `scenarios.moderado.projectionSeries.map(p => "Ano " + p.year)`
- [ ] Y-ticks abreviados (1.5M, 800k) — padrão de `FireProjection.tsx:237`
- [ ] Tooltip com `formatCurrency(ctx.parsed.y, locale, currency)`
- [ ] `animation: { duration: 800, easing: "easeOutQuart" }`

**Critério:** `npm run build` passa

---

### Issue 7: CoastFireCard
**Arquivos:** `src/components/patrimonio/CoastFireCard.tsx` (CREATE)

**Tasks:**
- [ ] Barra de progresso: `coastProgress = min(100, firePatrimony / coastFireNumber * 100)`
- [ ] Condicional: se `firePatrimony >= coastFireNumber` → mensagem de conquista
- [ ] Senão: mostrar `coastFireNumber`, quanto falta, estimativa em 30 anos sem aportes
- [ ] Nota explicativa do que é Coast FIRE (text-xs text-axiom-muted/60 italic)

**Critério:** `npm run build` passa

---

### Issue 8: FireDashboard — container principal
**Arquivos:** `src/components/patrimonio/FireDashboard.tsx` (CREATE)

**Tasks:**
- [ ] 6 fetches paralelos em `Promise.allSettled` ao montar: networth, items, portfolio, fire-settings, goals, benchmarks
- [ ] Calcular `firePatrimony = networth + itemsNet + portfolioValue`
- [ ] Estado local: `extraSavings`, `fireMonthlyExpense`, `fireSWR` — populados do fire-settings ao carregar
- [ ] Fetch debounced 400ms do `/api/reports/fire` quando qualquer input muda (usando `useRef` para debounce)
- [ ] Seção "Metas conectadas": renderizar `GoalCard[]` com os goals carregados (reutilizar componente existente)
  - Mostrar subtítulo com soma dos aportes mensais: `total de aportes: R$X/mês`
- [ ] Loading: skeleton de cada seção separado (FireStatusCard loading vs FireProjectionChart loading)
- [ ] Handler de mudanças que PATCH fire-settings com debounce 400ms — **FireDashboard é o único lugar que chama PATCH /api/patrimonio/fire-settings** (FireSettingsCard apenas recebe callbacks, não acessa a API diretamente)

**Referência:** `PatrimonioShell.tsx:62-106` para padrão de fetches paralelos com `Promise.allSettled`; `GoalsList.tsx:29-60` para o fetch de goals + CDI

**Critério:** `npm run build` passa

---

### Issue 9: PatrimonioShell — nova aba + remover FireProjection
**Arquivos:** `src/components/patrimonio/PatrimonioShell.tsx` (MODIFY), `src/components/reports/patrimonio/FireProjection.tsx` (DELETE)

**Tasks:**
- [ ] Adicionar `"independencia"` ao tipo `PatrimonioTab` e ao array `TABS` (label: "Independência", entre Análise e Bens & Passivos)
- [ ] Adicionar `import { FireDashboard } from "./FireDashboard"`
- [ ] Adicionar bloco `{activeTab === "independencia" && <FireDashboard currency={...} locale={...} />}`
- [ ] Remover `import { FireProjection }` e o bloco JSX correspondente da aba Análise
- [ ] Verificar com grep que FireProjection não é mais importado em nenhum arquivo: `grep -r "FireProjection" src/` deve retornar vazio antes de deletar
- [ ] Deletar `src/components/reports/patrimonio/FireProjection.tsx`

**Critério:** `npm run build` passa; aba Análise não tem mais a projeção FIRE; aba Independência exibe FireDashboard

---

## Complexidade

**Alta** — 7 arquivos novos, 3 modificações, 1 deleção. Nenhuma integração externa nova, mas envolve schema change + 6 fontes de dados + múltiplos componentes interdependentes.

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `avgMonthlyIncome = 0` (usuário sem transações) | Empty state no FireDashboard antes de renderizar sub-componentes |
| `firePatrimony < 0` (passivos maiores que ativos) | Usar `Math.max(0, firePatrimony)` no fetch do fire API |
| Prisma types não regenerados após schema change | Issue 1 roda `generate` explicitamente; Issue 2 em diante dependem disso |
| FireProjection ainda referenciado em algum lugar | Verificar com grep antes de deletar |

## Próxima Etapa

1. `/revisar-spec` — recomendado (milestone de produção)
2. Ou: `/publicar-milestone` direto se confiante
