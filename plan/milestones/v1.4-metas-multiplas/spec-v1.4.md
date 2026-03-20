# SPEC - v1.4 — Metas Financeiras Múltiplas

> Gerado por `/planejar-feature` em 2026-03-20

## Resumo

Substituir o sistema de meta única (`User.patrimonyGoal`) por múltiplas metas financeiras independentes. Cada meta tem nome, valor alvo, valor já poupado (independente do net worth), e frequência + valor de aporte (diário/semanal/mensal). A aba "Meta" exibe cards com barra de progresso e projeção de data de conclusão. CRUD completo via dialog.

---

## Arquitetura

```
prisma/schema.prisma
  ← ADD: enum ContributionFrequency + model FinancialGoal

API:
  GET/POST  /api/patrimonio/goals        → GoalsList fetch
  PATCH/DEL /api/patrimonio/goals/[id]   → GoalCard actions

Components:
  GoalsList.tsx     ← CREATE (fetch próprio + orquestra)
  GoalCard.tsx      ← CREATE (progress bar + projeção + ações)
  GoalDialog.tsx    ← CREATE (dialog criar/editar)

PatrimonioShell.tsx ← MODIFY (aba Meta usa GoalsList)
```

---

## Mudanças por Arquivo

### MODIFY: `prisma/schema.prisma`

**Adicionar:**
- [ ] Enum `ContributionFrequency` com valores `DAILY | WEEKLY | MONTHLY`
- [ ] Model `FinancialGoal`:
  ```prisma
  enum ContributionFrequency {
    DAILY
    WEEKLY
    MONTHLY
  }

  model FinancialGoal {
    id                    String                @id @default(cuid())
    userId                String
    name                  String
    targetAmount          Decimal               @db.Decimal(14, 2)
    savedAmount           Decimal               @default(0) @db.Decimal(14, 2)
    contributionAmount    Decimal               @db.Decimal(14, 2)
    contributionFrequency ContributionFrequency
    notes                 String?
    createdAt             DateTime              @default(now())
    updatedAt             DateTime              @updatedAt
    user                  User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  }
  ```
- [ ] Adicionar `financialGoals FinancialGoal[]` ao modelo `User`
- [ ] **NÃO remover** `patrimonyGoal Decimal?` do User — manter para não quebrar migration com dados existentes

**Migrar:** `npx prisma db push --accept-data-loss`

---

### CREATE: `src/app/api/patrimonio/goals/route.ts`

**Responsabilidade:** Listar e criar metas financeiras.

**Implementar:**
- [ ] Exportar interface `FinancialGoalSerialized`:
  ```ts
  export interface FinancialGoalSerialized {
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    contributionAmount: number;
    contributionFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
    notes: string | null;
    createdAt: string;
  }
  ```
- [ ] `GET`: auth check → `prisma.financialGoal.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })` → serializar → `{ goals: FinancialGoalSerialized[] }`
- [ ] `POST`: auth check → validar `name` (string não vazia), `targetAmount > 0`, `savedAmount >= 0`, `contributionAmount > 0`, `contributionFrequency` válido → `prisma.financialGoal.create(...)` → retornar `FinancialGoalSerialized` com status 201
- [ ] Serialização: `parseFloat(String(decimal))` para todos os campos Decimal, `.toISOString()` para datas

**Referência:** Padrão de `src/app/api/patrimonio/items/route.ts`

---

### CREATE: `src/app/api/patrimonio/goals/[id]/route.ts`

**Responsabilidade:** Atualizar e deletar meta individual com ownership check.

**Implementar:**
- [ ] `PATCH`: auth → ownership check → validar campos se presentes (`targetAmount > 0`, `savedAmount >= 0`, `contributionAmount > 0`) → update parcial → retornar `FinancialGoalSerialized`
- [ ] `DELETE`: auth → ownership check → `prisma.financialGoal.delete(...)` → `NextResponse.json({}, { status: 204 })`

**Referência:** Padrão de `src/app/api/patrimonio/items/[id]/route.ts`

---

### CREATE: `src/components/patrimonio/GoalDialog.tsx`

**Responsabilidade:** Dialog criar/editar meta financeira — 5 campos.

**Props:**
```ts
interface GoalDialogProps {
  mode: "create" | "edit";
  goal?: FinancialGoalSerialized;
  onSuccess: (goal: FinancialGoalSerialized) => void;
  onClose: () => void;
}
```

**Implementar:**
- [ ] Usar shadcn: `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter`
- [ ] Usar shadcn: `Input, Label, Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem`
- [ ] Campos:
  1. **Nome** (`Input text`) — placeholder "Ex: Casa própria"
  2. **Valor alvo** (`Input number`, min 0.01, step 0.01) — "Quanto quer acumular"
  3. **Já poupado** (`Input number`, min 0, step 0.01) — "Quanto já tem guardado para esta meta"
  4. **Aporte** (`Input number`, min 0.01, step 0.01) — "Quanto vai poupar por período"
  5. **Frequência** (`Select`) — `DAILY` "Diário" | `WEEKLY` "Semanal" | `MONTHLY` "Mensal"
  6. **Notas** (`<textarea>` nativa) — opcional
