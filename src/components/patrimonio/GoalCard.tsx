"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function GoalCard({ goal, currency, locale, onEdit, onDelete }: GoalCardProps) {
  const [deleting, setDeleting] = useState(false);

  const { name, targetAmount, savedAmount, contributionAmount, contributionFrequency } = goal;

  const progressPct = Math.min(100, (savedAmount / targetAmount) * 100);
  const achieved = savedAmount >= targetAmount;

  // Date projection
  const monthlyEquivalent =
    contributionFrequency === "DAILY"
      ? contributionAmount * 30
      : contributionFrequency === "WEEKLY"
      ? contributionAmount * 4.33
      : contributionAmount;

  const remaining = targetAmount - savedAmount;
  const monthsToGoal =
    remaining > 0 && monthlyEquivalent > 0 ? Math.ceil(remaining / monthlyEquivalent) : null;

  let projectionLabel: string | null = null;
  if (monthsToGoal !== null) {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToGoal);
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
        <p className="text-xs text-axiom-muted">
          Previsão:{" "}
          <span className="text-white">{projectionLabel}</span>
          {" — aportando "}
          {formatCurrency(contributionAmount, locale, currency)}/
          {FREQUENCY_LABELS[contributionFrequency].toLowerCase()}
        </p>
      ) : null}

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
