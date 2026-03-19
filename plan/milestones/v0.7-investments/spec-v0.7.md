# SPEC — v0.7 Carteira Base

> Gerado por `/planejar-feature` em 2026-03-19
> PRD: `plan/milestones/v0.7-investments/prd-investments.md`

## Resumo

Adicionar módulo de Investimentos ao Axiom ONE: cadastro manual de ativos (ações, FIIs, renda fixa, cripto, etc.), histórico de aportes/resgates/dividendos por ativo, e visão consolidada da carteira com custo médio e P&L. Sem cotação automática nesta versão — o usuário informa o preço atual manualmente. Nova rota `/investments` no sidebar.

---

## Arquitetura

```
User → /investments (page.tsx — Server Component)
           ↓ passa assets[] + currency ao client
       InvestmentsShell (Client — tabs)
           ├── Tab "Carteira"
           │     ├── PortfolioSummaryCards (total investido, P&L, nº ativos)
           │     ├── PortfolioDonut (Chart.js — alocação por tipo)
           │     └── AssetList (tabela — ativo, tipo, qtd, custo médio, preço atual, P&L%)
           │           └── AssetDialog (criar/editar ativo)
           └── Tab "Lançamentos"
                 ├── EntryList (tabela de todos os aportes/resgates)
                 └── EntryDialog (registrar aporte/resgate/dividendo)

API:
  /api/investments/assets        GET, POST
  /api/investments/assets/[id]   PATCH, DELETE
  /api/investments/entries       GET, POST
  /api/investments/entries/[id]  PATCH, DELETE
  /api/investments/portfolio     GET (cálculo custo médio + P&L)
```

---

## Mudanças por Arquivo

### MODIFY: `prisma/schema.prisma`

**Adicionar após `enum TransactionType`:**
- [ ] Enum `AssetType` (STOCK, FII, ETF, BDR, CRYPTO, FIXED_INCOME, STOCK_INT, OTHER)
- [ ] Enum `EntryType` (PURCHASE, SALE, DIVIDEND, SPLIT)
- [ ] Model `Asset` (id, userId, ticker?, name, type, currency, currentPrice?, createdAt)
- [ ] Model `InvestmentEntry` (id, assetId, userId, type, date, quantity Decimal(14,6), price Decimal(14,6), amount Decimal(14,2), notes?, createdAt)
- [ ] Adicionar relações `assets` e `investmentEntries` no model `User`

