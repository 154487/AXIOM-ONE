"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "./CategoryDialog";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus } from "lucide-react";
import type { Category } from "@/generated/prisma/client";

interface CategoriesManagerProps {
  initialCategories: Category[];
}

export function CategoriesManager({ initialCategories }: CategoriesManagerProps) {
  const t = useTranslations("Settings");
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; category?: Category } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  function handleSuccess(updated: Category) {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === updated.id);
      if (exists) return prev.map((c) => (c.id === updated.id ? updated : c));
      return [...prev, updated].sort((a, b) => a.name.localeCompare(b.name));
    });
    setDialog(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        setDeleteError((prev) => ({ ...prev, [id]: data.error ?? t("deleteError") }));
      }
    } catch {
      setDeleteError((prev) => ({ ...prev, [id]: t("connectionError") }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-lg">{t("categoriesTitle")}</h2>
        <Button
          onClick={() => setDialog({ mode: "create" })}
          className="bg-axiom-primary hover:bg-axiom-primary/90 text-white gap-1.5 h-9 text-sm"
        >
          <Plus size={15} />
          {t("addCategoryButton")}
        </Button>
      </div>

      <div className="bg-axiom-card border border-axiom-border rounded-xl divide-y divide-axiom-border overflow-hidden">
        {categories.length === 0 && (
          <p className="text-axiom-muted text-sm text-center py-8">
            {t("emptyCategories")}
          </p>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div>
                  <p className="text-white text-sm font-medium">{cat.name}</p>
                  {cat.icon && (
                    <p className="text-axiom-muted text-xs">{cat.icon}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDialog({ mode: "edit", category: cat })}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-axiom-muted hover:text-white hover:bg-axiom-hover transition-colors"
                  title={t("editButton")}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  disabled={deletingId === cat.id}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                    deletingId === cat.id
                      ? "text-axiom-muted cursor-not-allowed"
                      : "text-axiom-muted hover:text-axiom-expense hover:bg-axiom-expense/10"
                  )}
                  title={t("deleteButton")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {deleteError[cat.id] && (
              <p className="text-axiom-expense text-xs mt-1.5 pl-11">{deleteError[cat.id]}</p>
            )}
          </div>
        ))}
      </div>

      {dialog && (
        <CategoryDialog
          mode={dialog.mode}
          category={dialog.category}
          onSuccess={handleSuccess}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
