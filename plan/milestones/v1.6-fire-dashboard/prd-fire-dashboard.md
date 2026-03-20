# PRD - FIRE/FI Dashboard Evoluído

> Gerado por `/pesquisar-feature` em 2026-03-20

## Objetivo

Evoluir o componente `FireProjection` atual (simples, baseado só em médias de renda/gasto) para um dashboard dedicado de Independência Financeira (FI/FIRE) com múltiplas estratégias, métricas-chave visíveis, projeções ajustáveis e integração com os ativos reais do usuário (WealthItems).

---

## Pesquisa Competitiva

### Gorila (gorila.com.br)

**O que oferece:**
- Consolidação de portfólio multi-custodiante (3.000+ tipos de ativos)
- Performance, risco, rentabilidade, P&L, dividend yield, alocação por classe
- Relatórios customizados e análise de indicadores

**O que NÃO oferece:**
- Nenhuma projeção de independência financeira
- Nenhum cálculo de FI Number, Coast FIRE, Barista FIRE
- Sem planejamento de aposentadoria

**Conclusão:** Gorila é uma ferramenta de gestão de portfólio, não de planejamento FI. Não é concorrente direto nesta feature.

---

### StatusInvest

**O que oferece:**
- Módulo "Forecast": projeção de resultados futuros de empresas (analistas)
- Análise fundamentalista de ativos (não de carteira do usuário)

**O que NÃO oferece:**
- Nenhuma calculadora FIRE pessoal
- Sem tracking de independência financeira do usuário

**Conclusão:** StatusInvest é uma ferramenta de análise de ativos, não de planejamento pessoal FI.

---

### Monarch Money e Copilot Money

**O que oferecem (ambos):**
- Net worth tracking consolidado
- Budgeting (categoria de gastos)
- Metas de poupança com barra de progresso
- Dashboard customizável

**O que NÃO oferecem:**
- FI/FIRE planning explícito (ambos marcados como "No" em comparativos)
- Monte Carlo simulations
- FI Number, Coast FIRE, Barista FIRE, Safe Withdrawal Rate

**Conclusão:** São apps de budget/tracking, não de planejamento FI. Isso representa uma oportunidade: integrar FI planning dentro de um app de finanças pessoais completo é diferencial.

---

### ProjectionLab (referência gold standard para FIRE)

**Inputs que coleta do usuário:**
- Patrimônio atual (por conta/tipo de ativo)
- Renda anual e projeções futuras
- Gastos atuais e projetados
- Taxa de retorno esperada
- Inflação
- Safe Withdrawal Rate (padrão 4%)
- Tipo de FIRE desejado (Barista, Coast, Fat, Lean, Standard)
- Eventos de vida (compra de imóvel, filhos, viagens, herança)

**Projeções e métricas exibidas:**
- FI Number (patrimônio alvo)
- Ano projetado de FI
- Savings rate atual e projetada
- Net worth ao longo do tempo (linha + área)
- Chance de sucesso via Monte Carlo (%)
- Withdrawl rate projetado
- Sankey de fluxo de caixa
- Estimativas de imposto ano a ano
- Modelagem de múltiplos cenários lado a lado
- Historical backtesting (como teria ido nos últimos 50 anos)
- Costa FIRE number e data (ponto onde pode parar de aportar)

**Estratégias FIRE suportadas:**
1. **Standard FIRE** — 25x gastos anuais, 4% SWR
2. **Lean FIRE** — vida frugal, gastos menores
3. **Fat FIRE** — 30-40x gastos (vida confortável)
4. **Barista FIRE** — semi-aposentadoria com renda parcial
5. **Coast FIRE** — aporte zero após atingir "coast number"
6. **Passive Income FIRE** — baseado em renda passiva > gastos

---

### FirePath App

**Diferenciais:**
- 50-year projection horizon
- "Golden Crossover" visualization — quando renda passiva > gastos
- 9 currencies, multi-language
- Scenario comparison (side by side)

---

### WalletBurst FIRE Calculator (padrão de inputs)

**Inputs:**
- Idade atual
- Renda anual (take-home)
- Gastos anuais atuais
- Gastos projetados na aposentadoria
- Patrimônio atual
- Taxa de retorno esperada (padrão 7%)
- Inflação (padrão 3%)
- Safe Withdrawal Rate (padrão 4%)

**Outputs:**
- FI Number = gastos anuais / SWR
- Tempo até FI em anos
- Gráfico net worth vs FI Number
- Tudo em valores reais (inflation-adjusted)

---

## O que AXIOM ONE tem hoje

**`/api/reports/fire`** (sem auth, sem Prisma):
- Inputs via query string: `patrimony`, `monthlyIncome`, `monthlyExpenses`, `rate`
- Calcula FI Number (gastos × 12 × 25)
- Projeção mês a mês por 50 anos
- Retorna: `fiNumber`, `projectedMonths`, `projectedYear`, `projectionSeries`, `fiLine`

