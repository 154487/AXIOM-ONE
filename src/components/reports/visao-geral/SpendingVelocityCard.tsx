"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import type { OverviewData } from "../types";

interface SpendingVelocityCardProps {
  overviewData: OverviewData;
  currency: string;
  locale: string;
  periodStart: string;
}

export function SpendingVelocityCard({
  overviewData,
  currency,
  locale,
  periodStart,
}: SpendingVelocityCardProps) {
  const t = useTranslations("Reports");

  // Verifica se o período selecionado é o mês atual
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = periodStart.startsWith(currentMonthPrefix);

  const { velocity } = overviewData;

  if (!isCurrentMonth || !velocity) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
        <h3 className="text-white font-semibold mb-4">{t("spendingVelocity")}</h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-axiom-muted text-sm text-center">
            Velocidade de gasto disponível apenas para o mês atual.
          </p>
        </div>
      </div>
    );
  }

  const pct = velocity.budget > 0 ? Math.min(100, (velocity.spent / velocity.budget) * 100) : 0;

  const barColor =
    pct < 70
      ? "bg-axiom-income"
      : pct < 90
      ? "bg-yellow-400"
      : "bg-axiom-expense";

  const overrunAbs = Math.abs(Math.round(velocity.projectedOverrun));
  const isOver = velocity.projectedOverrun >= 0;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-4">{t("spendingVelocity")}</h3>

      <div className="flex-1 flex flex-col gap-5 justify-center">
        {/* Dia atual */}
        <div className="flex justify-between text-sm">
          <span className="text-axiom-muted">
            Dia {velocity.dayOfMonth} de {velocity.daysInMonth}
          </span>
          <span className={`font-semibold ${pct >= 90 ? "text-axiom-expense" : pct >= 70 ? "text-yellow-400" : "text-axiom-income"}`}>
            {pct.toFixed(0)}% do orçamento
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-3 bg-axiom-hover rounded-full">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-axiom-hover rounded-lg p-3">
            <p className="text-axiom-muted text-xs mb-1">Gasto até agora</p>
            <p className="text-white font-semibold text-sm">
              {formatCurrency(velocity.spent, locale, currency)}
            </p>
          </div>
          <div className="bg-axiom-hover rounded-lg p-3">
            <p className="text-axiom-muted text-xs mb-1">Orçamento estimado</p>
            <p className="text-white font-semibold text-sm">
              {formatCurrency(velocity.budget, locale, currency)}
            </p>
          </div>
        </div>

        {/* Projeção */}
        <div className={`rounded-lg p-3 ${isOver ? "bg-axiom-expense/10" : "bg-axiom-income/10"}`}>
          <p className={`text-sm font-medium ${isOver ? "text-axiom-expense" : "text-axiom-income"}`}>
            {isOver
              ? `No ritmo atual, terminará ${overrunAbs}% acima do estimado`
              : `No ritmo atual, terminará ${overrunAbs}% abaixo do estimado`}
          </p>
          <p className="text-axiom-muted text-xs mt-1">
            Projeção para o fim do mês: {formatCurrency(velocity.projectedEnd, locale, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
