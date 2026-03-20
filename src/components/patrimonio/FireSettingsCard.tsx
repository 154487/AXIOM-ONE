"use client";

import { useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface FireSettingsCardProps {
  monthlyExpense: number;
  swr: number;
  extraSavings: number;        // 0-20, estado local
  avgExpenses: number;         // médias das transações (placeholder)
  isUsingAvgExpenses: boolean; // true quando monthlyExpense vem da média (não editado)
  onMonthlyExpenseChange: (v: number) => void;
  onSWRChange: (v: number) => void;
  onExtraSavingsChange: (v: number) => void;
  currency: string;
  locale: string;
}

export function FireSettingsCard({
  monthlyExpense,
  swr,
  extraSavings,
  isUsingAvgExpenses,
  onMonthlyExpenseChange,
  onSWRChange,
  onExtraSavingsChange,
  currency,
  locale,
}: FireSettingsCardProps) {
  const expenseDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swrDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleExpenseChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    if (expenseDebounce.current) clearTimeout(expenseDebounce.current);
    expenseDebounce.current = setTimeout(() => onMonthlyExpenseChange(v), 400);
  }

  function handleSWRChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v < 0.5 || v > 10) return;
    if (swrDebounce.current) clearTimeout(swrDebounce.current);
    swrDebounce.current = setTimeout(() => onSWRChange(v), 400);
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Configurações do Plano</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Ajuste os parâmetros da sua projeção</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Gasto mensal alvo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-axiom-muted uppercase tracking-wide">
            Gasto mensal na aposentadoria
          </label>
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
              Baseado na média de transações
            </p>
          )}
        </div>

        {/* SWR */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-axiom-muted uppercase tracking-wide">
            Taxa de retirada (SWR %)
          </label>
          <input
            type="number"
            defaultValue={swr}
            min={0.5}
            max={10}
            step={0.5}
            onChange={(e) => handleSWRChange(e.target.value)}
            className="bg-axiom-hover border border-axiom-border rounded-lg px-3 py-2 text-sm text-white placeholder-axiom-muted/50 focus:outline-none focus:border-axiom-primary/60 transition-colors"
          />
          <p className="text-[11px] text-axiom-muted/60">
            4% = regra clássica · 3.5% = conservador · 5% = otimista
          </p>
        </div>
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
