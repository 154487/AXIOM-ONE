# SPEC - v1.5 — Bens & Passivos Aprimorado

> Gerado por `/planejar-feature` em 2026-03-20
> PRD: `plan/milestones/v1.5-wealth-items-enhanced/prd-wealth-items-enhanced.md`

## Resumo

Adicionar ao WealthItem: frequência da taxa (mensal/anual), banco credor e número de parcelas. Criar model `WealthItemInstallment` para rastrear pagamentos mensais (pago/em atraso). Exibir alertas de multa, mora, negativação e embargo quando há parcela em atraso.

## Arquitetura

```
WealthItem (schema)
  ├── rateFrequency (MONTHLY | ANNUAL)
  ├── loanBank (ID do banco credor)
  ├── loanInstallments (total de parcelas)
  └── installments[] → WealthItemInstallment
        ├── month / year (chave única por mês)
        └── status (PENDING | PAID | OVERDUE)

Fluxo de marcação de parcela:
  WealthItems.tsx (ItemRow)
    ↓ GET /api/patrimonio/items/[id]/installments?month=3&year=2026
    ↓ POST /api/patrimonio/items/[id]/installments  { month, year, status }
    ← WealthItemInstallment serializado

Cálculo de valor atual (helper centralizado):
  src/lib/wealthCalc.ts
    calcCurrentValue(base, rate, frequency, start)
    calcLateFees(installmentValue, overdueMonths)
```

---

## Mudanças por Arquivo

### Issue 1 — MODIFY: `prisma/schema.prisma`

**Adicionar:**
- [ ] Enum `RateFrequency { MONTHLY ANNUAL }`
- [ ] Enum `InstallmentStatus { PENDING PAID OVERDUE }`
- [ ] Campos em `WealthItem`:
  - `rateFrequency  RateFrequency  @default(ANNUAL)`
  - `loanBank       String?`
  - `loanInstallments Int?`
  - `installments   WealthItemInstallment[]`
- [ ] Model `WealthItemInstallment`:

```prisma
model WealthItemInstallment {
  id           String            @id @default(cuid())
  wealthItemId String
  month        Int               // 1-12
  year         Int               // ex: 2026
  status       InstallmentStatus
  paidAt       DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  item         WealthItem        @relation(fields: [wealthItemId], references: [id], onDelete: Cascade)

  @@unique([wealthItemId, month, year])
}
```

**Após editar:** `npx prisma db push --accept-data-loss && npx prisma generate`

**Critério:** `npx prisma generate` sem erros; `WealthItem` no Prisma client tem `rateFrequency`, `loanBank`, `loanInstallments`, `installments`.

---

### Issue 2 — CREATE: `src/lib/wealthCalc.ts`

**Responsabilidade:** Helper centralizado de cálculos financeiros de WealthItem (evita duplicação entre `route.ts` e `[id]/route.ts`).

**Implementar:**
- [ ] `calcCurrentValue(baseValue: number, rate: number | null, frequency: "MONTHLY" | "ANNUAL", start: Date): number`
  - `MONTHLY`: `months = elapsed / (30.4375 * 24 * 60 * 60 * 1000)`; `base * (1 + rate/100)^months`
  - `ANNUAL`: `years = elapsed / (365.25 * 24 * 60 * 60 * 1000)`; `base * (1 + rate/100)^years`
  - Se `!rate`: retorna `baseValue`
- [ ] `calcLateFees(installmentValue: number, overdueMonths: number): { fine: number; mora: number; total: number }`
  - `fine = installmentValue * 0.02` (multa única 2% Lei 10.931)
  - `mora = installmentValue * 0.01 * overdueMonths` (1%/mês)
  - `total = installmentValue + fine + mora`
- [ ] `overdueMonths(month: number, year: number): number`
  - Retorna quantos meses se passaram desde o mês da parcela até hoje

**Snippet base:**
```ts
export function calcCurrentValue(
  baseValue: number,
  rate: number | null,
  frequency: "MONTHLY" | "ANNUAL",
  start: Date
): number {
  if (!rate) return baseValue;
  if (frequency === "MONTHLY") {
    const months = (Date.now() - start.getTime()) / (30.4375 * 24 * 60 * 60 * 1000);
    return baseValue * Math.pow(1 + rate / 100, months);
  }
  const years = (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return baseValue * Math.pow(1 + rate / 100, years);
}
```

