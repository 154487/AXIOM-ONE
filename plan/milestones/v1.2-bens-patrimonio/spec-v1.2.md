# SPEC — v1.2 Bens e Passivos

> Gerado por `/planejar-feature` em 2026-03-19

## Resumo

Adicionar cadastro de bens (ativos: imóvel, veículo, investimento externo, etc.) e passivos (dívidas, financiamentos) dentro de `/patrimonio`. Cada item tem nome, valor, tipo (ASSET/LIABILITY), categoria e notas opcionais. O patrimônio líquido ajustado (transações + bens - passivos) é exibido em card de resumo no topo e usado na `PatrimonioGoal`.

---

## Arquitetura

```
/patrimonio  (PatrimonioShell)
  │
  ├── [existente] NetWorthChart
  ├── [existente] SavingsRateChart
  ├── [existente] FireProjection
  ├── [existente] AssetBreakdown
  ├── [existente] BenchmarkComparison
  ├── [NOVO] WealthItems             ← /api/patrimonio/items
  │         CRUD de bens e passivos
  └── [existente] PatrimonioGoal    ← recebe adjustedNetWorth (antes recebia currentNetWorth)
```

```
GET    /api/patrimonio/items         → { items[], totalAssets, totalLiabilities, net }
POST   /api/patrimonio/items         → body: WealthItemInput → WealthItem
PATCH  /api/patrimonio/items/[id]    → body: Partial<WealthItemInput> → WealthItem
DELETE /api/patrimonio/items/[id]    → 204
```

**PatrimonioShell passa a fazer 5 fetches paralelos:**
1. `/api/reports/networth` — já existente
2. `/api/investments/portfolio` — já existente
3. `/api/investments/benchmarks` — já existente
4. `/api/patrimonio/goal` — adicionado em v1.1
5. `/api/patrimonio/items` — novo

**adjustedNetWorth** calculado no PatrimonioShell:
```ts
const adjustedNetWorth = (data?.currentNetWorth ?? 0) + (itemsData?.net ?? 0);
```

---

## Mudanças por Arquivo

### MODIFY: `prisma/schema.prisma`

**Adicionar após model `JournalEntry`:**

```prisma
enum WealthItemType {
  ASSET
  LIABILITY
}

model WealthItem {
  id        String         @id @default(cuid())
  userId    String
  name      String
  value     Decimal        @db.Decimal(14, 2)
  itemType  WealthItemType
  category  String         // free text: "Imóvel", "Veículo", etc.
  notes     String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Adicionar relação em model `User` (após `journalEntries`):**
```prisma
wealthItems  WealthItem[]
```

**Após editar:** rodar `npx prisma db push --accept-data-loss`

**Referência:** padrão de outros models com userId + onDelete: Cascade

---

### CREATE: `src/app/api/patrimonio/items/route.ts`

**Responsabilidade:** Listar e criar WealthItems do usuário.

**Implementar:**
- [ ] Auth check padrão
- [ ] `GET`: buscar todos `WealthItem` do usuário ordenados por `itemType ASC, createdAt DESC`
  - Calcular `totalAssets = sum(value WHERE itemType = ASSET)`
  - Calcular `totalLiabilities = sum(value WHERE itemType = LIABILITY)`
  - Retornar `{ items: WealthItemSerialized[], totalAssets, totalLiabilities, net: totalAssets - totalLiabilities }`
  - Serializar `value: parseFloat(String(item.value))`
- [ ] `POST`: validar `name` (obrigatório), `value > 0`, `itemType` (ASSET|LIABILITY), `category` (obrigatório)
  - Criar registro e retornar `{ ...item, value: parseFloat(String(item.value)) }` com status 201

**Snippet:**
```ts
export interface WealthItemSerialized {
  id: string;
  name: string;
  value: number;
  itemType: "ASSET" | "LIABILITY";
  category: string;
  notes: string | null;
  createdAt: string;
}

