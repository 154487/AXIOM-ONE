"use client";

import { useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface FireSettingsCardProps {
  targetMonthlyContrib: number | null;
  extraSavings: number;
  expectedReturn: number;
  cdiAnual?: number | null;
  onTargetMonthlyContribChange: (v: number) => void;
  onExtraSavingsChange: (v: number) => void;
  onExpectedReturnChange: (v: number) => void;
  currency: string;
  locale: string;
}

export function FireSettingsCard({
  targetMonthlyContrib,
  extraSavings,
  expectedReturn,
  cdiAnual,
  onTargetMonthlyContribChange,
  onExtraSavingsChange,
  onExpectedReturnChange,
  currency,
  locale,
}: FireSettingsCardProps) {
  const contribDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleContribChange(raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return;
    if (contribDebounce.current) clearTimeout(contribDebounce.current);
    contribDebounce.current = setTimeout(() => onTargetMonthlyContribChange(v), 400);
  }

  const RETURN_MIN = 4;
  const RETURN_MAX = 20;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-white">Configurações do Plano</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Parâmetros que definem sua projeção</p>
      </div>

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
        <p className="text-xs text-axiom-muted">
          Valor real que você aporta — usado na Previsão de IF
        </p>
      </div>

      <div className="h-px bg-axiom-border" />

      {/* Taxa de retorno esperada */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs text-axiom-muted uppercase tracking-wide">
              Taxa de retorno esperada
            </label>
            <p className="text-xs text-axiom-muted mt-0.5">
              Retorno anual da sua carteira
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-axiom-primary">{expectedReturn.toFixed(1)}%</span>
            <p className="text-[11px] text-axiom-muted">a.a.</p>
          </div>
        </div>
        <input
          type="range"
          min={RETURN_MIN}
          max={RETURN_MAX}
          step={0.5}
          value={expectedReturn}
          onChange={(e) => onExpectedReturnChange(parseFloat(e.target.value))}
          className="w-full accent-axiom-primary cursor-pointer"
        />
        <div className="flex justify-between text-xs text-axiom-muted">
          <span>{RETURN_MIN}% — conservador</span>
          <span>agressivo — {RETURN_MAX}%</span>
        </div>
        {cdiAnual != null && (
          <p className="text-xs text-axiom-muted">
            CDI atual:{" "}
            <button
              onClick={() => onExpectedReturnChange(Math.round(cdiAnual * 2) / 2)}
              className="text-axiom-primary hover:underline font-medium"
            >
              {cdiAnual.toFixed(1)}% a.a.
            </button>{" "}
            · clique para usar como base
          </p>
        )}
      </div>

      <div className="h-px bg-axiom-border" />

      {/* Simular aporte extra */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs text-axiom-muted uppercase tracking-wide">
              Simular aporte extra
            </label>
            <p className="text-xs text-axiom-muted mt-0.5">
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
        <div className="flex justify-between text-xs text-axiom-muted">
          <span>sem extra</span>
          <span>+20% da renda</span>
        </div>
      </div>
    </div>
  );
}
