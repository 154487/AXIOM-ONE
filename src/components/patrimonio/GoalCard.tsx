"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getBankProductById, effectiveAnnualYield, monthsToReachGoal } from "@/lib/brazilianBanks";
import type { FinancialGoalSerialized } from "@/app/api/patrimonio/goals/route";

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
};

interface GoalCardProps {
  goal: FinancialGoalSerialized;
  currency: string;
  locale: string;
  cdiAnual: number | null; // taxa CDI/SELIC atual em % ao ano (ex: 13.65)
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function GoalCard({ goal, currency, locale, cdiAnual, onEdit, onDelete }: GoalCardProps) {
  const [deleting, setDeleting] = useState(false);

  const { name, targetAmount, savedAmount, contributionAmount, contributionFrequency, bank } = goal;

  const bankInfo = bank ? getBankProductById(bank) : null;

  // Rendimento efetivo anual (ex: 0.1365 para 13.65% a.a.)
  const annualYield =
    bankInfo && bankInfo.cdiPct > 0 && cdiAnual !== null
      ? effectiveAnnualYield(bankInfo.cdiPct, cdiAnual)
      : 0;

  // Yield display string (ex: "13,65% a.a.")
  const yieldDisplayPct = cdiAnual !== null && bankInfo && bankInfo.cdiPct > 0
    ? ((bankInfo.cdiPct / 100) * cdiAnual).toFixed(2)
    : null;

  // Aporte normalizado para mensal
  const monthlyContrib =
    contributionFrequency === "DAILY"
      ? contributionAmount * 30
      : contributionFrequency === "WEEKLY"
      ? contributionAmount * 4.33
      : contributionAmount;

  const progressPct = Math.min(100, targetAmount > 0 ? (savedAmount / targetAmount) * 100 : 0);
  const achieved = savedAmount >= targetAmount;

  // Projeção com juros compostos (se houver rendimento) ou linear
  const months = achieved
    ? 0
    : monthsToReachGoal(savedAmount, targetAmount, monthlyContrib, annualYield);

  let projectionLabel: string | null = null;
  if (!achieved && months !== null) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    projectionLabel = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 flex flex-col gap-4 group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-white font-semibold text-sm leading-tight">{name}</h4>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-axiom-hover border border-axiom-border text-axiom-muted">
          {FREQUENCY_LABELS[contributionFrequency]}
        </span>
      </div>

      {/* Banco + rendimento */}
      {bankInfo && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-axiom-muted">
            {bankInfo.bankName}
            {bankInfo.productName ? ` · ${bankInfo.productName}` : ""}
          </span>
          {bankInfo.cdiPct > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-axiom-primary/15 border border-axiom-primary/30 text-axiom-primary">
              {bankInfo.cdiPct}% CDI
              {yieldDisplayPct ? ` ≈ ${yieldDisplayPct}% a.a.` : ""}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-axiom-hover border border-axiom-border text-axiom-muted/60">
              sem rendimento
            </span>
          )}
        </div>
      )}

      {/* Valores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-axiom-hover">
          <span className="text-xs text-axiom-muted">Poupado</span>
          <span className="text-sm font-bold text-axiom-income">
            {formatCurrency(savedAmount, locale, currency)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-axiom-hover">
          <span className="text-xs text-axiom-muted">Meta</span>
          <span className="text-sm font-bold text-axiom-primary">
            {formatCurrency(targetAmount, locale, currency)}
          </span>
        </div>
      </div>

      {/* Progresso */}
      <div className="flex flex-col gap-1.5">
        <div className="w-full h-2 bg-axiom-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-axiom-primary rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs text-axiom-muted">{progressPct.toFixed(1)}%</span>
      </div>

      {/* Projeção ou badge meta atingida */}
      {achieved ? (
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-axiom-income/10 border border-axiom-income/20">
          <span className="text-xs font-semibold text-axiom-income">Meta atingida! 🎯</span>
        </div>
      ) : projectionLabel ? (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-axiom-muted">
            Previsão:{" "}
            <span className="text-white font-medium">{projectionLabel}</span>
            {" — aportando "}
            {formatCurrency(contributionAmount, locale, currency)}/
            {FREQUENCY_LABELS[contributionFrequency].toLowerCase()}
          </p>
          {annualYield > 0 && (
            <p className="text-[10px] text-axiom-income/80">
              ✦ Inclui rendimento composto de {yieldDisplayPct}% a.a.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-axiom-muted italic">
          Defina um aporte para ver a projeção
        </p>
      )}

      {/* Ações hover */}
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded text-axiom-muted hover:text-white transition-colors"
          title="Editar"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded text-axiom-muted hover:text-axiom-expense transition-colors disabled:opacity-50"
          title="Excluir"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
