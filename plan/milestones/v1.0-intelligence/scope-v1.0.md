# Escopo v1.0 — Intelligence Layer

> Criado: 2026-03-19

## Objetivo

Adicionar uma aba **Inteligência** dentro da página de Investimentos (`/investments`) com 3 funcionalidades que transformam dados brutos em insights acionáveis.

---

## Onde fica

Nova aba na `InvestmentsShell` — ao lado das abas **Carteira** e **Movimentações**:

```
[ Carteira ]  [ Movimentações ]  [ Inteligência ]   ← nova aba
```

Componente principal: `src/components/investments/intelligence/IntelligenceTab.tsx`

---

## Funcionalidades

### 1. Pattern Mapping — Journal × Health Score

**O que faz:** Gráfico de linha dupla mostrando a correlação entre aportes/entradas do Diário e a evolução do Health Score ao longo do tempo.

**Como funciona:**
- Busca todas as `JournalEntry` do usuário com `healthScoreAtTime` preenchido
- Plota linha do Health Score por data
- Marca pontos onde houve aporte (APORTE) ou resgate (RESGATE)
- Insight textual: "Nos meses com aporte, seu score subiu em média X pontos"

**Dados necessários:** `/api/intelligence/patterns` — agrega JournalEntry com healthScoreAtTime

---

### 2. Allocation Suggestion

**O que faz:** Sugere onde alocar a Sobra Sustentável com base no perfil inferido dos aportes históricos.

**Como funciona:**
- Calcula sobra disponível (chama `/api/reports/overview` para pegar `velocity.budget - velocity.spent`)
- Analisa distribuição atual da carteira (`allocationByType`)
- Compara com distribuição histórica de aportes (tendência do usuário)
- Sugere % de alocação por classe de ativo + valor em R$
- Exibe como cards clicáveis: ao clicar → abre o modal de novo aporte pré-preenchido

**Dados necessários:** `/api/intelligence/allocation` — combina portfolio + journal + overview

---

### 3. Simulação "E se...?"

**O que faz:** Slider interativo que projeta o impacto de aumentar/diminuir o aporte mensal.

**Como funciona:**
- Usuário ajusta slider: "E se eu aportasse R$ X/mês?"
- Projeção calcula:
  - Patrimônio em 5, 10, 20 anos
  - Data estimada de FIRE (usando mesma fórmula de `/api/reports/fire`)
  - Impacto estimado no Health Score
- Gráfico de linha com 3 cenários: conservador, atual, otimista
- Sem nova API — cálculo puramente client-side com base nos dados já carregados

**Dados necessários:** reutiliza `NetworthData` (já carregado) + parâmetros do slider

---

## Arquivos a criar/modificar

| Ação | Arquivo |
|------|---------|
| CREATE | `src/components/investments/intelligence/IntelligenceTab.tsx` |
| CREATE | `src/components/investments/intelligence/PatternMapping.tsx` |
| CREATE | `src/components/investments/intelligence/AllocationSuggestion.tsx` |
| CREATE | `src/components/investments/intelligence/WhatIfSimulator.tsx` |
| CREATE | `src/app/api/intelligence/patterns/route.ts` |
| CREATE | `src/app/api/intelligence/allocation/route.ts` |
| MODIFY | `src/components/investments/InvestmentsShell.tsx` — adicionar aba "Inteligência" |
| MODIFY | `messages/*.json` — adicionar `tabs.intelligence` em Investments |

---

## Fora de escopo (v1.0)

- Patrimônio Evoluído → ver `plan/initiatives/patrimonio-evoluido.md`
- Alertas automáticos de rebalanceamento
- Análise fundamentalista
- Importação de notas de corretagem

---

## Próximos passos

1. `/planejar-feature` — gera SPEC detalhada com paths e snippets
2. `/revisar-spec` — validação crítica
3. `/publicar-milestone` — cria issues no GitHub
4. `/executar-milestone` — implementação