**Critério:** `npm run build` sem erros de tipagem no helper.

---

### Issue 3 — CREATE: `src/lib/loanBanks.ts`

**Responsabilidade:** Tabela estática de bancos credores com taxas típicas para empréstimos/financiamentos.

**Implementar:**
- [ ] Interface `LoanBankInfo { id, bankName, productName, typicalRatePct, rateFrequency }`
- [ ] Array `LOAN_BANKS: LoanBankInfo[]` com 18+ produtos (crédito pessoal, consignado, financiamento imóvel, financiamento veicular)
- [ ] `getLoanBankGroups(): { productType: string; banks: LoanBankInfo[] }[]` — agrupa por tipo de produto para SelectGroup
- [ ] `getLoanBankById(id: string): LoanBankInfo | undefined`

**Conteúdo do array** (baseado no PRD):
```ts
// Crédito Pessoal: Caixa 2.2%, BB 2.8%, Itaú 3.0%, Bradesco 3.2%, Santander 3.0%, Nubank 3.5%, PicPay 3.0%
// Consignado: Caixa 1.8%, BMG 1.9%, Creditas 1.5%
// Financiamento Imobiliário (a.a.): Caixa 10.5%, BB 10.8%, Itaú 10.9%, Bradesco 10.8%
// Financiamento Veicular (a.m.): Caixa 1.6%, BB 1.8%, Itaú 1.9%, Santander 1.8%
// Outro banco (typicalRatePct: 0)
```

**Agrupamento para SelectGroup:** por `productName` (ex: "Crédito Pessoal", "Consignado", "Financiamento Imobiliário", "Financiamento Veicular").

**Critério:** `npm run build` sem erros; `getLoanBankGroups()` retorna 4 grupos.

---

### Issue 4 — MODIFY: `src/app/api/patrimonio/items/route.ts` + `src/app/api/patrimonio/items/[id]/route.ts`

**Responsabilidade:** Incluir novos campos na serialização, POST e PATCH.

#### `route.ts` — Alterar:
- [ ] Importar `calcCurrentValue` de `@/lib/wealthCalc` (remover função local)
- [ ] Adicionar campos em `WealthItemSerialized`:
  ```ts
  rateFrequency: "MONTHLY" | "ANNUAL";
  loanBank: string | null;
  loanInstallments: number | null;
  ```
- [ ] Atualizar `serialize()`: incluir `rateFrequency`, `loanBank`, `loanInstallments`; passar `item.rateFrequency` para `calcCurrentValue`
- [ ] Atualizar `findMany` query: adicionar `rateFrequency`, `loanBank`, `loanInstallments` nos campos retornados (Prisma já retorna todos os campos por padrão)
- [ ] Atualizar `POST`: aceitar `rateFrequency` (default `"ANNUAL"`), `loanBank` (nullable), `loanInstallments` (nullable int)
- [ ] Validação POST: `loanInstallments` se presente deve ser inteiro > 0

#### `[id]/route.ts` — Alterar:
- [ ] Importar `calcCurrentValue` de `@/lib/wealthCalc` (remover função local)
- [ ] Destruturar `rateFrequency`, `loanBank`, `loanInstallments` do `body`
- [ ] Incluir no `prisma.wealthItem.update`: `rateFrequency`, `loanBank`, `loanInstallments`
- [ ] Retornar novos campos no JSON response
- [ ] Passar `updated.rateFrequency` para `calcCurrentValue`

**Referência de serialização:**
```ts
// Padrão existente (items/route.ts:43)
const baseValue = parseFloat(String(item.value));
// Novo:
rateFrequency: item.rateFrequency as "MONTHLY" | "ANNUAL",
loanBank: item.loanBank,
loanInstallments: item.loanInstallments,
```

**Critério:** `npm run build` sem erros; POST aceita `rateFrequency: "MONTHLY"` e serializa corretamente.

---

### Issue 5 — CREATE: `src/app/api/patrimonio/items/[id]/installments/route.ts`

