"use client";

import { useState, useRef } from "react";
import { Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FireStatusCardProps {
  firePatrimony: number;
  fiNumber: number;
  savingsRate: number;        // % (ex: 32.5)
  avgMonthlyIncome: number;
  effectiveMonthlyExpense: number;
  currency: string;
  locale: string;
  fiNumberManual: number | null;
  onFiNumberChange: (v: number | null) => void;
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
}: FireStatusCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const progress = fiNumber > 0 ? Math.min(100, (firePatrimony / fiNumber) * 100) : 0;
  const faltaParaFI = Math.max(0, fiNumber - firePatrimony);

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
          sub="incluindo bens e investimentos"
        />

        {/* FI Number editável */}
        <div className="bg-axiom-hover/60 rounded-lg p-3 flex flex-col gap-1 group relative">
          <p className="text-[11px] text-axiom-muted uppercase tracking-wide">FI Number</p>
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
                title="Definir FI Number manualmente"
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
          sub={`${formatCurrency(avgMonthlyIncome - effectiveMonthlyExpense, locale, currency)}/mês`}
          highlight={savingsRate >= 20}
        />
        <KPIBox
          label="Falta para IF"
          value={formatCurrency(faltaParaFI, locale, currency)}
          sub={faltaParaFI === 0 ? "🎉 você chegou lá!" : "ainda necessário"}
        />
      </div>
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
