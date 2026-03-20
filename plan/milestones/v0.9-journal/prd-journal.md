# PRD - Financial Journal (v0.9)

> Gerado por `/pesquisar-feature` em 2026-03-19

## Objetivo

Implementar um diário financeiro pessoal onde o usuário registra eventos e reflexões em texto livre (Markdown), com injeção automática do **health score** e **sobra sustentável** do mês atual no momento da criação. Cada entrada fica vinculada ao contexto financeiro do dia — diferencial central do AXIOM ONE em relação a concorrentes.

---

## Contexto do Projeto

### Arquivos Relevantes

| Arquivo | Por que é relevante |
|---------|---------------------|
| `prisma/schema.prisma` | Adicionar model `JournalEntry` + enum `JournalEntryType` |
| `src/app/(dashboard)/investments/page.tsx` | Padrão de page.tsx: `force-dynamic`, auth, prisma → shell |
| `src/app/api/transactions/route.ts` | Padrão GET/POST com validação e serialização |
| `src/app/api/reports/overview/route.ts` | Lógica do healthScore — extrair para helper reutilizável |
| `src/components/layout/Sidebar.tsx` | Adicionar item `/journal` com ícone `BookOpen` |
| `messages/pt-BR.json` (+ 6 outros) | Adicionar chave `"journal"` em `Sidebar` nos 7 arquivos |

### Padrões a Reaproveitar

#### 1. Padrão de page.tsx (Server Component)
- **Arquivo:** `src/app/(dashboard)/investments/page.tsx:1-23`
- **Descrição:** `export const dynamic = "force-dynamic"`, auth(), redirect, fetch mínimo, passa props ao shell
- **Aplicar em:** `src/app/(dashboard)/journal/page.tsx`
- **Snippet:**
```tsx
export const dynamic = "force-dynamic";
const session = await auth();
if (!session?.user?.id) redirect("/login");
// fetch mínimo → passa ao Shell
return <JournalShell />;
```

#### 2. Padrão de API Route (GET + POST)
- **Arquivo:** `src/app/api/transactions/route.ts:69-152`
- **Descrição:** auth() → 401, validação → 400, ownership → 403, serialização Decimal/Date, retorno JSON
- **Aplicar em:** `src/app/api/journal/route.ts`

#### 3. Padrão de Client Shell com estado local
- **Arquivo:** `src/components/investments/InvestmentsShell.tsx`
- **Descrição:** `"use client"`, fetch no useEffect, estado local (loading, data), tabs/seções
- **Aplicar em:** `src/components/journal/JournalShell.tsx`

#### 4. Cálculo do Health Score
- **Arquivo:** `src/app/api/reports/overview/route.ts:52-86`
- **Descrição:** Pilares: poupança (40pts), tendência (30pts), renda (20pts), controle (10pts). Retorna 0–100.
- **Aplicar em:** `src/lib/healthSnapshot.ts` — extrair como helper `getHealthSnapshot(userId)` para chamar na criação de journal entries
- **Snippet chave:**
```ts
const selicAnual = ((1 + selicDaily / 100) ** 252 - 1) * 100;
const healthScore = Math.round(savingsPoints + trendPoints + 20 + controlPoints);
const sustainableSurplus = income - expenses; // sobra do mês atual
```

#### 5. Serialização Prisma → Client
- **Regra:** `Decimal` → `parseFloat(String(val))`, `Date` → `.toISOString()`
- **Aplicar em:** todas as API routes de journal

#### 6. Sidebar + i18n
- **Arquivo:** `src/components/layout/Sidebar.tsx:24-31`
- **Descrição:** Adicionar `{ href: "/journal", label: t("journal"), icon: BookOpen }` no array `navItems`
- **Arquivo i18n:** `messages/pt-BR.json` → `Sidebar.journal = "Diário"` (+ equivalente nos 6 outros idiomas)

### Componentes Reutilizáveis
- `bg-axiom-card border border-axiom-border rounded-xl p-5` — padrão de card
- `shadcn/ui Dialog` — para editor de nova entrada (já instalado)
- `shadcn/ui Badge` — para exibir tags e tipo de entrada
- `shadcn/ui Tabs` — se precisar de filtros visuais

---

## Decisão de Design: sem gray-matter

O PRD v0.7 citou `gray-matter` (YAML frontmatter embedded no texto). **Decisão**: não usar. Guardar campos estruturados como **colunas do banco** (`healthScoreAtTime`, `entryType`, `tags`, etc.) — mais simples, queryável, sem parsing overhead.

O `content` armazena só o Markdown puro (sem frontmatter).

---

## Model Proposto

