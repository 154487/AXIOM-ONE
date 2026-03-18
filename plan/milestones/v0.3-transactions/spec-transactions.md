# SPEC - v0.3 Transactions

> Gerado por `/planejar-feature` em 2026-03-17

## Resumo

Implementar a tela de Transactions completa: listagem tabular com filtros client-side (tipo, categoria, mês), criação, edição e exclusão via dialog. API Routes para CRUD completo. Sem migration — o model `Transaction` já existe no schema.

---

## Arquitetura

```
Browser (Transactions page — Server Component)
   ↓
Busca transactions + categories via Prisma (max 200, desc por date)
   ↓
<TransactionList> — Client Component
   ├── <TransactionFilters> — filtro tipo | categoria | mês (client-side)
   ├── <TransactionTable>   — tabela shadcn com os dados filtrados
   │     └── botões editar / deletar por linha
   └── <TransactionDialog>  — Dialog criar / editar
         ├── description (Input)
         ├── amount (Input number)
         ├── type (Select: INCOME | EXPENSE)
         ├── category (Select: lista de categorias do usuário)
         └── date (input type="date")

API Routes
   ├── GET    /api/transactions        → list (max 200, desc)
   ├── POST   /api/transactions        → create
   ├── PATCH  /api/transactions/[id]   → update
   └── DELETE /api/transactions/[id]   → delete
        ↓
   Prisma → PostgreSQL (Transaction, Category — sem migration)
```

---

## Stack de Referência

- `auth()` de `@/lib/auth` em API Routes e Server Components
- `prisma` de `@/lib/prisma` (server-only)
- shadcn a instalar: `select` — `npx shadcn@latest add select`
- shadcn já instalados: `dialog`, `table`, `badge`, `button`, `input`, `label`
- `formatCurrency()`, `formatDate()` de `@/lib/utils`

---

## Mudanças por Arquivo

### MODIFY: `src/app/(dashboard)/transactions/page.tsx`

**Responsabilidade:** Server Component — busca dados e renderiza TransactionList

**Implementar:**
- [ ] `auth()` → redirect se não autenticado
- [ ] `prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 200, include: { category: true } })`
- [ ] `prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } })`
- [ ] Renderizar `<TransactionList transactions={...} categories={...} />`

---

### CREATE: `src/components/transactions/TransactionList.tsx`

**Responsabilidade:** `"use client"` — container com estado de filtros + dialog

**Implementar:**
- [ ] Estado: `filters` (type: "ALL"|"INCOME"|"EXPENSE", categoryId: string|null, month: string|null)
- [ ] Estado: `transactions` local (useState inicializado com props — atualizar após create/edit/delete)
- [ ] Estado: `dialog` (null | { mode: "create" } | { mode: "edit"; transaction: Transaction })
- [ ] Renderizar `<TransactionFilters>`, `<TransactionTable>`, `<TransactionDialog>`
- [ ] Filtrar `transactions` client-side antes de passar para `<TransactionTable>`
- [ ] Botão "+ Nova Transação" (laranja) abre dialog mode=create

**Lógica de filtro:**
```ts
const filtered = transactions.filter((tx) => {
  if (filters.type !== "ALL" && tx.type !== filters.type) return false;
  if (filters.categoryId && tx.category.id !== filters.categoryId) return false;
  if (filters.month) {
    const txMonth = tx.date.toISOString().slice(0, 7); // "2026-03"
    if (txMonth !== filters.month) return false;
  }
  return true;
});
```

---

### CREATE: `src/components/transactions/TransactionFilters.tsx`

**Responsabilidade:** `"use client"` — filtros de tipo, categoria e mês

**Implementar:**
- [ ] Select tipo: All | Income | Expense (shadcn `Select`)
- [ ] Select categoria: "Todas" + lista de categorias (shadcn `Select`)
- [ ] Select mês: últimos 12 meses em formato `YYYY-MM` (shadcn `Select`)
- [ ] Botão "Limpar filtros" aparece quando há algum filtro ativo
- [ ] Props: `filters`, `onFilterChange`, `categories`

---

### CREATE: `src/components/transactions/TransactionTable.tsx`

**Responsabilidade:** `"use client"` — tabela de transações

**Implementar:**
- [ ] shadcn `Table` com colunas: Data | Descrição | Categoria | Tipo | Valor | Ações
- [ ] Coluna Valor: verde para INCOME (`text-axiom-income`), vermelho para EXPENSE (`text-axiom-expense`) com `+`/`-`
- [ ] Coluna Categoria: círculo colorido + nome
- [ ] Coluna Tipo: badge "Receita" (verde) ou "Despesa" (vermelho)
- [ ] Coluna Ações: botões editar (Pencil) e deletar (Trash2)
- [ ] Delete: `DELETE /api/transactions/[id]` → confirmar inline antes de chamar
- [ ] Estado vazio: mensagem "Nenhuma transação encontrada"
- [ ] Props: `transactions`, `onEdit(tx)`, `onDelete(id)`

---

### CREATE: `src/components/transactions/TransactionDialog.tsx`

**Responsabilidade:** `"use client"` — modal criar/editar transação

**Implementar:**
- [ ] shadcn `Dialog` com campos:
  - `description` — Input texto obrigatório
  - `amount` — Input number (positivo) obrigatório
  - `type` — Select: "Receita (INCOME)" | "Despesa (EXPENSE)"
  - `categoryId` — Select: lista de categorias do usuário
  - `date` — `<input type="date">` com default hoje
