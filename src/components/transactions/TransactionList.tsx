"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionTable, type Transaction } from "./TransactionTable";
import { TransactionDialog } from "./TransactionDialog";
import type { Category } from "@/generated/prisma/client";

type FilterType = "ALL" | "INCOME" | "EXPENSE";

interface Filters {
  type: FilterType;
  categoryId: string | null;
  month: string | null;
}

type DialogState =
  | null
  | { mode: "create" }
  | { mode: "edit"; transaction: Transaction };

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
}

export function TransactionList({ transactions: initial, categories }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initial);
  const [filters, setFilters] = useState<Filters>({ type: "ALL", categoryId: null, month: null });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = transactions.filter((tx) => {
    if (filters.type !== "ALL" && tx.type !== filters.type) return false;
    if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
    if (filters.month) {
      const txMonth = new Date(tx.date).toISOString().slice(0, 7);
      if (txMonth !== filters.month) return false;
    }
    return true;
  });

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleSuccess(tx: Transaction) {
    setTransactions((prev) => {
      const exists = prev.find((t) => t.id === tx.id);
      if (exists) return prev.map((t) => (t.id === tx.id ? tx : t));
      return [tx, ...prev];
    });
    setDialog(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TransactionFilters
          filters={filters}
          onFilterChange={setFilters}
          categories={categories}
        />
        <Button
          onClick={() => setDialog({ mode: "create" })}
          className="bg-axiom-primary hover:bg-axiom-primary/90 text-white gap-1.5 h-9 text-sm shrink-0"
        >
          <Plus size={15} />
          Nova Transação
        </Button>
      </div>

      <TransactionTable
        transactions={filtered}
        onEdit={(tx) => setDialog({ mode: "edit", transaction: tx })}
        onDelete={handleDelete}
        deletingId={deletingId}
      />

      {dialog && (
        <TransactionDialog
          mode={dialog.mode}
          transaction={dialog.mode === "edit" ? dialog.transaction : undefined}
          categories={categories}
          onSuccess={handleSuccess}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
