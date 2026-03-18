# PRD — Internacionalização (i18n)

> Gerado por `/pesquisar-feature` em 2026-03-18

## Objetivo

Detectar automaticamente o idioma do navegador/OS do usuário via header `Accept-Language` e servir toda a UI no idioma correspondente. Suporte inicial: **en** (inglês) e **pt-BR** (português brasileiro). Sem prefixo de URL — as rotas permanecem `/dashboard`, `/transactions`, etc. para todos os idiomas.

---

## Contexto do Projeto

### Estado Atual das Strings

O app já tem linguagem **mista**:

| Área | Idioma atual |
|------|-------------|
| Sidebar nav labels | **Inglês** (Dashboard, Transactions, Reports...) |
| Topbar títulos/subtítulo | **Inglês** (Financial Overview, Welcome back to AXIOM ONE) |
| KPI card titles | **Inglês** (Total Balance, Income, Expenses, Net Difference) |
| MonthlyChart título/legenda | **Inglês** (Monthly Overview, income, expenses) |
| RecentTransactions | **Inglês** (Recent Transactions, View All) |
| SpendingDonut | **Inglês** (Spending by Category) |
| Dashboard meses (gráfico) | **Inglês** (hardcoded `"en-US"` em `toLocaleString`) |
| Auth pages (login/register) | **Português** |
| Settings (todas) | **Português** |
| Transactions (todas) | **Português** |
| formatCurrency | **Hardcoded** `pt-BR` + `BRL` |
| formatDate | ISO puro (sem locale) |

### Arquivos Relevantes

| Arquivo | O que precisa mudar |
|---------|---------------------|
| `src/middleware.ts` | Adicionar detecção de locale via Accept-Language + set cookie |
| `next.config.ts` | Adicionar `withNextIntl` wrapper |
| `src/app/layout.tsx` | Adicionar `NextIntlClientProvider`, `lang` dinâmico |
| `src/app/(dashboard)/layout.tsx` | Server Component — passar locale se necessário |
| `src/lib/utils.ts` | `formatCurrency(value, locale)` + `formatDate(date, locale)` |
| `src/components/layout/Sidebar.tsx` | Traduzir nav labels |
| `src/components/layout/Topbar.tsx` | Traduzir page titles + subtítulo |
| `src/app/(auth)/login/page.tsx` | Extrair strings pt-BR para chaves |
| `src/app/(auth)/register/page.tsx` | Extrair strings pt-BR para chaves |
| `src/app/(dashboard)/dashboard/page.tsx` | Traduzir KPI titles + meses (`getTranslations`) |
| `src/components/dashboard/KPICard.tsx` | title é prop — sem mudança direta |
| `src/components/dashboard/MonthlyChart.tsx` | Traduzir título, legenda, tooltip formatter |
| `src/components/dashboard/SpendingDonut.tsx` | Traduzir título |
| `src/components/dashboard/RecentTransactions.tsx` | Traduzir "Recent Transactions" + "View All" |
| `src/components/settings/SettingsTabs.tsx` | Traduzir tab labels |
| `src/components/settings/ProfileForm.tsx` | Traduzir todos os labels/mensagens |
| `src/components/settings/CategoriesManager.tsx` | Traduzir labels/mensagens |
| `src/components/settings/CategoryDialog.tsx` | Traduzir labels/mensagens |
| `src/components/transactions/TransactionList.tsx` | Traduzir "Nova Transação" |
| `src/components/transactions/TransactionFilters.tsx` | Traduzir filter labels, month names |
| `src/components/transactions/TransactionTable.tsx` | Traduzir headers, badges, empty state |
| `src/components/transactions/TransactionDialog.tsx` | Traduzir labels, erros, botões |

**Novos arquivos:**
- `src/i18n/request.ts` — resolução de locale (cookie → Accept-Language → default 'en')
- `messages/en.json` — todas as strings em inglês
- `messages/pt-BR.json` — todas as strings em português

---

## Padrões Existentes no Projeto

### Padrão: Middleware atual (NextAuth)
- **Arquivo:** `src/middleware.ts`
- **Como funciona:** Usa `NextAuth(authConfig).auth` como middleware, protege rotas do dashboard
- **Aplicar:** Manter auth E adicionar locale detection antes do return

