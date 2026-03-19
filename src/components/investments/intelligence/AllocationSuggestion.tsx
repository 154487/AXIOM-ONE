"use client";

import { formatCurrency } from "@/lib/utils";
import type { AllocationResponse } from "@/app/api/intelligence/allocation/route";

interface AllocationSuggestionProps {
  data: AllocationResponse;
  currency: string;
}

const TYPE_ICONS: Record<string, string> = {
  FIXED_INCOME: "🏦",
  FII: "🏢",
  STOCK: "📈",
  ETF: "📊",
  BDR: "🌎",
  CRYPTO: "₿",
  STOCK_INT: "🌐",
  OTHER: "💼",
};

export function AllocationSuggestion({ data, currency }: AllocationSuggestionProps) {
  const { availableMonthly, suggestions } = data;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Sugestão de Alocação</h3>
        <span className="text-xs text-axiom-muted">Baseado no seu histórico de aportes</span>
      </div>

      {/* Sobra disponível */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-axiom-hover border border-axiom-border">
        <div>
          <p className="text-xs text-axiom-muted">Sobra disponível este mês</p>
          <p className={`text-lg font-bold ${availableMonthly > 0 ? "text-axiom-income" : "text-axiom-muted"}`}>
            {formatCurrency(availableMonthly, "pt-BR", currency)}
          </p>
        </div>
      </div>

      {availableMonthly <= 0 ? (
        <p className="text-sm text-axiom-muted italic text-center py-4">
          Sem sobra disponível para alocar este mês.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {suggestions.map((s) => (
            <div
              key={s.type}
              className="flex flex-col gap-2 p-3 rounded-lg border border-axiom-border bg-axiom-hover"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{TYPE_ICONS[s.type] ?? "💼"}</span>
                <span className="text-xs text-axiom-muted font-medium truncate">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-axiom-primary">{s.pct}%</p>
              <p className="text-xs text-white font-medium">
                {formatCurrency(s.amount, "pt-BR", currency)}
              </p>
              {/* barra proporcional */}
              <div className="w-full bg-axiom-border rounded-full h-1">
                <div
                  className="bg-axiom-primary h-1 rounded-full"
                  style={{ width: `${Math.min(100, s.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
