# SPEC — v1.1 Patrimônio Evoluído

> Gerado por `/planejar-feature` em 2026-03-19
> Iniciativa: plan/initiatives/patrimonio-evoluido.md

## Resumo

Evoluir a página `/patrimonio` (já existe desde v0.10) com 3 novos componentes:
(1) **Breakdown por Classe de Ativo** — doughnut + tabela usando dados já calculados em `/api/investments/portfolio`;
(2) **Comparação vs Benchmark** — linha do patrimônio real vs CDI/IPCA projetados no mesmo gráfico;
(3) **Meta de Patrimônio** — usuário define meta em R$, barra de progresso + projeção de quando atinge.

---

## Arquitetura

```
/patrimonio  (PatrimonioShell)
  │
  ├── [existente] NetWorthChart         ← /api/reports/networth
  ├── [existente] SavingsRateChart      ← /api/reports/networth
  ├── [existente] FireProjection        ← /api/reports/networth
  │
  ├── [NOVO] AssetBreakdown             ← /api/investments/portfolio (novo fetch)
  ├── [NOVO] BenchmarkComparison        ← /api/reports/networth + /api/investments/benchmarks
  └── [NOVO] PatrimonioGoal             ← /api/patrimonio/goal (novo endpoint)
                                           + /api/reports/networth (currentNetWorth)
```

```
GET  /api/patrimonio/goal  →  { goal: number | null }
PATCH /api/patrimonio/goal →  body: { goal: number | null }  →  { goal: number | null }
```

**PatrimonioShell passa a fazer 4 fetches paralelos:**
1. `/api/reports/networth` — já existente
2. `/api/investments/portfolio` — já existente, usado apenas por `totals.totalCurrentValue` e `allocationByType`
3. `/api/investments/benchmarks` — já existente, usado por `BenchmarkComparison`
4. `/api/patrimonio/goal` — novo

---

## Mudanças por Arquivo

### MODIFY: `prisma/schema.prisma`

**Adicionar campo ao model User (linha ~30, após `notifMonthlyReport`):**

```prisma
patrimonyGoal   Decimal?   // meta de patrimônio em reais — opcional
```

**Após editar:** rodar `npx prisma db push --accept-data-loss`

**Referência:** campos Decimal existentes em `JournalEntry.sustainableSurplusAtTime`

---

### CREATE: `src/app/api/patrimonio/goal/route.ts`

**Responsabilidade:** Ler e salvar a meta de patrimônio do usuário.

**Implementar:**
- [ ] Auth check padrão (`src/app/api/journal/route.ts:34-37`)
- [ ] `GET`: buscar `user.patrimonyGoal`, retornar `{ goal: parseFloat(String(patrimonyGoal)) | null }`
- [ ] `PATCH`: aceitar `{ goal: number | null }` no body, atualizar `user.patrimonyGoal`, retornar `{ goal }`
- [ ] Validação no PATCH: se `goal !== null && goal <= 0` → retornar 400 `"Meta deve ser maior que zero"`

