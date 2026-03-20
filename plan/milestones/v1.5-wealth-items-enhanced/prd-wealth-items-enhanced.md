# PRD - v1.5 — Bens & Passivos Aprimorado

> Gerado por `/pesquisar-feature` em 2026-03-20

## Objetivo

Evoluir a tela de Bens e Passivos com: (A) suporte a taxa de correção mensal **ou** anual; (B) rastreamento de empréstimos com banco credor, número de parcelas, registro mensal de pagamento (paga/em atraso) e projeção de quitação real baseada no histórico de pagamentos; (C) alertas sobre consequências de atraso (multa, mora, negativação, embargo); (D) melhorias de UX e análise patrimonial que faltam na tela.

---

## Contexto do Projeto

### Arquivos Relevantes

| Arquivo | Por que é relevante |
|---------|---------------------|
| `prisma/schema.prisma` | Model `WealthItem` — adicionar `rateFrequency`, `loanBank` |
| `src/app/api/patrimonio/items/route.ts` | Serialização + cálculo de valor atual + POST |
| `src/app/api/patrimonio/items/[id]/route.ts` | PATCH com lógica de reset de appreciationStart |
| `src/components/patrimonio/WealthItemDialog.tsx` | Form create/edit — 6 campos hoje, recebe novos |
| `src/components/patrimonio/WealthItems.tsx` | Lista + ItemRow + summary bar 3 cards |
| `src/lib/brazilianBanks.ts` | Padrão de tabela estática de bancos a seguir |
| `src/components/patrimonio/PatrimonioShell.tsx` | Orquestra fetches, recebe `itemsData?.net` |

### Padrões a Reaproveitar

#### 1. Padrão de banco estático com agrupamento
- **Arquivo:** `src/lib/brazilianBanks.ts`
- **Uso:** `BankProductInfo[]` com `bankName`, `productName`, `cdiPct`; `getBankGroups()` para Select agrupado; `getBankProductById()` para lookup
- **Aplicar em:** Nova tabela `LOAN_BANKS` com taxas típicas por banco + tipo de empréstimo

#### 2. Padrão de taxa com frequência (já visto em GoalCard)
- **Arquivo:** `src/components/patrimonio/GoalCard.tsx`
- **Uso:** `monthlyEquivalent = freq === "DAILY" ? contrib * 30 : freq === "WEEKLY" ? contrib * 4.33 : contrib`
- **Aplicar em:** `calcCurrentValue` adaptar para `rateFrequency === "MONTHLY"` vs `"ANNUAL"`

#### 3. Padrão de serialização Decimal → number
- **Arquivo:** `src/app/api/patrimonio/items/route.ts:33`
- **Uso:** `parseFloat(String(item.value))`
- **Aplicar em:** Todo campo Decimal novo no schema

#### 4. Padrão de campo de preview em tempo real
- **Arquivo:** `src/components/patrimonio/WealthItemDialog.tsx` (previewNext)
- **Uso:** Calcular `parsedValue * (1 + rate/100)^1` antes do submit e exibir como hint
- **Aplicar em:** Preview de saldo devedor com taxa mensal

#### 5. Padrão de SelectGroup + SelectLabel
- **Arquivo:** `src/components/patrimonio/GoalDialog.tsx`
- **Uso:** `getBankGroups()` → `{bankName, products[]}` → `SelectGroup` + `SelectLabel` por banco
- **Aplicar em:** Seletor de banco credor no dialog de passivos

---

## Análise: Estado Atual da Tela

### O que funciona bem ✅
- CRUD completo (criar, editar, excluir)
- Separação ASSET / LIABILITY com totais e líquido
- Taxa de valorização/depreciação com juros compostos (recém adicionada)
- Preview de valor em 1 ano com a taxa
- Sugestões de taxa por categoria (Imóvel +6%, Veículo -10%)
- Badge ↑/↓ na listagem com ganho/perda acumulado

### O que falta ❌

**Crítico para esta milestone:**
1. **Frequência da taxa** — só suporta anual hoje; empréstimos usam taxa **mensal** (ex: 2,5% a.m.)
2. **Banco credor em empréstimos** — sem identificação de onde veio o débito
3. **Tabela de taxas por banco** — o usuário não sabe quanto cada banco cobra tipicamente
4. **Projeção de quitação** — "em X meses você quita pagando R$Y/mês"