**Responsabilidade:** CRUD de parcelas mensais para um WealthItem.

**Implementar:**
- [ ] `GET` com query params `?month=&year=`:
  - Auth check
  - Ownership check no WealthItem pai
  - Retorna `WealthItemInstallment | null` para o mês/ano solicitado
  - Também retorna `paidCount` (total de PAID para o item)
- [ ] `POST` body `{ month, year, status }`:
  - Auth check + ownership check
  - Valida `status` ∈ `["PAID", "OVERDUE", "PENDING"]`
  - Valida `month` ∈ 1-12 e `year` razoável (2020-2050)
  - `upsert` por `@@unique([wealthItemId, month, year])`
  - Se `status === "PAID"`: sets `paidAt = new Date()`; else `paidAt = null`
  - Retorna o `WealthItemInstallment` serializado

**Interface de retorno:**
```ts
export interface InstallmentSerialized {
  id: string;
  wealthItemId: string;
  month: number;
  year: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  paidAt: string | null;
}

export interface InstallmentStatusResponse {
  installment: InstallmentSerialized | null;
  paidCount: number; // total de parcelas PAID do item (para projeção)
}
```

**Critério:** `npm run build`; POST retorna 200 com status correto; GET retorna null para mês sem registro.

---

### Issue 6 — MODIFY: `src/components/patrimonio/WealthItemDialog.tsx`

**Responsabilidade:** Adicionar toggle de frequência, seletor de banco credor e campo de parcelas.

**Adicionar estado:**
- [ ] `rateFrequency: "MONTHLY" | "ANNUAL"` — default `"ANNUAL"`; inicializar com `item?.rateFrequency ?? "ANNUAL"`
- [ ] `loanBank: string` — default `""`; inicializar com `item?.loanBank ?? ""`
- [ ] `loanInstallments: string` — default `""`; inicializar com `item?.loanInstallments?.toString() ?? ""`

**Alterar campo de taxa:**
- [ ] Ao lado do Input de taxa: dois botões toggle `% a.m.` / `% a.a.` que setam `rateFrequency`
- [ ] Preview: se `MONTHLY` mostrar "Em 12 meses: R$X" (`parsedValue * (1 + rate/100)^12`); se `ANNUAL` manter "Em 1 ano: R$X"
- [ ] Badge hint: `% a.m.` ou `% a.a.` visível no label

**Nova seção "Empréstimo"** — renderizar apenas quando `itemType === "LIABILITY"` E `category` ∈ `["Empréstimo Pessoal", "Financiamento Imobiliário", "Financiamento Veicular"]`:
> "Consignado" não existe em `LIABILITY_CATEGORIES` hoje. Adicionar à lista antes de usar na condição (ou omitir da condição).
- [ ] Select de banco credor usando `getLoanBankGroups()` (mesmo padrão de `GoalDialog.tsx:227`)
  - `SelectGroup` por tipo de produto
  - Mostrar `typicalRatePct% a.m.` ou `typicalRatePct% a.a.` no item
- [ ] Ao selecionar banco: auto-fill `appreciationRate` + `rateFrequency` com `typicalRatePct` + `rateFrequency` do banco (só se campo vazio); ao clicar no botão de sugestão de categoria (RATE_SUGGESTIONS), forçar `rateFrequency = "ANNUAL"` junto — evita sugerir 6%/m por engano
- [ ] Input `loanInstallments`: número inteiro, placeholder "Ex: 48"
- [ ] Preview de quitação: se `loanInstallments` preenchido, mostrar "Previsão de quitação: [mês/ano]"
  ```ts
  const months = parseInt(loanInstallments);
  if (!isNaN(months) && months > 0) {
    const now = new Date();
    // ATENÇÃO: usar construtor, não setMonth() — evita bug de overflow de mês
    const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
    // "Quitação em dez/2028 (48 parcelas)"
  }
  ```

**Alterar handleSubmit:**
- [ ] Incluir `rateFrequency`, `loanBank: loanBank || null`, `loanInstallments: parsedInstallments || null` no body

**Critério:** `npm run build`; dialog de passivo mostra seção de empréstimo ao selecionar categoria correta.

---

### Issue 7 — MODIFY: `src/components/patrimonio/WealthItems.tsx`