export interface WealthItemsResponse {
  items: WealthItemSerialized[];
  totalAssets: number;
  totalLiabilities: number;
  net: number;
}
```

**Referência:** padrão de `src/app/api/categories/route.ts`

---

### CREATE: `src/app/api/patrimonio/items/[id]/route.ts`

**Responsabilidade:** Editar e deletar WealthItem com ownership check.

**Implementar:**
- [ ] Auth check padrão
- [ ] `PATCH`: buscar item por `id`, verificar `item.userId === session.user.id` → 403 se não
  - Campos editáveis: `name`, `value`, `category`, `notes`
  - Validar `value > 0` se `value` estiver presente no body
  - Não permitir mudar `itemType` (mudar tipo é semanticamente deletar e recriar)
  - Retornar item serializado
- [ ] `DELETE`: ownership check → `prisma.wealthItem.delete({ where: { id } })` → 204

**Referência:** padrão de `src/app/api/categories/[id]/route.ts`

---

### CREATE: `src/components/patrimonio/WealthItemDialog.tsx`

**Responsabilidade:** Dialog shadcn para criar ou editar um WealthItem.

**Implementar:**
- [ ] `"use client"`
- [ ] Props:
  ```ts
  interface WealthItemDialogProps {
    mode: "create" | "edit";
    defaultType?: "ASSET" | "LIABILITY"; // pré-seleciona aba ao criar
    item?: WealthItemSerialized;
    onSuccess: (item: WealthItemSerialized) => void;
    onClose: () => void;
  }
  ```
- [ ] Campos do form:
  - `name`: Input texto, obrigatório
  - `value`: Input number `min="0.01" step="0.01"`, obrigatório
  - `itemType`: Select `ASSET` ("Ativo") | `LIABILITY` ("Passivo") — desabilitado no modo edit
  - `category`: Select com presets por tipo:
    - ASSET presets: `["Imóvel", "Veículo", "Investimento Externo", "Conta Bancária", "Previdência", "Outro"]`
    - LIABILITY presets: `["Financiamento Imobiliário", "Financiamento Veicular", "Empréstimo Pessoal", "Cartão de Crédito", "Outro"]`
  - `notes`: `<textarea>` HTML nativo (shadcn Textarea não instalado) com classes `bg-axiom-hover border border-axiom-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-axiom-muted focus:outline-none focus:border-axiom-primary w-full resize-none`
- [ ] Ao mudar `itemType`, resetar `category` para primeiro preset do novo tipo
- [ ] `handleSubmit`: POST ou PATCH → chamar `onSuccess(data)` em caso de sucesso
- [ ] Mostrar erro inline se API retornar erro
- [ ] Usar shadcn: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter`, `Input`, `Label`, `Button`
- [ ] Estilo: `bg-axiom-card border-axiom-border text-white` no DialogContent

**Referência:** `src/components/settings/CategoryDialog.tsx` (padrão exato de Dialog shadcn)

---

### CREATE: `src/components/patrimonio/WealthItems.tsx`

**Responsabilidade:** Card com lista de bens e passivos, totais, e botões de CRUD.

**Implementar:**
- [ ] `"use client"`
- [ ] Props:
  ```ts
  interface WealthItemsProps {
    items: WealthItemSerialized[];
    totalAssets: number;
    totalLiabilities: number;
    net: number;
    currency: string;
    locale: string;
    onRefresh: () => void; // PatrimonioShell re-fetcha items
  }
  ```
- [ ] Estados locais: `dialogMode: "create" | "edit" | null`, `editingItem: WealthItemSerialized | null`, `defaultType: "ASSET" | "LIABILITY"`
- [ ] **Header do card**: título "Bens e Passivos" + botões "+ Ativo" e "+ Passivo"
- [ ] **Summary bar**: 3 números em linha:
  - Ativos: `totalAssets` (cor `text-axiom-income`)
  - Passivos: `totalLiabilities` (cor `text-axiom-expense`)
  - Líquido: `net` (cor dinâmica: `text-axiom-income` se ≥ 0, `text-axiom-expense` se < 0)