**Schema exato:**
```prisma
enum AssetType {
  STOCK
  FII
  ETF
  BDR
  CRYPTO
  FIXED_INCOME
  STOCK_INT
  OTHER
}

enum EntryType {
  PURCHASE
  SALE
  DIVIDEND
  SPLIT
}

model Asset {
  id           String    @id @default(cuid())
  userId       String
  ticker       String?
  name         String
  type         AssetType
  currency     String    @default("BRL")
  currentPrice Decimal?  @db.Decimal(14, 6)
  createdAt    DateTime  @default(now())
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  entries      InvestmentEntry[]

  @@unique([userId, ticker])
}

model InvestmentEntry {
  id        String    @id @default(cuid())
  assetId   String
  userId    String
  type      EntryType
  date      DateTime
  quantity  Decimal   @db.Decimal(14, 6)
  price     Decimal   @db.Decimal(14, 6)
  amount    Decimal   @db.Decimal(14, 2)
  notes     String?
  createdAt DateTime  @default(now())
  asset     Asset     @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**No model User, adicionar:**
```prisma
assets             Asset[]
investmentEntries  InvestmentEntry[]
```

---

### CREATE: `src/app/api/investments/assets/route.ts`

**Responsabilidade:** Listar e criar ativos do usuário

**Implementar:**
- [ ] `GET` — `prisma.asset.findMany({ where: { userId }, include: { entries: true }, orderBy: { createdAt: 'desc' } })`
  - Serializar: `currentPrice: parseFloat(String(a.currentPrice ?? 0))`
- [ ] `POST` — validar `name` (string, obrigatório), `type` (enum AssetType), `ticker` (opcional), `currency` (default BRL), `currentPrice` (opcional)
  - Checar duplicata `@@unique([userId, ticker])` → 409 se ticker já existe

**Referência:** Padrão de `src/app/api/categories/route.ts`

---

### CREATE: `src/app/api/investments/assets/[id]/route.ts`

**Responsabilidade:** Editar e deletar ativo

**Implementar:**
- [ ] `PATCH` — atualizar campos permitidos: `name`, `ticker`, `type`, `currency`, `currentPrice`
  - ownership check: `asset.userId !== session.user.id` → 403
- [ ] `DELETE` — verificar se tem entradas (`_count.entries > 0`) → 409 com mensagem clara
  - Se sem entradas: deletar (cascade automático pelo Prisma)

**Referência:** Padrão de `src/app/api/categories/[id]/route.ts`

---

### CREATE: `src/app/api/investments/entries/route.ts`

**Responsabilidade:** Listar e criar lançamentos de investimento

**Implementar:**
- [ ] `GET` — query params: `assetId?`, `type?`, `start?`, `end?`
  - `prisma.investmentEntry.findMany({ where: { userId, ...filters }, include: { asset: true }, orderBy: { date: 'desc' } })`
  - Serializar: `quantity`, `price`, `amount` → `parseFloat(String(...))`
- [ ] `POST` — validar `assetId`, `type` (EntryType), `date`, `quantity` (> 0), `price` (> 0)
  - `amount` calculado internamente: `quantity * price` (não aceitar do client)
  - Verificar que `assetId` pertence ao `userId` → 403 se não

---

### CREATE: `src/app/api/investments/entries/[id]/route.ts`

**Responsabilidade:** Editar e deletar lançamentos

**Implementar:**
- [ ] `PATCH` — campos permitidos: `type`, `date`, `quantity`, `price`, `notes`
  - Recalcular `amount = quantity * price` ao atualizar
  - ownership check via entry.userId
- [ ] `DELETE` — ownership check → deletar

---

### CREATE: `src/app/api/investments/portfolio/route.ts`

**Responsabilidade:** Retornar carteira consolidada com custo médio e P&L por ativo

**Implementar:**
- [ ] `GET` — buscar todos assets + entries do usuário
- [ ] Para cada ativo, calcular:
  ```typescript
  // Custo médio ponderado (apenas PURCHASE e SPLIT)
  let totalQty = 0;
  let totalCost = 0;
  for (const e of entries) {
    if (e.type === 'PURCHASE') {
      totalCost += e.quantity * e.price;
      totalQty += e.quantity;
    } else if (e.type === 'SALE') {
      totalQty -= e.quantity; // reduz posição
    }
  }
  const avgCost = totalQty > 0 ? totalCost / totalQty : 0;
  const currentPrice = asset.currentPrice ?? avgCost;
  const currentValue = totalQty * currentPrice;
  const invested = totalQty * avgCost;
  const pnl = currentValue - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  ```
- [ ] Retornar: `{ assets: AssetPosition[], totalInvested, totalCurrentValue, totalPnl, totalPnlPct, allocationByType }`
- [ ] `allocationByType`: objeto `{ STOCK: pct, FII: pct, ... }` para o Donut chart

**Tipo de retorno:**
```typescript
interface AssetPosition {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  totalQuantity: number;
  avgCost: number;
  currentPrice: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  totalDividends: number;
}
```

---

### CREATE: `src/app/(dashboard)/investments/page.tsx`

**Responsabilidade:** Server Component — auth guard + fetch inicial + shell

**Implementar:**
- [ ] `export const dynamic = "force-dynamic"`
- [ ] Auth guard → redirect("/login")
- [ ] Fetch paralelo: `prisma.userCurrency.findFirst({ where: { userId, isDefault: true } })` + `getLocale()`
- [ ] Passar ao `<InvestmentsShell initialCurrency={currency} initialLocale={locale} />`

**Referência:** Copiar estrutura de `src/app/(dashboard)/reports/page.tsx`

---

### CREATE: `src/components/investments/InvestmentsShell.tsx`

**Responsabilidade:** Shell client com 2 abas — Carteira e Lançamentos

**Implementar:**
- [ ] `"use client"` + `useTranslations("Investments")`
- [ ] Estado: `activeTab: "portfolio" | "entries"`
- [ ] Fetch `portfolio`: `GET /api/investments/portfolio` ao montar — estado `portfolioKey` para forçar refetch
  ```typescript
  const [portfolioKey, setPortfolioKey] = useState(0);
  const triggerPortfolioRefresh = () => setPortfolioKey(k => k + 1);
  // passar triggerPortfolioRefresh para EntryList via prop onEntryCreated
  ```
- [ ] Fetch `entries`: `GET /api/investments/entries` ao ativar aba Lançamentos
- [ ] Tabs shadcn: "Carteira" | "Lançamentos"
- [ ] Aba Carteira: `<PortfolioSummaryCards>` + `<PortfolioDonut>` + `<AssetList positions={portfolioData.assets} />`
- [ ] Aba Lançamentos: `<EntryList onEntryCreated={triggerPortfolioRefresh} />`
- [ ] `AssetList` recebe `positions: AssetPosition[]` (calculado) como props — não faz fetch próprio

**Referência:** Estrutura de `src/components/reports/ReportsShell.tsx`

---

### CREATE: `src/components/investments/portfolio/PortfolioSummaryCards.tsx`

**Responsabilidade:** 3 cards de resumo no topo da carteira

**Implementar:**
- [ ] Card 1: Total Investido (custo médio × qtd)
- [ ] Card 2: Valor Atual (preço atual × qtd)
- [ ] Card 3: P&L total (R$ + %) — cor axiom-income se positivo, axiom-expense se negativo
- [ ] Animação count-up 1000ms (padrão do projeto)

**Referência:** `src/components/dashboard/KPICard.tsx`

---

### CREATE: `src/components/investments/portfolio/PortfolioDonut.tsx`

**Responsabilidade:** Gráfico de pizza da alocação por tipo de ativo

**Implementar:**
- [ ] `"use client"` + `mounted` guard obrigatório
- [ ] Chart.js `Doughnut` com `react-chartjs-2`
- [ ] Dados: `allocationByType` do portfolio response (% por AssetType)
- [ ] Labels traduzidas: STOCK → "Ações BR", FII → "Fundos Imobiliários", etc.
- [ ] Cores distintas por tipo (usar paleta axiom-primary + variações)
- [ ] Animation: `{ duration: 1000, easing: "easeOutQuart" }`

**Referência:** `src/components/dashboard/SpendingDonut.tsx`

---

### CREATE: `src/components/investments/portfolio/AssetList.tsx`

**Responsabilidade:** Tabela de posições da carteira com ações de CRUD

**Implementar:**
- [ ] `"use client"` — estado local: `assets`, `dialogOpen`, `selectedAsset`
- [ ] shadcn Table: colunas → Ativo | Tipo | Qtd | Custo Médio | Preço Atual | Valor | P&L%
- [ ] P&L% colorido: verde se positivo, vermelho se negativo
- [ ] Botão "+" para criar novo ativo → abre `<AssetDialog>`
- [ ] Linha clicável → abre `<AssetDialog>` em modo edição
- [ ] Botão delete (ícone Trash) → chama DELETE, trata 409 (tem lançamentos)
- [ ] Atualização de estado local após create/update/delete (padrão do projeto)

**Referência:** `src/components/transactions/TransactionTable.tsx`

---

### CREATE: `src/components/investments/portfolio/AssetDialog.tsx`

**Responsabilidade:** Dialog shadcn para criar/editar ativo

**Implementar:**
- [ ] Props: `open`, `onClose`, `asset?` (se presente = modo edição), `onSave(asset)`
- [ ] Campos: Nome (obrigatório), Ticker (opcional), Tipo (Select com AssetType), Moeda, Preço Atual
- [ ] Validação client-side: nome obrigatório, preço atual ≥ 0
- [ ] POST para `/api/investments/assets` (create) ou PATCH para `/api/investments/assets/${id}` (edit)
- [ ] Ao salvar: chamar `onSave(result)` → pai atualiza estado local

**Referência:** `src/components/transactions/TransactionDialog.tsx`

---

### CREATE: `src/components/investments/entries/EntryList.tsx`

**Responsabilidade:** Tabela de todos os lançamentos com botão novo

**Implementar:**
- [ ] `"use client"` — estado local: `entries`, `dialogOpen`, `selectedEntry`
- [ ] shadcn Table: colunas → Data | Ativo | Tipo | Qtd | Preço | Total | Notas
- [ ] Tipo colorido por badge: PURCHASE (verde), SALE (vermelho), DIVIDEND (azul/laranja), SPLIT (muted)
- [ ] Botão "Novo Lançamento" no topo → `<EntryDialog>`
- [ ] Linha clicável = editar, ícone Trash = deletar

**Referência:** `src/components/transactions/TransactionTable.tsx`

---

### CREATE: `src/components/investments/entries/EntryDialog.tsx`

**Responsabilidade:** Dialog para registrar aporte/resgate/dividendo

**Implementar:**
- [ ] Props: `open`, `onClose`, `entry?`, `assets[]`, `onSave(entry)`
- [ ] Campos: Ativo (Select), Tipo (Select: Compra/Venda/Dividendo/Desdobramento), Data, Quantidade, Preço Unitário, Notas
- [ ] Preview calculado: Quantidade × Preço = Total (exibido em tempo real)
- [ ] Validação: ativo obrigatório, qtd > 0, preço > 0
- [ ] POST `/api/investments/entries` ou PATCH `/api/investments/entries/${id}`

---

### MODIFY: `src/components/layout/Sidebar.tsx`

**Alterar:**
- [ ] Adicionar import `TrendingUp` do lucide-react
- [ ] Inserir item no array `navItems` após `/reports`:
  ```typescript
  { href: "/investments", label: t("investments"), icon: TrendingUp },
  ```

---

### MODIFY: `messages/pt-BR.json`

**Adicionar seção `"Investments"`:**
```json
"Investments": {
  "title": "Investimentos",
  "tabs": {
    "portfolio": "Carteira",
    "entries": "Lançamentos"
  },
  "summary": {
    "totalInvested": "Total Investido",
    "currentValue": "Valor Atual",
    "pnl": "Resultado"
  },
  "assetTypes": {
    "STOCK": "Ações BR",
    "FII": "Fundos Imobiliários",
    "ETF": "ETF",
    "BDR": "BDR",
    "CRYPTO": "Criptomoedas",
    "FIXED_INCOME": "Renda Fixa",
    "STOCK_INT": "Ações Internacionais",
    "OTHER": "Outros"
  },
  "entryTypes": {
    "PURCHASE": "Compra",
    "SALE": "Venda",
    "DIVIDEND": "Dividendo",
    "SPLIT": "Desdobramento"
  },
  "table": {
    "asset": "Ativo",
    "type": "Tipo",
    "quantity": "Qtd",
    "avgCost": "Custo Médio",
    "currentPrice": "Preço Atual",
    "currentValue": "Valor",
    "pnl": "P&L",
    "date": "Data",
    "price": "Preço Unit.",
    "total": "Total",
    "notes": "Notas"
  },
  "dialog": {
    "newAsset": "Novo Ativo",
    "editAsset": "Editar Ativo",
    "newEntry": "Novo Lançamento",
    "editEntry": "Editar Lançamento",
    "name": "Nome",
    "ticker": "Ticker (opcional)",
    "currentPrice": "Preço Atual (opcional)",
    "currency": "Moeda"
  }
}
```

**Adicionar chave em `"Sidebar"`:**
```json
"investments": "Investimentos"
```

**Repetir estrutura (traduzida) para:** `en.json`, `es.json`, `fr.json`, `ar.json`, `hi.json`, `zh.json`

---

## Ordem de Implementação

1. **Schema** — `prisma/schema.prisma` + `npx prisma migrate dev --name add-investments`
2. **i18n** — todos os arquivos de mensagens (ANTES de qualquer UI — `useTranslations` quebra sem chaves)
3. **API assets** — `assets/route.ts` + `assets/[id]/route.ts`
4. **API entries** — `entries/route.ts` + `entries/[id]/route.ts`
5. **API portfolio** — `portfolio/route.ts` (cálculo custo médio + P&L)
6. **Page** — `investments/page.tsx`
7. **Shell + Sidebar** — `InvestmentsShell.tsx` + modificar `Sidebar.tsx`
8. **Portfolio UI** — `PortfolioSummaryCards` + `PortfolioDonut` + `AssetList` + `AssetDialog`
9. **Entries UI** — `EntryList` + `EntryDialog`

---

## Issues

### Issue 1: Schema + Migração — models Asset e InvestmentEntry
**Arquivos:** `prisma/schema.prisma`

**Tasks:**
- [ ] Adicionar enums `AssetType` e `EntryType` após `enum TransactionType`
- [ ] Adicionar model `Asset` com `@@unique([userId, ticker])`
- [ ] Adicionar model `InvestmentEntry` com Decimal(14,6) para quantity e price
- [ ] Adicionar relações `assets[]` e `investmentEntries[]` no model User
- [ ] Rodar `npx prisma migrate dev --name add-investments`
- [ ] Rodar `npx prisma generate`

**Critério:** `npm run build` passa sem erros de tipo Prisma

---

### Issue 2: API de Ativos — CRUD `/api/investments/assets`
**Arquivos:**
- `src/app/api/investments/assets/route.ts` (CREATE)
- `src/app/api/investments/assets/[id]/route.ts` (CREATE)

**Tasks:**
- [ ] `GET /assets` — lista ativos com entries incluídas, serializar Decimal→number
- [ ] `POST /assets` — criar ativo, checar @@unique ticker → 409
- [ ] `PATCH /assets/[id]` — editar, ownership check → 403
- [ ] `DELETE /assets/[id]` — checar `_count.entries` → 409 se > 0, ownership check

**Critério:** `npm run build` passa; testar no browser via DevTools

---

### Issue 3: API de Lançamentos — CRUD `/api/investments/entries`
**Arquivos:**
- `src/app/api/investments/entries/route.ts` (CREATE)
- `src/app/api/investments/entries/[id]/route.ts` (CREATE)

**Tasks:**
- [ ] `GET /entries` — lista com filtros `assetId?`, `start?`, `end?`, inclui asset
- [ ] `POST /entries` — validar campos, calcular `amount = quantity * price`, verificar ownership do asset
- [ ] `POST /entries` — quando `type === 'SALE'`: calcular posição atual do ativo e retornar 400 se `saleQty > currentPosition`
  ```typescript
  if (type === 'SALE') {
    const existingEntries = await prisma.investmentEntry.findMany({ where: { assetId, userId } });
    let currentQty = 0;
    for (const e of existingEntries) {
      if (e.type === 'PURCHASE') currentQty += parseFloat(String(e.quantity));
      else if (e.type === 'SALE') currentQty -= parseFloat(String(e.quantity));
    }
    if (quantity > currentQty) {
      return NextResponse.json({ error: "Quantidade vendida excede posição atual" }, { status: 400 });
    }
  }
  ```
- [ ] `PATCH /entries/[id]` — editar, recalcular amount, ownership check
- [ ] `DELETE /entries/[id]` — ownership check → deletar
- [ ] `SPLIT`: `price` enviado pelo client deve ser ignorado; salvar `price = 0` no banco

**Critério:** `npm run build` passa; SALE acima da posição retorna 400

---

### Issue 4: API Portfolio — `/api/investments/portfolio`
**Arquivos:** `src/app/api/investments/portfolio/route.ts` (CREATE)

**Tasks:**
- [ ] `GET /portfolio` — buscar todos assets + entries do userId
- [ ] Calcular por ativo: custo médio ponderado, quantidade atual, P&L, P&L%
- [ ] Calcular `totalDividends` por ativo: soma de `amount` das entries com `type === 'DIVIDEND'`
- [ ] Calcular totais: totalInvested, totalCurrentValue, totalPnl, totalPnlPct
- [ ] Calcular allocationByType: % de cada AssetType sobre totalCurrentValue
- [ ] Retornar `{ assets: AssetPosition[], totals, allocationByType }`

**Critério:** `npm run build` passa; resposta JSON correta no browser

---

### Issue 5: Página + Shell + Sidebar — infra do módulo
**Arquivos:**
- `src/app/(dashboard)/investments/page.tsx` (CREATE)
- `src/components/investments/InvestmentsShell.tsx` (CREATE)
- `src/components/layout/Sidebar.tsx` (MODIFY)

**Tasks:**
- [ ] `page.tsx`: force-dynamic, auth, fetch currency + locale, renderiza `<InvestmentsShell>`
- [ ] `InvestmentsShell.tsx`: tabs "Carteira" | "Lançamentos", fetch portfolio ao montar
- [ ] `Sidebar.tsx`: adicionar item `{ href: "/investments", label: t("investments"), icon: TrendingUp }`
- [ ] Adicionar chave `"investments"` nas mensagens do Sidebar (todos os idiomas)

**Critério:** `/investments` carrega sem 404, sidebar mostra item "Investimentos"

---

### Issue 6: UI Carteira — PortfolioSummaryCards + PortfolioDonut + AssetList + AssetDialog
**Arquivos:**
- `src/components/investments/portfolio/PortfolioSummaryCards.tsx` (CREATE)
- `src/components/investments/portfolio/PortfolioDonut.tsx` (CREATE)
- `src/components/investments/portfolio/AssetList.tsx` (CREATE)
- `src/components/investments/portfolio/AssetDialog.tsx` (CREATE)

**Tasks:**
- [ ] `PortfolioSummaryCards`: 3 KPI cards (total investido, valor atual, P&L) com count-up 1000ms
- [ ] `PortfolioDonut`: Chart.js Doughnut, mounted guard, allocationByType do portfolio
- [ ] `AssetList`: shadcn Table com colunas do spec, P&L colorido, botão criar/editar
- [ ] `AssetDialog`: Dialog shadcn, 5 campos, validação client-side, POST/PATCH
- [ ] Estado local no AssetList (create/update/delete pattern)

**Critério:** Criar ativo, ver na tabela, editar, ver no donut; `npm run build` passa

---

### Issue 7: UI Lançamentos — EntryList + EntryDialog
**Arquivos:**
- `src/components/investments/entries/EntryList.tsx` (CREATE)
- `src/components/investments/entries/EntryDialog.tsx` (CREATE)

**Tasks:**
- [ ] `EntryList`: tabela shadcn, badges coloridos por tipo, botão "Novo Lançamento"
- [ ] `EntryDialog`: Dialog shadcn, 6 campos, preview "Total = Qtd × Preço" em tempo real
- [ ] Ao criar entrada: invalidar portfolio (refetch) para P&L atualizar
- [ ] Estado local (create/update/delete pattern)

**Critério:** Registrar compra → P&L atualiza na aba Carteira; `npm run build` passa

---

### Issue 2: i18n — chaves de Investimentos em todos os idiomas
> ⚠️ **Implementar ANTES das Issues de UI** — `useTranslations` quebra sem chaves

**Arquivos:** `messages/pt-BR.json`, `messages/en.json`, `messages/es.json`, `messages/fr.json`, `messages/ar.json`, `messages/hi.json`, `messages/zh.json`

**Tasks:**
- [ ] Adicionar seção `"Investments"` completa em todos os idiomas (ver spec acima)
- [ ] Adicionar `"investments"` em `"Sidebar"` em todos os idiomas
- [ ] Validar que não há chaves faltando com `npm run build`

**Critério:** `npm run build` sem erros de i18n

---

## Complexidade

**Alta** — 15+ arquivos novos, novos models Prisma, lógica de custo médio ponderado

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Custo médio incorreto para SALE/SPLIT | Implementar FIFO ou custo médio ponderado — spec usa médio ponderado, mais simples |
| Decimal precision no browser | Sempre `parseFloat(String(...))` na API, nunca enviar Prisma Decimal ao client |
| Chart.js SSR error | mounted guard obrigatório em PortfolioDonut |
| Ticker null em @@unique | `@@unique([userId, ticker])` só funciona para valores não-nulos no Postgres — OK pois ticker é nullable; ativos sem ticker não verificam duplicata |

---

## Próxima Etapa

Após implementar e fechar v0.7:
- `/fechar-milestone` — release v0.7.0
- `/planejar-feature` para v0.8 — Cotações + Benchmarks Realtime (BCB + AwesomeAPI + brapi.dev)
