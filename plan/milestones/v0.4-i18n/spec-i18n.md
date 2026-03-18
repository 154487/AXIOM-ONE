# SPEC — Internacionalização (i18n)

> Gerado por `/planejar-feature` em 2026-03-18
> PRD: `plan/milestones/v0.4-i18n/prd-i18n.md`

## Resumo

Implementar suporte a múltiplos idiomas (en + pt-BR) usando `next-intl v4`.
Detecção automática via header `Accept-Language`, persistência em cookie `NEXT_LOCALE`.
Sem prefixo de URL — rotas permanecem `/dashboard`, `/transactions`, etc.

---

## Arquitetura

```
Browser Request
      ↓
middleware.ts (auth NextAuth + set cookie NEXT_LOCALE)
      ↓
src/i18n/request.ts (cookie → Accept-Language → default "en")
      ↓
app/layout.tsx (NextIntlClientProvider + <html lang={locale}>)
      ↓
Server Components  →  await getTranslations("Namespace")
Client Components  →  useTranslations("Namespace") + useLocale()
```

---

## Mudanças por Arquivo

### CREATE: `src/i18n/request.ts`

**Responsabilidade:** Resolver locale por requisição (cookie → Accept-Language → "en")

**Implementar:**
- [ ] `getRequestConfig` do `next-intl/server`
- [ ] Ler cookie `NEXT_LOCALE` — se válido, usar
- [ ] Fallback: negociar via `Negotiator` + `@formatjs/intl-localematcher`
- [ ] Importar messages dinamicamente: `messages/${locale}.json`

**Snippet base:**
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
    locale = match(negotiator.languages(), LOCALES, DEFAULT);
  }
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
```

---

### CREATE: `messages/en.json`

**Responsabilidade:** Todas as strings em inglês, organizadas por namespace

**Namespaces obrigatórios:**
- [ ] `Sidebar` — nav labels (Dashboard, Transactions, Reports, Import, Settings)
- [ ] `Topbar` — pageTitles por rota + subtitle "Welcome back to AXIOM ONE"
- [ ] `Dashboard` — KPI titles (Total Balance, Income, Expenses, Net Difference)
- [ ] `MonthlyChart` — title "Monthly Overview", income "Income", expenses "Expenses"
- [ ] `SpendingDonut` — title "Spending by Category"
- [ ] `RecentTransactions` — title "Recent Transactions", viewAll "View All"
- [ ] `Auth.login` — título, subtítulo, labels form, botão, link register
- [ ] `Auth.register` — título, subtítulo, labels form, botão, link login
- [ ] `Settings` — tabs, ProfileForm labels/msgs, CategoriesManager labels/msgs, CategoryDialog labels
- [ ] `Transactions` — botão novo, filter labels, nomes dos meses (Jan–Dec), table headers, badges tipo, empty state, dialog labels/erros/botões

**Referência de estrutura (parcial):**
```json
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
  }
}
```

---

### CREATE: `messages/pt-BR.json`

**Responsabilidade:** Mesma estrutura de `en.json`, strings em português brasileiro

**Implementar:**
- [ ] Todos os mesmos namespaces do `en.json`
- [ ] Strings extraídas dos componentes atuais (auth, settings, transactions já são pt-BR)
- [ ] Dashboard/Sidebar/Topbar traduzidos para pt-BR

**Referência de estrutura (parcial):**
```json
{
  "Sidebar": {
    "dashboard": "Painel",
    "transactions": "Transações",
    "reports": "Relatórios",
    "import": "Importar",
    "settings": "Configurações"
  },
  "Topbar": {
    "pageTitles": {
      "/dashboard": "Visão Financeira",
      "/transactions": "Transações",
      "/reports": "Relatórios Financeiros",
      "/import": "Importar Arquivo OFX",
      "/settings": "Configurações"
    },
    "subtitle": "Bem-vindo de volta ao AXIOM ONE"
  },
  "Dashboard": {
    "totalBalance": "Saldo Total",
    "income": "Receitas",
    "expenses": "Despesas",
    "netDifference": "Diferença Líquida"
  }
}
```

---

### MODIFY: `src/middleware.ts`

**Alterar:**
- [ ] Substituir export direto por wrapper `auth(function middleware(req) {...})`
- [ ] Dentro do callback: detectar locale via `Accept-Language` se cookie ausente
- [ ] Setar cookie `NEXT_LOCALE` na response (`res.cookies.set`)
- [ ] Preservar `matcher` existente intacto

**De → Para:**
```ts
// ANTES
export default NextAuth(authConfig).auth;