```ts
// Padrão atual — precisa ser preservado
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
export default NextAuth(authConfig).auth;
export const config = { matcher: [...rotas protegidas...] };
```

**Problema:** NextAuth exporta `.auth` como default, não dá para compor diretamente com outro middleware. Solução: criar função wrapper que chama ambos:

```ts
import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth(function middleware(req) {
  const res = NextResponse.next();
  // locale detection aqui
  if (!req.cookies.get("NEXT_LOCALE")) {
    const locale = detectLocale(req.headers.get("accept-language") ?? "");
    res.cookies.set("NEXT_LOCALE", locale, { path: "/" });
  }
  return res;
});
```

### Padrão: Server Component com auth
- **Arquivo:** `src/app/(dashboard)/layout.tsx`
- **Como funciona:** `await auth()` → redirect se sem sessão
- **Aplicar:** `await getLocale()` pode coexistir na mesma função

### Padrão: Client Component com estado local
- **Arquivo:** `src/components/transactions/TransactionList.tsx`
- **Como funciona:** `useState` inicializado com props do servidor
- **Aplicar:** Usar `useTranslations()` no topo do componente, passar `t` para subcomponentes se necessário

---

## Dependências Externas

### next-intl v4

**Instalação:**
```bash
npm install next-intl
# Para negociação BCP 47 correta:
npm install @formatjs/intl-localematcher negotiator
npm install -D @types/negotiator
```

**`src/i18n/request.ts`** — resolve locale por requisição:
```ts
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import Negotiator from "negotiator";
import { match } from "@formatjs/intl-localematcher";

const LOCALES = ["en", "pt-BR"];
const DEFAULT = "en";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  let locale = cookieStore.get("NEXT_LOCALE")?.value;

  if (!locale || !LOCALES.includes(locale)) {
    const headerStore = await headers();
    const acceptLang = headerStore.get("accept-language") ?? "";
    const negotiator = new Negotiator({ headers: { "accept-language": acceptLang } });
    const languages = negotiator.languages();
    locale = match(languages, LOCALES, DEFAULT);
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

**`next.config.ts`** — wrap com plugin:
```ts
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin(); // auto-descobre src/i18n/request.ts
export default withNextIntl(nextConfig);
```

**`app/layout.tsx`** — wrap com provider:
```tsx
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

const locale = await getLocale();
return (
  <html lang={locale}>
    <body>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </body>
  </html>
);
```

**Server Component:**
```ts
import { getTranslations } from "next-intl/server";
const t = await getTranslations("Dashboard");
t("totalBalance") // → "Total Balance" ou "Saldo Total"
```

**Client Component:**
```ts
"use client";
import { useTranslations } from "next-intl";
const t = useTranslations("Sidebar");
t("dashboard") // → "Dashboard" ou "Painel"
```

---

## Estrutura dos arquivos de tradução

```
messages/
  en.json      ← inglês (idioma primário)
  pt-BR.json   ← português brasileiro