**Melhorias de UX (próximas milestones):**
5. **Breakdown por categoria** no summary — "Imóveis: R$X | Veículos: R$Y | Investimentos: R$Z"
6. **Relação dívida/ativo** — LTV para financiamento imobiliário (saldo / valor do imóvel)
7. **Total de juros a pagar** — quanto vai sair do bolso em juros ao longo do empréstimo
8. **Linha do tempo de valores** — histórico de como o patrimônio físico evoluiu (requer model WealthItemSnapshot)
9. **Razão dívida/renda** — (soma de parcelas mensais) / renda média mensal (cross com `reports/networth`)
10. **Multi-moeda** — imóveis em USD para quem tem propriedade no exterior

---

## Feature A — Frequência da Taxa (MONTHLY | ANNUAL)

### Schema
```prisma
enum RateFrequency {
  MONTHLY
  ANNUAL
}

model WealthItem {
  ...
  appreciationRate      Decimal?      @db.Decimal(7, 4)
  rateFrequency         RateFrequency @default(ANNUAL)
  appreciationStart     DateTime?
  ...
}
```

### Cálculo atualizado
```ts
function calcCurrentValue(baseValue, rate, frequency, start): number {
  if (!rate) return baseValue;
  if (frequency === "MONTHLY") {
    const months = (Date.now() - start.getTime()) / (30.4375 * 24 * 60 * 60 * 1000);
    return baseValue * Math.pow(1 + rate / 100, months);
  }
  // ANNUAL (default)
  const years = (Date.now() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return baseValue * Math.pow(1 + rate / 100, years);
}
```

### UI
- Radio/Select ao lado do campo de taxa: `○ % a.m.  ● % a.a.`
- Preview atualiza dinamicamente: "Em 12 meses: R$X" (mostra 12 meses para mensal, 1 ano para anual — mesma janela de tempo)
- Badge no ItemRow: `↑ 2,5%/m` ou `↑ 6%/a`

---

## Feature B — Empréstimo com Banco Credor

### Schema
```prisma
model WealthItem {
  ...
  loanBank          String?   // ID do banco credor (ex: "caixa-pessoal")
  loanInstallments  Int?      // Total de parcelas (ex: 48)
  ...
}

// Registra se cada parcela foi paga ou está em atraso
model WealthItemInstallment {
  id          String   @id @default(cuid())
  wealthItemId String
  month       Int      // 1-12
  year        Int      // ex: 2026
  status      InstallmentStatus
  paidAt      DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  item        WealthItem @relation(fields: [wealthItemId], references: [id], onDelete: Cascade)
  @@unique([wealthItemId, month, year])
}

enum InstallmentStatus {
  PENDING   // ainda não chegou o vencimento ou não foi marcada
  PAID      // paga no mês
  OVERDUE   // em atraso
}
```
> `loanInstallments` informa o total (ex: 48x). O número de `PAID` installments = parcelas pagas.
> Projeção real: `loanInstallments - count(PAID)` parcelas restantes.
> Alertas de atraso surgem quando uma parcela do mês atual (ou anterior) está `OVERDUE` ou `PENDING`.

### Alertas de atraso (Feature C — novo)

Quando status `OVERDUE`:
- **Multa legal:** 2% sobre o valor da parcela (Lei 10.931/2004)
- **Mora:** 1% a.m. por mês de atraso
- **Negativação:** alerta após 30 dias em atraso (SPC/Serasa)
- **Embargo:** risco de ação judicial para dívidas acima de 40 salários mínimos ou após 90 dias

Exibir no ItemRow um badge vermelho `⚠️ Em atraso` e ao expandir mostrar o cálculo estimado de quanto a dívida cresceu com multa + mora.

### Tabela estática de bancos para empréstimos

Criar `src/lib/loanBanks.ts` (separado de `brazilianBanks.ts` para não poluir):

