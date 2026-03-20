# SPEC — v0.10: Journal ↔ Investments Link

> Gerado por `/planejar-feature` em 2026-03-19

## Resumo

Vincular entradas do diário financeiro a operações de investimento via campo opcional `investmentEntryId`. Quando o tipo for APORTE ou RESGATE, o editor mostra as operações recentes para seleção. No card exibe o bloco da operação. O shell exibe um banner quando há movimentações não catalogadas nos últimos 30 dias.

---

## Arquitetura

```
JournalEntry
    │
    └── investmentEntryId? ──→ InvestmentEntry
                                    │
                                    └── asset (ticker, name, type)

Fluxo de criação:
  Usuário seleciona tipo APORTE/RESGATE
      → JournalEditor busca GET /api/journal/uncataloged
      → Usuário seleciona operação (opcional)
      → POST /api/journal { ..., investmentEntryId }

Fluxo de banner:
  JournalShell monta
      → GET /api/journal/uncataloged
      → count > 0 → banner "N movimentações não catalogadas"
```

---

## Mapeamento de tipos

| JournalEntryType | EntryType (InvestmentEntry) |
|------------------|-----------------------------|
| APORTE           | PURCHASE                    |
| RESGATE          | SALE                        |
| NOTE/REFLEXAO/META | — (sem link natural)      |

> Apenas PURCHASE e SALE aparecem como "não catalogados". DIVIDEND e SPLIT são ignorados no banner.

---

## Mudanças por Arquivo

### Issue 1 — MODIFY: `prisma/schema.prisma`

**Adicionar em `JournalEntry`:**
```prisma
investmentEntryId String?
investmentEntry   InvestmentEntry? @relation(fields: [investmentEntryId], references: [id], onDelete: SetNull)
```

**Adicionar em `InvestmentEntry`:**
```prisma
journalEntry JournalEntry?
```

**Schema final dos dois models:**
```prisma
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
  investmentEntryId        String?          // NOVO
  createdAt                DateTime         @default(now())
  updatedAt                DateTime         @updatedAt
  user                     User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  investmentEntry          InvestmentEntry? @relation(fields: [investmentEntryId], references: [id], onDelete: SetNull) // NOVO
}

model InvestmentEntry {
  id           String       @id @default(cuid())
  assetId      String
  userId       String
  type         EntryType
  date         DateTime
  quantity     Decimal      @db.Decimal(14, 6)
  price        Decimal      @db.Decimal(14, 6)
  amount       Decimal      @db.Decimal(14, 2)
  notes        String?
  createdAt    DateTime     @default(now())
  asset        Asset        @relation(fields: [assetId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  journalEntry JournalEntry? // NOVO (relação reversa)
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_journal_investment_link
npx prisma generate
```

**Critério:** `npx prisma migrate dev` roda sem erros.

---

### Issue 2 — CREATE: `src/app/api/journal/uncataloged/route.ts`

**Responsabilidade:** Retorna contagem + lista das InvestmentEntry (PURCHASE/SALE) dos últimos 30 dias sem JournalEntry vinculada. Aceita query param `?include=<id>` para incluir uma operação já vinculada (modo edição).

**Implementar:**
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date();
  since.setDate(since.getDate() - 30);

  // ?include=<investmentEntryId> — para modo edição: inclui a operação já vinculada
  const include = req.nextUrl.searchParams.get("include");

  const entries = await prisma.investmentEntry.findMany({
    where: {
      userId: session.user.id,
      OR: [
        // operações dos últimos 30 dias sem vínculo
        { type: { in: ["PURCHASE", "SALE"] }, date: { gte: since }, journalEntry: null },
        // operação já vinculada a esta entry (se passada)
        ...(include ? [{ id: include }] : []),
      ],
    },
    include: { asset: true },
    orderBy: { date: "desc" },
    take: 20,
  });

  return NextResponse.json({
    count: entries.length,
    entries: entries.map(serializeInvestmentEntry),
  });
}
```

**Serializer `serializeInvestmentEntry`:**
```ts
function serializeInvestmentEntry(e: InvestmentEntry & { asset: Asset }) {
  return {
    ...e,
    quantity: parseFloat(String(e.quantity)),
    price:    parseFloat(String(e.price)),
    amount:   parseFloat(String(e.amount)),
    date:     e.date instanceof Date ? e.date.toISOString() : e.date,
    createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
  };
}
```

**Critério:** `GET /api/journal/uncataloged` retorna `{ count: N, entries: [...] }`.

---

### Issue 3 — MODIFY: `src/app/api/journal/route.ts` + `src/app/api/journal/[id]/route.ts`

#### `route.ts` (GET + POST)

**GET — adicionar `include`:**
```ts
const entries = await prisma.journalEntry.findMany({
  where,
  orderBy: { date: "desc" },
  take: 100,
  include: {
    investmentEntry: { include: { asset: true } },   // NOVO
  },
});
```

**POST — aceitar `investmentEntryId` no body (com ownership check):**
```ts
const { title, content, entryType, tags, date, investmentEntryId } = body;