// DEPOIS
const { auth } = NextAuth(authConfig);
export default auth(function middleware(req) {
  const res = NextResponse.next();
  if (!req.cookies.get("NEXT_LOCALE")) {
    const locale = detectLocale(req.headers.get("accept-language") ?? "");
    res.cookies.set("NEXT_LOCALE", locale, { path: "/" });
  }
  return res;
});

function detectLocale(acceptLang: string): string {
  // Negotiator espera objeto com headers, não string direta
  const languages = new Negotiator({
    headers: { "accept-language": acceptLang },
  }).languages();
  try {
    return match(languages, LOCALES, DEFAULT);
  } catch {
    return DEFAULT;
  }
}
```

**Atenção:** Importar `NextResponse`, `Negotiator` e `match` no topo do arquivo. O middleware roda no Edge Runtime — `negotiator` e `@formatjs/intl-localematcher` são compatíveis com Edge.

---

### MODIFY: `next.config.ts`

**Alterar:**
- [ ] Importar `createNextIntlPlugin` de `"next-intl/plugin"`
- [ ] Envolver `nextConfig` com `withNextIntl(nextConfig)`
- [ ] Manter `serverExternalPackages` e `webpack` intactos

**Linha aproximada:** linhas 1–2 (import) + última linha (export)

```ts
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin(); // auto-descobre src/i18n/request.ts

// ... nextConfig existente ...

export default withNextIntl(nextConfig);
```

---

### MODIFY: `src/app/layout.tsx`

**Alterar:**
- [ ] Tornar `RootLayout` assíncrono (`async function`)
- [ ] Chamar `await getLocale()` de `"next-intl/server"`
- [ ] Passar `lang={locale}` para `<html>`
- [ ] Envolver `{children}` com `<NextIntlClientProvider>`

**Linha 15:** `<html lang="pt-BR"` → `<html lang={locale}`

---

### MODIFY: `src/lib/utils.ts`

**Alterar:**
- [ ] `formatCurrency(value, locale = "pt-BR")` — parâmetro locale opcional
- [ ] `formatDate(date, locale = "pt-BR")` — parâmetro locale opcional + retornar `toLocaleDateString` no lugar de ISO split

**De → Para:**
```ts
// formatCurrency
export function formatCurrency(value: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(value);
}

// formatDate
export function formatDate(date: Date | string, locale = "pt-BR"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}
```

**Impacto:** Todos os callers que não passam locale continuam funcionando (default `"pt-BR"`). Callers que precisam de locale dinâmico passarão `useLocale()` ou `await getLocale()`.

---

### MODIFY: `src/components/layout/Sidebar.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Sidebar")` no topo do componente
- [ ] Substituir `navItems` array estático por array que usa `t("key")`
- [ ] Manter lógica de collapse e active pill intacta

**Linha 17–23:** navItems com labels hardcoded → usar `t("dashboard")`, `t("transactions")`, etc.

---

### MODIFY: `src/components/layout/Topbar.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Topbar")` no topo do componente
- [ ] Substituir objeto `pageTitles` estático por `t("pageTitles.<rota>")`
- [ ] Substituir string "Welcome back to AXIOM ONE" por `t("subtitle")`

**Linha 7–13:** `pageTitles` record → tradução via `t`
**Linha 28:** "Welcome back to AXIOM ONE" → `t("subtitle")`

---

### MODIFY: `src/app/(dashboard)/dashboard/page.tsx`

**Alterar:**
- [ ] Adicionar `await getTranslations("Dashboard")` e `await getLocale()`
- [ ] Substituir strings hardcoded nos KPICards por `t("totalBalance")`, `t("income")`, etc.
- [ ] Substituir `d.toLocaleString("en-US", ...)` por `d.toLocaleString(locale, ...)` em `monthlyData`