**Responsabilidade:** Atualizar ItemRow para exibir frequência, banco credor e tracker de parcelas mensais.

**Alterar `ItemRow` — badge de taxa (linha 233):**
- [ ] Substituir `% a.a.` fixo por `item.rateFrequency === "MONTHLY" ? "%/m" : "%/a"`
- [ ] Title do badge: atualizar para incluir frequência

**Adicionar em `ItemRow` — banco credor:**
- [ ] Se `item.loanBank`: mostrar badge com nome do banco após a categoria
  - Usar `getLoanBankById(item.loanBank)?.bankName` de `loanBanks.ts`
  - Estilo: mesmo badge cinza de categoria

**Adicionar componente `InstallmentTracker`** (local ao arquivo ou sub-componente):
- [ ] Renderizado abaixo do ItemRow quando `item.loanInstallments != null`
- [ ] Ao montar: `GET /api/patrimonio/items/[id]/installments?month=M&year=Y` (mês corrente)
- [ ] Estado: `installment: InstallmentSerialized | null`, `paidCount: number`, `loading: boolean`, `marking: boolean`
- [ ] Projeção de quitação: `remaining = item.loanInstallments - paidCount`; data = `addMonths(now, remaining)`
- [ ] Exibição por status:
  - **Sem registro (null):** `"Parcela [paidCount+1]/[loanInstallments] • [Mês Ano]"` + botões `[✓ Marcar paga]` `[⚠ Em atraso]`
  - **PAID:** badge verde `✅ Parcela [paidCount]/[loanInstallments] paga` + previsão "Quitação: [data]"
  - **OVERDUE:** badge vermelho `⚠ Em atraso` + alerta sempre visível (não expandível — espaço limitado na row) com multa/mora calculados via `calcLateFees(overdueMonths(inst.month, inst.year))`; mensagem "Risco de negativação após 30 dias • Risco de embargo após 90 dias"
  > **Limitação conhecida:** `paidCount+1` assume marcação sequencial. Se o usuário pular meses, o número da parcela exibido pode estar defasado — comportamento esperado para v1.5.
  - **PENDING:** mesmo que null (pode ser re-marcado)
- [ ] Botões chamam `POST /api/patrimonio/items/[id]/installments` e atualizam estado local
- [ ] `addMonths` helper local: `const d = new Date(); d.setMonth(d.getMonth() + n); return d`

**Critério:** `npm run build`; ItemRow com `loanInstallments` mostra tracker; botões funcionam sem reload.

---

## Ordem de Implementação

1. **Schema** — enums + campos + model novo + `db push` + `generate`
2. **wealthCalc.ts** — helper de cálculo (sem deps do projeto)
3. **loanBanks.ts** — dados estáticos (sem deps do projeto)
4. **API items** — serialização + POST + PATCH com novos campos
5. **API installments** — endpoint novo
6. **WealthItemDialog** — UI do form
7. **WealthItems ItemRow** — display + tracker

---

## Issues Sugeridas

### Issue #97 — Schema: RateFrequency + InstallmentStatus + WealthItemInstallment
**Arquivos:** `prisma/schema.prisma`

**Tasks:**
- [ ] Adicionar enum `RateFrequency { MONTHLY ANNUAL }`
- [ ] Adicionar enum `InstallmentStatus { PENDING PAID OVERDUE }`
- [ ] Adicionar campos `rateFrequency`, `loanBank`, `loanInstallments`, `installments[]` em `WealthItem`
- [ ] Criar model `WealthItemInstallment` com `@@unique([wealthItemId, month, year])`
- [ ] Rodar `npx prisma db push --accept-data-loss && npx prisma generate`

**Critério:** `npx prisma studio` mostra novos campos em WealthItem; build passa

---

### Issue #98 — Lib: wealthCalc.ts + loanBanks.ts
**Arquivos:** `src/lib/wealthCalc.ts` (CREATE), `src/lib/loanBanks.ts` (CREATE)

**Tasks:**
- [ ] CREATE `src/lib/wealthCalc.ts` com `calcCurrentValue`, `calcLateFees`, `overdueMonths`
- [ ] CREATE `src/lib/loanBanks.ts` com `LoanBankInfo`, `LOAN_BANKS` (18+ produtos), `getLoanBankGroups()`, `getLoanBankById()`

