# SPEC - v0.1 Foundation

> Gerado por `/planejar-feature` em 2026-03-17

## Resumo

Setup completo do projeto AXIOM-ONE: scaffolding Next.js 14 com App Router,
design system fiel ao Figma (dark theme + laranja), banco de dados PostgreSQL
com Prisma, autenticação via NextAuth.js, layout shell (sidebar + topbar) e
Dashboard com KPI cards e gráficos (dados mock na v0.1).

---

## Stack Definida

| Camada       | Tecnologia                       |
|--------------|----------------------------------|
| Framework    | Next.js 14 (App Router)          |
| Linguagem    | TypeScript                       |
| Estilo       | Tailwind CSS + shadcn/ui         |
| Banco        | PostgreSQL + Prisma ORM          |
| Auth         | NextAuth.js v5 (Auth.js)         |
| Gráficos     | Recharts                         |
| Ícones       | SVGs customizados (MODELO/ICONOGRAFIA) |
| Package mgr  | npm                              |

---

## Design Tokens (extraídos do Figma)

```
Background principal:  #0D1B2A
Background cards:      #152030
Background hover:      #1A2840
Primária (laranja):    #FF6B35
Income (verde):        #10B981
Expense (vermelho):    #EF4444
Texto primário:        #FFFFFF
Texto secundário:      #AAB2BD
Border sutil:          #1E2D42
```

---

## Estrutura de Pastas

```
axiom-one/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── import/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (Button, Card, Input, etc.)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Topbar.tsx
│   │   └── dashboard/
│   │       ├── KPICard.tsx
│   │       ├── MonthlyChart.tsx
│   │       ├── SpendingDonut.tsx
│   │       └── RecentTransactions.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── public/
│   └── icons/
├── .env.local
├── tailwind.config.ts
└── next.config.ts
```

---

## Schema Prisma

```prisma
model User {
  id           String        @id @default(cuid())
  name         String?
  email        String        @unique
  password     String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  transactions Transaction[]
  categories   Category[]
}

model Category {
  id           String        @id @default(cuid())
  name         String
  color        String
  icon         String?
  userId       String
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  createdAt    DateTime      @default(now())
}

model Transaction {
  id          String          @id @default(cuid())
  description String
  amount      Decimal         @db.Decimal(10, 2)
  type        TransactionType
  date        DateTime
  categoryId  String
  category    Category        @relation(fields: [categoryId], references: [id])
  userId      String
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

---

## Arquitetura do Fluxo

```
Browser
   ↓
Next.js App Router
   ↓
(auth) group layout  ←  rotas publicas (login, register)
(dashboard) group layout  ←  rotas protegidas (middleware NextAuth)
   ↓
Server Components (fetch de dados via Prisma direto)
   ↓
Client Components (charts, interatividade)
   ↓
PostgreSQL via Prisma
```

---

## Mudanças por Arquivo

### Issue 1 — Setup do Projeto

#### CREATE: `src/app/page.tsx`
- [ ] Redirect: se autenticado → `/dashboard`, se não → `/login`
- [ ] Usar `redirect()` do Next.js após checar session

#### CREATE: `package.json` (via `create-next-app`)
- [ ] Inicializar Next.js 14 com TypeScript, Tailwind, App Router, src/
- [ ] Instalar dependências: `prisma`, `@prisma/client`, `next-auth@beta`, `recharts`, `bcryptjs`, `@types/bcryptjs`
- [ ] Instalar shadcn/ui: `npx shadcn@latest init`
- [ ] Adicionar componentes shadcn: `button`, `card`, `input`, `label`, `dropdown-menu`, `badge`, `separator`, `avatar`, `switch`, `table`

#### CREATE: `tailwind.config.ts`
- [ ] Configurar tema com tokens de cor do Figma (ver Design Tokens acima)
- [ ] Configurar font Inter
- [ ] Configurar dark mode: `class`

```ts
// Cores a adicionar em extend.colors:
axiom: {
  bg: '#0D1B2A',
  card: '#152030',
  hover: '#1A2840',
  border: '#1E2D42',
  primary: '#FF6B35',
  income: '#10B981',
  expense: '#EF4444',
  muted: '#AAB2BD',
}
```

#### CREATE: `src/app/globals.css`
- [ ] Definir variáveis CSS alinhadas com shadcn (overrides para dark theme)
- [ ] Aplicar `background-color: #0D1B2A` no body por padrão