```

**Organização por namespace (componente/área):**
```json
// messages/en.json
{
  "Sidebar": {
    "dashboard": "Dashboard",
    "transactions": "Transactions",
    "reports": "Reports",
    "import": "Import",
    "settings": "Settings"
  },
  "Topbar": {
    "pageTitles": {
      "/dashboard": "Financial Overview",
      "/transactions": "Transactions",
      "/reports": "Financial Reports",
      "/import": "Import OFX File",
      "/settings": "Settings"
    },
    "subtitle": "Welcome back to AXIOM ONE"
  },
  "Dashboard": {
    "totalBalance": "Total Balance",
    "income": "Income",
    "expenses": "Expenses",
    "netDifference": "Net Difference"
  },
  "MonthlyChart": {
    "title": "Monthly Overview",
    "income": "Income",
    "expenses": "Expenses"
  },
  "SpendingDonut": { "title": "Spending by Category" },
  "RecentTransactions": { "title": "Recent Transactions", "viewAll": "View All" },
  "Auth": {
    "login": { "title": "Sign In", "subtitle": "Access your account...", ... },
    "register": { "title": "Create Account", ... }
  },
  "Settings": { ... },
  "Transactions": { ... }
}
```

---

## formatCurrency e formatDate — Locale Aware

`formatCurrency` precisa saber o locale para escolher a moeda certa.
**Decisão de escopo:** moeda permanece BRL (app é de gestão financeira BR), mas o formato numérico muda com o locale.

```ts
// Atual:
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Novo:
export function formatCurrency(value: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(date: Date | string, locale = "pt-BR"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}
```

Em Client Components, usar `useLocale()` para passar o locale:
```ts
import { useLocale } from "next-intl";
const locale = useLocale();
formatCurrency(tx.amount, locale)
```

Em Server Components, usar `getLocale()`:
```ts
import { getLocale } from "next-intl/server";
const locale = await getLocale();
```

---

## Regras e Constraints

- **Moeda:** sempre BRL — só o formato numérico muda com o locale
- **Namespace por área:** Sidebar, Topbar, Dashboard, MonthlyChart, SpendingDonut, RecentTransactions, Auth, Settings, Transactions
- **Cookie:** `NEXT_LOCALE`, path `/`, sem maxAge (session cookie — pode ser persistido depois)
- **Fallback:** se locale não suportado → `"en"`
- **Não traduzir:** dados do usuário (descrições de transações, nomes de categorias), mensagens de erro das API Routes
- **Não usar:** `next/font` nem qualquer mudança de fonte — usar system-ui (já configurado)
- **Manter padrão:** Client Components com `"use client"` usam `useTranslations()`, Server Components usam `getTranslations()`
- **Middleware:** preservar auth do NextAuth — compor locale detection dentro do callback `auth()`

---

## Escopo

### Incluído
- Detecção automática via `Accept-Language` header
- Cookie `NEXT_LOCALE` persistindo preferência por sessão
- Tradução de todas as strings UI hardcoded (en + pt-BR)
- `formatCurrency` e `formatDate` locale-aware
- `lang` attribute no `<html>` dinâmico

### Excluído
- Seletor de idioma manual pelo usuário (futuro)
- Persistência de preferência no banco (futuro)
- Outros idiomas além de en e pt-BR (futuro)
- Tradução de mensagens de erro das API Routes
- Tradução de dados do usuário (transações, categorias)

---

## Issues do Milestone v0.4-i18n

| # | Título | Arquivos-chave |
|---|--------|---------------|
| 1 | Setup next-intl: install, config, i18n/request.ts, middleware, layout | next.config.ts, middleware.ts, i18n/request.ts, layout.tsx |
| 2 | Translation files: en.json + pt-BR.json | messages/en.json, messages/pt-BR.json |
| 3 | Locale-aware formatting: formatCurrency, formatDate, MonthlyChart | lib/utils.ts, MonthlyChart.tsx, dashboard/page.tsx |
| 4 | Translate layout: Sidebar, Topbar | Sidebar.tsx, Topbar.tsx |
| 5 | Translate auth pages: login, register | login/page.tsx, register/page.tsx |
| 6 | Translate dashboard: page + KPICard, SpendingDonut, RecentTransactions | dashboard/page.tsx, SpendingDonut.tsx, RecentTransactions.tsx |
| 7 | Translate settings: SettingsTabs, ProfileForm, CategoriesManager, CategoryDialog | 4 settings components |
| 8 | Translate transactions: TransactionList, Filters, Table, Dialog | 4 transaction components |

---

## Memory Anchors

- **Biblioteca:** `next-intl v4` — sem URL prefix, cookie `NEXT_LOCALE`, `getRequestConfig` em `src/i18n/request.ts`
- **Locale detection:** `Accept-Language` header via `negotiator` + `@formatjs/intl-localematcher`, fallback `"en"`
- **Middleware:** compor auth NextAuth + locale detection usando `auth(function middleware(req) {...})`
- **Padrão client:** `useTranslations("Namespace")` — padrão server: `await getTranslations("Namespace")`
- **Aviso:** `formatCurrency`/`formatDate` recebem `locale` como param — moeda sempre BRL

## Próxima Etapa

1. Revisar este PRD
2. `/clear` → `/planejar-feature`
