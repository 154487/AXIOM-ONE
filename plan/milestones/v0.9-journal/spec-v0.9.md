# SPEC - Financial Journal (v0.9)

> Gerado por `/planejar-feature` em 2026-03-19
> PRD: plan/milestones/v0.9-journal/prd-journal.md

## Resumo

Implementar o Financial Journal: CRUD de entradas em Markdown com injeção automática de health score e sobra sustentável do mês no momento da criação. Rota `/journal` no sidebar, editor com preview Markdown, filtros por mês e tipo. Diferencial: cada entrada fica vinculada ao contexto financeiro do dia (snapshot imutável).

## Arquitetura

```
POST /api/journal
       ↓
  auth() → 401
       ↓
  validação body → 400
       ↓
  getHealthSnapshot(userId)      ← src/lib/healthSnapshot.ts
  (busca transações mês atual,       (server-only)
   calcula 4 pilares)
       ↓
  prisma.journalEntry.create()
       ↓
  serializa (Decimal→number, Date→ISO)
       ↓
  201 + entry criada
```

---

## Ordem de Implementação

1. Schema (prisma) — base de tudo
2. Helper getHealthSnapshot — usado pela API
3. API routes — CRUD completo
4. Components: Shell + List + Card — page depende de JournalShell
5. Page /journal — rota do Next.js (após Shell existir)
6. Component: Editor (Dialog)
7. Sidebar + i18n — última (não bloqueia nada)

---

## Mudanças por Arquivo

---

### MODIFY: `prisma/schema.prisma`

**Adicionar** após o enum `EntryType`:

```prisma
enum JournalEntryType {
  NOTE
  APORTE
  RESGATE
  REFLEXAO
  META
}

model JournalEntry {
  id                       String           @id @default(cuid())
  userId                   String
  title                    String
  content                  String
  entryType                JournalEntryType @default(NOTE)
  tags                     String[]
  date                     DateTime         @default(now())
  healthScoreAtTime        Int?
  sustainableSurplusAtTime Decimal?         @db.Decimal(12, 2)
  createdAt                DateTime         @default(now())
  updatedAt                DateTime         @updatedAt
  user                     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Adicionar** no model `User` (após `investmentEntries InvestmentEntry[]`):
```prisma
  journalEntries  JournalEntry[]
```

**Após editar o schema:**
```bash
npx prisma migrate dev --name add-journal-entry
npx prisma generate
```

---

### CREATE: `src/lib/healthSnapshot.ts`

**Responsabilidade:** Helper server-side — calcula health score + sobra sustentável do mês atual para um userId.

**Implementar:**
- [ ] Interface `HealthSnapshot { healthScore: number | null; sustainableSurplus: number | null; month: string }`
- [ ] Função `getHealthSnapshot(userId: string): Promise<HealthSnapshot>`
- [ ] Buscar transações do mês atual com `prisma.transaction.findMany`
- [ ] Calcular income e expenses separados
- [ ] Aplicar os 4 pilares (ref: `src/app/api/reports/overview/route.ts:56-79`)
- [ ] Retornar `sustainableSurplus = income - expenses`

**Referência:** `src/app/api/reports/overview/route.ts:44-86`

**Snippet base:**
```ts
import "server-only";
import { prisma } from "@/lib/prisma";

export interface HealthSnapshot {
  healthScore: number | null;
  sustainableSurplus: number | null;
  month: string; // "2026-03"
}