#### CREATE: `.env.local`
- [ ] `DATABASE_URL` (PostgreSQL)
- [ ] `AUTH_SECRET` (NextAuth v5 — era NEXTAUTH_SECRET na v4)
- [ ] `AUTH_URL=http://localhost:3000` (NextAuth v5 — era NEXTAUTH_URL na v4)

---

### Issue 2 — Banco de Dados (Prisma)

#### CREATE: `prisma/schema.prisma`
- [ ] Implementar schema completo (User, Category, Transaction, enum TransactionType)
- [ ] Configurar provider PostgreSQL

#### CREATE: `src/lib/prisma.ts`
- [ ] Singleton do PrismaClient para dev (evitar múltiplas conexões com hot reload)

```ts
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### CREATE: `prisma/seed.ts`
- [ ] Seed com 1 usuário de teste
- [ ] Seed com categorias padrão (Housing, Food, Transport, Shopping, Health, Utilities)
- [ ] Seed com 10 transações mock
- [ ] Instalar `tsx` como devDependency
- [ ] Adicionar ao `package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }`

---

### Issue 3 — Autenticação

#### CREATE: `src/lib/auth.ts`
- [ ] Configurar NextAuth.js v5 com `Credentials` provider
- [ ] Hash de senha com `bcryptjs`
- [ ] Retornar `id`, `name`, `email` no token JWT
- [ ] Configurar callbacks `jwt` e `session`

#### CREATE: `src/app/api/auth/[...nextauth]/route.ts`
- [ ] Exportar handlers `GET` e `POST` do NextAuth

#### CREATE: `src/middleware.ts`
- [ ] Proteger rotas via matcher (URLs reais, não filesystem paths com grupos):
```ts
export const config = {
  matcher: ['/dashboard/:path*', '/transactions/:path*', '/reports/:path*', '/import/:path*', '/settings/:path*']
}
```
- [ ] Redirecionar não autenticados para `/login`

#### CREATE: `src/app/(auth)/layout.tsx`
- [ ] Layout centralizado, fundo `#0D1B2A`
- [ ] Logo AXIOM ONE (SVG inline ou imagem)

