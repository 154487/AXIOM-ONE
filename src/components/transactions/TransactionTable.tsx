"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  date: string;
  categoryId: string;
  category: Category;
}

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function TransactionTable({ transactions, onEdit, onDelete, deletingId }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl py-16 text-center">
        <p className="text-axiom-muted text-sm">Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-axiom-border hover:bg-transparent">
            <TableHead className="text-axiom-muted">Data</TableHead>
            <TableHead className="text-axiom-muted">Descrição</TableHead>
            <TableHead className="text-axiom-muted">Categoria</TableHead>
            <TableHead className="text-axiom-muted">Tipo</TableHead>
            <TableHead className="text-axiom-muted text-right">Valor</TableHead>
            <TableHead className="text-axiom-muted w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id} className="border-axiom-border hover:bg-axiom-hover">
              <TableCell className="text-axiom-muted text-sm">
                {formatDate(tx.date)}
              </TableCell>
              <TableCell className="text-white text-sm">{tx.description}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tx.category.color }}
                  />
                  <span className="text-axiom-muted text-sm">{tx.category.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "text-xs font-medium border-0",
                    tx.type === "INCOME"
                      ? "bg-axiom-income/15 text-axiom-income"
                      : "bg-axiom-expense/15 text-axiom-expense"
                  )}
                >
                  {tx.type === "INCOME" ? "Receita" : "Despesa"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "text-sm font-medium",
                    tx.type === "INCOME" ? "text-axiom-income" : "text-axiom-expense"
                  )}
                >
                  {tx.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => onEdit(tx)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-axiom-muted hover:text-white hover:bg-axiom-hover transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(tx.id)}
                    disabled={deletingId === tx.id}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                      deletingId === tx.id
                        ? "text-axiom-muted cursor-not-allowed"
                        : "text-axiom-muted hover:text-axiom-expense hover:bg-axiom-expense/10"
                    )}
                    title="Deletar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