export async function getHealthSnapshot(userId: string): Promise<HealthSnapshot> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: monthStart, lte: monthEnd } },
  });

  const income   = txs.filter(t => t.type === "INCOME") .reduce((a, t) => a + parseFloat(String(t.amount)), 0);
  const expenses = txs.filter(t => t.type === "EXPENSE").reduce((a, t) => a + parseFloat(String(t.amount)), 0);

  if (income === 0) return { healthScore: null, sustainableSurplus: null, month };

  const savingsRate   = (income - expenses) / income;
  const savingsPoints = Math.min(40, Math.max(0, savingsRate * 200));
  const trendPoints   = income - expenses >= 0 ? 30 : 0;
  // Nota: Pilar 4 (Controle, 10pts) omitido intencionalmente — requer query de
  // 3 meses de histórico, complexidade não justificada para um snapshot rápido.
  // healthScore máximo aqui é 90 (vs 100 em Reports). É esperado e aceitável.
  const healthScore   = Math.round(savingsPoints + trendPoints + 20); // renda (20) sempre presente
  const sustainableSurplus = income - expenses;

  return { healthScore, sustainableSurplus, month };
}
```

---

### CREATE: `src/app/api/journal/route.ts`

**Responsabilidade:** GET (listar) e POST (criar) entradas do journal.

**Implementar:**
- [ ] Função `serializeEntry` — converte `Decimal` → `parseFloat`, `Date` → `.toISOString()`, mantém `tags: string[]`
- [ ] `GET`: auth → filtros `month` (ex: `"2026-03"`), `type`, `tag` via searchParams → `prisma.journalEntry.findMany` ordenado por `date desc`, máx 100 → serializar
- [ ] `POST`: auth → validar `title` (obrigatório, string não vazia) e `content` (obrigatório) → `getHealthSnapshot(userId)` → `prisma.journalEntry.create` com snapshot injetado → serializar → 201

**Referência:** `src/app/api/investments/entries/route.ts:8-57` (padrão serializeEntry + GET com filtros)

**Snippet POST:**
```ts
import { getHealthSnapshot } from "@/lib/healthSnapshot";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, content, entryType, tags, date } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: "Conteúdo obrigatório" }, { status: 400 });

  const snapshot = await getHealthSnapshot(session.user.id);

  const entry = await prisma.journalEntry.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      content: content.trim(),
      entryType: entryType ?? "NOTE",
      tags: Array.isArray(tags) ? tags : [],
      date: date ? new Date(date) : new Date(),
      healthScoreAtTime: snapshot.healthScore,
      sustainableSurplusAtTime: snapshot.sustainableSurplus,
    },
  });

  return NextResponse.json(serializeEntry(entry), { status: 201 });
}
```

**Snippet GET com filtros:**
```ts
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "2026-03"
  const type  = searchParams.get("type");
  const tag   = searchParams.get("tag");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59, 999) };
  }
  if (type) where.entryType = type;
  if (tag)  where.tags = { has: tag };

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json(entries.map(serializeEntry));
}
```

---

### CREATE: `src/app/api/journal/[id]/route.ts`

**Responsabilidade:** PATCH (editar) e DELETE de entrada específica.

**Implementar:**
- [ ] Definir `serializeEntry` localmente neste arquivo (copiar de `route.ts` — mesma função, ~8 linhas; padrão do projeto: ex. `assets/route.ts` e `assets/[id]/route.ts` cada um com seu serialize)
- [ ] `PATCH`: auth → buscar entry → ownership check (404 se não existir, 403 se userId diferente) → atualizar apenas campos editáveis (title, content, entryType, tags, date) — **nunca reatualizar healthScoreAtTime** → serializar → 200
- [ ] `DELETE`: auth → ownership check → `prisma.journalEntry.delete` → 204

**Referência:** `src/app/api/investments/assets/[id]/route.ts` (padrão ownership check + PATCH/DELETE)

**Snippet PATCH:**
```ts
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.journalEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (entry.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { title, content, entryType, tags, date } = body;

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      ...(title !== undefined   && { title: title.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(entryType !== undefined && { entryType }),
      ...(tags !== undefined    && { tags }),
      ...(date !== undefined    && { date: new Date(date) }),
      // healthScoreAtTime: NUNCA atualizar — snapshot imutável
    },
  });

  return NextResponse.json(serializeEntry(updated));
}
```

---

### CREATE: `src/app/(dashboard)/journal/page.tsx`

**Responsabilidade:** Server Component — auth guard + renderiza JournalShell.

**Implementar:**
- [ ] `export const dynamic = "force-dynamic"`
- [ ] `auth()` + `redirect("/login")` se sem sessão
- [ ] Retornar `<JournalShell />`

**Referência:** `src/app/(dashboard)/investments/page.tsx` (idêntico, sem fetch adicional)

**Snippet:**
```tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { JournalShell } from "@/components/journal/JournalShell";

