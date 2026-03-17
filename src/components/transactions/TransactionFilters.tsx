"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Category } from "@/generated/prisma/client";

type FilterType = "ALL" | "INCOME" | "EXPENSE";

interface Filters {
  type: FilterType;
  categoryId: string | null;
  month: string | null;
}

interface TransactionFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  categories: Category[];
}

function getLast12Months(): { value: string; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
}

const MONTHS = getLast12Months();

export function TransactionFilters({ filters, onFilterChange, categories }: TransactionFiltersProps) {
  const hasActiveFilter = filters.type !== "ALL" || filters.categoryId !== null || filters.month !== null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tipo */}
      <Select
        value={filters.type}
        onValueChange={(v) => onFilterChange({ ...filters, type: v as FilterType })}
      >
        <SelectTrigger className="bg-axiom-hover border-axiom-border text-white w-36 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-axiom-card border-axiom-border">
          <SelectItem value="ALL" className="text-white">Todos</SelectItem>
          <SelectItem value="INCOME" className="text-white">Receitas</SelectItem>
          <SelectItem value="EXPENSE" className="text-white">Despesas</SelectItem>
        </SelectContent>
      </Select>

      {/* Categoria */}
      <Select
        value={filters.categoryId ?? "ALL"}
        onValueChange={(v) => onFilterChange({ ...filters, categoryId: v === "ALL" ? null : v })}
      >
        <SelectTrigger className="bg-axiom-hover border-axiom-border text-white w-44 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-axiom-card border-axiom-border">
          <SelectItem value="ALL" className="text-white">Todas categorias</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id} className="text-white">
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Mês */}
      <Select
        value={filters.month ?? "ALL"}
        onValueChange={(v) => onFilterChange({ ...filters, month: v === "ALL" ? null : v })}
      >
        <SelectTrigger className="bg-axiom-hover border-axiom-border text-white w-44 h-9">
          <SelectValue placeholder="Todos os meses" />
        </SelectTrigger>
        <SelectContent className="bg-axiom-card border-axiom-border">
          <SelectItem value="ALL" className="text-white">Todos os meses</SelectItem>
          {MONTHS.map((m) => (
            <SelectItem key={m.value} value={m.value} className="text-white">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange({ type: "ALL", categoryId: null, month: null })}
          className="text-axiom-muted hover:text-white h-9"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