**`FireProjection.tsx`** (dentro de Reports > Patrimônio):
- Exibe 3 KPIs: FI Number, Ano projetado, Meses até IF
- Slider de economia adicional (0-20%)
- Select de cenário (conservador 6% / moderado 8% / agressivo 10%)
- Linha de patrimônio projetado vs FI Number
- Usa médias de income/expense do histórico de transações

**Limitações atuais:**
1. Renda e gastos vêm apenas de médias de transações (ignora WealthItems)
2. Só uma estratégia (Standard FIRE com 4% SWR hardcoded)
3. Não mostra savings rate atual
4. Não tem Coast FIRE
5. Não há inflation adjustment
6. Não há opção de alterar SWR
7. Inputs não editáveis (renda fixa no histórico)
8. Sem "Golden Crossover" / renda passiva projetada

---

## Métricas-chave que todo FIRE dashboard sério mostra

| Métrica | Descrição | AXIOM tem? |
|---------|-----------|------------|
| FI Number | 25x gastos anuais (4% SWR) | ✅ |
| Savings Rate | % da renda poupada | ❌ |
| Anos até FI | Tempo restante | ✅ (meses) |
| Patrimônio atual | Net worth consolidado | ✅ (via networth) |
| % do caminho percorrido | patrimônio / FI Number | ❌ |
| Coast FIRE number | Quanto precisa ter para parar de aportar | ❌ |
| Withdrawal rate atual | Se dependesse do patrimônio hoje | ❌ |
| Cenários (conservador/moderado/agressivo) | Múltiplas linhas no mesmo gráfico | ❌ (apenas 1 por vez) |
| Golden Crossover | Ano que renda passiva > gastos | ❌ |
| Inflation-adjusted values | Valores em poder de compra de hoje | ❌ |

---

## Oportunidade / Diferencial para AXIOM ONE

Nenhum app de gestão financeira pessoal brasileiro (Gorila, StatusInvest) oferece FI/FIRE planning integrado. Monarch/Copilot também não. O AXIOM ONE pode se diferenciar sendo o único app que combina:

1. Tracking completo de transações + gastos
2. Patrimônio consolidado (WealthItems)
3. Dashboard FI/FIRE evoluído com múltiplas estratégias

---

## Escopo Sugerido para v1.6

### Incluído
- Página/seção dedicada de FI Dashboard (não só componente dentro de Reports)
- Inputs editáveis: renda mensal, gastos mensais, SWR, taxa de retorno, inflação
- KPIs expandidos: Savings Rate, % do caminho, Coast FIRE number, anos até Coast FIRE
- Múltiplos cenários simultâneos no mesmo gráfico (3 linhas)
- Inflation adjustment (valores em reais de hoje)
- Integração com patrimônio real (WealthItems como base do `patrimony`)

### Excluído (para versões futuras)
- Monte Carlo simulations (requer backend pesado)
- Historical backtesting
- Modelagem de eventos de vida (compra de imóvel, filhos)
- Roth conversions / estratégias de saque complexas
- Barista FIRE / Fat FIRE / Lean FIRE (só Standard + Coast)

---

## Arquivos Relevantes

| Arquivo | Relevância |
|---------|-----------|
| `src/app/api/reports/fire/route.ts` | API atual — será expandida |
| `src/components/reports/patrimonio/FireProjection.tsx` | Componente atual — será evoluído |
| `src/components/reports/patrimonio/NetWorthChart.tsx` | Padrão de gráfico Line com área |
| `src/app/api/reports/networth/route.ts` | Fornece patrimônio atual |
| `src/app/api/patrimonio/items/route.ts` | WealthItems para patrimônio real |
| `src/lib/healthSnapshot.ts` | Padrão de snapshot financeiro |
| `src/components/reports/ReportsShell.tsx` | Container das abas de reports |

---

## Padrões a Reaproveitar

### Padrão: Gráfico Line com múltiplos datasets
- **Arquivo:** `src/components/reports/patrimonio/NetWorthChart.tsx`
- **Uso:** Múltiplas linhas com cores distintas, legend, tooltip com formatCurrency
- **Aplicar:** Cenários múltiplos no gráfico de projeção

### Padrão: KPI Card simples
- **Arquivo:** `src/components/dashboard/KPICard.tsx`
- **Uso:** count-up animado, ícone, label/value
- **Aplicar:** Cards de Savings Rate, % do caminho, Coast FIRE number

### Padrão: API sem Prisma (pure cálculo)
- **Arquivo:** `src/app/api/reports/fire/route.ts`
- **Uso:** GET com query params, cálculos matemáticos, sem auth
- **Aplicar:** Expandir esta mesma API com mais parâmetros

---

## Regras e Constraints

- [ ] Manter compatibilidade com o `FireProjection` atual (não quebrar Reports)
- [ ] Usar tokens `axiom-*` (nunca hex hardcoded)
- [ ] Chart.js sempre com `mounted` guard
- [ ] Inputs editáveis devem ter debounce (300ms já implementado)
- [ ] Valores financeiros sempre via `formatCurrency(value, locale, currency)`
- [ ] API FIRE não requer auth (já sem Prisma — manter assim)