- [ ] **Lista**: agrupada por tipo — primeiro ATIVOS (ícone `TrendingUp`), depois PASSIVOS (ícone `TrendingDown`)
  - Cada item: nome + badge categoria + valor + botões ✏️ 🗑️
  - Badge categoria: `bg-axiom-hover text-axiom-muted text-xs`
  - Delete: chamar DELETE API → `onRefresh()`
  - Edit: abrir dialog modo edit
- [ ] **Empty state** (sem itens): "Nenhum bem ou passivo cadastrado" + botões de adicionar
- [ ] Quando `WealthItemDialog` chamar `onSuccess`: fechar dialog + `onRefresh()`
- [ ] Usar `formatCurrency(value, locale, currency)` de `@/lib/utils`
- [ ] Importar `TrendingUp`, `TrendingDown`, `Pencil`, `Trash2` de `lucide-react`

---

### MODIFY: `src/components/patrimonio/PatrimonioShell.tsx`

**Alterar:**
- [ ] Adicionar import: `import { WealthItems } from "./WealthItems"`
- [ ] Adicionar 2 novos estados:
  ```ts
  const [itemsData, setItemsData] = useState<WealthItemsResponse | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  ```
  Onde `WealthItemsResponse` é importado de `@/app/api/patrimonio/items/route`
- [ ] Adicionar função `fetchItems` separada (igual ao `fetchGoal` existente):
  ```ts
  const fetchItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const res = await fetch("/api/patrimonio/items");
      if (res.ok) setItemsData(await res.json());
    } catch { /* silent */ } finally { setItemsLoading(false); }
  }, []);
  ```
- [ ] No `fetchData`, adicionar 5º fetch paralelo: `fetch("/api/patrimonio/items")`
- [ ] Calcular `adjustedNetWorth`:
  ```ts
  const adjustedNetWorth = (data?.currentNetWorth ?? 0) + (itemsData?.net ?? 0);
  ```
- [ ] Renderizar `<WealthItems>` após `<BenchmarkComparison>` e antes de `<PatrimonioGoal>`
- [ ] `<PatrimonioGoal>` passa `currentNetWorth={adjustedNetWorth}` (era `data?.currentNetWorth ?? 0`)

**Nota:** `WealthItemsResponse` deve ser importado da API route como tipo (export interface no route.ts).

---

## Ordem de Implementação

1. **Schema** — `prisma/schema.prisma` + `db push`
2. **API items** — `GET` + `POST` em `route.ts`
3. **API items/[id]** — `PATCH` + `DELETE`
4. **WealthItemDialog** — Dialog CRUD
5. **WealthItems** — componente lista
6. **PatrimonioShell** — integração + adjustedNetWorth

---

## Issues Sugeridas

### Issue 1: Schema — WealthItem + WealthItemType
**Arquivos:** `prisma/schema.prisma`

**Tasks:**
- [ ] Adicionar enum `WealthItemType { ASSET LIABILITY }`
- [ ] Adicionar model `WealthItem` com campos: id, userId, name, value (Decimal 14,2), itemType, category, notes?, createdAt, updatedAt, relação User
- [ ] Adicionar `wealthItems WealthItem[]` em model `User`
- [ ] Rodar `npx prisma db push --accept-data-loss`

**Critério:** `prisma.wealthItem.create({ data: { ... } })` compila sem erro de tipo

---

### Issue 2: API items — GET lista + POST criar
**Arquivos:** `src/app/api/patrimonio/items/route.ts`

**Tasks:**
- [ ] CREATE `src/app/api/patrimonio/items/route.ts`
- [ ] Exportar interfaces `WealthItemSerialized` e `WealthItemsResponse`
- [ ] `GET`: retorna `{ items[], totalAssets, totalLiabilities, net }` com valores serializados
- [ ] `POST`: valida name, value > 0, itemType, category → cria e retorna item com status 201
- [ ] Auth check em ambos

