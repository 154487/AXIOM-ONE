"use client";

import { formatCurrency } from "@/lib/utils";

interface CoastFireCardProps {
  coastFireNumber: number;
  firePatrimony: number;
  fiNumber: number;
  retirementYears: number;
  onRetirementYearsChange: (v: number) => void;
  currency: string;
  locale: string;
}

export function CoastFireCard({
  coastFireNumber,
  firePatrimony,
  fiNumber,
  retirementYears,
  onRetirementYearsChange,
  currency,
  locale,
}: CoastFireCardProps) {
  const coastProgress =
    coastFireNumber > 0 ? Math.min(100, (firePatrimony / coastFireNumber) * 100) : 0;
  const hasReachedCoast = firePatrimony >= coastFireNumber;

  // Estimativa: quanto o patrimônio atual cresceria em retirementYears sem aportes (8% a.a.)
  const futureValueNoContrib = firePatrimony * Math.pow(1 + 0.08, retirementYears);
  const faltaParaCoast = Math.max(0, coastFireNumber - firePatrimony);

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Coast FIRE</h3>
        <p className="text-xs text-axiom-muted mt-0.5">
          O ponto onde você pode parar de aportar e ainda chegar à independência em {retirementYears} anos
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-axiom-muted">Progresso Coast FIRE</span>
          <span className="text-xs font-semibold text-white">{coastProgress.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-axiom-hover rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              hasReachedCoast ? "bg-axiom-income" : "bg-blue-500"
            }`}
            style={{ width: `${coastProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-axiom-muted">
          <span>{formatCurrency(firePatrimony, locale, currency)}</span>
          <span>{formatCurrency(coastFireNumber, locale, currency)}</span>
        </div>
      </div>

      {/* Mensagem condicional */}
      {hasReachedCoast ? (
        <div className="bg-axiom-income/10 border border-axiom-income/30 rounded-lg p-3">
          <p className="text-sm font-semibold text-axiom-income">
            🎉 Você já pode parar de aportar!
          </p>
          <p className="text-xs text-axiom-muted mt-1">
            Com o patrimônio atual e sem novos aportes, você chegará ao FI Number em ~{retirementYears} anos.
            Continue aportando para chegar mais rápido.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-axiom-hover/60 rounded-lg p-2.5">
              <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Coast FIRE Number</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {formatCurrency(coastFireNumber, locale, currency)}
              </p>
            </div>
            <div className="bg-axiom-hover/60 rounded-lg p-2.5">
              <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Falta para Coastar</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {formatCurrency(faltaParaCoast, locale, currency)}
              </p>
            </div>
          </div>
          <p className="text-xs text-axiom-muted">
            Em {retirementYears} anos sem aportes, o patrimônio atual cresceria para{" "}
            <span className="text-white font-medium">
              {formatCurrency(futureValueNoContrib, locale, currency)}
            </span>{" "}
            {futureValueNoContrib >= fiNumber
              ? "(≥ FI Number ✓)"
              : `(FI Number: ${formatCurrency(fiNumber, locale, currency)})`}
          </p>
        </div>
      )}

      {/* Slider de horizonte — aqui faz sentido contextual */}
      <div className="flex flex-col gap-2 pt-2 border-t border-axiom-border">
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-axiom-muted uppercase tracking-wide">
            Em quantos anos quer se aposentar?
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
        <div className="flex justify-between text-[11px] text-axiom-muted/50">
          <span>5 anos</span>
          <span>50 anos</span>
        </div>
      </div>

      <p className="text-[11px] text-axiom-muted/50 italic">
        Coast FIRE = patrimônio que cresce sozinho a 8% a.a. até atingir o FI Number em {retirementYears} anos.
      </p>
    </div>
  );
}