```prisma
enum JournalEntryType {
  NOTE        // Nota livre
  APORTE      // Registro de investimento
  RESGATE     // Resgate de investimento
  REFLEXAO    // Reflexão periódica
  META        // Definição/revisão de metas
}

model JournalEntry {
  id                       String           @id @default(cuid())
  userId                   String
  title                    String
  content                  String           // Markdown puro
  entryType                JournalEntryType @default(NOTE)
  tags                     String[]         // PostgreSQL array
  date                     DateTime         @default(now())
  healthScoreAtTime        Int?             // 0–100, snapshot do momento
  sustainableSurplusAtTime Decimal?         @db.Decimal(12, 2)
  createdAt                DateTime         @default(now())
  updatedAt                DateTime         @updatedAt
  user                     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Adicionar `journalEntries JournalEntry[]` no model `User`.

---

## Helper: `src/lib/healthSnapshot.ts`

Função server-side que calcula health score + sobra do mês atual para um userId:

```ts
export interface HealthSnapshot {
  healthScore: number | null;
  sustainableSurplus: number | null;  // income - expenses do mês atual
  month: string; // "2026-03"
}

export async function getHealthSnapshot(userId: string): Promise<HealthSnapshot>
```

Lógica: busca transações do mês atual via Prisma, aplica os 4 pilares da `reports/overview/route.ts`.

---

## API Routes

### `GET /api/journal`
Query params: `?month=2026-03&type=NOTE&tag=ações`
Retorna: `JournalEntry[]` ordenado por `date desc`, máx 100

### `POST /api/journal`
Body: `{ title, content, entryType, tags, date }`
Injeta automaticamente: `healthScoreAtTime`, `sustainableSurplusAtTime` (via `getHealthSnapshot`)
Retorna: entrada criada serializada

### `PATCH /api/journal/[id]`
Body: `{ title?, content?, entryType?, tags?, date? }`
Ownership check obrigatório
Não reatualiza healthScore (preserva snapshot original)

### `DELETE /api/journal/[id]`
Ownership check, retorna 204

---

## Componentes

### `JournalShell.tsx` — `"use client"`
Container principal: fetch inicial, estado (entries, loading, filtros), abre editor via Dialog.

### `JournalList.tsx`
Grid de cards de entradas. Filtros: mês (select) e tipo (tabs ou badges clicáveis).

### `JournalEntryCard.tsx`
Card com: título, data, tipo (badge), tags, preview das primeiras 2 linhas do content, health score snapshot (badge colorido com escala: ≥70 verde, ≥50 branco, <50 vermelho).

### `JournalEditor.tsx` — Dialog shadcn
Form: título (input), tipo (select), tags (input chips simples), data (date input), conteúdo (textarea Markdown).
Botão "Salvar" — POST /api/journal.
Markdown preview opcional (tab "Escrever" / "Visualizar") usando `react-markdown`.

---

## Dependências Externas

### react-markdown + remark-gfm
- **Instalação:** `npm install react-markdown remark-gfm`
- **Uso:** renderização do Markdown no `JournalEntryCard` e preview no editor
- **Regra:** `"use client"` — não usar em Server Components
- **Snippet:**
```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
```

---

## Escopo

### Incluído
- CRUD completo de entradas do journal
- Injeção automática de health score + sobra sustentável (snapshot do mês)
- Editor Markdown com preview simples
- Filtros por mês e tipo de entrada
- Tags livres (array de strings)
- Rota `/journal` no sidebar
- Health score badge colorido em cada card

### Excluído
- Pattern insights (correlação journal × health score) — fica para v1.0
- Link de entrada com ativo específico (`relatedAssetId`) — simplificação para v0.9
- Exportação de entradas (PDF, CSV)
- Busca full-text no conteúdo

---

## Regras e Constraints

- [ ] Nunca importar `healthSnapshot.ts` no client — server-only
- [ ] `healthScoreAtTime` é imutável após criação (snapshot do momento)
- [ ] Serializar `sustainableSurplusAtTime`: `parseFloat(String(decimal))`
- [ ] Serializar `date` e `createdAt`: `.toISOString()`
- [ ] Tags: `String[]` no Prisma (PostgreSQL array nativo) — sem model separado
- [ ] Markdown no textarea: não sanitizar na edição; `react-markdown` sanitiza no render
- [ ] Seguir tokens `axiom-*` — nunca hex hardcoded

---

## Issues Sugeridas (7 issues)

### Issue #59 — Schema: model JournalEntry
**Arquivos:** `prisma/schema.prisma`
- [ ] Adicionar enum `JournalEntryType` (NOTE, APORTE, RESGATE, REFLEXAO, META)
- [ ] Adicionar model `JournalEntry` com todos os campos
- [ ] Adicionar relação `journalEntries` no model `User`
- [ ] Rodar `npx prisma migrate dev --name add-journal-entry`
- [ ] Gerar client: `npx prisma generate`
**Critério:** `npx prisma studio` mostra tabela `JournalEntry`

### Issue #60 — Lib: helper getHealthSnapshot
**Arquivos:** `src/lib/healthSnapshot.ts` (CREATE)
- [ ] Extrair lógica de cálculo de health score de `reports/overview/route.ts`
- [ ] Implementar `getHealthSnapshot(userId): Promise<HealthSnapshot>`
- [ ] Calcular `sustainableSurplus = income - expenses` do mês atual
**Critério:** função retorna `{ healthScore: number|null, sustainableSurplus: number|null, month: string }`

### Issue #61 — API: CRUD /api/journal
**Arquivos:** `src/app/api/journal/route.ts` (CREATE), `src/app/api/journal/[id]/route.ts` (CREATE)
- [ ] `GET /api/journal` com filtros `month`, `type`, `tag`
- [ ] `POST /api/journal` — valida body, injeta `getHealthSnapshot`, cria entrada
- [ ] `PATCH /api/journal/[id]` — ownership check, atualiza campos editáveis (não recalcula snapshot)
- [ ] `DELETE /api/journal/[id]` — ownership check, retorna 204
- [ ] Serializar todos os campos Decimal e Date
**Critério:** POST cria entrada com `healthScoreAtTime` preenchido automaticamente

### Issue #62 — Page: rota /journal
**Arquivos:** `src/app/(dashboard)/journal/page.tsx` (CREATE)
- [ ] `export const dynamic = "force-dynamic"`
- [ ] auth() + redirect
- [ ] Renderizar `<JournalShell />`
**Critério:** `/journal` renderiza sem erro 404

### Issue #63 — Components: JournalShell + JournalList + JournalEntryCard
**Arquivos:** `src/components/journal/JournalShell.tsx` (CREATE), `src/components/journal/JournalList.tsx` (CREATE), `src/components/journal/JournalEntryCard.tsx` (CREATE)
- [ ] `JournalShell`: fetch GET /api/journal, estado loading/entries/filtros, botão "Nova entrada"
- [ ] `JournalList`: grid de cards com filtro por mês (select) e tipo (badges)
- [ ] `JournalEntryCard`: título, data, tipo badge, tags, preview 2 linhas, health score badge colorido
- [ ] Health score badge: ≥70 `text-axiom-income`, ≥50 `text-white`, <50 `text-axiom-expense`
**Critério:** lista exibe entradas com health score visível

### Issue #64 — Component: JournalEditor (Dialog)
**Arquivos:** `src/components/journal/JournalEditor.tsx` (CREATE)
- [ ] Dialog shadcn com form: título, tipo (select), tags (input + chips), data, conteúdo (textarea)
- [ ] Tab "Escrever" / "Visualizar" — preview usa `react-markdown` + `remark-gfm`
- [ ] POST /api/journal ao salvar, atualiza lista local via callback
- [ ] Suporte a edição (PATCH) quando recebe `entry` como prop
- [ ] Instalar: `npm install react-markdown remark-gfm`
**Critério:** criar entrada abre no card com health score injetado; editar preserva snapshot

### Issue #65 — Sidebar + i18n: rota /journal em todos os idiomas
**Arquivos:** `src/components/layout/Sidebar.tsx`, `messages/pt-BR.json`, `messages/en.json`, `messages/es.json`, `messages/fr.json`, `messages/ar.json`, `messages/hi.json`, `messages/zh.json`
- [ ] Adicionar `{ href: "/journal", label: t("journal"), icon: BookOpen }` no `navItems` do Sidebar (entre Investimentos e Configurações)
- [ ] Adicionar chave `Sidebar.journal` nos 7 arquivos de mensagem:
  - pt-BR: `"Diário"`
  - en: `"Journal"`
  - es: `"Diario"`
  - fr: `"Journal"`
  - ar: `"المذكرة"`
  - hi: `"डायरी"`
  - zh: `"日记"`
**Critério:** item "Diário" aparece no sidebar; ativo em `/journal`

---

## Memory Anchors

- **Entidades-chave:** JournalEntry, JournalEntryType, HealthSnapshot (lib helper)
- **Padrões críticos:** healthScoreAtTime é imutável após criação (snapshot); helper getHealthSnapshot é server-only; serializar Decimal e Date em todas as APIs
- **Avisos:** não usar gray-matter — campos estruturados como colunas do banco; react-markdown apenas em "use client"
- **Dependências novas:** `react-markdown`, `remark-gfm` (npm install antes da issue #64)
- **Diferencial:** snapshot de contexto financeiro (healthScore + sobra) no momento de cada entrada = correlação comportamental única

## Próxima Etapa

Sem incerteza técnica — todas as tecnologias são conhecidas.

1. Revisar este PRD (2 min)
2. `/clear` → `/planejar-feature`