---

## Memory Anchors

- **Entidades-chave:** FireProjection, NetworthData, WealthItem, UserCurrency
- **Padrões críticos:** mounted guard Chart.js, debounce 300ms nos sliders, formatCurrency com locale
- **Avisos:** API /fire sem Prisma e sem auth — manter assim; não puxar médias só de transações, integrar WealthItems
- **Dependências externas:** nenhuma nova necessária (Chart.js já instalado)

---

---

## Decisões de Arquitetura

### Nova aba "Independência" no PatrimonioShell
Hoje: Evolução | Análise | Bens & Passivos | Meta
Novo: Evolução | Análise | **Independência** | Bens & Passivos | Meta

`FireProjection.tsx` dentro da aba Análise é removido. A lógica toda vai para a nova aba.

### Patrimônio FIRE = 3 fontes somadas
```ts
firePatrimony = currentNetWorth              // transações acumuladas (networth route)
              + itemsData.net                // WealthItems (bens - passivos)
              + portfolioData.totals.totalCurrentValue  // investimentos em carteira
```
Já existe `adjustedNetWorth = currentNetWorth + itemsNet` no PatrimonioShell. Adicionar portfolio.

### Inputs editáveis salvos no banco (novos campos em User)
```prisma
// Adicionar ao model User:
fireMonthlyExpense  Decimal?  @db.Decimal(14, 2)  // gasto mensal alvo na aposentadoria
fireSWR             Decimal?  @db.Decimal(5, 2)    // taxa de retirada (padrão 4.0)
```
- Fallback: `fireMonthlyExpense` → média de despesas das transações
- Nova API: `GET/PATCH /api/patrimonio/fire-settings` (mesmo padrão de `/api/patrimonio/goal`)

### Coast FIRE
```ts
// Anos até aposentadoria: usa 30 como proxy (sem campo de idade por ora)
const coastFireNumber = fiNumber / Math.pow(1 + annualRate, 30)
// Se patrimônio atual >= coastFireNumber → "você já pode parar de aportar!"
```

### Múltiplos cenários simultâneos no gráfico
Atualmente o componente mostra 1 linha de projeção por vez.
Novo: 3 linhas coloridas no mesmo gráfico (Conservador/Moderado/Agressivo) + 1 linha horizontal FI Number.

### Metas conectadas (seção compacta)
Reutilizar os `GoalCard` existentes em modo compacto, mostrar soma de aportes mensais das metas e como isso afeta o PMT do FIRE.

---

## Estrutura de Componentes a Criar

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| CREATE | `src/components/patrimonio/FireDashboard.tsx` | Container da aba Independência |
| CREATE | `src/components/patrimonio/FireStatusCard.tsx` | Situação atual: patrimônio, % caminho, savings rate |
| CREATE | `src/components/patrimonio/FireSettingsCard.tsx` | Inputs editáveis: gasto alvo, SWR, aporte extra |
| CREATE | `src/components/patrimonio/FireProjectionChart.tsx` | Gráfico com 3 cenários simultâneos |
| CREATE | `src/components/patrimonio/CoastFireCard.tsx` | Coast FIRE number + data |
| CREATE | `src/app/api/patrimonio/fire-settings/route.ts` | GET/PATCH fireMonthlyExpense + fireSWR |
| MODIFY | `src/app/api/reports/fire/route.ts` | Adicionar: swr, coastFire, inflation |
| MODIFY | `src/components/patrimonio/PatrimonioShell.tsx` | Nova aba + fetches adicionais |
| MODIFY | `prisma/schema.prisma` | Campos fireMonthlyExpense, fireSWR no User |
| DELETE | `src/components/reports/patrimonio/FireProjection.tsx` | Substituído pelo FireDashboard |

---

## Memory Anchors (atualizado)

- **Entidades-chave:** User (fireMonthlyExpense, fireSWR), FinancialGoal[], WealthItem[], Transaction[], InvestmentEntry[]
- **Padrões críticos:** `firePatrimony = networth + itemsNet + portfolioValue`; fire/route.ts sem Prisma (puro cálculo); settings: GET/PATCH igual ao padrão de `/api/patrimonio/goal`
- **Avisos:** Coast FIRE usa 30 anos fixos como proxy; nunca cachear dados financeiros pessoais; fallback: se `fireMonthlyExpense` null → usar média de despesas das transações
- **Fórmulas:** `fiNumber = monthlyExpense * 12 * (100/swr)`; `coastFire = fiNumber / (1+r)^30`; `firePatrimony = networth + itemsNet + portfolioValue`
- **Reutilizar:** `GoalCard` em modo compacto para metas conectadas; `formatCurrency(v, locale, currency)` em todos os valores; mounted guard + animation 800ms easeOutQuart nos gráficos

---

## Próxima Etapa

1. Revise este PRD (2 min)
2. `/clear` para limpar contexto
3. `/planejar-feature` para gerar SPEC com paths e ações detalhadas
