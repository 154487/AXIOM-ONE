# SPEC - v1.3 — Patrimônio Redesign

> Gerado por `/planejar-feature` em 2026-03-20

## Resumo

Reestruturar a página `/patrimonio` com sistema de **abas** (igual ReportsShell) separando gráficos de CRUD. Criar `PatrimonioEvolutionChart` — gráfico combinado com income/expenses/net como áreas com gradiente + linha de patrimônio acumulado, inspirado no visual de área suave com tooltip customizado.

---

## Arquitetura

```
/patrimonio (page.tsx — sem mudança)
   ↓
PatrimonioShell.tsx  ← MODIFY (adicionar abas)
   ├── Aba "Evolução"
   │   ├── PatrimonioEvolutionChart  ← CREATE (novo gráfico combinado)
   │   └── SavingsRateChart          (existente, mantido)
   ├── Aba "Análise"
   │   ├── AssetBreakdown            (existente, mantido)
   │   ├── BenchmarkComparison       (existente, mantido)
   │   └── FireProjection            (existente, mantido)
   ├── Aba "Bens & Passivos"
   │   └── WealthItems               (existente, mantido)
   └── Aba "Meta"
       └── PatrimonioGoal            (existente, mantido)
```

---

## Mudanças por Arquivo

### CREATE: `src/components/patrimonio/PatrimonioEvolutionChart.tsx`

**Responsabilidade:** Gráfico combinado — fluxo de caixa mensal (áreas income/expenses) + patrimônio acumulado (linha). Visual premium com gradientes via Canvas API, curvas suaves (tension 0.4), tooltip customizado multi-linha.

**Props:**
```ts
interface PatrimonioEvolutionChartProps {
  networthData: NetworthData;   // de src/components/reports/types
  itemsNet: number;             // net de WealthItems (assets - liabilities)
  currency: string;
  locale: string;
}
```

**Implementar:**
- [ ] Registrar: `CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend`
- [ ] `mounted` guard (padrão Chart.js do projeto)
- [ ] 4 datasets no mesmo eixo:
  1. **Income** (área, verde): `monthIncome` por mês, `fill: "origin"`, gradiente `rgba(16,185,129,0.35)` → `rgba(16,185,129,0)`
  2. **Despesas** (área, vermelho): `monthExpenses` por mês, `fill: "origin"`, gradiente `rgba(239,68,68,0.25)` → `rgba(239,68,68,0)`
  3. **Net Mensal** (linha fina, laranja): `monthIncome - monthExpenses`, `borderColor: "#FF6B35"`, `borderWidth: 1.5`, sem fill
  4. **Patrimônio** (linha grossa, branco): `cumulativeBalance`, `borderColor: "#fff"`, `borderWidth: 2`, sem fill

- [ ] Gradiente via função Canvas API — aplicar a datasets 1 e 2. **Obrigatório**: usar `chart.chartArea` como guard (height pode ser 0 antes do mount):
  ```ts
  // Dataset Income (verde)
  backgroundColor: (ctx: any) => {
    const chart = ctx.chart;
    if (!chart.chartArea) return "rgba(16,185,129,0)";
    const { top, bottom } = chart.chartArea;
    const g = chart.ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, "rgba(16,185,129,0.35)");
    g.addColorStop(1, "rgba(16,185,129,0)");
    return g;
  },
  // Dataset Expenses (vermelho) — mesmo padrão com rgba(239,68,68,...)
  ```
- [ ] `tension: 0.4` em todos os datasets
- [ ] `pointRadius: months.length > 24 ? 0 : 2`
- [ ] Tooltip customizado:
  ```ts
  callbacks: {
    title: (items) => months[items[0].dataIndex]?.month ?? "",
    label: (ctx) => {
      const m = months[ctx.dataIndex];
      if (!m) return "";
      if (ctx.datasetIndex === 0) return ` income : ${formatCurrency(m.monthIncome, locale, currency)}`;
      if (ctx.datasetIndex === 1) return ` expenses : ${formatCurrency(m.monthExpenses, locale, currency)}`;
      if (ctx.datasetIndex === 2) return ` net : ${formatCurrency(m.monthIncome - m.monthExpenses, locale, currency)}`;
      if (ctx.datasetIndex === 3) return ` patrimônio : ${formatCurrency(m.cumulativeBalance + itemsNet, locale, currency)} (+ bens atuais)`;
      return "";
    },
  }
  ```
- [ ] Grid X: `display: false` (sem linhas verticais); Grid Y: `color: "#1E2D42"`, `borderDash: [4, 4]`
- [ ] Escala Y: labels abreviados `k` (≥1000) ou `M` (≥1000000)
- [ ] Legend: exibir (`display: true`), `color: "#AAB2BD"`, `font: { size: 11 }`, `boxWidth: 12`, `boxHeight: 2`
- [ ] Header do card: título "Evolução do Patrimônio" + valor total ajustado (`lastCumulative + itemsNet`)
- [ ] Empty state: mesma estrutura de `NetWorthChart.tsx` (card com mensagem)

**Referência visual:** Screenshot enviado — área income (verde), área expenses (vermelho), linha net (laranja), tooltip dark com valores multi-linha.