**Critério:** `npm run build` sem erros; `getLoanBankGroups()` retorna 4 grupos

---

### Issue #99 — API: items serialização + installments endpoint
**Arquivos:** `src/app/api/patrimonio/items/route.ts` (MODIFY), `src/app/api/patrimonio/items/[id]/route.ts` (MODIFY), `src/app/api/patrimonio/items/[id]/installments/route.ts` (CREATE)

**Tasks:**
- [ ] Importar `calcCurrentValue` de `@/lib/wealthCalc` em ambas as routes (remover função local)
- [ ] Adicionar `rateFrequency`, `loanBank`, `loanInstallments` em `WealthItemSerialized` + `serialize()`
- [ ] Atualizar POST em `route.ts` para aceitar novos campos
- [ ] Atualizar PATCH em `[id]/route.ts` para aceitar novos campos
- [ ] CREATE `installments/route.ts`: GET retorna status do mês + paidCount; POST faz upsert do status

**Critério:** POST `/api/patrimonio/items` com `rateFrequency: "MONTHLY"` serializa corretamente; POST `/api/patrimonio/items/[id]/installments` com `{ month: 3, year: 2026, status: "PAID" }` retorna 200

---

### Issue #100 — UI: WealthItemDialog atualizado
**Arquivos:** `src/components/patrimonio/WealthItemDialog.tsx` (MODIFY)

**Tasks:**
- [ ] Adicionar estado `rateFrequency`, `loanBank`, `loanInstallments`
- [ ] Toggle `% a.m.` / `% a.a.` ao lado do campo de taxa
- [ ] Preview atualiza dinamicamente conforme frequência (12 meses para mensal, 1 ano para anual)
- [ ] Seção "Empréstimo" condicional para LIABILITY com categoria de empréstimo/financiamento
- [ ] Select de banco com `getLoanBankGroups()` (padrão GoalDialog.tsx:227)
- [ ] Auto-fill taxa ao selecionar banco
- [ ] Campo `loanInstallments` com preview de data de quitação
- [ ] Submit envia novos campos

**Critério:** `npm run build`; ao selecionar "Empréstimo Pessoal" aparece seção de banco; ao selecionar Nubank auto-preenche 3.5%/m

---

### Issue #101 — UI: WealthItems ItemRow + InstallmentTracker
**Arquivos:** `src/components/patrimonio/WealthItems.tsx` (MODIFY)

**Tasks:**
- [ ] Badge de taxa usa `rateFrequency` do item (`%/m` ou `%/a`)
- [ ] Badge de banco credor com `getLoanBankById(item.loanBank)?.bankName`
- [ ] Componente `InstallmentTracker` com fetch do mês corrente
- [ ] Exibição por status: null/PENDING → botões; PAID → badge verde + quitação; OVERDUE → badge vermelho + multa/mora + alerta
- [ ] Alerta de atraso inclui: valor da multa (2%), mora (1%/mês), aviso de negativação (30d) e embargo (90d)

**Critério:** `npm run build`; item com `loanInstallments: 48` mostra tracker; marcar como paga atualiza badge sem reload

---

## Complexidade

**Média** — 7 arquivos (2 novos em lib/, 1 nova API route, 4 modificados). Sem integrações externas.

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| `calcCurrentValue` duplicado em 2 routes hoje | Criar helper lib/ na issue #98 e importar em ambas na issue #99 |
| `WealthItemInstallment` cresce sem limite | Aceitar por ora — são poucos itens por usuário |
| Toggle `% a.m.` / `% a.a.` conflita com RATE_SUGGESTIONS (sempre anual) | Manter sugestões como anuais; ao usar toggle mensal, sugestões somem ou mostram equivalência |
| Prisma generate pode falhar se `.next` corrompido | `rm -rf .next && npm run build` se necessário |

## Regras de Execução

- NÃO alterar arquivos fora da lista acima
- Seguir ordem: schema → lib → API → UI
- 1 issue = 1 commit no formato `feat(v1.5): descrição (#N)`
- `npm run build` obrigatório antes de cada commit
