"use client";

import { useState, useEffect, useCallback } from "react";
import { GoalCard } from "./GoalCard";
import { GoalDialog } from "./GoalDialog";
import type { FinancialGoalSerialized } from "@/app/api/patrimonio/goals/route";

function SkeletonCard({ label }: { label: string }) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-4">
      <p className="text-axiom-muted text-sm font-medium">{label}</p>
      <div className="flex-1 animate-pulse bg-axiom-hover rounded-lg h-32" />
    </div>
  );
}

interface GoalsListProps {
  currency: string;
  locale: string;
}

export function GoalsList({ currency, locale }: GoalsListProps) {
  const [goals, setGoals] = useState<FinancialGoalSerialized[]>([]);
  const [cdiAnual, setCdiAnual] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingGoal, setEditingGoal] = useState<FinancialGoalSerialized | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/patrimonio/goals");
      if (res.ok) {
        const data = await res.json();
        setGoals(data.goals);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    // Busca CDI (≈ SELIC) para projeção com juros compostos
    fetch("/api/investments/benchmarks")
      .then((r) => r.json())
      .then((d) => { if (d.selicAnual) setCdiAnual(d.selicAnual); })
      .catch(() => {});
  }, [fetchGoals]);

  function handleSuccess(goal: FinancialGoalSerialized) {
    if (dialogMode === "create") {
      setGoals((prev) => [goal, ...prev]);
    } else {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
    }
    setDialogMode(null);
    setEditingGoal(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/patrimonio/goals/${id}`, { method: "DELETE" });
      await fetchGoals();
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setEditingGoal(null);
    setDialogMode("create");
  }

  function openEdit(goal: FinancialGoalSerialized) {
    setEditingGoal(goal);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingGoal(null);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold">Metas Financeiras</h3>
            <p className="text-xs text-axiom-muted mt-0.5">Objetivos independentes com projeção de data</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-axiom-primary text-white text-xs font-medium hover:bg-axiom-primary/90 transition-colors"
          >
            + Nova meta
          </button>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            <SkeletonCard label="Carregando metas..." />
            <SkeletonCard label="" />
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-axiom-card border border-axiom-border rounded-xl p-10 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-axiom-muted italic">Nenhuma meta criada</p>
            <button
              onClick={openCreate}
              className="px-4 py-2 rounded-lg bg-axiom-primary text-white text-sm font-medium hover:bg-axiom-primary/90 transition-colors"
            >
              Criar primeira meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                currency={currency}
                locale={locale}
                cdiAnual={cdiAnual}
                onEdit={() => openEdit(goal)}
                onDelete={async () => {
                  if (deletingId) return;
                  await handleDelete(goal.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {dialogMode !== null && (
        <GoalDialog
          mode={dialogMode}
          goal={editingGoal ?? undefined}
          onSuccess={handleSuccess}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