// Ownership check: garantir que a operação pertence ao usuário
if (investmentEntryId) {
  const invEntry = await prisma.investmentEntry.findUnique({ where: { id: investmentEntryId } });
  if (!invEntry || invEntry.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

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
    ...(investmentEntryId ? { investmentEntryId } : {}),
  },
  include: { investmentEntry: { include: { asset: true } } },
});
```

**`serializeEntry` — estender para incluir `investmentEntry`:**
```ts
function serializeEntry(entry: JournalEntryWithInvestment) {
  return {
    ...entry,
    sustainableSurplusAtTime: entry.sustainableSurplusAtTime
      ? parseFloat(String(entry.sustainableSurplusAtTime))
      : null,
    date:      entry.date instanceof Date      ? entry.date.toISOString()      : entry.date,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
    investmentEntry: entry.investmentEntry
      ? {
          ...entry.investmentEntry,
          quantity:  parseFloat(String(entry.investmentEntry.quantity)),
          price:     parseFloat(String(entry.investmentEntry.price)),
          amount:    parseFloat(String(entry.investmentEntry.amount)),
          date:      entry.investmentEntry.date instanceof Date ? entry.investmentEntry.date.toISOString() : entry.investmentEntry.date,
          createdAt: entry.investmentEntry.createdAt instanceof Date ? entry.investmentEntry.createdAt.toISOString() : entry.investmentEntry.createdAt,
          asset: entry.investmentEntry.asset,
        }
      : null,
  };
}
```

**Definir tipo auxiliar:**
```ts
import { JournalEntry, InvestmentEntry, Asset, Prisma } from "@/generated/prisma/client";

type JournalEntryWithInvestment = JournalEntry & {
  investmentEntry: (InvestmentEntry & { asset: Asset }) | null;
};
```

#### `[id]/route.ts` (PATCH)

**PATCH — aceitar `investmentEntryId` no body (com ownership check):**
```ts
const { title, content, entryType, tags, date, investmentEntryId } = body;

