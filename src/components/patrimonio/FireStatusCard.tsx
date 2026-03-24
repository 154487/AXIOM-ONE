"use client";

import { useState, useRef } from "react";
import { Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const FI_NUMBER_LABELS: Record<string, string> = {
  "pt-BR": "Meta Investida",
  en: "Investment Goal",
  es: "Meta Invertida",
  fr: "Objectif Investi",
  ar: "هدف الاستثمار",
  zh: "投资目标",
  hi: "निवेश लक्ष्य",
};

function getFiLabel(locale: string) {
  return FI_NUMBER_LABELS[locale] ?? FI_NUMBER_LABELS["en"];
}

// Simula mês a mês até atingir o FI Number. Retorna meses ou null (>50 anos).
function monthsToFI(
  currentPatrimony: number,
  fiTarget: number,
  monthlyContrib: number,
  annualRate: number
): number | null {
  if (currentPatrimony >= fiTarget) return 0;
  if (monthlyContrib <= 0 && annualRate <= 0) return null;
  const r = (1 + annualRate) ** (1 / 12) - 1;
  let p = currentPatrimony;
  for (let m = 1; m <= 600; m++) {
    p = p * (1 + r) + monthlyContrib;
    if (p >= fiTarget) return m;
  }
  return null;
}

interface FireStatusCardProps {
  firePatrimony: number;
  fiNumber: number;
  savingsRate: number;
  avgMonthlyIncome: number;
  effectiveMonthlyExpense: number;
  currency: string;
  locale: string;
  fiNumberManual: number | null;
  onFiNumberChange: (v: number | null) => void;
  cdiAnual?: number | null;
  ipcaAnual?: number | null;
  targetMonthlyContrib: number | null;
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
  ipcaAnual,
  targetMonthlyContrib,
}: FireStatusCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const progress = fiNumber > 0 ? Math.min(100, (firePatrimony / fiNumber) * 100) : 0;
  const faltaParaFI = Math.max(0, fiNumber - firePatrimony);
  const monthlySurplus = Math.max(0, avgMonthlyIncome - effectiveMonthlyExpense);

  const badgeColor =
    progress >= 50
      ? "bg-axiom-income/20 text-axiom-income border-axiom-income/30"
      : progress >= 25
      ? "bg-axiom-primary/20 text-axiom-primary border-axiom-primary/30"
      : "bg-axiom-expense/20 text-axiom-expense border-axiom-border/30";

  function startEditing() {
    setInputVal(fiNumberManual ? String(fiNumberManual) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commitEdit() {
    const parsed = parseFloat(inputVal.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!isNaN(parsed) && parsed > 0) onFiNumberChange(parsed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  }

  // — Renda passiva atual (4% SWR) —
  const SWR = 0.04;
  const rendaPassiva = firePatrimony * SWR / 12;
  const rendaPassivaProgress =
    effectiveMonthlyExpense > 0
      ? Math.min(100, (rendaPassiva / effectiveMonthlyExpense) * 100)
      : 0;

  // — Previsão de IF —
  // cdiAnual vem como percentual (ex: 14.65 = 14.65% a.a.) — converter para decimal
  const returnRate = (cdiAnual != null) ? cdiAnual / 100 : 0.10;
  const monthlyContribForProjection = targetMonthlyContrib ?? 0;
  const months = targetMonthlyContrib !== null
    ? monthsToFI(firePatrimony, fiNumber, monthlyContribForProjection, returnRate)
    : null; // não projeta sem aporte definido manualmente
  const currentYear = new Date().getFullYear();
  const yearsToFI = months !== null ? Math.ceil(months / 12) : null;
  const targetYear = yearsToFI !== null ? currentYear + yearsToFI : null;

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
        <div className="h-2 bg-axiom-hover rounded-full overflow-hidden">
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

      {/* Grid 2×2 KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPIBox
          label="Patrimônio Investido"
          value={formatCurrency(firePatrimony, locale, currency)}
          sub="carteira de investimentos"
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
            {fiNumberManual ? "sua meta de patrimônio" : "sugestão pela regra dos 4% · clique para definir"}
          </p>
        </div>

        <KPIBox
          label="Renda Passiva Hoje"
          value={`${formatCurrency(rendaPassiva, locale, currency)}/mês`}
          sub={`${rendaPassivaProgress.toFixed(1)}% do objetivo · SWR 4%`}
          highlight={rendaPassivaProgress >= 50}
        />
        <KPIBox
          label="Falta para IF"
          value={formatCurrency(faltaParaFI, locale, currency)}
          sub={faltaParaFI === 0 ? "🎉 você chegou lá!" : "ainda necessário"}
        />
      </div>

      {/* Previsão de IF */}
      <div className="flex flex-col gap-4 pt-1 border-t border-axiom-border">

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Previsão de IF</p>
            {targetMonthlyContrib === null ? (
              <>
                <p className="text-sm font-medium text-axiom-muted">—</p>
                <p className="text-[11px] text-axiom-muted/60">
                  Defina seu aporte mensal em{" "}
                  <span className="text-axiom-primary">Configurações do Plano</span>
                </p>
              </>
            ) : yearsToFI === 0 ? (
              <p className="text-base font-bold text-axiom-income">Já atingido 🎉</p>
            ) : targetYear !== null ? (
              <>
                <p className="text-xl font-bold text-white leading-none">~{targetYear}</p>
                <p className="text-[11px] text-axiom-muted/70">
                  daqui {yearsToFI} {yearsToFI === 1 ? "ano" : "anos"}
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-axiom-muted">50+ anos</p>
                <p className="text-[11px] text-axiom-muted/70">aumente o aporte ou revise o Número IF</p>
              </>
            )}
          </div>
          {targetMonthlyContrib !== null && (
            <div className="text-right shrink-0">
              <p className="text-[10px] text-axiom-muted/60">aporte · retorno</p>
              <p className="text-[11px] text-axiom-muted">
                {formatCurrency(targetMonthlyContrib, locale, currency)}/mês
              </p>
              <p className="text-[10px] text-axiom-muted/50">
                {(returnRate * 100).toFixed(1)}% a.a. {cdiAnual ? "(CDI)" : "(est.)"}
              </p>
            </div>
          )}
        </div>

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
