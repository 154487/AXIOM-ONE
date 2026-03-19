# Iniciativa — Patrimônio Evoluído

> Criado: 2026-03-19
> Página: `/patrimonio` (já existe desde v0.10)
> Milestone: a definir (pós v1.0)

## Objetivo

Evoluir a página de Patrimônio de uma visualização estática para um painel completo de gestão patrimonial.

---

## Funcionalidades planejadas

### 1. Breakdown por Classe de Ativo
- Doughnut chart mostrando % por tipo: Renda Fixa, FIIs, Ações, Cripto, etc.
- Tabela com valor atual, % da carteira e variação por classe
- Dados vêm de `allocationByType` já calculado em `/api/investments/portfolio`

### 2. Comparação vs Benchmark
- Linha do patrimônio vs CDI, IBOV, IPCA no mesmo período
- Usa dados já disponíveis: `benchmarks.ts` (BCB/AwesomeAPI) + `NetworthData`
- Mostra se o usuário está "batendo o CDI" ou não

### 3. Meta de Patrimônio
- Usuário define meta (ex: R$ 500.000)
- Barra de progresso visual: "Você está X% do seu objetivo"
- Projeção de quando atinge a meta com o ritmo atual
- Requer novo campo no banco: `User.patrimonyGoal` (Decimal, nullable)

---

## Dependências

- Página `/patrimonio` já existe (criada na v0.10)
- `PatrimonioShell.tsx` já existe — apenas adicionar componentes
- `allocationByType` já calculado em portfolio API
- Benchmarks já disponíveis via `src/lib/benchmarks.ts`
- Meta de patrimônio precisa de migration no schema

---

## Quando fazer

Após v1.0 estar concluída. Pode ser v1.1 ou milestone dedicada.
Usar `/planejar-feature` quando for o momento.