- [ ] Mode "create" → `POST /api/transactions`
- [ ] Mode "edit" → `PATCH /api/transactions/[id]` (campos pré-preenchidos)
- [ ] Validação client-side: description não vazio, amount > 0, categoryId selecionado
- [ ] Props: `mode`, `transaction?`, `categories`, `onSuccess(tx)`, `onClose()`

**Snippet base do select de categorias:**
```tsx
<Select value={categoryId} onValueChange={setCategoryId}>
  <SelectTrigger className="bg-axiom-hover border-axiom-border text-white">
    <SelectValue placeholder="Selecione uma categoria" />
  </SelectTrigger>
  <SelectContent className="bg-axiom-card border-axiom-border">
    {categories.map((cat) => (
      <SelectItem key={cat.id} value={cat.id} className="text-white">
        {cat.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

### CREATE: `src/app/api/transactions/route.ts`

**Responsabilidade:** Listar e criar transações do usuário autenticado

**Implementar:**
- [ ] `GET` — `prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 200, include: { category: true } })`
- [ ] `POST` — recebe `{ description, amount, type, categoryId, date }`
  - Validar: description não vazio, amount > 0, type em ["INCOME","EXPENSE"], categoryId presente, date válida
  - Verificar ownership da category (`category.userId === session.user.id`) → 403
  - `prisma.transaction.create` com `include: { category: true }`
  - Retornar transaction com category incluída (para atualizar estado local)
- [ ] Ambos requerem `auth()` → 401

---

### CREATE: `src/app/api/transactions/[id]/route.ts`

**Responsabilidade:** Editar e deletar transação específica

**Implementar:**
- [ ] `PATCH` — recebe `{ description?, amount?, type?, categoryId?, date? }`
  - Verificar ownership: `transaction.userId === session.user.id` → 403
  - Se `categoryId` enviado: verificar ownership da category
  - `prisma.transaction.update` com `include: { category: true }`
- [ ] `DELETE` — verificar ownership → `prisma.transaction.delete`
- [ ] Ambos: `auth()` → 401

---

## Ordem de Implementação

```
1. API: GET/POST /api/transactions          → issue 10
2. API: PATCH/DELETE /api/transactions/[id] → issue 10
3. UI: instalar shadcn select               → issue 11
4. UI: TransactionList + Filters + Table    → issue 11
5. UI: TransactionDialog                   → issue 12
6. UI: transactions/page.tsx (Server Comp) → issue 12
```

---

## Issues

### Issue 10: API — Transactions CRUD
**Arquivos:**
- `src/app/api/transactions/route.ts` (CREATE)
- `src/app/api/transactions/[id]/route.ts` (CREATE)

**Tasks:**
- [ ] CREATE `api/transactions/route.ts` — GET (list 200 desc + include category) + POST (create com validação + ownership category)
- [ ] CREATE `api/transactions/[id]/route.ts` — PATCH (update + ownership) + DELETE (ownership)
- [ ] GET retorna `{ ...transaction, category: { id, name, color } }`
- [ ] POST valida: description, amount > 0, type INCOME|EXPENSE, categoryId, date

**Critério:** POST cria transação e retorna com category inclusa; DELETE retorna 403 para transação de outro usuário

---

### Issue 11: UI — Listagem, filtros e tabela
**Arquivos:**
- `src/components/transactions/TransactionList.tsx` (CREATE)
- `src/components/transactions/TransactionFilters.tsx` (CREATE)
- `src/components/transactions/TransactionTable.tsx` (CREATE)

**Tasks:**
- [ ] Instalar shadcn select: `npx shadcn@latest add select`
- [ ] CREATE `TransactionList.tsx` — estado de filtros + dialog + estado local de transactions
- [ ] CREATE `TransactionFilters.tsx` — selects de tipo, categoria e mês
- [ ] CREATE `TransactionTable.tsx` — shadcn Table com colunas, badges, cores e botões editar/deletar
- [ ] Filtros client-side aplicados sobre estado local

**Critério:** filtrar por tipo "Expense" mostra apenas despesas; filtrar por mês mostra apenas transações do mês selecionado

---

### Issue 12: UI — Dialog criar/editar + page.tsx
**Arquivos:**
- `src/components/transactions/TransactionDialog.tsx` (CREATE)
- `src/app/(dashboard)/transactions/page.tsx` (MODIFY)

**Tasks:**
- [ ] CREATE `TransactionDialog.tsx` — Dialog com 5 campos (description, amount, type, category, date), mode create/edit
- [ ] MODIFY `transactions/page.tsx` — Server Component: auth + fetch transactions (include category) + fetch categories → `<TransactionList>`
- [ ] Após criar: transação aparece no topo da lista imediatamente
- [ ] Após editar: transação atualizada reflete na lista imediatamente

**Critério:** criar transação → aparece na lista sem reload; editar descrição → tabela reflete imediatamente; deletar → remove da lista

---

## Complexidade

**Média** — 7 arquivos (1 modify, 6 create), sem migration, 1 novo componente shadcn (`select`)

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `amount` como `Decimal` no Prisma | Converter com `parseFloat(String(tx.amount))` antes de enviar ao client |
| `date` como `Date` no Prisma | Serializar como ISO string na API; parsear no client com `new Date(tx.date)` |
| Select de mês sem transações | Gerar últimos 12 meses fixos independente dos dados |
| Category ownership no POST | Buscar category antes de criar; verificar `category.userId === session.user.id` |

---

## Próxima Etapa

1. `/revisar-spec` — revisão crítica
2. `/clear` — limpar contexto
3. `/publicar-milestone` — criar milestone v0.3 + 3 issues no GitHub
4. `/executar-milestone` — implementar issue por issue