**Linha 86:** `"en-US"` → `locale` (variável obtida via `getLocale()`)
**Linhas 147–172:** KPI titles hardcoded → `t("key")`

---

### MODIFY: `src/components/dashboard/MonthlyChart.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("MonthlyChart")` e `useLocale()`
- [ ] Substituir título "Monthly Overview" por `t("title")`
- [ ] Substituir `name="income"` / `name="expenses"` por `t("income")` / `t("expenses")`
- [ ] Substituir locale hardcoded `"pt-BR"` no `formatter` do Tooltip por `locale`

**Linha 27:** título hardcoded → `t("title")`
**Linhas 52–53:** `"pt-BR"` no `Intl.NumberFormat` → `locale`
**Linhas 58–59:** `name="income"` / `name="expenses"` → `t("income")` / `t("expenses")`

---

### MODIFY: `src/components/dashboard/SpendingDonut.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("SpendingDonut")`
- [ ] Substituir título hardcoded por `t("title")`

---

### MODIFY: `src/components/dashboard/RecentTransactions.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("RecentTransactions")`
- [ ] Substituir "Recent Transactions" por `t("title")`
- [ ] Substituir "View All" por `t("viewAll")`

---

### MODIFY: `src/app/(auth)/login/page.tsx`

> `"use client"` confirmado — usar `useTranslations`, não `getTranslations`.

**Alterar:**
- [ ] Adicionar `useTranslations("Auth.login")` no topo do componente
- [ ] Extrair todas as strings pt-BR para chaves de tradução
- [ ] Preencher namespace `Auth.login` em `messages/en.json` e `messages/pt-BR.json`

---

### MODIFY: `src/app/(auth)/register/page.tsx`

> `"use client"` confirmado — usar `useTranslations`, não `getTranslations`.

**Alterar:**
- [ ] Adicionar `useTranslations("Auth.register")` no topo do componente
- [ ] Extrair todas as strings pt-BR para chaves de tradução
- [ ] Preencher namespace `Auth.register` em `messages/en.json` e `messages/pt-BR.json`

---

### MODIFY: `src/components/settings/SettingsTabs.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Settings")`
- [ ] Substituir tab labels por chaves de tradução

---

### MODIFY: `src/components/settings/ProfileForm.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Settings")`
- [ ] Extrair todos os labels, placeholders, mensagens de sucesso/erro

---

### MODIFY: `src/components/settings/CategoriesManager.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Settings")`
- [ ] Extrair labels, botões, mensagens de erro/sucesso

---

### MODIFY: `src/components/settings/CategoryDialog.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Settings")`
- [ ] Extrair labels do dialog, botões, validações

---

### MODIFY: `src/components/transactions/TransactionList.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Transactions")` e `useLocale()`
- [ ] Substituir "Nova Transação" por `t("newTransaction")`
- [ ] Passar `locale` para `formatCurrency` / `formatDate` onde chamados

---

### MODIFY: `src/components/transactions/TransactionFilters.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Transactions")` e `useLocale()`
- [ ] Substituir filter labels por chaves de tradução
- [ ] Substituir nomes de meses hardcoded por `toLocaleString(locale, { month: "long" })`

---

### MODIFY: `src/components/transactions/TransactionTable.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Transactions")`
- [ ] Substituir headers da tabela por chaves de tradução
- [ ] Substituir badge labels (INCOME/EXPENSE → "Receita"/"Despesa") por `t`
- [ ] Substituir empty state por `t("emptyState")`

---

### MODIFY: `src/components/transactions/TransactionDialog.tsx`

**Alterar:**
- [ ] Adicionar `useTranslations("Transactions")`
- [ ] Extrair todos os labels, placeholders, mensagens de erro, botões

---

## Ordem de Implementação

