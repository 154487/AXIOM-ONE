"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { JournalList } from "./JournalList";

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  entryType: string;
  tags: string[];
  date: string;
  healthScoreAtTime: number | null;
  sustainableSurplusAtTime: number | null;
  createdAt: string;
  updatedAt: string;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

interface JournalShellProps {
  // JournalEditor will be added in issue #65
  renderEditor?: (props: {
    open: boolean;
    entry: JournalEntry | null;
    onClose: () => void;
    onSaved: (entry: JournalEntry) => void;
  }) => React.ReactNode;
}

export function JournalShell({ renderEditor }: JournalShellProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: filterMonth });
      if (filterType) params.set("type", filterType);
      const res = await fetch(`/api/journal?${params.toString()}`);
      if (res.ok) setEntries(await res.json());
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterType]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSaved = useCallback((entry: JournalEntry) => {
    setEntries((prev) => {
      const exists = prev.find((e) => e.id === entry.id);
      if (exists) return prev.map((e) => (e.id === entry.id ? entry : e));
      return [entry, ...prev];
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Excluir esta entrada?")) return;
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const openNew = () => {
    setEditingEntry(null);
    setEditorOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setEditorOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Diário Financeiro</h1>
          <p className="text-sm text-axiom-muted mt-0.5">
            Registre reflexões, aportes e metas com contexto do seu score
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-axiom-primary hover:bg-axiom-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nova entrada
        </button>
      </div>

      {/* List */}
      <JournalList
        entries={entries}
        loading={loading}
        filterMonth={filterMonth}
        onFilterMonthChange={setFilterMonth}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {/* Editor (injected by page after issue #65) */}
      {renderEditor?.({
        open: editorOpen,
        entry: editingEntry,
        onClose: () => setEditorOpen(false),
        onSaved: handleSaved,
      })}
    </div>
  );
}