export default async function JournalPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <JournalShell />;
}
```

---

### CREATE: `src/components/journal/JournalShell.tsx`

**Responsabilidade:** Container client — estado global, fetch, abre editor.

**Implementar:**
- [ ] `"use client"` + imports
- [ ] Interface `JournalEntry` local com todos os campos serializados
- [ ] Estados: `entries`, `loading`, `filterMonth` (string "YYYY-MM"), `filterType` (string | null), `editorOpen` (boolean), `editingEntry` (JournalEntry | null)
- [ ] `fetchEntries()` — GET /api/journal com filtros aplicados, chamado no mount e ao mudar filtros
- [ ] Botão "Nova entrada" → `setEditorOpen(true)`
- [ ] Renderizar: título da página, controles de filtro, `<JournalList>`, `<JournalEditor>`
- [ ] Callbacks: `onSaved(entry)` — adiciona/atualiza entry no estado local; `onDeleted(id)` — remove

**Referência:** `src/components/investments/InvestmentsShell.tsx:41-60` (padrão de fetch + estado)

**Snippet estrutura:**
```tsx
"use client";

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  entryType: string;
  tags: string[];
  date: string;
  healthScoreAtTime: number | null;
  sustainableSurplusAtTime: number | null;
  createdAt: string;
}

export function JournalShell() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterType, setFilterType] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  // ...
}
```

---

### CREATE: `src/components/journal/JournalList.tsx`

**Responsabilidade:** Grid de cards com filtros visuais por mês e tipo.

**Implementar:**
- [ ] Props: `entries`, `filterMonth`, `onFilterMonthChange`, `filterType`, `onFilterTypeChange`, `onEdit(entry)`, `onDelete(id)`
- [ ] Select de mês — gera opções dos últimos 12 meses (YYYY-MM → label "Mar 2026")
- [ ] Badges de tipo clicáveis: `Todos | Nota | Aporte | Resgate | Reflexão | Meta`
- [ ] Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- [ ] Estado vazio: mensagem "Nenhuma entrada neste período. Crie a primeira!"

---

### CREATE: `src/components/journal/JournalEntryCard.tsx`

**Responsabilidade:** Card de uma entrada com preview e health score badge.

**Implementar:**
- [ ] Props: `entry: JournalEntry`, `onEdit()`, `onDelete()`
- [ ] Layout: título (bold), data formatada, badge de tipo, badges de tags, preview (2 linhas do content — strip Markdown), health score badge
- [ ] Health score badge colorido:
  - `≥ 70` → `bg-axiom-income/10 text-axiom-income` + label "Score alto"
  - `≥ 50` → `bg-axiom-hover text-white` + label "Score médio"
  - `< 50` → `bg-axiom-expense/10 text-axiom-expense` + label "Score baixo"
  - `null` → não exibir badge (sem dados do mês)
- [ ] Preview: remover `# ## * _ `` []()` com regex simples antes de exibir
- [ ] Menu de ações (⋯): "Editar" e "Excluir" — pode usar simples botões no hover ou `DropdownMenu` shadcn

**Referência:** `src/components/investments/portfolio/PortfolioSummaryCards.tsx` (estilo de card com ícone + badge)

**Snippet preview Markdown:**
```ts
function stripMarkdown(md: string): string {
  return md
    .replace(/#+\s/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .slice(0, 120);
}
```

---

### CREATE: `src/components/journal/JournalEditor.tsx`

**Antes de implementar:** `npm install react-markdown remark-gfm`

**Responsabilidade:** Dialog de criação/edição de entradas.

**Implementar:**
- [ ] Props: `open`, `onOpenChange`, `entry?: JournalEntry` (se presente → modo edição), `onSaved(entry)`
- [ ] Usar `Dialog` do shadcn (`@/components/ui/dialog`)
- [ ] Campos do form:
  - `title`: `<Input>` obrigatório
  - `entryType`: `<select>` com opções NOTE/APORTE/RESGATE/REFLEXAO/META e labels em português
  - `date`: `<input type="date">` default hoje
  - `tags`: `<Input>` onde Enter adiciona chip; chip com × para remover
  - `content`: `<textarea>` Markdown, `rows={10}`, `className="w-full bg-axiom-hover rounded-lg p-3 text-sm text-white font-mono resize-none focus:outline-none focus:ring-1 focus:ring-axiom-primary"`
