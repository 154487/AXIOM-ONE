"use client";

import { formatCurrency } from "@/lib/utils";

interface FirePlanCardProps {
  essentialCategories: { id: string; name: string; color: string; monthlyAvg: number }[];
  liabilityCosts: {
    wealthItemId: string;
    wealthItemName: string;
    categoryId: string;
    categoryName: string;
    monthlyAvg: number;
  }[];
  totalEssentialMonthly: number;
  currency: string;
  locale: string;
}

export function FirePlanCard({
  essentialCategories,
  liabilityCosts,
  totalEssentialMonthly,
  currency,
  locale,
}: FirePlanCardProps) {
  if (essentialCategories.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white">Custo de Vida Real</h3>
        <p className="text-xs text-axiom-muted mt-2">
          Marque categorias como{" "}
          <span className="text-axiom-primary font-medium">Essencial</span> em{" "}
          <strong className="text-white">Configurações &gt; Categorias</strong> para ver o breakdown
          do seu custo de vida real.
        </p>
      </div>
    );
  }

  const maxAvg = Math.max(...essentialCategories.map((c) => c.monthlyAvg), 1);

  // Insight: quanto cai se quitar passivos que geram gastos em categorias essenciais
  const essentialCatIds = new Set(essentialCategories.map((c) => c.id));
  const sub = liabilityCosts
    .filter((lc) => essentialCatIds.has(lc.categoryId))
    .reduce((s, lc) => s + lc.monthlyAvg, 0);

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Custo de Vida Real</h3>
        <p className="text-xs text-axiom-muted mt-0.5">
          Gastos médios nas categorias essenciais
        </p>
      </div>

      {/* Lista de categorias essenciais */}
      <div className="flex flex-col gap-2.5">
        {essentialCategories.map((cat) => (
          <div key={cat.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-white">{cat.name}</span>
              </div>
              <span className="text-xs font-medium text-white">
                {formatCurrency(cat.monthlyAvg, locale, currency)}/mês
              </span>
            </div>
            <div className="h-1.5 bg-axiom-hover rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(cat.monthlyAvg / maxAvg) * 100}%`,
                  backgroundColor: cat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between border-t border-axiom-border pt-3">
        <span className="text-xs text-axiom-muted uppercase tracking-wide">Total essencial</span>
        <span className="text-sm font-bold text-white">
          {formatCurrency(totalEssentialMonthly, locale, currency)}/mês
        </span>
      </div>

      {/* Origem dos gastos por passivos */}
      {liabilityCosts.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Origem dos gastos (passivos)</p>
          {liabilityCosts.map((lc) => (
            <div key={lc.wealthItemId} className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs text-white">{lc.wealthItemName}</span>
                <span className="text-[11px] text-axiom-muted">via {lc.categoryName}</span>
              </div>
              <span className="text-xs text-axiom-expense font-medium">
                {formatCurrency(lc.monthlyAvg, locale, currency)}/mês
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Insight: quitando passivos */}
      {sub > 0 && (
        <div className="bg-axiom-income/10 border border-axiom-income/20 rounded-lg px-3 py-2">
          <p className="text-xs text-axiom-income">
            Quitando os passivos, seu essencial cairia para{" "}
            <span className="font-bold">{formatCurrency(totalEssentialMonthly - sub, locale, currency)}/mês</span>{" "}
            (-{formatCurrency(sub, locale, currency)}/mês)
          </p>
        </div>
      )}
    </div>
  );
}
