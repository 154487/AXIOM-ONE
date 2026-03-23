"use client";

import { useState, useRef } from "react";
import { Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Label do FI Number traduzido por locale
const FI_NUMBER_LABELS: Record<string, string> = {
  "pt-BR": "Número IF",
  en: "FI Number",
  es: "Número IF",
  fr: "Numéro IF",
  ar: "رقم الاستقلال",
  zh: "财务独立数",
  hi: "FI संख्या",
};

function getFiLabel(locale: string) {
  return FI_NUMBER_LABELS[locale] ?? FI_NUMBER_LABELS["en"];
}

// Valor futuro de aportes mensais com juros compostos
function futureValue(monthly: number, annualRate: number, years: number) {
  if (monthly <= 0 || annualRate <= 0) return 0;
  const r = (1 + annualRate) ** (1 / 12) - 1;
  const n = years * 12;
  return monthly * (((1 + r) ** n - 1) / r);
}

interface FireStatusCardProps {
  firePatrimony: number;
  fiNumber: number;
  savingsRate: number; // % (ex: 32.5)
  avgMonthlyIncome: number;
  effectiveMonthlyExpense: number;
  currency: string;
  locale: string;
  fiNumberManual: number | null;
  onFiNumberChange: (v: number | null) => void;
  cdiAnual?: number | null;
}

export function FireStatusCard({
  firePatrimony,
  fiNumber,
  savingsRate,
  avgMonthlyIncome,
  effectiveMonthlyExpense,
  currency,
  locale,
  fiNumberManual,
  onFiNumberChange,
  cdiAnual,
}: FireStatusCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const progress = fiNumber > 0 ? Math.min(100, (firePatrimony / fiNumber) * 100) : 0;
  const faltaParaFI = Math.max(0, fiNumber - firePatrimony);
  const monthlysurplus = Math.max(0, avgMonthlyIncome - effectiveMonthlyExpense);

  const badgeColor =
    progress >= 50
      ? "bg-axiom-income/20 text-axiom-income border-axiom-income/30"
      : progress >= 25
      ? "bg-axiom-primary/20 text-axiom-primary border-axiom-primary/30"
      : "bg-axiom-expense/20 text-axiom-expense border-axiom-expense/30";

  function startEditing() {
    setInputVal(fiNumberManual ? String(fiNumberManual) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const parsed = parseFloat(inputVal.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) {
      onFiNumberChange(parsed);
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  }

  // Cenários de rendimento: Poupança / CDI / Renda Variável
  const scenarios = [
    { label: "Poupança", rate: 0.06, color: "text-axiom-muted" },
    {
      label: `CDI ${cdiAnual ? (cdiAnual * 100).toFixed(1) : "~11"}%`,
      rate: cdiAnual ?? 0.11,
      color: "text-axiom-income",
    },
    { label: "Renda variável ~12%", rate: 0.12, color: "text-axiom-primary" },
  ];

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Situação Atual</h3>
        <p className="text-xs text-axiom-muted mt-0.5">Onde você está no caminho para a independência</p>
      </div>

      {/* Barra de progresso */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-axiom-muted">Progresso para IF</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${badgeColor}`}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-axiom-hover rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-axiom-primary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-axiom-muted">
          <span>{formatCurrency(firePatrimony, locale, currency)}</span>
          <span>{formatCurrency(fiNumber, locale, currency)}</span>
        </div>
      </div>

      {/* Grid 2×2 de KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPIBox
          label="Patrimônio Total"
          value={formatCurrency(firePatrimony, locale, currency)}
          sub="bens, passivos e investimentos"
        />

        {/* FI Number editável */}
        <div className="bg-axiom-hover/60 rounded-lg p-3 flex flex-col gap-1 group relative">
          <p className="text-[11px] text-axiom-muted uppercase tracking-wide">{getFiLabel(locale)}</p>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="text-base font-bold text-white bg-transparent border-b border-axiom-primary outline-none w-full"
              placeholder="Ex: 2000000"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="text-base font-bold text-white">{formatCurrency(fiNumber, locale, currency)}</p>
              <button
                onClick={startEditing}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-axiom-muted hover:text-axiom-primary"
                title="Definir manualmente"
              >
                <Pencil size={12} />
              </button>
              {fiNumberManual && (
                <button
                  onClick={() => onFiNumberChange(null)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-axiom-muted hover:text-axiom-expense"
                  title="Voltar ao calculado"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}
          <p className="text-[11px] text-axiom-muted/70">
            {fiNumberManual ? "definido por você" : "calculado (regra 4%)"}
          </p>
        </div>

        <KPIBox
          label="Taxa de Poupança"
          value={`${savingsRate.toFixed(1)}%`}
          sub={`${formatCurrency(monthlysurplus, locale, currency)}/mês`}
          highlight={savingsRate >= 20}
        />
        <KPIBox
          label="Falta para IF"
          value={formatCurrency(faltaParaFI, locale, currency)}
          sub={faltaParaFI === 0 ? "🎉 você chegou lá!" : "ainda necessário"}
        />
      </div>

      {/* Cenários de rendimento */}
      {monthlysurplus > 0 && (
        <div className="flex flex-col gap-2 pt-1 border-t border-axiom-border">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] text-axiom-muted uppercase tracking-wide">
              Se investir o aporte mensal
            </p>
            <p className="text-[11px] text-axiom-muted/60">10 anos · 20 anos</p>
          </div>
          {scenarios.map(({ label, rate, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-[11px] w-36 shrink-0 ${color}`}>{label}</span>
              <div className="flex-1 flex items-center justify-end gap-3">
                <span className="text-[11px] text-white/80 tabular-nums">
                  {formatCurrency(futureValue(monthlysurplus, rate, 10), locale, currency)}
                </span>
                <span className="text-[11px] text-axiom-muted/40">·</span>
                <span className="text-[11px] font-medium text-white tabular-nums">
                  {formatCurrency(futureValue(monthlysurplus, rate, 20), locale, currency)}
                </span>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-axiom-muted/40 mt-0.5">
            Juros compostos mensais, sem contar patrimônio atual
          </p>
        </div>
      )}
    </div>
  );
}

function KPIBox({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-axiom-hover/60 rounded-lg p-3 flex flex-col gap-1">
      <p className="text-[11px] text-axiom-muted uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold ${highlight ? "text-axiom-income" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[11px] text-axiom-muted/70">{sub}</p>
    </div>
  );
}