- [ ] Tabs "Escrever" / "Visualizar" usando `Tabs` shadcn (apenas para o campo content)
- [ ] Na tab "Visualizar": `<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>` com `prose prose-invert` do Tailwind (se não tiver `@tailwindcss/typography`, usar estilos manuais básicos)
- [ ] Ao salvar: POST (create) ou PATCH (edit) → chamar `onSaved(entry)` → fechar dialog
- [ ] Exibir mensagem de erro inline no dialog se fetch falhar (ex: "Erro ao salvar. Tente novamente."); botão Salvar volta ao estado normal
- [ ] Modo edição: preencher form com dados da `entry`; exibir nota "(health score snapshot preservado)"

**Referência:** `src/components/transactions/TransactionDialog.tsx` (padrão Dialog shadcn com form + loading state)

**Snippet label mapa:**
```ts
const ENTRY_TYPE_LABELS: Record<string, string> = {
  NOTE: "Nota livre",
  APORTE: "Aporte",
  RESGATE: "Resgate",
  REFLEXAO: "Reflexão",
  META: "Meta",
};
```

---

### MODIFY: `src/components/layout/Sidebar.tsx`

**Alterar:**
- [ ] Adicionar `BookOpen` ao import do lucide-react (linha 9)
- [ ] Adicionar item no array `navItems` entre `/investments` e `/settings` (linha 29–30):
```ts
{ href: "/journal", label: t("journal"), icon: BookOpen },
```

---

### MODIFY: `messages/pt-BR.json`

**Adicionar** na chave `"Sidebar"`:
```json
"journal": "Diário"
```

---

### MODIFY: `messages/en.json`

**Adicionar** na chave `"Sidebar"`:
```json
"journal": "Journal"
```

---

### MODIFY: `messages/es.json`

**Adicionar** na chave `"Sidebar"`:
```json
"journal": "Diario"
```

---

### MODIFY: `messages/fr.json`

**Adicionar** na chave `"Sidebar"`:
```json
"journal": "Journal"
```

---

### MODIFY: `messages/ar.json`

**Adicionar** na chave `"Sidebar"`:
```json
"journal": "المذكرة"
```

---

### MODIFY: `messages/hi.json`

**Adicionar** na chave `"Sidebar"`:
```json
"journal": "डायरी"
```

---

### MODIFY: `messages/zh.json`

**Adicionar** na chave `"Sidebar"`:
```json
"journal": "日记"
```

---

### MODIFY: `CLAUDE.md`

**Adicionar** na tabela de Milestones:
```
| v0.9 | Financial Journal | ✅ concluída — release v0.9.0 |
```

**Adicionar** na seção "Mapa de Domínio" → Models (Prisma):
```
JournalEntry
  id, userId, title, content (Markdown), entryType (JournalEntryType),
  tags (String[]), date, healthScoreAtTime (Int?), sustainableSurplusAtTime (Decimal 12,2?),
  createdAt, updatedAt
  → relations: user
```

**Adicionar** na seção "Lib — Cache e APIs externas":
```
- `src/lib/healthSnapshot.ts` — `getHealthSnapshot(userId)` → `HealthSnapshot`, calcula health score + sobra do mês atual (server-only)
```

**Adicionar** na seção de API Routes:
```
├── journal/                   # GET list (filtros: month, type, tag), POST create (injeta health snapshot)
└── journal/[id]/              # PATCH update (snapshot imutável), DELETE
```

---

## Complexidade

**Média** — 14 arquivos (6 novos, 8 modificados), sem integrações externas novas além de `react-markdown`.

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `react-markdown` SSR | Sempre `"use client"` nos componentes que o importam |
| `String[]` no Prisma/PostgreSQL | Sintaxe nativa — funciona com `has:` e `hasSome:` no Prisma query |
| `@tailwindcss/typography` não instalado | Usar estilos manuais no preview em vez de `prose` |
| Snapshot null (sem transações no mês) | Aceito — `healthScoreAtTime: null`, badge não exibido no card |

