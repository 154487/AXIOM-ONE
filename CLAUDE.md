# AXIOM ONE — Guia do Projeto

## O que é

Aplicação de gestão financeira pessoal focada em clareza e construção de patrimônio.
Dark theme com acento laranja. Interface premium estilo fintech.

---

## Stack

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Framework | Next.js (App Router) | 15 |
| Linguagem | TypeScript | strict |
| Estilo | Tailwind CSS v4 + shadcn/ui | — |
| Banco | PostgreSQL + Prisma ORM | Prisma 7 |
| Auth | NextAuth.js v5 (Auth.js) | beta |
| Gráficos | **Chart.js + react-chartjs-2** | — |
| Ícones | lucide-react | 0.577 |
| Fonte | system-ui / SF Pro (nativa do OS) | — |
| Package mgr | npm | — |
| APIs externas | brapi.dev (B3), BCB SGS (SELIC/CDI/IPCA), AwesomeAPI (câmbio) | — |

---

## Design Tokens

```
Background principal:  #0D1B2A   → bg-axiom-bg
Background cards:      #152030   → bg-axiom-card
Background hover:      #1A2840   → bg-axiom-hover
Border sutil:          #1E2D42   → border-axiom-border
Primária (laranja):    #FF6B35   → text/bg-axiom-primary
Income (verde):        #10B981   → text/bg-axiom-income
Expense (vermelho):    #EF4444   → text/bg-axiom-expense
Texto muted:           #AAB2BD   → text-axiom-muted
Texto primário:        #FFFFFF
```

**NUNCA** usar cores hardcoded fora dos tokens acima. Sempre usar as classes `axiom-*`.

---

## QA — Comandos

```bash
npm run build    # build completo (principal verificador)
npm run dev      # servidor de desenvolvimento
```

Não há `npm run lint` nem `npm run typecheck` — o build do Next.js faz os dois.
**Sempre rodar `npm run build` antes de commitar.**