**Snippet base:**
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { patrimonyGoal: true },
  });

  const goal = user?.patrimonyGoal ? parseFloat(String(user.patrimonyGoal)) : null;
  return NextResponse.json({ goal });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { goal } = await req.json();
  if (goal !== null && goal !== undefined && goal <= 0) {
    return NextResponse.json({ error: "Meta deve ser maior que zero" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { patrimonyGoal: goal ?? null },
  });

  return NextResponse.json({ goal: goal ?? null });
}
```

---

### CREATE: `src/components/patrimonio/AssetBreakdown.tsx`

**Responsabilidade:** Doughnut chart com % por classe de ativo + tabela resumo.

**Implementar:**
- [ ] `"use client"` + mounted guard (`useState(false)` + `useEffect(() => setMounted(true), [])`)
- [ ] Props:
  ```ts
  interface AssetBreakdownProps {
    allocationByType: Partial<Record<string, number>>; // % por tipo
    totalCurrentValue: number;
    currency: string;
    locale: string;
  }
  ```
- [ ] Usar mesmo mapa de labels/cores que `InvestmentsShell`:
  ```ts
  const TYPE_LABELS: Record<string, string> = {
    FIXED_INCOME: "Renda Fixa", FII: "Fundos Imobiliários",
    STOCK: "Ações BR", ETF: "ETF", BDR: "BDR",
    CRYPTO: "Criptomoedas", STOCK_INT: "Ações Internacionais", OTHER: "Outros",
  };
  const TYPE_COLORS = ["#FF6B35","#10B981","#3B82F6","#8B5CF6","#F59E0B","#EF4444","#06B6D4","#AAB2BD"];
  ```
- [ ] Chart.js `Doughnut` com `cutout: "65%"`, label central com `totalCurrentValue` formatado
- [ ] Tabela abaixo do gráfico: Tipo | % | Valor estimado
- [ ] Se `Object.keys(allocationByType).length === 0` → empty state: "Nenhum ativo na carteira"
- [ ] Usar `formatCurrency(value, locale, currency)` de `@/lib/utils`

**Referência mounted guard:** `src/components/dashboard/MonthlyChart.tsx`
**Referência Doughnut:** `src/components/dashboard/SpendingDonut.tsx`

---

### CREATE: `src/components/patrimonio/BenchmarkComparison.tsx`

**Responsabilidade:** Linha do patrimônio real vs CDI e IPCA projetados, partindo do mesmo ponto inicial.

**Implementar:**
- [ ] `"use client"` + mounted guard
- [ ] `import type { NetworthData } from "@/components/reports/types"`
- [ ] Props:
  ```ts
  interface BenchmarkComparisonProps {
    networthData: NetworthData;
    selicAnual: number | null;  // % a.a.
    ipca: number | null;        // % ao mês
    currency: string;
    locale: string;
  }
  ```
- [ ] Se `networthData.months.length < 2` → empty state: "Dados insuficientes para comparação"
- [ ] Calcular série CDI: começar de `months[0].cumulativeBalance`, compor mensalmente com `(1 + selicAnual/100)^(1/12) - 1`
- [ ] Calcular série IPCA: começar do mesmo ponto, compor com `ipca/100` ao mês
- [ ] Chart.js `Line` com 3 datasets:
  - Patrimônio Real → cor `#FF6B35` (axiom-primary)
  - CDI projetado → cor `#10B981` (axiom-income), borderDash [4,4]
  - IPCA projetado → cor `#AAB2BD` (axiom-muted), borderDash [4,4]
- [ ] Nota de rodapé: "CDI/IPCA calculados com taxas atuais aplicadas retroativamente — estimativa educacional"
- [ ] Se `selicAnual === null && ipca === null` → exibir apenas linha do patrimônio real com aviso de indisponibilidade dos benchmarks

**Referência NetWorthChart:** `src/components/reports/patrimonio/NetWorthChart.tsx`

---

### CREATE: `src/components/patrimonio/PatrimonioGoal.tsx`

**Responsabilidade:** Card para definir meta de patrimônio, exibir progresso e projetar quando atinge.

**Implementar:**
- [ ] `"use client"`
- [ ] Props:
  ```ts
  interface PatrimonioGoalProps {
    currentNetWorth: number;
    goal: number | null;
    avgMonthlySavings: number; // média de (income - expenses) por mês
    currency: string;
    locale: string;
    onGoalSaved?: () => void; // callback para PatrimonioShell re-fetch goal
  }
  ```
- [ ] Estados: `editMode: boolean`, `inputValue: string`
- [ ] **Modo visualização (goal definida):**
  - `progressPct = Math.min(100, (currentNetWorth / goal) * 100)`
  - Barra de progresso com `progressPct`
  - Valor atual / meta formatados
  - Projeção: se `avgMonthlySavings > 0 && currentNetWorth < goal`:
    - `monthsToGoal = Math.ceil((goal - currentNetWorth) / avgMonthlySavings)`
    - Mostrar "Estimativa: [mês/ano]" com `new Date()` + `monthsToGoal` meses
  - Botão "Editar meta"