// Ownership check: garantir que a operação pertence ao usuário (se fornecida)
if (investmentEntryId) {
  const invEntry = await prisma.investmentEntry.findUnique({ where: { id: investmentEntryId } });
  if (!invEntry || invEntry.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

const updated = await prisma.journalEntry.update({
  where: { id },
  data: {
    ...(title             !== undefined && { title: title.trim() }),
    ...(content           !== undefined && { content: content.trim() }),
    ...(entryType         !== undefined && { entryType }),
    ...(tags              !== undefined && { tags }),
    ...(date              !== undefined && { date: new Date(date) }),
    ...(investmentEntryId !== undefined && { investmentEntryId: investmentEntryId ?? null }), // null desvincula
  },
  include: { investmentEntry: { include: { asset: true } } },
});
```

**Mesmo `serializeEntry` estendido** — copiar de `route.ts` (padrão do projeto: cada arquivo define o seu).

**Critério:** Build passa. GET retorna `investmentEntry` null ou populado.

---

### Issue 4 — MODIFY: `src/components/journal/JournalEditor.tsx`

**Adicionar ao estado:**
```ts
const [investmentEntryId, setInvestmentEntryId] = useState<string | null>(null);
const [recentOps, setRecentOps] = useState<RecentOp[]>([]);
const [loadingOps, setLoadingOps] = useState(false);
```

**Tipo `RecentOp`** (definir localmente no arquivo):
```ts
interface RecentOp {
  id: string;
  type: string;         // "PURCHASE" | "SALE"
  date: string;         // ISO
  quantity: number;
  price: number;
  amount: number;
  asset: { ticker: string | null; name: string };
}
```

**Carregar operações recentes quando tipo = APORTE ou RESGATE:**

> Modo edição: se `entry?.investmentEntryId` existe, passa `?include=<id>` para que a operação já vinculada apareça na lista mesmo não sendo "uncataloged".

```ts
useEffect(() => {
  if (!open) return;
  if (entryType !== "APORTE" && entryType !== "RESGATE") {
    setRecentOps([]);
    return;
  }
  setLoadingOps(true);
  const alreadyLinked = entry?.investmentEntryId;
  const url = alreadyLinked
    ? `/api/journal/uncataloged?include=${alreadyLinked}`
    : "/api/journal/uncataloged";
  fetch(url)
    .then((r) => r.json())
    .then((data) => setRecentOps(data.entries ?? []))
    .catch(() => {})
    .finally(() => setLoadingOps(false));
}, [open, entryType, entry?.investmentEntryId]);
```

**Pré-selecionar ao editar:**
```ts
// no useEffect que popula o form (já existe)
setInvestmentEntryId(entry?.investmentEntryId ?? null);
```

**Renderizar o seletor após o campo `date`:**
```tsx
{(entryType === "APORTE" || entryType === "RESGATE") && (
  <div className="flex flex-col gap-1.5">
    <Label>Operação vinculada</Label>
    {loadingOps ? (
      <p className="text-xs text-axiom-muted">Carregando...</p>
    ) : recentOps.length === 0 ? (
      <p className="text-xs text-axiom-muted italic">Nenhuma operação recente não catalogada.</p>
    ) : (
      <div className="flex flex-col gap-1.5">
        {/* Opção "nenhuma" */}
        <label className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors
          ${investmentEntryId === null
            ? "border-axiom-primary bg-axiom-primary/10"
            : "border-axiom-border hover:border-axiom-primary/50"}`}>
          <input
            type="radio"
            name="invEntry"
            checked={investmentEntryId === null}
            onChange={() => setInvestmentEntryId(null)}
            className="hidden"
          />
          <span className="text-sm text-axiom-muted">Nenhuma</span>
        </label>
        {recentOps.map((op) => {
          const label = op.asset.ticker ?? op.asset.name;
          const typeLabel = op.type === "PURCHASE" ? "Compra" : "Venda";
          const date = new Date(op.date).toLocaleDateString("pt-BR");
          return (
            <label key={op.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors
              ${investmentEntryId === op.id
                ? "border-axiom-primary bg-axiom-primary/10"
                : "border-axiom-border hover:border-axiom-primary/50"}`}>
              <input
                type="radio"
                name="invEntry"
                checked={investmentEntryId === op.id}
                onChange={() => setInvestmentEntryId(op.id)}
                className="hidden"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  {label} · {typeLabel}
                </p>
                <p className="text-xs text-axiom-muted">
                  {op.quantity} × R$ {op.price.toFixed(2)} = R$ {op.amount.toFixed(2)} · {date}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    )}
  </div>
)}
```

**Incluir no payload de save:**
```ts
body: JSON.stringify({ title, content, entryType, tags, date, investmentEntryId }),
```

**Critério:** Ao selecionar APORTE/RESGATE, aparece o seletor de operações. Build passa.

---

### Issue 5 — MODIFY: `src/components/journal/JournalEntryCard.tsx` + `src/components/journal/JournalShell.tsx`

#### `JournalEntryCard.tsx`

**Estender interface `JournalEntry` (importada de `JournalShell`):**
> A interface `JournalEntry` exportada por `JournalShell.tsx` receberá os novos campos — o card não precisa redefinir.

**Adicionar bloco de operação vinculada** (após o preview, antes do footer):
```tsx
{entry.investmentEntry && (
  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-axiom-hover border border-axiom-border text-xs">
    <span className="text-axiom-primary font-mono font-semibold">
      {entry.investmentEntry.asset.ticker ?? entry.investmentEntry.asset.name}
    </span>
    <span className="text-axiom-muted">·</span>
    <span className="text-axiom-muted">
      {entry.investmentEntry.type === "PURCHASE" ? "Compra" : "Venda"}
    </span>
    <span className="text-axiom-muted">·</span>
    <span className="text-white">
      {entry.investmentEntry.quantity}× R$ {entry.investmentEntry.price.toFixed(2)}
    </span>
    <span className="ml-auto text-axiom-muted">
      = R$ {entry.investmentEntry.amount.toFixed(2)}
    </span>
  </div>
)}
```

#### `JournalShell.tsx`

**Estender interface `JournalEntry`:**
```ts
export interface InvestmentEntryLinked {
  id: string;
  type: string;
  quantity: number;
  price: number;
  amount: number;
  date: string;
  asset: { id: string; ticker: string | null; name: string; type: string };
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  entryType: string;
  tags: string[];
  date: string;
  healthScoreAtTime: number | null;
  sustainableSurplusAtTime: number | null;
  investmentEntryId: string | null;          // NOVO
  investmentEntry: InvestmentEntryLinked | null; // NOVO
  createdAt: string;
  updatedAt: string;
}
```

**Adicionar estado e fetch do banner:**
```ts
const [uncatalogedCount, setUncatalogedCount] = useState(0);

// Adicionar ao fetchEntries ou em useEffect separado no mount:
const fetchUncataloged = useCallback(async () => {
  try {
    const res = await fetch("/api/journal/uncataloged");
    if (res.ok) {
      const data = await res.json();
      setUncatalogedCount(data.count ?? 0);
    }
  } catch { /* silent */ }
}, []);

useEffect(() => { fetchUncataloged(); }, [fetchUncataloged]);
```

**Renderizar banner antes da `<JournalList>`:**
```tsx
{uncatalogedCount > 0 && (
  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-axiom-primary/30 bg-axiom-primary/5">
    <div className="flex items-center gap-2 text-sm">
      <span className="text-axiom-primary font-medium">⚠</span>
      <span className="text-white">
        {uncatalogedCount === 1
          ? "1 movimentação não catalogada"
          : `${uncatalogedCount} movimentações não catalogadas`}
      </span>
      <span className="text-axiom-muted text-xs">(últimos 30 dias)</span>
    </div>
    <button
      onClick={openNew}
      className="text-xs text-axiom-primary hover:underline shrink-0"
    >
      Criar nota
    </button>
  </div>
)}
```

**Atualizar `uncatalogedCount` ao salvar** — adicionar `fetchUncataloged()` ao final do `handleSaved` existente, sem alterar o `setEntries`:
```ts
const handleSaved = useCallback((entry: JournalEntry) => {
  setEntries((prev) => {
    const exists = prev.find((e) => e.id === entry.id);
    if (exists) return prev.map((e) => (e.id === entry.id ? entry : e));
    return [entry, ...prev];
  });
  fetchUncataloged(); // reatualiza contagem após vincular operação
}, [fetchUncataloged]);
```

**Critério:** Banner aparece quando há operações não catalogadas. Desaparece ao criar nota vinculada.

---

## Ordem de Implementação

1. **Schema** — `prisma/schema.prisma` + migração
2. **API uncataloged** — `src/app/api/journal/uncataloged/route.ts`
3. **API journal updates** — `route.ts` + `[id]/route.ts`
4. **JournalEditor** — seletor de operações
5. **JournalEntryCard + JournalShell** — bloco de detalhes + banner

---

## Issues Sugeridas

### Issue 1: Schema — vincular JournalEntry a InvestmentEntry
**Arquivos:** `prisma/schema.prisma`

**Tasks:**
- [ ] Adicionar `investmentEntryId String?` em `JournalEntry`
- [ ] Adicionar relação `investmentEntry InvestmentEntry? @relation(...)` com `onDelete: SetNull`
- [ ] Adicionar relação reversa `journalEntry JournalEntry?` em `InvestmentEntry`
- [ ] `npx prisma migrate dev --name add_journal_investment_link`
- [ ] `npx prisma generate`

**Critério:** Build passa, migração roda sem erros.

---

### Issue 2: API — GET /api/journal/uncataloged
**Arquivos:** `src/app/api/journal/uncataloged/route.ts` (CREATE)

**Tasks:**
- [ ] Auth check padrão
- [ ] Aceitar query param `?include=<investmentEntryId>` (modo edição)
- [ ] Query com `OR`: `{ journalEntry: null, últimos 30 dias }` + `{ id: include }` (se passado)
- [ ] Include `asset`
- [ ] Serializar Decimals e Dates
- [ ] Retornar `{ count, entries }`

**Critério:** `GET /api/journal/uncataloged` retorna JSON correto. Com `?include=<id>`, retorna a operação já vinculada mesmo que tenha vínculo.

---

### Issue 3: API — atualizar /api/journal e /api/journal/[id]
**Arquivos:** `src/app/api/journal/route.ts`, `src/app/api/journal/[id]/route.ts`

**Tasks:**
- [ ] Definir tipo `JournalEntryWithInvestment` em ambos os arquivos
- [ ] Estender `serializeEntry` para serializar `investmentEntry` (Decimal + Date)
- [ ] GET: adicionar `include: { investmentEntry: { include: { asset: true } } }`
- [ ] POST: aceitar `investmentEntryId` do body, **ownership check** antes do create (403 se não pertence ao usuário)
- [ ] PATCH: aceitar `investmentEntryId` do body (`null` desvincula), **ownership check** antes do update

**Critério:** Build passa. GET retorna campo `investmentEntry` (null ou populado). POST/PATCH retornam 403 se `investmentEntryId` de outro usuário.

---

### Issue 4: Component — JournalEditor com seletor de operações
**Arquivos:** `src/components/journal/JournalEditor.tsx`

**Tasks:**
- [ ] Adicionar interface `RecentOp` local
- [ ] Estado: `investmentEntryId`, `recentOps`, `loadingOps`
- [ ] `useEffect` que busca `/api/journal/uncataloged` quando tipo = APORTE ou RESGATE
  - Modo edição: se `entry?.investmentEntryId` existe, usar `?include=<id>` para carregar a operação já vinculada
  - Dependências do effect: `[open, entryType, entry?.investmentEntryId]`
- [ ] Pré-selecionar `investmentEntryId` ao editar entry existente (no useEffect do form)
- [ ] Renderizar lista de radio buttons estilizados entre `date` e `tags`
- [ ] Incluir `investmentEntryId` no payload do save (POST/PATCH)

**Critério:** Seletor aparece apenas para APORTE/RESGATE. Modo edição mostra a operação já vinculada pré-selecionada. Operação é vinculada ao salvar.

---

### Issue 5: Components — JournalEntryCard (bloco) + JournalShell (banner + interface)
**Arquivos:** `src/components/journal/JournalShell.tsx`, `src/components/journal/JournalEntryCard.tsx`

**Tasks:**
- [ ] Estender interface `JournalEntry` em `JournalShell.tsx` com `investmentEntryId` e `investmentEntry`
- [ ] Adicionar interface `InvestmentEntryLinked` em `JournalShell.tsx`
- [ ] Adicionar estado `uncatalogedCount` + `fetchUncataloged` callback
- [ ] `useEffect` no mount para buscar contagem
- [ ] Chamar `fetchUncataloged()` dentro de `handleSaved`
- [ ] Renderizar banner condicional entre o header e a `<JournalList>`
- [ ] Em `JournalEntryCard.tsx`: renderizar bloco de operação quando `entry.investmentEntry != null`

**Critério:** Banner aparece/desaparece corretamente. Card exibe detalhes da operação vinculada.

---

## Complexidade

**Média** — 7 arquivos (1 create, 6 modify), sem integrações externas novas, schema change com migration.

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `onDelete: SetNull` exige campo opcional | `investmentEntryId String?` — já está opcional |
| Operação vinculada a mais de um diário | Relação 1-para-1 no Prisma (`journalEntry JournalEntry?`) garante unicidade |
| Banner não atualiza após vínculo | `fetchUncataloged()` chamado dentro de `handleSaved` (snippet completo na Issue 5) |
| Operações antigas aparecendo no seletor | Filtro `journalEntry: null` no endpoint garante apenas não vinculadas |
| Seletor vazio no modo edição | Endpoint aceita `?include=<id>` — operação já vinculada sempre aparece na lista |
| `investmentEntryId` de outro usuário | Ownership check no POST/PATCH antes do Prisma — retorna 403 |

## Próxima Etapa

Após aprovar esta SPEC:
1. `/revisar-spec`
2. `/publicar-milestone`
3. `/executar-milestone`
