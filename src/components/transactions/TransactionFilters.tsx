"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
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

function getLast12Months(locale: string): { value: string; label: string }[] {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
}

export function TransactionFilters({ filters, onFilterChange, categories }: TransactionFiltersProps) {
  const t = useTranslations("Transactions");
  const locale = useLocale();
  const months = getLast12Months(locale);
  const hasActiveFilter = filters.type !== "ALL" || filters.categoryId !== null || filters.month !== null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Tipo */}
      <Select
        value={filters.type}
        onValueChange={(v) => onFilterChange({ ...filters, type: v as FilterType })}
      >
        <SelectTrigger className="bg-axiom-hover border-axiom-border text-white w-36 h-9">
          <SelectValue>
            {filters.type === "ALL" ? t("filterTypeAll") : filters.type === "INCOME" ? t("filterTypeIncome") : t("filterTypeExpense")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-axiom-card border-axiom-border">
          <SelectItem value="ALL" className="text-white">{t("filterTypeAll")}</SelectItem>
          <SelectItem value="INCOME" className="text-white">{t("filterTypeIncome")}</SelectItem>
          <SelectItem value="EXPENSE" className="text-white">{t("filterTypeExpense")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Categoria */}
      <Select
        value={filters.categoryId ?? "ALL"}
        onValueChange={(v) => onFilterChange({ ...filters, categoryId: v === "ALL" ? null : v })}
      >
        <SelectTrigger className="bg-axiom-hover border-axiom-border text-white w-44 h-9">
          <SelectValue>
            {filters.categoryId ? (categories.find((c) => c.id === filters.categoryId)?.name ?? t("filterCategoryAll")) : t("filterCategoryAll")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-axiom-card border-axiom-border">
          <SelectItem value="ALL" className="text-white">{t("filterCategoryAll")}</SelectItem>
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
          <SelectValue>
            {filters.month ? (months.find((m) => m.value === filters.month)?.label ?? t("filterMonthAll")) : t("filterMonthAll")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-axiom-card border-axiom-border">
          <SelectItem value="ALL" className="text-white">{t("filterMonthAll")}</SelectItem>
          {months.map((m) => (
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
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