- [ ] **Modo edição:** input numérico + botão "Salvar" que chama `PATCH /api/patrimonio/goal`
- [ ] Botão "Remover meta" que chama `PATCH /api/patrimonio/goal` com `{ goal: null }`
- [ ] **Sem meta definida:** prompt "Defina uma meta de patrimônio" + input inline
- [ ] Calcular `avgMonthlySavings` no PatrimonioShell a partir de `NetworthData.months[]`:
  ```ts
  const avgMonthlySavings = data.months.length > 0
    ? data.months.reduce((acc, m) => acc + (m.monthIncome - m.monthExpenses), 0) / data.months.length
    : 0;
  ```

---

### MODIFY: `src/components/patrimonio/PatrimonioShell.tsx`

**Alterar:**
- [ ] Adicionar 3 novos estados: `portfolioData`, `portfolioLoading`, `benchmarksData`, `benchmarksLoading`, `goalData`, `goalLoading`
- [ ] `fetchData` passa a fazer 4 fetches em paralelo: networth + portfolio + benchmarks + goal
- [ ] Calcular `avgMonthlySavings` a partir de `networthData.months`
- [ ] Renderizar após os componentes existentes (NetWorthChart, SavingsRateChart, FireProjection):
  1. `<AssetBreakdown>` — logo após FireProjection
  2. `<BenchmarkComparison>` — em seguida
  3. `<PatrimonioGoal>` — por último
- [ ] Atualizar callback: quando `PatrimonioGoal` salvar → re-fetch goal (`setGoalData`)

**Tipos necessários:**
```ts
import type { BenchmarkData } from "@/lib/benchmarks"; // para benchmarksData state

interface PortfolioTotals {
  totalCurrentValue: number;
}
interface PortfolioForPatrimonio {
  totals: PortfolioTotals;
  allocationByType: Partial<Record<string, number>>;
}
```

**Estados novos (6 no total — 3 pares data+loading):**
```ts
const [portfolioData, setPortfolioData] = useState<PortfolioForPatrimonio | null>(null);
const [portfolioLoading, setPortfolioLoading] = useState(false);
const [benchmarksData, setBenchmarksData] = useState<BenchmarkData | null>(null);
const [benchmarksLoading, setBenchmarksLoading] = useState(false);
const [goalData, setGoalData] = useState<{ goal: number | null } | null>(null);
const [goalLoading, setGoalLoading] = useState(false);
```

**Referência de padrão de múltiplos fetches:** `src/components/investments/intelligence/IntelligenceTab.tsx`

---

## Ordem de Implementação

1. **Schema** — `prisma/schema.prisma` + `db push`
2. **API goal** — `src/app/api/patrimonio/goal/route.ts`
3. **AssetBreakdown** — componente Doughnut
4. **BenchmarkComparison** — componente Line
5. **PatrimonioGoal** — componente meta + progresso
6. **PatrimonioShell** — integrar tudo

---

## Issues Sugeridas

### Issue 1: Schema — campo patrimonyGoal no User
**Arquivos:** `prisma/schema.prisma`

**Tasks:**
- [ ] Adicionar `patrimonyGoal Decimal?` ao model `User` após `notifMonthlyReport`
- [ ] Rodar `npx prisma db push --accept-data-loss`

**Critério:** `prisma.user.update({ data: { patrimonyGoal: 500000 } })` compila sem erro de tipo

---

### Issue 2: API goal — GET + PATCH /api/patrimonio/goal
**Arquivos:** `src/app/api/patrimonio/goal/route.ts`

**Tasks:**
- [ ] CREATE `src/app/api/patrimonio/goal/route.ts`
- [ ] `GET`: retorna `{ goal: number | null }`
- [ ] `PATCH`: valida `goal > 0`, salva em `user.patrimonyGoal`, retorna `{ goal }`
- [ ] Auth check em ambos