#### CREATE: `src/app/(auth)/login/page.tsx`
- [ ] Form com email + senha
- [ ] Botão "Entrar" (laranja, #FF6B35)
- [ ] Link para `/register`
- [ ] Validação client-side básica
- [ ] Chamar `signIn('credentials', ...)` do NextAuth
- [ ] Exibir erro de credenciais inválidas

#### CREATE: `src/app/(auth)/register/page.tsx`
- [ ] Form com nome + email + senha + confirmação de senha
- [ ] POST para `/api/auth/register` (criar usuário + hash senha)
- [ ] Redirecionar para `/login` após cadastro

#### CREATE: `src/app/api/auth/register/route.ts`
- [ ] Receber `name`, `email`, `password`
- [ ] Validar se email já existe
- [ ] Hash senha com `bcryptjs`
- [ ] Criar User no Prisma
- [ ] Retornar `201` ou erro

---

### Issue 4 — Layout Shell (Sidebar + Topbar)

#### CREATE: `src/app/(dashboard)/layout.tsx`
- [ ] Wrapper com sidebar fixa à esquerda + conteúdo principal
- [ ] Passar session do servidor para componentes
- [ ] Fundo geral `#0D1B2A`

#### CREATE: `src/components/layout/Sidebar.tsx`
- [ ] Logo AXIOM ONE no topo (avatar "A" laranja + texto)
- [ ] Links de navegação: Dashboard, Transactions, Reports, Import, Settings
- [ ] Ícone SVG para cada item (usar pasta ICONOGRAFIA)
- [ ] Item ativo com pill laranja `#FF6B35` (fundo + texto branco)
- [ ] Item inativo: texto `#AAB2BD`, hover `#1A2840`
- [ ] Botão collapse (seta `←`) para minimizar sidebar
- [ ] Sidebar com largura `w-48` expandida, `w-16` recolhida

#### CREATE: `src/components/layout/Topbar.tsx`
- [ ] Título da página + subtítulo "Welcome back to AXIOM ONE"
- [ ] Ícone dark mode toggle (lua) — **v0.1: decorativo apenas**, sem implementação de tema light
- [ ] Ícone notificações (sino) — **v0.1: decorativo apenas**
- [ ] Avatar do usuário (círculo laranja com inicial do nome)
- [ ] Fundo transparente (herda do layout)

#### CREATE: `src/lib/utils.ts`
- [ ] Função `cn()` para merge de classNames (shadcn padrão)
- [ ] Função `formatCurrency(value: number): string` → R$ 1.234,56
- [ ] Função `formatDate(date: Date): string` → 2025-11-08

---

### Issue 5 — Dashboard

#### CREATE: `src/app/(dashboard)/dashboard/page.tsx`
- [ ] Server Component: buscar dados do usuário logado via Prisma (usar `auth()` do NextAuth v5)
- [ ] Cálculos do mês corrente:
  - `income` = soma de INCOME do mês atual
  - `expenses` = soma de EXPENSE do mês atual
  - `netDifference` = income - expenses
  - `totalBalance` = soma de todo INCOME - soma de todo EXPENSE (histórico completo)
- [ ] Variação % em relação ao mês anterior para cada KPI
- [ ] Renderizar KPICard × 4, MonthlyChart, SpendingDonut, RecentTransactions

#### CREATE: `src/components/dashboard/KPICard.tsx`
- [ ] Props: `title`, `value`, `change` (% com sinal), `icon`, `type` (income | expense | neutral)
- [ ] Fundo `#152030`, borda sutil `#1E2D42`
- [ ] Badge de variação no canto superior direito (verde positivo, vermelho negativo)
- [ ] Ícone com fundo circular levemente mais claro

#### CREATE: `src/components/dashboard/MonthlyChart.tsx`
- [ ] Client Component (`"use client"`)
- [ ] Recharts `BarChart` com barras de income (verde) e expenses (laranja/vermelho)
- [ ] 6 meses no eixo X
- [ ] Grid dashed, fundo transparente
- [ ] Legenda abaixo (income / expenses)

#### CREATE: `src/components/dashboard/SpendingDonut.tsx`
- [ ] Client Component
- [ ] Recharts `PieChart` (donut) por categoria
- [ ] Legenda com nome e valor abaixo do gráfico
- [ ] Cores das categorias definidas no Prisma seed

#### CREATE: `src/components/dashboard/RecentTransactions.tsx`
- [ ] Lista das últimas 6 transações
- [ ] Cada item: ícone da categoria, descrição, categoria, valor (verde income / laranja expense), data
- [ ] Link "View All" laranja → `/transactions`

---

## Ordem de Implementação (por issue)

```
1. Setup do Projeto       → scaffolding + dependências + Tailwind tokens
2. Banco de Dados         → Prisma schema + seed
3. Autenticação           → NextAuth + login + register + middleware
4. Layout Shell           → Sidebar + Topbar + layout protegido
5. Dashboard              → KPIs + charts + recent transactions
```

---

## Issues Sugeridas para GitHub

### Issue 1: Setup — scaffolding, Tailwind e dependências
**Arquivos:** `package.json`, `tailwind.config.ts`, `src/app/globals.css`, `.env.local`

**Tasks:**
- [ ] `npx create-next-app@latest axiom-one --typescript --tailwind --app --src-dir`
- [ ] Instalar dependências (prisma, next-auth, recharts, bcryptjs)
- [ ] `npx shadcn@latest init` + adicionar componentes necessários
- [ ] Configurar cores Figma em `tailwind.config.ts` sob `axiom.*`
- [ ] Configurar `globals.css` com dark theme base

**Critério:** `npm run dev` sobe sem erros, página inicial renderiza com fundo `#0D1B2A`

---

### Issue 2: Banco — Prisma schema e seed
**Arquivos:** `prisma/schema.prisma`, `src/lib/prisma.ts`, `prisma/seed.ts`

**Tasks:**
- [ ] CREATE `prisma/schema.prisma` com User, Category, Transaction, TransactionType
- [ ] CREATE `src/lib/prisma.ts` (singleton)
- [ ] `npx prisma migrate dev --name init`
- [ ] CREATE `prisma/seed.ts` com usuário, categorias padrão e 10 transações mock
- [ ] `npx prisma db seed`

**Critério:** `npx prisma studio` mostra tabelas populadas

---

### Issue 3: Auth — login, register e proteção de rotas
**Arquivos:** `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/auth/register/route.ts`, `src/middleware.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`

**Tasks:**
- [ ] CREATE `src/lib/auth.ts` com NextAuth Credentials provider + bcrypt
- [ ] CREATE handler NextAuth em `api/auth/[...nextauth]/route.ts`
- [ ] CREATE `api/auth/register/route.ts` (POST criar usuário)
- [ ] CREATE `src/middleware.ts` protegendo `/(dashboard)/*`
- [ ] CREATE tela `/login` com form funcional
- [ ] CREATE tela `/register` com form funcional
- [ ] Testar: login com seed user → redireciona para `/dashboard`

**Critério:** acesso `/dashboard` sem login redireciona para `/login`; login com seed user funciona

---

### Issue 4: Layout — Sidebar e Topbar
**Arquivos:** `src/app/(dashboard)/layout.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, `src/lib/utils.ts`

**Tasks:**
- [ ] CREATE `src/lib/utils.ts` com `cn()`, `formatCurrency()`, `formatDate()`
- [ ] CREATE `Sidebar.tsx` fiel ao Figma (logo, nav items, ativo pill laranja, collapse)
- [ ] CREATE `Topbar.tsx` com título dinâmico, dark mode toggle, notificações, avatar
- [ ] CREATE `layout.tsx` compondo sidebar + topbar + content area

**Critério:** sidebar renderiza com active state correto por rota; botão collapse funciona

---

### Issue 5: Dashboard — KPIs, gráficos e transações recentes
**Arquivos:** `src/app/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/KPICard.tsx`, `src/components/dashboard/MonthlyChart.tsx`, `src/components/dashboard/SpendingDonut.tsx`, `src/components/dashboard/RecentTransactions.tsx`

**Tasks:**
- [ ] CREATE `KPICard.tsx` com badge de variação e ícone
- [ ] CREATE `MonthlyChart.tsx` (Recharts BarChart income + expenses, 6 meses)
- [ ] CREATE `SpendingDonut.tsx` (Recharts PieChart donut por categoria)
- [ ] CREATE `RecentTransactions.tsx` (lista últimas 6 + link View All)
- [ ] CREATE `dashboard/page.tsx` buscando dados reais do banco (usuário logado)

**Critério:** dashboard renderiza com dados do seed, gráficos visíveis, KPIs calculados

---

## Complexidade

**Alta** — projeto do zero, 20+ arquivos, múltiplas camadas

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| NextAuth v5 API diferente da v4 | Usar docs Auth.js v5 (beta) como referência |
| shadcn conflitar com dark theme custom | Sobrescrever CSS variables do shadcn no globals.css |
| Recharts SSR issue | Garantir `"use client"` nos componentes de gráfico |
| PostgreSQL local não configurado | Documentar setup no README ou usar Docker Compose |

---

## Próxima Etapa

```
1. /revisar-spec   → revisão crítica
2. /publicar-milestone  → cria milestone v0.1 + 5 issues no GitHub
3. /executar-milestone  → implementa issue por issue
```
