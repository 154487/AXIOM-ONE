"use client";

import { formatCurrency } from "@/lib/utils";

interface FireMetricsCardProps {
  firePatrimony: number;
  fiNumber: number;
  effectiveMonthlyExpense: number; // alvo configurado — usado no FI Ratio e Runway
  avgMonthlyExpense: number;        // média real das transações — base dos níveis FIRE
  currency: string;
  locale: string;
}

export function FireMetricsCard({
  firePatrimony,
  fiNumber,
  effectiveMonthlyExpense,
  avgMonthlyExpense,
  currency,
  locale,
}: FireMetricsCardProps) {
  const SWR = 0.04;
  const fmt = (v: number) => formatCurrency(v, locale, currency);

  // — FI Ratio —
  const rendaPassiva = firePatrimony * SWR / 12;
  const fiRatio = effectiveMonthlyExpense > 0
    ? Math.min(100, (rendaPassiva / effectiveMonthlyExpense) * 100)
    : 0;

  // — Runway —
  const runwayMonths = effectiveMonthlyExpense > 0
    ? firePatrimony / effectiveMonthlyExpense
    : 0;
  const runwayYears = runwayMonths / 12;
  const runwayTargetYear = new Date().getFullYear() + Math.floor(runwayYears);

  // — Lean / Regular / Fat FIRE —
  // Base: média real das transações (o que o usuário gasta de fato)
  const base = avgMonthlyExpense > 0 ? avgMonthlyExpense : effectiveMonthlyExpense;
  const levels = [
    {
      label: "Lean FIRE",
      description: "vida enxuta (50% do gasto real)",
      expense: base * 0.5,
      fiNum: base * 0.5 * 12 * 25,
      color: "bg-blue-400",
      textColor: "text-blue-400",
    },
    {
      label: "Regular FIRE",
      description: "seu gasto médio atual",
      expense: base,
      fiNum: base * 12 * 25,
      color: "bg-axiom-primary",
      textColor: "text-axiom-primary",
    },
    {
      label: "Fat FIRE",
      description: "vida confortável (2× o gasto real)",
      expense: base * 2,
      fiNum: base * 2 * 12 * 25,
      color: "bg-axiom-income",
      textColor: "text-axiom-income",
    },
  ];

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-white">Perspectivas FIRE</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Indicadores complementares da sua jornada</p>
      </div>

      {/* FI Ratio + Runway — grid 2 colunas */}
      <div className="grid grid-cols-2 gap-4">

        {/* FI Ratio */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-axiom-muted uppercase tracking-wide">FI Ratio</p>
          <p className="text-2xl font-bold text-white leading-none">
            {fiRatio.toFixed(1)}
            <span className="text-base font-normal text-axiom-muted ml-0.5">%</span>
          </p>
          <div className="h-1.5 bg-axiom-hover rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-axiom-income transition-all duration-700"
              style={{ width: `${fiRatio}%` }}
            />
          </div>
          <p className="text-[11px] text-axiom-muted/70">
            {fmt(rendaPassiva)}/mês gerado de {fmt(effectiveMonthlyExpense)}/mês necessário
          </p>
        </div>

        {/* Runway */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Runway</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold text-white leading-none">
              {runwayYears >= 1
                ? `${runwayYears.toFixed(1)}`
                : `${Math.round(runwayMonths)}`}
            </p>
            <p className="text-sm text-axiom-muted">
              {runwayYears >= 1 ? "anos" : "meses"}
            </p>
          </div>
          <p className="text-[11px] text-axiom-muted font-medium">
            {Math.round(runwayMonths)} meses de despesas guardados
          </p>
          <p className="text-[11px] text-axiom-muted/70">
            {runwayMonths >= 1
              ? `Se parar de ganhar hoje, dura até ~${runwayTargetYear}`
              : "Acumule mais para ter uma reserva"}
          </p>
        </div>
      </div>

      <div className="h-px bg-axiom-border" />

      {/* Lean / Regular / Fat FIRE */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Níveis de IF</p>
        {levels.map(({ label, description, expense, fiNum, color, textColor }) => {
          const progress = fiNum > 0 ? Math.min(100, (firePatrimony / fiNum) * 100) : 0;
          const reached = firePatrimony >= fiNum;
          return (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
                  {reached && (
                    <span className="text-[10px] bg-axiom-income/20 text-axiom-income border border-axiom-income/30 px-1.5 py-0.5 rounded-full">
                      atingido ✓
                    </span>
                  )}
                  <span className="text-[10px] text-axiom-muted/50">{description}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-axiom-muted">{fmt(fiNum)}</span>
                  <span className="text-[10px] text-axiom-muted/50 ml-1.5">{progress.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-axiom-hover rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${color}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-[10px] text-axiom-muted/40 mt-1">
          Baseado no seu gasto médio real de {fmt(base)}/mês · regra dos 4% (× 300)
        </p>
      </div>
    </div>
  );
}