**Critério:** `npm run build` passa; `GET /api/patrimonio/goal` retorna 200

---

### Issue 3: AssetBreakdown — doughnut + tabela por classe
**Arquivos:** `src/components/patrimonio/AssetBreakdown.tsx`

**Tasks:**
- [ ] CREATE `src/components/patrimonio/AssetBreakdown.tsx`
- [ ] `"use client"` + mounted guard (sem import de AssetType — tipo das props já é `string`)
- [ ] Chart.js Doughnut com `cutout: "65%"` e label central
- [ ] Tabela: Tipo | % | Valor estimado
- [ ] Empty state se sem ativos
- [ ] Usar `formatCurrency` de `@/lib/utils`

**Critério:** `npm run build` passa; renderiza com `allocationByType={}`

---

### Issue 4: BenchmarkComparison — patrimônio vs CDI/IPCA
**Arquivos:** `src/components/patrimonio/BenchmarkComparison.tsx`

**Tasks:**
- [ ] CREATE `src/components/patrimonio/BenchmarkComparison.tsx`
- [ ] `"use client"` + mounted guard
- [ ] `import type { NetworthData } from "@/components/reports/types"`
- [ ] Séries CDI e IPCA calculadas client-side a partir dos dados disponíveis
- [ ] Chart.js Line com 3 datasets + borderDash nas linhas de benchmark
- [ ] Empty state se `months.length < 2`
- [ ] Nota de rodapé sobre natureza estimativa

**Critério:** `npm run build` passa; gráfico renderiza sem erro com dados mockados

---

### Issue 5: PatrimonioGoal — meta + barra + projeção
**Arquivos:** `src/components/patrimonio/PatrimonioGoal.tsx`

**Tasks:**
- [ ] CREATE `src/components/patrimonio/PatrimonioGoal.tsx`
- [ ] Modo sem meta: prompt + input inline
- [ ] Modo com meta: barra de progresso + % + valor atual/meta + projeção de data
- [ ] Modo edição: input + botão salvar → `PATCH /api/patrimonio/goal`
- [ ] Botão remover → `PATCH /api/patrimonio/goal` com `{ goal: null }`
- [ ] Feedback visual após salvar (sem reload)

**Critério:** `npm run build` passa; barra progresso exibe corretamente em todos os estados

---

### Issue 6: PatrimonioShell — integrar 3 novos componentes
**Arquivos:** `src/components/patrimonio/PatrimonioShell.tsx`

**Tasks:**
- [ ] `import type { BenchmarkData } from "@/lib/benchmarks"` para tipar `benchmarksData`
- [ ] Adicionar 6 estados (3 pares data+loading): `portfolioData/Loading`, `benchmarksData/Loading`, `goalData/Loading`
- [ ] Adicionar fetches paralelos: `/api/investments/portfolio`, `/api/investments/benchmarks`, `/api/patrimonio/goal`
- [ ] Calcular `avgMonthlySavings` de `networthData.months`
- [ ] Renderizar `AssetBreakdown`, `BenchmarkComparison`, `PatrimonioGoal` após componentes existentes
- [ ] Passar `onGoalSaved={() => refetchGoal()}` para `PatrimonioGoal`

**Critério:** `npm run build` passa; `/patrimonio` exibe os 3 novos componentes

---

## Complexidade

**Média** — 6 arquivos novos/modificados, 1 migration, sem nova API externa

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `selicAnual` nulo (sem BRAPI_TOKEN) | BenchmarkComparison exibe só linha real + aviso |
| Usuário sem investimentos | AssetBreakdown mostra empty state |
| `currentNetWorth` negativo (gastos > renda) | PatrimonioGoal mostra progresso 0% sem crash |
| `avgMonthlySavings <= 0` | Omitir linha de projeção em PatrimonioGoal |

---

## Próxima Etapa

1. `/revisar-spec` — validação crítica
2. `/publicar-milestone`
3. `/executar-milestone`
