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
| Gráficos | Recharts | 3 |
| Ícones | lucide-react | 0.577 |
| Fonte | Plus Jakarta Sans | — |
| Package mgr | npm | — |

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
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx  # placeholder — v0.3
│   │   ├── reports/page.tsx       # placeholder — futuro
│   │   ├── import/page.tsx        # placeholder — futuro
│   │   ├── settings/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/    # Handler NextAuth
│   │   ├── auth/register/         # POST criar usuário
│   │   ├── categories/            # GET list, POST create
│   │   ├── categories/[id]/       # PATCH update, DELETE
│   │   ├── settings/profile/      # PATCH update name/email
│   │   └── settings/password/     # PATCH change password
│   ├── layout.tsx                 # Root layout (fonte, html, body)
│   ├── globals.css                # Tailwind v4 + tokens Axiom + shadcn overrides
│   └── page.tsx                   # Redirect: autenticado → /dashboard, anon → /login
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            # Nav lateral (collapse, active pill laranja)
│   │   └── Topbar.tsx             # Título da página, moon, bell, avatar
│   ├── dashboard/
│   │   ├── KPICard.tsx            # Card com valor, badge % variação, ícone
│   │   ├── MonthlyChart.tsx       # Recharts BarChart (income + expenses 6 meses)
│   │   ├── SpendingDonut.tsx      # Recharts PieChart por categoria
│   │   └── RecentTransactions.tsx # Lista últimas 6 transações
│   ├── settings/
│   │   ├── SettingsTabs.tsx       # shadcn Tabs (Perfil | Categorias)
│   │   ├── ProfileForm.tsx        # Form nome/email + form senha (router.refresh após salvar)
│   │   ├── CategoriesManager.tsx  # Grid de categorias + estado local
│   │   └── CategoryDialog.tsx     # shadcn Dialog criar/editar categoria
│   └── ui/                        # shadcn/ui instalados: button, card, input, label,
│                                  # dropdown-menu, badge, separator, avatar, switch,
│                                  # table, tabs, dialog
└── lib/
    ├── auth.ts          # NextAuth config COMPLETA (server-only, usa Prisma)
    ├── auth.config.ts   # Config LEVE sem Prisma — usada no middleware (Edge Runtime)
    ├── prisma.ts        # Singleton PrismaClient (server-only, adapter PrismaPg)
    └── utils.ts         # cn(), formatCurrency(), formatDate()
```

---

## Mapa de Domínio

### Models (Prisma)

```
User
  id, name?, email (unique), password (bcrypt), createdAt, updatedAt
  → relations: transactions[], categories[]

Category
  id, name, color (#hex), icon?, userId, createdAt
  → relations: user, transactions[]

Transaction
  id, description, amount (Decimal 10,2), type (INCOME|EXPENSE),
  date, userId, categoryId, createdAt, updatedAt
  → relations: user, category
```

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

### Padrão de Server Components (dashboard)

```ts
// page.tsx
const session = await auth();
if (!session?.user?.id) redirect("/login");
const data = await prisma.xxx.findMany({ where: { userId: session.user.id } });
// renderizar Client Components passando data como props
```

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
| v0.2 | Settings | ✅ concluída (branch: feature/v0.2-settings, pendente merge) |
| v0.3 | — | planejamento |

---

## Regras de Implementação

1. **Nunca importar Prisma ou bcryptjs no middleware** — usar apenas `auth.config.ts`
2. **Nunca usar cores fora dos tokens `axiom-*`** — nem inline styles com hex hardcoded
3. **Sempre `server-only`** em `auth.ts` e `prisma.ts`
4. **shadcn components:** instalar via `npx shadcn@latest add <component>` antes de usar
5. **Recharts:** sempre `"use client"` nos componentes de gráfico
6. **Deletar categoria:** verificar `_count.transactions` antes — retornar 409 se > 0
7. **Cache corrompido:** se internal server error aparecer, `rm -rf .next && npm run dev`

---

## Seed de Desenvolvimento

```
Email: test@axiom.com
Senha: axiom123
```

Rodar seed: `npx prisma db seed`