```ts
export interface LoanBankInfo {
  id: string;
  bankName: string;
  productName: string;   // "Crédito Pessoal", "Consignado", "Financ. Imóvel"
  typicalRatePct: number; // % a.m. — referência
  rateFrequency: "MONTHLY" | "ANNUAL";
}

export const LOAN_BANKS: LoanBankInfo[] = [
  // Crédito Pessoal
  { id: "caixa-pessoal",   bankName: "Caixa Econômica", productName: "Crédito Pessoal",   typicalRatePct: 2.2,  rateFrequency: "MONTHLY" },
  { id: "bb-pessoal",      bankName: "Banco do Brasil", productName: "Crédito Pessoal",   typicalRatePct: 2.8,  rateFrequency: "MONTHLY" },
  { id: "itau-pessoal",    bankName: "Itaú",             productName: "Crédito Pessoal",   typicalRatePct: 3.0,  rateFrequency: "MONTHLY" },
  { id: "bradesco-pessoal",bankName: "Bradesco",         productName: "Crédito Pessoal",   typicalRatePct: 3.2,  rateFrequency: "MONTHLY" },
  { id: "santander-pessoal",bankName:"Santander",        productName: "Crédito Pessoal",   typicalRatePct: 3.0,  rateFrequency: "MONTHLY" },
  { id: "nubank-pessoal",  bankName: "Nubank",           productName: "Crédito Pessoal",   typicalRatePct: 3.5,  rateFrequency: "MONTHLY" },
  { id: "picpay-pessoal",  bankName: "PicPay",           productName: "Crédito Pessoal",   typicalRatePct: 3.0,  rateFrequency: "MONTHLY" },
  // Consignado
  { id: "caixa-consig",    bankName: "Caixa Econômica", productName: "Consignado",         typicalRatePct: 1.8,  rateFrequency: "MONTHLY" },
  { id: "bmg-consig",      bankName: "Banco BMG",        productName: "Consignado",         typicalRatePct: 1.9,  rateFrequency: "MONTHLY" },
  { id: "creditas-consig", bankName: "Creditas",         productName: "Consignado/Garantia",typicalRatePct: 1.5,  rateFrequency: "MONTHLY" },
  // Financiamento Imobiliário (taxa anual)
  { id: "caixa-imovel",    bankName: "Caixa Econômica", productName: "Financ. Imobiliário",typicalRatePct: 10.5, rateFrequency: "ANNUAL"  },
  { id: "bb-imovel",       bankName: "Banco do Brasil", productName: "Financ. Imobiliário",typicalRatePct: 10.8, rateFrequency: "ANNUAL"  },
  { id: "itau-imovel",     bankName: "Itaú",             productName: "Financ. Imobiliário",typicalRatePct: 10.9, rateFrequency: "ANNUAL"  },
  { id: "bradesco-imovel", bankName: "Bradesco",         productName: "Financ. Imobiliário",typicalRatePct: 10.8, rateFrequency: "ANNUAL"  },
  // Financiamento Veicular
  { id: "caixa-veiculo",   bankName: "Caixa Econômica", productName: "Financ. Veicular",   typicalRatePct: 1.6,  rateFrequency: "MONTHLY" },
  { id: "bb-veiculo",      bankName: "Banco do Brasil", productName: "Financ. Veicular",   typicalRatePct: 1.8,  rateFrequency: "MONTHLY" },
  { id: "itau-veiculo",    bankName: "Itaú",             productName: "Financ. Veicular",   typicalRatePct: 1.9,  rateFrequency: "MONTHLY" },
  { id: "santander-veiculo",bankName:"Santander",        productName: "Financ. Veicular",   typicalRatePct: 1.8,  rateFrequency: "MONTHLY" },
  { id: "outro-emprestimo",bankName: "Outro banco",      productName: "Empréstimo",         typicalRatePct: 0,    rateFrequency: "MONTHLY" },
];
```

### UX no Dialog — seção "Empréstimo" (só para LIABILITY)
Ao selecionar uma categoria de passivo (`Empréstimo Pessoal`, `Financiamento Imobiliário`, `Financiamento Veicular`), exibir uma seção adicional:

```
[ Banco credor (opcional)      ▼ ]     ← SelectGroup agrupado por tipo
[ Taxa de juros: [ 2,5 ] % a.m. ]     ← auto-preenchida com típica do banco selecionado
[ Número de parcelas: [ 48 ]    ]     ← total de parcelas (ex: 48x)
  ℹ️  Previsão de quitação: dez/2029  ← calculado a partir das parcelas restantes
```

### Marcação mensal de pagamento (InstallmentTracker)

Na tela `WealthItems`, cada passivo com `loanInstallments` exibe ao lado:
```
Financiamento Caixa  [Caixa Imóvel]  ↑ 10,5%/a   R$ 320.000
  Parcela 18/360 • Março 2026: [ Marcar como paga ] [ Marcar em atraso ]
```

Lógica:
- Ao entrar na tela: verifica se o mês atual tem `WealthItemInstallment` com status `PAID` ou `OVERDUE`
- Se não tem registro do mês atual → mostra botões de ação
- Se `PAID` → mostra badge verde `✅ Paga`
- Se `OVERDUE` → mostra badge vermelho `⚠️ Em atraso` + alerta de multa/mora

### Projeção de quitação (real)

