"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { JournalList } from "./JournalList";
import { JournalEditor } from "./JournalEditor";

export interface InvestmentEntryLinked {
  id: string;
  type: string;
  quantity: number;
  price: number;
  amount: number;
  date: string;
  asset: { id: string; ticker: string | null; name: string; type: string };
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  entryType: string;
  tags: string[];
  date: string;
  healthScoreAtTime: number | null;
  sustainableSurplusAtTime: number | null;
  investmentEntryId: string | null;
  investmentEntry: InvestmentEntryLinked | null;
  createdAt: string;
  updatedAt: string;
}

export interface EditorPrefill {
  investmentEntryId?: string;
  entryType?: string;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function JournalShell() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editorPrefill, setEditorPrefill] = useState<EditorPrefill | undefined>();
  const [uncatalogedOps, setUncatalogedOps] = useState<InvestmentEntryLinked[]>([]);

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

  const fetchUncataloged = useCallback(async () => {
    try {
      const res = await fetch("/api/journal/uncataloged");
      if (res.ok) {
        const data = await res.json();
        setUncatalogedOps(data.entries ?? []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);
  useEffect(() => { fetchUncataloged(); }, [fetchUncataloged]);

  // Tags únicas de todas as entradas carregadas
  const allTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [entries]);

  const handleSaved = useCallback((entry: JournalEntry) => {
    setEntries((prev) => {
      const exists = prev.find((e) => e.id === entry.id);
      if (exists) return prev.map((e) => (e.id === entry.id ? entry : e));
      return [entry, ...prev];
    });
    fetchUncataloged();
  }, [fetchUncataloged]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Excluir esta entrada?")) return;
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      fetchUncataloged();
    }
  }, [fetchUncataloged]);

  const openNew = (prefill?: EditorPrefill) => {
    setEditingEntry(null);
    setEditorPrefill(prefill);
    setEditorOpen(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditorPrefill(undefined);
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
          onClick={() => openNew()}
          className="flex items-center gap-2 bg-axiom-primary hover:bg-axiom-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nova entrada
        </button>
      </div>

      {/* Banner — movimentações não catalogadas */}
      {uncatalogedOps.length > 0 && (
        <div className="flex flex-col gap-2 px-4 py-3 rounded-xl border border-axiom-primary/30 bg-axiom-primary/5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-axiom-primary font-medium">⚠</span>
            <span className="text-white">
              {uncatalogedOps.length === 1
                ? "1 movimentação não catalogada"
                : `${uncatalogedOps.length} movimentações não catalogadas`}
            </span>
            <span className="text-axiom-muted text-xs">(últimos 30 dias)</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {uncatalogedOps.map((op) => {
              const ticker = op.asset.ticker ?? op.asset.name;
              const typeLabel = op.type === "PURCHASE" ? "Compra" : "Venda";
              const entryType = op.type === "PURCHASE" ? "APORTE" : "RESGATE";
              const opDate = new Date(op.date).toLocaleDateString("pt-BR");
              return (
                <div key={op.id} className="flex items-center justify-between gap-3 pl-1">
                  <span className="text-xs text-axiom-muted">
                    <span className="text-axiom-primary font-mono font-semibold">{ticker}</span>
                    {" · "}{typeLabel}
                    {" · "}{op.quantity}× R$ {op.price.toFixed(2)}
                    {" · "}{opDate}
                  </span>
                  <button
                    onClick={() => openNew({ investmentEntryId: op.id, entryType })}
                    className="text-xs text-axiom-primary hover:underline shrink-0"
                  >
                    Criar nota
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Editor */}
      <JournalEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        entry={editingEntry}
        prefill={editorPrefill}
        suggestedTags={allTags}
        onSaved={handleSaved}
      />
    </div>
  );
}
