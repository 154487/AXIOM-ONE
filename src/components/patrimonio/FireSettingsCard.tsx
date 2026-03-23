"use client";

import { useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface FireSettingsCardProps {
  monthlyExpense: number;
  targetMonthlyIncome: number | null;
  targetMonthlyContrib: number | null;
  extraSavings: number;
  avgExpenses: number;
  avgExpensesByPeriod: number;
  isUsingAvgExpenses: boolean;
  expensePeriod: 3 | 6 | 12;
  retirementYears: number;
  onMonthlyExpenseChange: (v: number) => void;
  onTargetMonthlyIncomeChange: (v: number) => void;
  onTargetMonthlyContribChange: (v: number) => void;
  onSWRChange?: (v: number) => void; // kept for compatibility — unused
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
  targetMonthlyIncome,
  targetMonthlyContrib,
  extraSavings,
  avgExpensesByPeriod,
  isUsingAvgExpenses,
  expensePeriod,
  retirementYears,
  onMonthlyExpenseChange,
  onTargetMonthlyIncomeChange,
  onTargetMonthlyContribChange,
  onExtraSavingsChange,
  onPeriodChange,
  onRetirementYearsChange,
  currency,
  locale,
}: FireSettingsCardProps) {
  const expenseDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incomeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contribDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleExpenseChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    if (expenseDebounce.current) clearTimeout(expenseDebounce.current);
    expenseDebounce.current = setTimeout(() => onMonthlyExpenseChange(v), 400);
  }

  function handleIncomeChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    if (incomeDebounce.current) clearTimeout(incomeDebounce.current);
    incomeDebounce.current = setTimeout(() => onTargetMonthlyIncomeChange(v), 400);
  }

  function handleContribChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    if (contribDebounce.current) clearTimeout(contribDebounce.current);
    contribDebounce.current = setTimeout(() => onTargetMonthlyContribChange(v), 400);
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Configurações do Plano</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Ajuste os parâmetros da sua projeção</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* (B) Gasto mensal com seletor de período */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-axiom-muted uppercase tracking-wide">
              Gasto mensal na aposentadoria
            </label>
            {/* Seletor de período */}
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
          <input
            type="number"
            defaultValue={monthlyExpense}
            min={100}
            step={100}
            onChange={(e) => handleExpenseChange(e.target.value)}
            className="bg-axiom-hover border border-axiom-border rounded-lg px-3 py-2 text-sm text-white placeholder-axiom-muted/50 focus:outline-none focus:border-axiom-primary/60 transition-colors"
            placeholder="Ex: 5000"
          />
          {isUsingAvgExpenses && (
            <p className="text-[11px] text-axiom-muted/60 italic">
              Média dos últimos {expensePeriod}m:{" "}
              <span className="text-axiom-muted not-italic">
                {formatCurrency(avgExpensesByPeriod, locale, currency)}
              </span>
            </p>
          )}
        </div>

        {/* (C) Renda mensal desejada na aposentadoria (substitui SWR) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-axiom-muted uppercase tracking-wide">
            Renda mensal na aposentadoria
          </label>
          <input
            type="number"
            defaultValue={targetMonthlyIncome ?? ""}
            min={100}
            step={100}
            onChange={(e) => handleIncomeChange(e.target.value)}
            className="bg-axiom-hover border border-axiom-border rounded-lg px-3 py-2 text-sm text-white placeholder-axiom-muted/50 focus:outline-none focus:border-axiom-primary/60 transition-colors"
            placeholder="Ex: 8000"
          />
          <p className="text-[11px] text-axiom-muted/60">
            FI Number = renda × 12 × 25 (regra dos 4%)
          </p>
        </div>
      </div>

      {/* (C2) Aporte mensal para projeção */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-xs text-axiom-muted uppercase tracking-wide">
          Aporte mensal investido
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
          Usado na Previsão de IF — quanto você investe por mês de fato
        </p>
      </div>

      {/* (D) Slider horizonte de aposentadoria */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-axiom-muted uppercase tracking-wide">
            Horizonte de aposentadoria
          </label>
          <span className="text-sm font-semibold text-axiom-primary">{retirementYears} anos</span>
        </div>
        <input
          type="range"
          min={5}
          max={50}
          step={5}
          value={retirementYears}
          onChange={(e) => onRetirementYearsChange(parseInt(e.target.value))}
          className="w-full accent-axiom-primary cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-axiom-muted">
          <span>5 anos</span>
          <span>50 anos</span>
        </div>
        <p className="text-[11px] text-axiom-muted/70">
          Afeta o Coast FIRE — quanto antes quiser se aposentar, mais precisa ter hoje
        </p>
      </div>

      {/* Slider de aporte extra */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-axiom-muted uppercase tracking-wide">
            Aporte extra mensal
          </label>
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
        <div className="flex justify-between text-[11px] text-axiom-muted">
          <span>0%</span>
          <span>+20%</span>
        </div>
        <p className="text-[11px] text-axiom-muted/70">
          Simula quanto o aporte extra acelera a independência financeira
        </p>
      </div>
    </div>
  );
}