- [ ] `handleSubmit`: POST para `/api/patrimonio/goals` (create) ou PATCH para `/api/patrimonio/goals/${goal.id}` (edit)
- [ ] `parseFloat(value.replace(",", "."))` para campos numéricos
- [ ] Validação client-side: nome obrigatório, targetAmount > 0, contributionAmount > 0, savedAmount >= 0
- [ ] Estado `saving` + `error` (string | null)
- [ ] `onValueChange={(v) => setFrequency(v ?? "MONTHLY")}` no Select (evitar tipo incompatível)

**Referência:** `src/components/patrimonio/WealthItemDialog.tsx` para estrutura completa

---

### CREATE: `src/components/patrimonio/GoalCard.tsx`

**Responsabilidade:** Card de meta individual com progresso e projeção.

**Props:**
```ts
interface GoalCardProps {
  goal: FinancialGoalSerialized;
  currency: string;
  locale: string;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}
```

**Implementar:**
- [ ] Layout: card `bg-axiom-card border border-axiom-border rounded-xl p-5`
- [ ] Header: nome da meta + badge de frequência (`Diário` | `Semanal` | `Mensal`) à direita
- [ ] Valores: "Poupado" (savedAmount, verde) | "Meta" (targetAmount, laranja) — grid 2 cols
- [ ] Barra de progresso: `progressPct = Math.min(100, (savedAmount / targetAmount) * 100)`, altura `h-2`, cor `bg-axiom-primary`, com percentual abaixo
- [ ] **Projeção de data:**
  ```ts
  // Converter aporte para equivalente mensal
  const monthlyEquivalent =
    frequency === "DAILY" ? contribution * 30 :
    frequency === "WEEKLY" ? contribution * 4.33 :
    contribution; // MONTHLY

  // Meses até atingir
  const remaining = targetAmount - savedAmount;
  const monthsToGoal = remaining > 0 && monthlyEquivalent > 0
    ? Math.ceil(remaining / monthlyEquivalent)
    : null;

  // Label de data — ATENÇÃO: setMonth() é mutador, criar Date separadamente
  let projectionLabel: string | null = null;
  if (monthsToGoal !== null) {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToGoal);
    projectionLabel = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }
  ```
- [ ] Exibir: `"Previsão: <mês> <ano> — aportando <valor>/<freq>"`
- [ ] Se `savedAmount >= targetAmount`: badge verde "Meta atingida! 🎯"
- [ ] Hover reveal para ações: ícones `Pencil` (onEdit) e `Trash2` (onDelete com `deleting` state)
- [ ] `formatCurrency` para todos os valores

**Referência:** `src/components/patrimonio/WealthItems.tsx` (ItemRow com hover reveal)

---

### CREATE: `src/components/patrimonio/GoalsList.tsx`

**Responsabilidade:** Container da aba Meta — fetch próprio, lista de GoalCard, botão nova meta, dialog.

**Props:**
```ts
interface GoalsListProps {
  currency: string;
  locale: string;
}
```

**Implementar:**
- [ ] Estado: `goals: FinancialGoalSerialized[]`, `loading: boolean`, `dialogMode: "create" | "edit" | null`, `editingGoal: FinancialGoalSerialized | null`, `deletingId: string | null`
- [ ] `fetchGoals()`: GET `/api/patrimonio/goals` → `setGoals(data.goals)`
- [ ] `useEffect(() => { fetchGoals() }, [])` para fetch inicial
- [ ] `handleDelete(id)`: `setDeletingId(id)` → DELETE `/api/patrimonio/goals/${id}` → `await fetchGoals()` → `setDeletingId(null)` (usar refresh, não filter otimista — consistência com WealthItems e segurança contra falhas silenciosas)
- [ ] `handleSuccess(goal)`: create → prepend; edit → replace in-place (padrão estado local do projeto)
- [ ] Header: "Metas Financeiras" + botão `+ Nova meta` (laranja, `bg-axiom-primary`)
- [ ] Empty state: texto "Nenhuma meta criada" + botão "Criar primeira meta"
- [ ] Definir `SkeletonCard` local (não exportada de PatrimonioShell): `function SkeletonCard({ label }: { label: string }) { ... }` — mesmo visual do PatrimonioShell
- [ ] Loading skeleton: 2x `<SkeletonCard label="..." />`
- [ ] Grid de `GoalCard` — `grid grid-cols-1 gap-4`
- [ ] `GoalDialog` renderizado quando `dialogMode !== null`
- [ ] Import de `FinancialGoalSerialized` de `@/app/api/patrimonio/goals/route`