Baseada em: `loanInstallments - count(PAID installments) = parcelas restantes`
```ts
const paidCount = installments.filter(i => i.status === "PAID").length;
const remaining = loanInstallments - paidCount;
const targetDate = addMonths(new Date(), remaining);
// "Quitação prevista em dez/2029 (31 parcelas restantes)"
```

### Alertas de atraso

Quando `OVERDUE`:
```ts
const fine = installmentValue * 0.02;          // multa 2% (Lei 10.931)
const mora = installmentValue * 0.01 * months; // mora 1%/mês
const total = installmentValue + fine + mora;
// "Esta parcela em atraso gerou R$ X em multa + mora"
// "Risco de negativação após 30 dias • Risco de embargo após 90 dias"
```

---

## Feature C — Melhorias de UX na Listagem

### C1: Badge de crescimento na summary bar
Hoje: 3 cards estáticos (Ativos | Passivos | Líquido).
Adicionar ao card de Passivos: total de juros que serão cobrados (se houver taxa em algum passivo).

### C2: ItemRow — mostrar banco credor em passivos
```
Empréstimo Pessoal   [Nubank]  ↑ 3,5%/m          R$ 15.000
                                              + R$ 1.230 juros
```

### C3: WealthItem — breakdown no summary expandido
Substituir os 3 cards por 4 linhas de breakdown em grid:
```
ATIVOS                              PASSIVOS
Imóveis    R$ 850.000               Financiamentos  R$ 320.000
Veículos   R$ 45.000 (↓ R$ 8k)     Empréstimos     R$ 15.000
Outros     R$ 12.000                Cartões         R$  3.200
──────────────────────────────────────────────────
Líquido: R$ 568.800
```

---

## Escopo da Milestone v1.5

### Incluído
- [ ] `RateFrequency` enum no schema + campo `rateFrequency` em WealthItem
- [ ] `loanBank String?` + `loanInstallments Int?` no schema WealthItem
- [ ] Model `WealthItemInstallment` + enum `InstallmentStatus` (PENDING/PAID/OVERDUE)
- [ ] `calcCurrentValue` adaptado para frequência mensal/anual
- [ ] `src/lib/loanBanks.ts` — tabela estática de bancos credores com taxas típicas
- [ ] Dialog: toggle mensal/anual ao lado do campo de taxa
- [ ] Dialog: seletor de banco credor + campo número de parcelas para LIABILITY
- [ ] Dialog: taxa auto-preenchida com sugestão do banco + override pelo usuário
- [ ] Dialog: preview de previsão de quitação (data estimada)
- [ ] ItemRow: badge `↑ 2,5%/m` vs `↑ 6%/a` (com frequência)
- [ ] ItemRow: mostrar banco credor + parcela atual (ex: "18/360") se informado
- [ ] ItemRow: botões "Marcar como paga / Em atraso" para o mês corrente
- [ ] ItemRow: badge `✅ Paga` ou `⚠️ Em atraso` com cálculo de multa+mora
- [ ] Alertas de consequências: negativação (30d), embargo (90d)
- [ ] API `patrimonio/items/[id]/installments`: GET mês atual + POST marcar status
- [ ] API: incluir `rateFrequency`, `loanBank`, `loanInstallments` em serialização + POST + PATCH

### Excluído (próximas milestones)
- Breakdown por categoria no summary
- Histórico temporal (requer nova table `WealthItemSnapshot`)
- Integração com BCB API para taxas em tempo real
- Multi-moeda em ativos
- Notificações push/email de vencimento de parcela

---

## Memory Anchors

- **Entidades-chave:** WealthItem, WealthItemInstallment, WealthItemSerialized, WealthItemsResponse, RateFrequency, InstallmentStatus (novos enums)
- **Padrões críticos:** `calcCurrentValue` em 2 lugares (route.ts + [id]/route.ts) — criar helper em lib/; Select agrupado = `getBankGroups()` pattern de `brazilianBanks.ts`; installments API separada em `items/[id]/installments/route.ts`
- **Avisos:** `appreciationRate` existente mantém semântica (positivo = cresce, negativo = decresce); ao atualizar `value` no PATCH, reset `appreciationStart = now()`; multa/mora são exibição client-side (não persistidas)
- **Dependências externas:** nenhuma — dados de taxas bancárias são estáticos em `loanBanks.ts`; limites de negativação/embargo são informativos fixos (30d/90d)

---

## Próxima Etapa

Sem incerteza técnica — dados estáticos, padrões claros.

1. `/clear` → `/planejar-feature` para gerar SPEC v1.5