> Atenção: se o `.next/` ficar corrompido após muitas mudanças, deletar e rebuildar:
> `rm -rf .next && npm run build`

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/                    # Rotas públicas (login, register)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/               # Rotas protegidas pelo middleware
│   │   ├── dashboard/page.tsx     # force-dynamic — fetch KPIs, gráficos, moeda padrão
│   │   ├── transactions/page.tsx  # Server Component — auth + fetch transactions+categories → TransactionList
│   │   ├── reports/page.tsx       # force-dynamic — auth + fetch moeda/locale → ReportsShell
│   │   ├── journal/page.tsx       # force-dynamic — auth guard → JournalShell
│   │   ├── import/page.tsx        # Server Component — fetch categories → ImportWizard
│   │   ├── settings/page.tsx      # Server Component — fetch user+categories+currencies → SettingsPage
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/    # Handler NextAuth
│   │   ├── auth/register/         # POST criar usuário
│   │   ├── categories/            # GET list, POST create
│   │   ├── categories/[id]/       # PATCH update, DELETE
│   │   ├── transactions/          # GET list (max 200 desc + category), POST create
│   │   ├── transactions/[id]/     # PATCH update, DELETE (ownership check)
│   │   ├── settings/profile/      # PATCH update name/email (envia email ao old email)
│   │   ├── settings/password/     # PATCH change password (envia email de alerta)
│   │   ├── settings/theme/        # PATCH set AXIOM_THEME cookie (dark|light)
│   │   ├── settings/locale/       # PATCH set NEXT_LOCALE cookie
│   │   ├── settings/notifications/ # PATCH save 3 boolean notification prefs
│   │   ├── currencies/            # GET list, POST create (auto-default se primeira)
│   │   ├── currencies/[id]/       # DELETE (promove próxima), PATCH (set default)
│   │   ├── notifications/         # GET últimas 30
│   │   ├── notifications/[id]/    # PATCH mark as read
│   │   ├── notifications/read-all/ # PATCH mark all read
│   │   ├── import/parse/          # POST multipart/form-data → ParsedRow[] (OFX/CSV/XLSX)
│   │   ├── import/confirm/        # POST bulk createMany (filtra categoryId nulo)
│   │   ├── reports/overview/      # GET ?start=&end= → healthScore, pillars[], insights[], velocity
│   │   ├── reports/cashflow/      # GET ?start=&end= → monthlyBars[], sankeyNodes[], sankeyLinks[]
│   │   ├── reports/networth/      # GET → months[], currentNetWorth, avgSavingsRate (all-time)
│   │   ├── reports/recurring/     # GET → recurring[] heurística all-time (≥3 ocorrências)
│   │   ├── reports/trends/        # GET ?cats=&start=&end= → categories[], series[] com mean/stdDev
│   │   ├── reports/merchants/     # GET ?start=&end= → top 10 merchants por valor
│   │   ├── reports/seasonal/      # GET → hasEnoughData, months[] variação sazonal (all-time)
│   │   ├── reports/fire/          # GET ?patrimony=&monthlyIncome=&monthlyExpenses=&rate= (sem Prisma)
│   │   ├── journal/               # GET ?month=&type=&tag= (max 100), POST (cria + snapshot)
│   │   ├── journal/[id]/          # PATCH (ownership check, healthScore imutável), DELETE → 204
│   │   ├── patrimonio/goal/       # GET → { goal }, PATCH → salva patrimonyGoal
│   │   ├── patrimonio/fire-settings/ # GET/PATCH → 7 campos FIRE do User (expense, swr, targetIncome, years, contrib, invested, fiNumberManual)
│   │   ├── reports/fire-essentials/  # GET → FireEssentialsResponse: categorias essenciais + custo de passivos linkados
│   │   ├── patrimonio/items/      # GET → WealthItemsResponse, POST → cria WealthItem
│   │   ├── patrimonio/items/[id]/ # PATCH → atualiza (itemType imutável), DELETE → 204
│   │   ├── patrimonio/items/[id]/installments/ # GET/PATCH parcelas do WealthItem
│   │   ├── patrimonio/goals/      # GET list, POST create FinancialGoal
│   │   ├── patrimonio/goals/[id]/ # PATCH update, DELETE
│   │   └── patrimonio/performance/ # GET ?period=1y|2y|5y|all → retorno % vs CDI/IPCA/IBOV
│   ├── layout.tsx                 # Root layout (lê AXIOM_THEME cookie → class "dark")
│   ├── globals.css                # Tailwind v4 + tokens Axiom + dark/light via CSS vars
│   └── page.tsx                   # Redirect: autenticado → /dashboard, anon → /login
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            # Nav lateral (collapse, active pill laranja)
│   │   └── Topbar.tsx             # Título da página, bell (notificações), avatar
│   ├── dashboard/
│   │   ├── KPICard.tsx            # "use client" — count-up animado 1000ms easeOutQuart
│   │   ├── MonthlyChart.tsx       # "use client" — Chart.js Bar, mounted guard, animação 1000ms
│   │   ├── SpendingDonut.tsx      # "use client" — Chart.js Doughnut, mounted guard, animação 1000ms
│   │   └── RecentTransactions.tsx # Lista últimas 6 transações com moeda dinâmica
│   ├── settings/
│   │   ├── SettingsPage.tsx       # "use client" — container com dark/lang/currency/notifs
│   │   ├── ProfileForm.tsx        # Form nome/email + form senha (router.refresh após salvar)
│   │   ├── CategoriesManager.tsx  # Grid de categorias + estado local
│   │   ├── CategoryDialog.tsx     # shadcn Dialog criar/editar categoria
│   │   └── CurrencyManager.tsx    # Gerenciar moedas do usuário (add/remove/default)
│   ├── transactions/
│   │   ├── TransactionList.tsx    # "use client" — container: estado filtros + dialog + transactions local
│   │   ├── TransactionFilters.tsx # Selects: tipo (ALL/INCOME/EXPENSE), categoria, mês (12 meses fixos)
│   │   ├── TransactionTable.tsx   # shadcn Table: Data|Descrição|Categoria|Tipo|Valor|Ações
│   │   └── TransactionDialog.tsx  # shadcn Dialog criar/editar: 5 campos, validação client-side
│   ├── import/
│   │   ├── ImportWizard.tsx       # "use client" — wizard 3 etapas: upload → preview → sucesso
│   │   ├── ImportDropzone.tsx     # Drag-and-drop, posts para /api/import/parse
│   │   ├── ImportPreviewTable.tsx # Tabela editável com skip, descrição, tipo, categoria
│   │   └── ImportInlineCategorySelect.tsx # Select com "+ Nova categoria..." inline
│   ├── reports/
│   │   ├── types.ts               # Interfaces: OverviewData, CashflowData, NetworthData
│   │   ├── ReportsShell.tsx       # "use client" — 4 abas + PeriodFilter (callback), fetch por aba
│   │   ├── visao-geral/
│   │   │   ├── HealthScoreCard.tsx  # Score animado count-up + 4 barras de pilares
│   │   │   ├── InsightsCard.tsx     # 3 insights com ícone lucide + badge colorido
│   │   │   └── SpendingVelocityCard.tsx # Barra + projeção de fim de mês
│   │   ├── fluxo-caixa/
│   │   │   ├── CashFlowChart.tsx    # Chart.js mixed Bar+Line (income/expense/net)
│   │   │   ├── SankeyDiagram.tsx    # chartjs-chart-sankey (lazy import SSR-safe)
│   │   │   └── RecurringList.tsx    # Assinaturas/recorrências agrupadas por frequência
│   │   ├── tendencias/
│   │   │   ├── CategoryTrendChart.tsx # Line multi-cat com banda stdDev, fetch próprio
│   │   │   ├── MerchantSpotlight.tsx  # Top 10 merchants com barra proporcional
│   │   │   └── SeasonalAnalysis.tsx   # Grid 12 meses com heatmap de variação
│   │   └── patrimonio/
│   │       ├── NetWorthChart.tsx    # Line com área preenchida (cor por saldo positivo/negativo)
│   │       └── SavingsRateChart.tsx # Bar por mês + linha meta 20% (dataset line borderDash)
│   ├── patrimonio/
│   │   ├── PatrimonioShell.tsx    # "use client" — abas: Evolução|Análise|Independência|Bens|Meta
│   │   ├── AssetBreakdown.tsx     # Doughnut + tabela por classe de ativo
│   │   ├── PatrimonioGoal.tsx     # Meta patrimônio: barra progresso + projeção
│   │   ├── PortfolioPerformanceChart.tsx # Retorno acumulado % vs CDI/IPCA/IBOV, period selector
│   │   ├── FireDashboard.tsx      # Container aba Independência — 6 fetches paralelos
│   │   ├── FireStatusCard.tsx     # Patrimônio, FI Number, % caminho, savings rate
│   │   ├── FireSettingsCard.tsx   # Gasto alvo, SWR, slider aporte extra (debounce 400ms)
│   │   ├── FireProjectionChart.tsx # 3 cenários simultâneos + FI Number tracejado
│   │   ├── CoastFireCard.tsx      # Coast FIRE number, barra, mensagem conquista
│   │   ├── GoalsList.tsx          # Lista + CRUD de FinancialGoal
│   │   ├── GoalCard.tsx           # Card meta com projeção CDI e barra de progresso
│   │   ├── GoalDialog.tsx         # Dialog criar/editar meta
│   │   ├── WealthItems.tsx        # Lista bens/passivos agrupada com CRUD inline (exibe custo mensal gerado por passivos linkados)
│   │   ├── WealthItemDialog.tsx   # Dialog criar/editar bem ou passivo (select de linkedCategory para LIABILITY)
│   │   ├── FirePlanCard.tsx       # Custo de vida real: barras por categoria essencial + origem de gastos por passivos + insight quitação
│   │   └── FireGoalsCard.tsx      # Metas pessoais de IF com progresso (patrimônio, aporte, renda)
│   ├── journal/
│   │   ├── JournalShell.tsx       # "use client" — estado global, fetch entries, upsert/delete local
│   │   ├── JournalList.tsx        # Filtros mês/tipo + grid de cards
│   │   ├── JournalEntryCard.tsx   # Card com preview, health badge colorido, botões hover
│   │   └── JournalEditor.tsx      # Dialog criar/editar: Markdown editor + preview (react-markdown)
│   ├── shared/
│   │   └── PeriodFilter.tsx       # Seletor período compartilhado: URL mode (dashboard) ou callback mode (reports)
│   └── ui/                        # shadcn/ui instalados: button, card, input, label,
│                                  # dropdown-menu, badge, separator, avatar, switch,
│                                  # table, tabs, dialog, select
└── lib/
    ├── auth.ts          # NextAuth config COMPLETA (server-only, usa Prisma)
    ├── auth.config.ts   # Config LEVE sem Prisma — usada no middleware (Edge Runtime)
    ├── prisma.ts        # Singleton PrismaClient (server-only, adapter PrismaPg)
    ├── utils.ts         # cn(), formatCurrency(value, locale, currency), formatDate()
    ├── email.ts         # Resend lazy init + templates de email (senha, perfil)
    ├── crypto.ts        # fetchCryptoPrice(), fetchCryptoPrices(), searchCryptoBySymbol() — CoinGecko, cache 5min/30min
    └── import/
        ├── types.ts           # ParsedRow, ReviewedRow interfaces
        ├── parseFile.ts       # Dispatcher por extensão
        ├── parseOFX.ts        # Parser SGML OFX (bancos BR)
        ├── parseCSV.ts        # papaparse + detecção de colunas flexível
        ├── parseXLSX.ts       # xlsx — detecta header row dinamicamente (Nubank/Inter)
        ├── cleanDescription.ts # Normaliza nomes de transações bancárias
        └── matchCategory.ts   # Auto-match de categoria por keywords