1. **Setup** (Issue 1) — instalar pacotes, criar `i18n/request.ts`, modificar `middleware.ts`, `next.config.ts`, `layout.tsx`
2. **Translation files** (Issue 2) — criar `messages/en.json` e `messages/pt-BR.json` com TODOS os namespaces (esboço inicial, completar nas issues seguintes)
3. **Formatting** (Issue 3) — `utils.ts` + `MonthlyChart.tsx` + `dashboard/page.tsx` (locale nos meses)
4. **Layout** (Issue 4) — `Sidebar.tsx` + `Topbar.tsx`
5. **Auth** (Issue 5) — `login/page.tsx` + `register/page.tsx`
6. **Dashboard** (Issue 6) — `dashboard/page.tsx` (KPIs) + `SpendingDonut.tsx` + `RecentTransactions.tsx`
7. **Settings** (Issue 7) — 4 componentes de settings
8. **Transactions** (Issue 8) — 4 componentes de transactions

> **Nota:** `messages/*.json` são criados com estrutura mínima na Issue 1 (necessário para o build). A Issue 2 popula os namespaces do layout/dashboard. Os namespaces Auth, Settings e Transactions são completados junto com suas respectivas issues (5, 7, 8).

---

## Issues Sugeridas

### Issue 1: Setup next-intl — install, config, middleware, layout + translation files mínimos
**Arquivos:** `next.config.ts`, `src/middleware.ts`, `src/i18n/request.ts`, `src/app/layout.tsx`, `messages/en.json`, `messages/pt-BR.json`

**Tasks:**
- [ ] `npm install next-intl @formatjs/intl-localematcher negotiator && npm install -D @types/negotiator`
- [ ] CREATE `src/i18n/request.ts` com `getRequestConfig` (cookie → Accept-Language → "en")
- [ ] CREATE `messages/en.json` — estrutura mínima com todos os namespaces e chaves vazias `""` (populadas nas Issues 3–8)
- [ ] CREATE `messages/pt-BR.json` — mesma estrutura mínima
- [ ] MODIFY `next.config.ts` — wrap com `withNextIntl(nextConfig)`
- [ ] MODIFY `src/middleware.ts` — compor `auth(function middleware(req){...})` + setar cookie `NEXT_LOCALE`
- [ ] MODIFY `src/app/layout.tsx` — `async`, `getLocale()`, `lang={locale}`, `<NextIntlClientProvider>`

> **Motivo:** `withNextIntl` e `NextIntlClientProvider` requerem que `messages/*.json` existam para o build funcionar. Os arquivos são criados aqui com chaves vazias e completados incrementalmente nas issues 3–8.

**Critério:** `npm run build` passa; navegar no app não quebra nada

---

### Issue 2: Popular translation files — namespaces Sidebar, Topbar, Dashboard, MonthlyChart, SpendingDonut, RecentTransactions
**Arquivos:** `messages/en.json`, `messages/pt-BR.json`

> Arquivos já existem após Issue 1 com chaves vazias. Esta issue popula os namespaces do layout e dashboard (Issues 4 e 6 dependem das strings prontas aqui).

**Tasks:**
- [ ] Popular namespace `Sidebar` (en + pt-BR)
- [ ] Popular namespace `Topbar` (en + pt-BR)
- [ ] Popular namespace `Dashboard` (en + pt-BR)
- [ ] Popular namespace `MonthlyChart` (en + pt-BR)
- [ ] Popular namespace `SpendingDonut` (en + pt-BR)
- [ ] Popular namespace `RecentTransactions` (en + pt-BR)

> Namespaces `Auth`, `Settings` e `Transactions` são populados junto com as Issues 5, 7 e 8 respectivamente.

**Critério:** `npm run build` passa; nenhuma chave vazia nos namespaces acima

---

### Issue 3: Formatação locale-aware — utils, MonthlyChart, dashboard months
**Arquivos:** `src/lib/utils.ts`, `src/components/dashboard/MonthlyChart.tsx`, `src/app/(dashboard)/dashboard/page.tsx`

**Tasks:**
- [ ] MODIFY `src/lib/utils.ts` — `formatCurrency(value, locale?)` + `formatDate(date, locale?)`
- [ ] MODIFY `src/app/(dashboard)/dashboard/page.tsx` — `await getLocale()` + trocar `"en-US"` por `locale` em `toLocaleString`
- [ ] MODIFY `src/components/dashboard/MonthlyChart.tsx` — `useLocale()` no tooltip formatter + `useTranslations("MonthlyChart")` para title e legend names