**Critério:** `npm run build` passa; `GET /api/patrimonio/items` retorna 200

---

### Issue 3: API items/[id] — PATCH editar + DELETE remover
**Arquivos:** `src/app/api/patrimonio/items/[id]/route.ts`

**Tasks:**
- [ ] CREATE `src/app/api/patrimonio/items/[id]/route.ts`
- [ ] `PATCH`: ownership check → atualiza name, value, category, notes (itemType imutável)
- [ ] `DELETE`: ownership check → deleta → retorna 204

**Critério:** `npm run build` passa; DELETE retorna 204; PATCH retorna item atualizado

---

### Issue 4: WealthItemDialog — Dialog criar/editar
**Arquivos:** `src/components/patrimonio/WealthItemDialog.tsx`

**Tasks:**
- [ ] CREATE `src/components/patrimonio/WealthItemDialog.tsx`
- [ ] Form: name, value, itemType (select, desabilitado no edit), category (select com presets por tipo), notes (textarea)
- [ ] POST criar / PATCH editar → `onSuccess(item)` ou erro inline
- [ ] Presets ASSET: Imóvel, Veículo, Investimento Externo, Conta Bancária, Previdência, Outro
- [ ] Presets LIABILITY: Financiamento Imobiliário, Financiamento Veicular, Empréstimo Pessoal, Cartão de Crédito, Outro

**Critério:** `npm run build` passa; dialog abre/fecha sem erro

---

### Issue 5: WealthItems — lista + CRUD UI
**Arquivos:** `src/components/patrimonio/WealthItems.tsx`

**Tasks:**
- [ ] CREATE `src/components/patrimonio/WealthItems.tsx`
- [ ] Summary bar: Ativos (verde) | Passivos (vermelho) | Líquido (dinâmico)
- [ ] Lista agrupada: ATIVOS → PASSIVOS, cada item com nome + badge + valor + ✏️🗑️
- [ ] Botões "+ Ativo" e "+ Passivo" no header
- [ ] Delete: chama API → `onRefresh()`
- [ ] Empty state quando sem itens

**Critério:** `npm run build` passa; renderiza corretamente com lista vazia

---

### Issue 6: PatrimonioShell — 5º fetch + adjustedNetWorth
**Arquivos:** `src/components/patrimonio/PatrimonioShell.tsx`

**Tasks:**
- [ ] Adicionar import `WealthItemsResponse` de `@/app/api/patrimonio/items/route`
- [ ] Adicionar `itemsData` state + `fetchItems` function
- [ ] Adicionar 5º fetch paralelo no `fetchData`
- [ ] Calcular `adjustedNetWorth = (data?.currentNetWorth ?? 0) + (itemsData?.net ?? 0)`
- [ ] Renderizar `<WealthItems>` antes de `<PatrimonioGoal>` com `onRefresh={fetchItems}`
- [ ] Passar `adjustedNetWorth` para `PatrimonioGoal.currentNetWorth`

**Critério:** `npm run build` passa; `/patrimonio` exibe WealthItems e PatrimonioGoal usa valor ajustado

---

## Complexidade

**Média** — 6 arquivos novos/modificados, 1 migration, CRUD completo, sem API externa

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `itemType` mutável quebraria lógica de presets | PATCH não permite mudar `itemType` |
| `net` negativo quebrar PatrimonioGoal | `progressPct = Math.min(100, Math.max(0, ...))` já trata |
| Items com `value = 0` | Validar `value > 0` no POST |
| `/api/patrimonio/items` lento (muitos itens) | Sem paginação — patrimônio pessoal raramente tem >100 bens |

---

## Próxima Etapa

1. `/revisar-spec` — validação crítica
2. `/publicar-milestone`
3. `/executar-milestone`