**Referência de código:** `src/components/reports/patrimonio/NetWorthChart.tsx` para estrutura base (mounted guard, card layout, empty state). O padrão de gradiente Canvas é criado do zero — o snippet acima é auto-suficiente.

---

### MODIFY: `src/components/patrimonio/PatrimonioShell.tsx`

**Responsabilidade:** Reestruturar layout de scroll linear para 4 abas. Manter os 5 fetches existentes; apenas reorganizar a renderização por aba.

**Implementar:**
- [ ] Tipo `type PatrimonioTab = "evolucao" | "analise" | "bens" | "meta"`
- [ ] Estado `const [activeTab, setActiveTab] = useState<PatrimonioTab>("evolucao")`
- [ ] Array de tabs:
  ```ts
  const TABS = [
    { key: "evolucao", label: "Evolução" },
    { key: "analise",  label: "Análise" },
    { key: "bens",     label: "Bens & Passivos" },
    { key: "meta",     label: "Meta" },
  ] as const;
  ```
- [ ] Renderizar barra de tabs com mesmo estilo de `ReportsShell.tsx:104-118`:
  ```tsx
  <div className="flex bg-axiom-hover rounded-lg p-1 gap-1 w-fit">
    {TABS.map(({ key, label }) => (
      <button
        key={key}
        onClick={() => setActiveTab(key)}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          activeTab === key
            ? "bg-axiom-primary text-white"
            : "text-axiom-muted hover:text-white"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
  ```
- [ ] **Aba "evolucao"**: substituir `NetWorthChart` por `PatrimonioEvolutionChart` (passando `itemsNet={itemsData?.net ?? 0}`), manter `SavingsRateChart`
- [ ] **Aba "analise"**: `AssetBreakdown` + `BenchmarkComparison` + `FireProjection`
- [ ] **Aba "bens"**: `WealthItems` (com `onRefresh={fetchItems}`)
- [ ] **Aba "meta"**: `PatrimonioGoal` (com `adjustedNetWorth`)
- [ ] Adicionar import de `PatrimonioEvolutionChart`
- [ ] Remover import de `NetWorthChart` (não usado mais neste arquivo)
- [ ] Manter os skeletons de loading por aba (verificar se `loading` ou `!data` da aba ativa antes de renderizar)
- [ ] Header da página (título + descrição) permanece acima das abas

**Referência:** Estrutura de `ReportsShell.tsx` — abas + conteúdo condicional por `activeTab`.

---

## Ordem de Implementação

1. **PatrimonioEvolutionChart** — criar componente (não tem dependências externas)
2. **PatrimonioShell** — reestruturar em abas + usar novo chart

---

## Issues Sugeridas

### Issue #91 — PatrimonioEvolutionChart: gráfico combinado cash flow + patrimônio

**Arquivo:** `src/components/patrimonio/PatrimonioEvolutionChart.tsx`

**Tasks:**
- [ ] CREATE `src/components/patrimonio/PatrimonioEvolutionChart.tsx`
- [ ] 4 datasets: Income (área verde), Expenses (área vermelha), Net mensal (linha laranja), Patrimônio acumulado (linha branca)
- [ ] Gradiente Canvas API nos datasets de área
- [ ] Tooltip customizado: title = mês, 4 linhas com valores formatados
- [ ] `tension: 0.4`, `pointRadius: 0` para séries longas
- [ ] Header: "Evolução do Patrimônio" + valor total ajustado (cumulativeBalance + itemsNet)
- [ ] Empty state quando `months.length === 0`

**Critério:** `npm run build` passa; gráfico renderiza na aba Evolução com 4 séries visíveis

---

### Issue #92 — PatrimonioShell: reestruturar em 4 abas

**Arquivo:** `src/components/patrimonio/PatrimonioShell.tsx`

**Tasks:**
- [ ] Adicionar estado `activeTab` com tipo `PatrimonioTab`
- [ ] Renderizar barra de 4 abas (mesmo estilo de ReportsShell)
- [ ] Aba "Evolução": `PatrimonioEvolutionChart` + `SavingsRateChart`
- [ ] Aba "Análise": `AssetBreakdown` + `BenchmarkComparison` + `FireProjection`
- [ ] Aba "Bens & Passivos": `WealthItems`
- [ ] Aba "Meta": `PatrimonioGoal`
- [ ] Substituir `NetWorthChart` por `PatrimonioEvolutionChart`, remover import antigo
- [ ] Skeletons corretos por aba (usar loading states dos fetches correspondentes)

**Critério:** `npm run build` passa; navegação entre abas funciona; todos os 7 componentes renderizam nas abas corretas

---

## Complexidade

**Baixa-Média** — 2 arquivos, sem nova API, sem migration. O gráfico tem lógica de gradiente Canvas mas segue padrão já existente no projeto.

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Canvas gradient no SSR | `mounted` guard padrão já resolve |
| `NetWorthChart` ainda importado em `ReportsShell.tsx`? | Verificar — ele está em `reports/patrimonio/`, não em `patrimonio/`. São arquivos distintos, sem conflito |
| WealthItems sem histórico temporal | `itemsNet` é passado como valor único (offset fixo) — patrimônio dataset = `cumulativeBalance + itemsNet` por mês. Transparente e correto |
| Aba "Bens" perde o botão de refresh após trocar aba | `fetchItems` já é useCallback estável, não há re-render desnecessário |