**Critério:** gráfico mostra meses no idioma correto; tooltip formata moeda conforme locale

---

### Issue 4: Traduzir layout — Sidebar e Topbar
**Arquivos:** `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`

**Tasks:**
- [ ] MODIFY `Sidebar.tsx` — `useTranslations("Sidebar")` nos navItems
- [ ] MODIFY `Topbar.tsx` — `useTranslations("Topbar")` nos pageTitles e subtitle

**Critério:** nav labels e títulos de página mudam conforme locale

---

### Issue 5: Traduzir auth — login e register
**Arquivos:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`

**Tasks:**
- [ ] MODIFY `login/page.tsx` — extrair strings para `Auth.login`, usar `useTranslations`
- [ ] MODIFY `register/page.tsx` — extrair strings para `Auth.register`, usar `useTranslations`

**Critério:** páginas de auth renderizam corretamente em en e pt-BR

---

### Issue 6: Traduzir dashboard — KPIs, SpendingDonut, RecentTransactions
**Arquivos:** `src/app/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/SpendingDonut.tsx`, `src/components/dashboard/RecentTransactions.tsx`

**Tasks:**
- [ ] MODIFY `dashboard/page.tsx` — `await getTranslations("Dashboard")` + KPI titles via `t`
- [ ] MODIFY `SpendingDonut.tsx` — `useTranslations("SpendingDonut")` + título via `t`
- [ ] MODIFY `RecentTransactions.tsx` — `useTranslations("RecentTransactions")` + title e viewAll via `t`

**Critério:** KPIs e componentes dashboard mudam com locale

---

### Issue 7: Traduzir settings — 4 componentes
**Arquivos:** `src/components/settings/SettingsTabs.tsx`, `ProfileForm.tsx`, `CategoriesManager.tsx`, `CategoryDialog.tsx`

**Tasks:**
- [ ] MODIFY `SettingsTabs.tsx` — `useTranslations("Settings")` nas tab labels
- [ ] MODIFY `ProfileForm.tsx` — extrair labels/mensagens para `Settings`
- [ ] MODIFY `CategoriesManager.tsx` — extrair labels/mensagens para `Settings`
- [ ] MODIFY `CategoryDialog.tsx` — extrair labels/botões para `Settings`

**Critério:** settings completamente traduzido em en e pt-BR

---

### Issue 8: Traduzir transactions — 4 componentes
**Arquivos:** `src/components/transactions/TransactionList.tsx`, `TransactionFilters.tsx`, `TransactionTable.tsx`, `TransactionDialog.tsx`

**Tasks:**
- [ ] MODIFY `TransactionList.tsx` — `useTranslations("Transactions")` + `useLocale()` para formatters
- [ ] MODIFY `TransactionFilters.tsx` — traduzir labels + meses via `toLocaleString(locale)`
- [ ] MODIFY `TransactionTable.tsx` — traduzir headers, badges tipo, empty state
- [ ] MODIFY `TransactionDialog.tsx` — traduzir labels, erros, botões

**Critério:** transactions completamente traduzido em en e pt-BR

---

## Complexidade

**Alta** — 3 arquivos a criar + 20 arquivos a modificar, integração com biblioteca externa

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Middleware: auth + locale compose quebra | Testar login/redirect antes de prosseguir nas issues 2+ |
| `next-intl` incompatível com `next.config.ts` + Prisma externals | Após `withNextIntl`, rodar `npm run build` imediatamente |
| Chave de tradução ausente em tempo de execução | `next-intl` lança erro no dev — usar `npm run dev` para detectar |
| `formatDate` com `toLocaleDateString` pode mudar formato visual | Spec fixa `{ day: "2-digit", month: "2-digit", year: "numeric" }` — testar ambos locales |
| auth pages são Server Components? | Confirmado: ambas são `"use client"` — usar `useTranslations` |

## Próxima Etapa

Após aprovar esta SPEC:
1. Execute `/clear` para limpar contexto
2. Execute `/publicar-milestone` para criar milestone + issues no GitHub
3. Execute `/executar-milestone` para implementar
