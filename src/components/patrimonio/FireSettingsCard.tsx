"use client";

import { useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface FireSettingsCardProps {
  monthlyExpense: number;
  targetMonthlyContrib: number | null;
  extraSavings: number;
  avgExpensesByPeriod: number;
  isUsingAvgExpenses: boolean;
  expensePeriod: 3 | 6 | 12;
  fiNumber: number;
  onMonthlyExpenseChange: (v: number) => void;
  onTargetMonthlyContribChange: (v: number) => void;
  onSWRChange?: (v: number) => void;
  onExtraSavingsChange: (v: number) => void;
  onPeriodChange: (months: 3 | 6 | 12) => void;
  onRetirementYearsChange: (v: number) => void;
  currency: string;
  locale: string;
}

const PERIODS: { label: string; value: 3 | 6 | 12 }[] = [
  { label: "3M", value: 3 },
  { label: "6M", value: 6 },
  { label: "12M", value: 12 },
];

export function FireSettingsCard({
  monthlyExpense,
  targetMonthlyContrib,
  extraSavings,
  avgExpensesByPeriod,
  isUsingAvgExpenses,
  expensePeriod,
  fiNumber,
  onMonthlyExpenseChange,
  onTargetMonthlyContribChange,
  onExtraSavingsChange,
  onPeriodChange,
  currency,
  locale,
}: FireSettingsCardProps) {
  const expenseDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contribDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleExpenseChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    if (expenseDebounce.current) clearTimeout(expenseDebounce.current);
    expenseDebounce.current = setTimeout(() => onMonthlyExpenseChange(v), 400);
  }

  function handleContribChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    if (contribDebounce.current) clearTimeout(contribDebounce.current);
    contribDebounce.current = setTimeout(() => onTargetMonthlyContribChange(v), 400);
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-white">Configurações do Plano</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Parâmetros que definem sua projeção</p>
      </div>

      {/* Gasto mensal na IF */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-axiom-muted uppercase tracking-wide">
            Quanto você precisa por mês na IF?
          </label>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-axiom-muted/50">auto</span>
            <div className="flex gap-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onPeriodChange(p.value)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    expensePeriod === p.value
                      ? "bg-axiom-primary text-white"
                      : "text-axiom-muted hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <input
          type="number"
          defaultValue={monthlyExpense}
          min={100}
          step={100}
          onChange={(e) => handleExpenseChange(e.target.value)}
          className="bg-axiom-hover border border-axiom-border rounded-lg px-3 py-2 text-sm text-white placeholder-axiom-muted/50 focus:outline-none focus:border-axiom-primary/60 transition-colors"
          placeholder="Ex: 5000"
        />
        <div className="flex flex-col gap-0.5 text-[11px]">
          {isUsingAvgExpenses && (
            <span className="text-axiom-muted/60">
              Média das suas despesas ({expensePeriod}M):{" "}
              <span className="text-axiom-muted">
                {formatCurrency(avgExpensesByPeriod, locale, currency)}/mês
              </span>
            </span>
          )}
          <span className="text-axiom-muted/60">
            Isso gera um{" "}
            <span className="text-axiom-primary">Número IF de {formatCurrency(fiNumber, locale, currency)}</span>
            {" "}(regra dos 4%)
          </span>
        </div>
      </div>

      <div className="h-px bg-axiom-border" />

      {/* Aporte mensal investido */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-axiom-muted uppercase tracking-wide">
          Quanto você investe por mês
        </label>
        <input
          type="number"
          defaultValue={targetMonthlyContrib ?? ""}
          min={0}
          step={100}
          onChange={(e) => handleContribChange(e.target.value)}
          className="bg-axiom-hover border border-axiom-border rounded-lg px-3 py-2 text-sm text-white placeholder-axiom-muted/50 focus:outline-none focus:border-axiom-primary/60 transition-colors"
          placeholder="Ex: 2000"
        />
        <p className="text-[11px] text-axiom-muted/60">
          Valor real que você aporta — usado na Previsão de IF
        </p>
      </div>

      <div className="h-px bg-axiom-border" />

      {/* Simular aporte extra */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs text-axiom-muted uppercase tracking-wide">
              Simular aporte extra
            </label>
            <p className="text-[11px] text-axiom-muted/60 mt-0.5">
              Cenário hipotético — e se você aportasse mais?
            </p>
          </div>
          <span className="text-sm font-semibold text-axiom-primary">+{extraSavings}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={extraSavings}
          onChange={(e) => onExtraSavingsChange(parseInt(e.target.value))}
          className="w-full accent-axiom-primary cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-axiom-muted/50">
          <span>sem extra</span>
          <span>+20% da renda</span>
        </div>
      </div>
    </div>
  );
}
