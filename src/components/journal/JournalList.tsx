"use client";

import { JournalEntryCard } from "./JournalEntryCard";
import type { JournalEntry } from "./JournalShell";

const TYPES = [
  { value: null,       label: "Todos" },
  { value: "NOTE",     label: "Nota" },
  { value: "APORTE",   label: "Aporte" },
  { value: "RESGATE",  label: "Resgate" },
  { value: "REFLEXAO", label: "Reflexão" },
  { value: "META",     label: "Meta" },
];

function buildMonthOptions(): { value: string; label: string }[] {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

interface JournalListProps {
  entries: JournalEntry[];
  loading: boolean;
  filterMonth: string;
  onFilterMonthChange: (m: string) => void;
  filterType: string | null;
  onFilterTypeChange: (t: string | null) => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
}

export function JournalList({
  entries,
  loading,
  filterMonth,
  onFilterMonthChange,
  filterType,
  onFilterTypeChange,
  onEdit,
  onDelete,
}: JournalListProps) {
  const monthOptions = buildMonthOptions();

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterMonth}
          onChange={(e) => onFilterMonthChange(e.target.value)}
          className="bg-axiom-card border border-axiom-border text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-axiom-primary"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={String(t.value)}
              onClick={() => onFilterTypeChange(t.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filterType === t.value
                  ? "bg-axiom-primary border-axiom-primary text-white"
                  : "border-axiom-border text-axiom-muted hover:text-white hover:border-axiom-primary/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-axiom-card border border-axiom-border rounded-xl p-4 h-36 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-axiom-muted">
          <p className="text-base">Nenhuma entrada neste período.</p>
          <p className="text-sm mt-1">Crie a primeira!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
