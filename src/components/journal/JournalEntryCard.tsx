"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { JournalEntry } from "./JournalShell";

const TYPE_LABELS: Record<string, string> = {
  NOTE: "Nota",
  APORTE: "Aporte",
  RESGATE: "Resgate",
  REFLEXAO: "Reflexão",
  META: "Meta",
};

function stripMarkdown(md: string): string {
  return md
    .replace(/#+\s/g, "")
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .slice(0, 120);
}

function HealthBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  if (score >= 70) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-axiom-income/10 text-axiom-income font-medium">
        Score {score} — Alto
      </span>
    );
  }
  if (score >= 50) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-axiom-hover text-white font-medium">
        Score {score} — Médio
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-axiom-expense/10 text-axiom-expense font-medium">
      Score {score} — Baixo
    </span>
  );
}

interface JournalEntryCardProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
}

export function JournalEntryCard({ entry, onEdit, onDelete }: JournalEntryCardProps) {
  const dateLabel = new Date(entry.date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const preview = stripMarkdown(entry.content);

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-4 flex flex-col gap-3 hover:bg-axiom-hover transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{entry.title}</p>
          <p className="text-xs text-axiom-muted mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-axiom-muted hover:text-white hover:bg-axiom-border transition-colors"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-axiom-muted hover:text-axiom-expense hover:bg-axiom-expense/10 transition-colors"
            aria-label="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <p className="text-sm text-axiom-muted line-clamp-2">{preview || "—"}</p>

      {/* Operação vinculada */}
      {entry.investmentEntry && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-axiom-hover border border-axiom-border text-xs">
          <span className="text-axiom-primary font-mono font-semibold shrink-0">
            {entry.investmentEntry.asset.ticker ?? entry.investmentEntry.asset.name}
          </span>
          <span className="text-axiom-muted">·</span>
          <span className="text-axiom-muted shrink-0">
            {entry.investmentEntry.type === "PURCHASE" ? "Compra" : "Venda"}
          </span>
          <span className="text-axiom-muted">·</span>
          <span className="text-white shrink-0">
            {entry.investmentEntry.quantity}× R$ {entry.investmentEntry.price.toFixed(2)}
          </span>
          <span className="ml-auto text-axiom-muted shrink-0">
            = R$ {entry.investmentEntry.amount.toFixed(2)}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap gap-1.5 items-center mt-auto">
        <span className="text-xs px-2 py-0.5 rounded-full bg-axiom-primary/10 text-axiom-primary font-medium">
          {TYPE_LABELS[entry.entryType] ?? entry.entryType}
        </span>
        {entry.tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-axiom-border text-axiom-muted">
            #{tag}
          </span>
        ))}
        <HealthBadge score={entry.healthScoreAtTime} />
      </div>
    </div>
  );
}
