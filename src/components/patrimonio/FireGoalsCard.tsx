"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { FireSettingsResponse } from "@/types/fire";

interface FireGoalsCardProps {
  settings: FireSettingsResponse;
  avgMonthlyIncome: number;
  avgMonthlyContrib: number;
  totalInvested: number;
  currency: string;
  locale: string;
  onSave: (field: keyof FireSettingsResponse, value: number | null) => void;
}

interface GoalRowProps {
  label: string;
  hint: string;
  current: number;
  target: number | null;
  currency: string;
  locale: string;
  onSave: (value: number | null) => void;
}

function GoalRow({ label, hint, current, target, currency, locale, onSave }: GoalRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(target !== null ? String(target) : "");

  const progress = target && target > 0 ? Math.min(100, (current / target) * 100) : 0;

  function handleSave() {
    const v = parseFloat(draft);
    if (!isNaN(v) && v > 0) {
      onSave(v);
    } else if (draft === "" || draft === "0") {
      onSave(null);
    }
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-axiom-muted uppercase tracking-wide">{label}</p>
          <p className="text-[11px] text-axiom-muted/60 mt-0.5">{hint}</p>
        </div>
        <div className="text-right">
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                autoFocus
                className="w-28 bg-axiom-hover border border-axiom-primary/60 rounded px-2 py-1 text-xs text-white focus:outline-none"
                placeholder="Ex: 5000"
              />
              <button
                onClick={handleSave}
                className="text-xs text-axiom-primary font-semibold px-2 py-1 hover:text-white transition-colors"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraft(target !== null ? String(target) : "");
                setEditing(true);
              }}
              className="text-right group"
            >
              {target !== null ? (
                <>
                  <p className="text-sm font-semibold text-white group-hover:text-axiom-primary transition-colors">
                    {formatCurrency(target, locale, currency)}
                  </p>
                  <p className="text-[11px] text-axiom-muted/60">meta · clique para editar</p>
                </>
              ) : (
                <p className="text-xs text-axiom-primary/70 hover:text-axiom-primary transition-colors">
                  Definir meta...
                </p>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-axiom-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-axiom-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-axiom-muted w-10 text-right">
          {target
            ? `${progress.toFixed(0)}%`
            : formatCurrency(current, locale, currency).replace(/\s/g, "")}
        </span>
      </div>

      {/* Atual */}
      <p className="text-[11px] text-axiom-muted/70">
        Atual: <span className="text-axiom-muted">{formatCurrency(current, locale, currency)}</span>
      </p>
    </div>
  );
}

export function FireGoalsCard({
  settings,
  avgMonthlyIncome,
  avgMonthlyContrib,
  totalInvested,
  currency,
  locale,
  onSave,
}: FireGoalsCardProps) {
  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Metas Pessoais de IF</h3>
        <p className="text-xs text-axiom-muted mt-0.5">
          Defina seus alvos — clique nos valores para editar
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <GoalRow
          label="Renda mensal desejada"
          hint="Quanto quer receber por mês na aposentadoria"
          current={avgMonthlyIncome}
          target={settings.targetMonthlyIncome}
          currency={currency}
          locale={locale}
          onSave={(v) => onSave("targetMonthlyIncome", v)}
        />

        <div className="border-t border-axiom-border" />

        <GoalRow
          label="Aporte mensal"
          hint="Quanto quer guardar por mês"
          current={avgMonthlyContrib}
          target={settings.targetMonthlyContrib}
          currency={currency}
          locale={locale}
          onSave={(v) => onSave("targetMonthlyContrib", v)}
        />

        <div className="border-t border-axiom-border" />

        <GoalRow
          label="Patrimônio investido"
          hint="Total que quer ter investido"
          current={totalInvested}
          target={settings.targetInvestedAmount}
          currency={currency}
          locale={locale}
          onSave={(v) => onSave("targetInvestedAmount", v)}
        />
      </div>
    </div>
  );
}