**Referência:** Padrão de `WealthItems.tsx` para orquestração de dialog + estado local

---

### MODIFY: `src/components/patrimonio/PatrimonioShell.tsx`

**Remover:**
- [ ] Import de `PatrimonioGoal`
- [ ] Estado `goalData`, `goalLoading`
- [ ] Callback `fetchGoal`
- [ ] Fetch de `/api/patrimonio/goal` no `Promise.allSettled` (reduz para 4 fetches)
- [ ] `setGoalLoading(true)` e `setGoalLoading(false)` no `fetchData`

**Adicionar:**
- [ ] Import de `GoalsList`
- [ ] Aba "meta": renderizar `<GoalsList currency={initialCurrency} locale={initialLocale} />`

**Manter sem alteração:**
- [ ] Todos os outros estados e fetches (networth, portfolio, benchmarks, items)
- [ ] `adjustedNetWorth` (ainda usado no futuro se necessário)
- [ ] Abas Evolução, Análise, Bens & Passivos

**Observação:** `GoalsList` faz o próprio fetch — PatrimonioShell não precisa mais gerenciar estado de goals.

---

## Ordem de Implementação

1. **Schema** — model FinancialGoal + enum + migration
2. **API goals/route.ts** — GET + POST
3. **API goals/[id]/route.ts** — PATCH + DELETE
4. **GoalDialog** — dialog criar/editar (depende da API)
5. **GoalCard** — card individual (depende do tipo FinancialGoalSerialized)
6. **GoalsList** — orquestrador (depende de GoalCard + GoalDialog)
7. **PatrimonioShell** — conectar GoalsList na aba Meta

---

## Issues Sugeridas

### Issue #94 — Schema + API: FinancialGoal CRUD

**Arquivos:**
- `prisma/schema.prisma` — MODIFY
- `src/app/api/patrimonio/goals/route.ts` — CREATE
- `src/app/api/patrimonio/goals/[id]/route.ts` — CREATE

**Tasks:**
- [ ] Adicionar enum `ContributionFrequency` e model `FinancialGoal` ao schema
- [ ] Adicionar `financialGoals FinancialGoal[]` ao User
- [ ] `npx prisma db push --accept-data-loss`
- [ ] CREATE `src/app/api/patrimonio/goals/route.ts` com GET + POST + interface exportada
- [ ] CREATE `src/app/api/patrimonio/goals/[id]/route.ts` com PATCH + DELETE

**Critério:** `npm run build` passa; GET `/api/patrimonio/goals` retorna `{ goals: [] }` para usuário sem metas

---

### Issue #95 — Components: GoalDialog + GoalCard + GoalsList

**Arquivos:**
- `src/components/patrimonio/GoalDialog.tsx` — CREATE
- `src/components/patrimonio/GoalCard.tsx` — CREATE
- `src/components/patrimonio/GoalsList.tsx` — CREATE

**Tasks:**
- [ ] CREATE `GoalDialog.tsx`: 5 campos (nome, valor alvo, já poupado, aporte, frequência) + textarea notas + POST/PATCH
- [ ] CREATE `GoalCard.tsx`: progresso, projeção de data, badge frequência, hover Pencil/Trash2
- [ ] CREATE `GoalsList.tsx`: fetch próprio, lista de GoalCard, dialog orquestrado, empty state

**Critério:** `npm run build` passa; criar meta via dialog → aparece na lista com barra de progresso e projeção

---

### Issue #96 — PatrimonioShell: aba Meta usa GoalsList

**Arquivo:** `src/components/patrimonio/PatrimonioShell.tsx` — MODIFY

**Tasks:**
- [ ] Remover import e uso de `PatrimonioGoal`
- [ ] Remover estados `goalData`, `goalLoading` e callback `fetchGoal`
- [ ] Remover fetch de `/api/patrimonio/goal` do `Promise.allSettled` (manter os outros 4)
- [ ] Importar e usar `GoalsList` na aba "meta"
- [ ] Verificar `npm run build`

**Critério:** `npm run build` passa; aba Meta renderiza GoalsList; sem referências ao PatrimonioGoal antigo

---

## Complexidade

**Média** — 7 arquivos (3 creates de componente, 2 creates de API, 1 modify schema, 1 modify shell). Sem integração externa, lógica de projeção simples.

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `patrimonyGoal` em uso em algum lugar | Não remover do schema — apenas parar de usar na UI. API `/api/patrimonio/goal` fica ativa mas sem consumidor. |
| Select `onValueChange` tipo incompatível | Usar arrow `(v) => setFrequency(v ?? "MONTHLY")` — mesmo padrão de WealthItemDialog |
| `savedAmount` pode ser maior que `targetAmount` | Clamp no progressPct: `Math.min(100, ...)` + badge "Meta atingida" |
| Prisma 7 com `--accept-data-loss` em prod | Não há dados de `FinancialGoal` ainda — nova tabela, sem perda real |