```

---

## Mapa de Domínio

### Models (Prisma)

```
User
  id, name?, email (unique), password (bcrypt), createdAt, updatedAt
  notifTransactions (bool, default true), notifBudgetAlerts (bool, default true),
  notifMonthlyReport (bool, default false), patrimonyGoal (Decimal?, meta de patrimônio),
  fireMonthlyExpense (Decimal?, gasto mensal alvo FIRE), fireSWR (Decimal?, legado),
  fireTargetMonthlyIncome (Decimal?, renda mensal desejada na aposentadoria),
  fireRetirementYears (Int?, horizonte em anos, padrão 30),
  fireTargetMonthlyContrib (Decimal?, meta de aporte mensal),
  fireTargetInvestedAmount (Decimal?, meta de patrimônio investido),
  fireNumberManual (Decimal?, FI Number definido diretamente pelo usuário)
  → relations: transactions[], categories[], currencies[], notifications[]

Category
  id, name, color (#hex), icon?, isEssential (bool, default false), userId, createdAt
  → relations: user, transactions[], wealthItems[]

Transaction
  id, description, amount (Decimal 10,2), type (INCOME|EXPENSE),
  date, userId, categoryId (NOT NULL), createdAt, updatedAt
  → relations: user, category

UserCurrency
  id, code, symbol, name, isDefault (bool), userId, createdAt
  → unique [userId, code]
  → relations: user

Notification
  id, userId, type (TRANSACTION|BUDGET_ALERT|MONTHLY_REPORT|SYSTEM),
  title, message, read (bool, default false), createdAt
  → relations: user

JournalEntry
  id, userId, title, content (Markdown), entryType (NOTE|APORTE|RESGATE|REFLEXAO|META),
  tags (String[]), date, healthScoreAtTime (Int?, snapshot imutável), sustainableSurplusAtTime (Decimal?),
  createdAt, updatedAt
  → relations: user

WealthItem
  id, userId, name, value (Decimal 14,2), itemType (ASSET|LIABILITY),
  category (String), notes (String?), linkedCategoryId (String?, FK → Category onDelete SetNull), createdAt, updatedAt
  → relations: user, linkedCategory?
  → relations: user
```

### Lib — Cache e APIs externas

- `src/lib/cache.ts` — `MemCache` singleton, TTL por entrada, função `cached(key, ttlMs, fetcher)`
- `src/lib/quotes.ts` — `fetchQuotes(tickers[])` → `Record<ticker, price>`, cache 1h, brapi.dev (1 req/ticker)
- `src/lib/benchmarks.ts` — `fetchBenchmarks()` → `BenchmarkData`, cache 1h, BCB SGS + AwesomeAPI
- `src/lib/crypto.ts` — `fetchCryptoPrices(ids[])` → `Record<id, price>` em BRL, cache 5min; `searchCryptoBySymbol(q)` → `[{id,name,symbol}]`, cache 30min; CoinGecko API
- `src/lib/healthSnapshot.ts` — `getHealthSnapshot(userId)` → `HealthSnapshot` (max 90pts, pilar 4 omitido intencionalmente)

### Auth

- **`auth()`** — usar em Server Components e API Routes (importar de `@/lib/auth`)
- **`middleware.ts`** — usa `authConfig` leve (sem Prisma, Edge Runtime compatível)
- **Sessão JWT** — após update de `name`/`email`, chamar `router.refresh()` no client para atualizar Server Components sem logout

### Padrão de API Routes

```ts
// Sempre seguir este padrão:
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// validações → 400
// ownership check → 403
// lógica de negócio
// retorno
```

### Padrão de Serialização Prisma → Client

Campos que precisam de conversão antes de passar ao Client Component ou retornar via API:

```ts
// Decimal → number
amount: parseFloat(String(tx.amount))

// Date → string ISO
date: tx.date.toISOString()
```

Sempre serializar em **dois lugares**: na API Route (resposta JSON) e no Server Component (props para Client Component).

### Padrão de Client Component com Estado Local

```ts
// Inicializar com props do servidor, atualizar localmente após mutações
const [items, setItems] = useState(initialItems);

// Após create → adicionar no topo
setItems((prev) => [newItem, ...prev]);

// Após update → substituir in-place
setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

// Após delete → remover
setItems((prev) => prev.filter((i) => i.id !== id));
```

### Padrão de Server Components (dashboard)

```ts
// page.tsx
export const dynamic = "force-dynamic"; // garantir dados frescos
const session = await auth();
if (!session?.user?.id) redirect("/login");
const data = await prisma.xxx.findMany({ where: { userId: session.user.id } });
// renderizar Client Components passando data como props
```

### Padrão de Gráficos (Chart.js)

```tsx
// SEMPRE usar mounted guard — Chart.js precisa do Canvas API (browser only)
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

// Animação sincronizada com KPI count-up:
const options = {
  animation: { duration: 1000, easing: "easeOutQuart" },
  // ...
};

// Render:
{mounted ? <Bar data={...} options={...} /> : <div className="animate-pulse ..." />}
```

### Padrão de formatCurrency

```ts
// Assinatura completa — sempre passar locale e currency
formatCurrency(value, locale, currency)

// Exemplos:
formatCurrency(1234.56, "pt-BR", "BRL") // → R$ 1.234,56
formatCurrency(1234.56, "en", "USD")     // → $1,234.56
```

A moeda padrão do usuário vem de `UserCurrency` com `isDefault: true`. O dashboard já busca e repassa a todos os componentes via prop `currency`.

---

## Convenções

- **Código:** inglês
- **UI / Commits / Docs:** português (pt-BR)
- **Commits:** `<tipo>(vX.X): descrição (#N)` — 1 issue = 1 commit
- **Branches:** `feature/vX.X-<issue-title>` (kebab-case)
- **Tipos válidos:** feat, fix, refactor, docs, test, chore

---

## Milestones

| Versão | Nome | Status |
|--------|------|--------|
| v0.1 | Foundation | ✅ concluída |
| v0.2 | Settings | ✅ concluída — release v0.2.0 |
| v0.3 | Transactions | ✅ concluída — release v0.3.0 |
| v0.4 | i18n | ✅ concluída — release v0.4.0 |
| v0.5 | Import | ✅ concluída — release v0.5.0 |
| v0.6 | Reports | ✅ concluída — branch feature/v0.6-reports |
| v0.7 | Investimentos | ✅ concluída — release v0.7.0 |
| v0.8 | Cotações + Benchmarks Realtime | ✅ concluída — release v0.8.0 |
| v0.9 | Financial Journal | ✅ concluída — release v0.9.0 |
| v0.10 | Journal ↔ Investments Link + Patrimônio dedicado | ✅ concluída |
| v1.0 | Intelligence Layer | ✅ concluída — release v1.0.0 |
| v1.1 | Patrimônio Evoluído | ✅ concluída — release v1.1.0 |
| v1.2 | Bens e Passivos | ✅ concluída — release v1.2.0 |
| v1.3 | Patrimônio Redesign | ✅ concluída |
| v1.4 | Metas Financeiras Múltiplas | ✅ concluída |
| v1.5 | Bens & Passivos Aprimorado | ✅ concluída |
| v1.6 | FIRE Dashboard: Independência Financeira | ✅ concluída — release v1.6.0 |
| v1.7 | Independência Financeira Evoluída | ✅ concluída |
| v1.8 | FIRE: Plano Real de Independência | ✅ concluída — release v1.8.1 |
| v1.9 | Investimentos: Entrada Simplificada | ✅ concluída — release v1.9.0 |
| v2.0 | Painel de Proventos | ✅ concluída — release v2.0.0 |
| v2.1 | Rendimentos de Renda Fixa, Cripto e EntryDialog Aprimorado | ✅ concluída — release v2.1.0 |

---

## Regras de Implementação

1. **Nunca importar Prisma ou bcryptjs no middleware** — usar apenas `auth.config.ts`
2. **Nunca usar cores fora dos tokens `axiom-*`** — nem inline styles com hex hardcoded
3. **Sempre `server-only`** em `auth.ts` e `prisma.ts`
4. **shadcn components:** instalar via `npx shadcn@latest add <component>` antes de usar
5. **Chart.js:** sempre `"use client"` + `mounted` guard (Canvas API não existe no SSR)
6. **Deletar categoria:** verificar `_count.transactions` antes — retornar 409 se > 0
7. **Cache corrompido:** se internal server error aparecer, `rm -rf .next && npm run dev`
8. **Import de transações:** `categoryId` é NOT NULL — o confirm endpoint filtra linhas sem categoria antes do `createMany`
9. **Dashboard:** `export const dynamic = "force-dynamic"` — nunca cachear dados financeiros
10. **XLSX multi-seção (Nubank/Inter):** parseXLSX detecta a linha de cabeçalho dinamicamente, suporta DD-MM-YYYY e valores BR (vírgula decimal)
11. **BRAPI_TOKEN:** obrigatório em `.env.local` para cotações em tempo real; sem token o portfolio usa `currentPrice` do banco (fallback silencioso)

---

## Seed de Desenvolvimento

```
Email: test@axiom.com
Senha: axiom123
```

Rodar seed: `npx prisma db seed`