---

## Issues (7)

### Issue #59 — Schema: model JournalEntry
**Arquivos:** `prisma/schema.prisma`
- [ ] Adicionar enum `JournalEntryType` após `EntryType`
- [ ] Adicionar model `JournalEntry` com todos os campos
- [ ] Adicionar `journalEntries JournalEntry[]` no model `User`
- [ ] `npx prisma migrate dev --name add-journal-entry`
- [ ] `npx prisma generate`
**Critério:** build passa, Prisma client tem `prisma.journalEntry`

---

### Issue #60 — Lib: helper getHealthSnapshot
**Arquivos:** `src/lib/healthSnapshot.ts` (CREATE)
- [ ] `import "server-only"` no topo
- [ ] Interface `HealthSnapshot`
- [ ] `getHealthSnapshot(userId)` — busca txs do mês atual, calcula healthScore e surplus
**Critério:** build passa sem erros de tipo

---

### Issue #61 — API: CRUD /api/journal
**Arquivos:** `src/app/api/journal/route.ts` (CREATE), `src/app/api/journal/[id]/route.ts` (CREATE)
- [ ] `serializeEntry` helper local
- [ ] GET com filtros month/type/tag
- [ ] POST com injeção de snapshot
- [ ] PATCH com ownership check (sem reatualizar snapshot)
- [ ] DELETE com ownership check → 204
**Critério:** POST retorna entry com `healthScoreAtTime` preenchido

---

### Issue #62 — Components: JournalShell + JournalList + JournalEntryCard
**Arquivos:** `src/components/journal/JournalShell.tsx` (CREATE), `src/components/journal/JournalList.tsx` (CREATE), `src/components/journal/JournalEntryCard.tsx` (CREATE)
- [ ] Shell: fetch, estados, callbacks onSaved/onDeleted
- [ ] List: grid, select de mês, badges de tipo clicáveis, estado vazio
- [ ] Card: título, data, tipo badge, tags, preview (strip markdown), health score badge colorido
**Critério:** lista exibe entradas com health score badge

---

### Issue #63 — Page: /journal
**Arquivos:** `src/app/(dashboard)/journal/page.tsx` (CREATE)
- [ ] `force-dynamic`, auth, redirect, `<JournalShell />`
**Critério:** `/journal` renderiza sem 404 (depende da issue #62)

---

### Issue #64 — Component: JournalEditor (Dialog)
**Arquivos:** `src/components/journal/JournalEditor.tsx` (CREATE)
- [ ] `npm install react-markdown remark-gfm`
- [ ] Dialog shadcn: campos title, entryType, date, tags (chips), content (textarea)
- [ ] Tabs "Escrever" / "Visualizar" com `react-markdown`
- [ ] POST (create) ou PATCH (edit) ao salvar
- [ ] Modo edição preenche form; exibe "(health score snapshot preservado)"
**Critério:** criar entrada aparece na lista com snapshot; editar preserva healthScoreAtTime

---

### Issue #65 — Sidebar + i18n + CLAUDE.md
**Arquivos:** `src/components/layout/Sidebar.tsx`, 7 arquivos de messages, `CLAUDE.md`
- [ ] Importar `BookOpen` do lucide-react no Sidebar
- [ ] Adicionar `{ href: "/journal", label: t("journal"), icon: BookOpen }` entre investments e settings
- [ ] Adicionar chave `Sidebar.journal` nos 7 arquivos de messages
- [ ] Atualizar CLAUDE.md: milestone v0.9, model JournalEntry, lib healthSnapshot, API routes
**Critério:** item "Diário" aparece no sidebar, ativo na rota `/journal`

---

## Regras de Execução

- NÃO alterar arquivos fora desta lista
- `healthScoreAtTime` é **imutável** após criação — nunca passar no PATCH
- `react-markdown` apenas em componentes `"use client"`
- `healthSnapshot.ts` deve ter `import "server-only"` — nunca importar no client
- Instalar `react-markdown remark-gfm` **antes** da issue #64
- Verificar `npm run build` ao final de cada issue
