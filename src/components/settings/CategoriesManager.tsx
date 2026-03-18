"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "./CategoryDialog";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { CategoryIcon } from "./CategoryIcon";
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

  function handleSuccess(updated: Category) {
    setCategories((prev) => {
      const exists = prev.find((c) => c.id === updated.id);
      if (exists) return prev.map((c) => (c.id === updated.id ? updated : c));
      return [...prev, updated].sort((a, b) => a.name.localeCompare(b.name));
    });
    toast.success("Sucesso!", t("categorySaved"));
    setDialog(null);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toast.success("Sucesso!", t("categoryDeleted"));
      } else {
        toast.error("Erro", data.error ?? t("deleteError"));
      }
    } catch {
      toast.error("Erro", t("connectionError"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button
          onClick={() => setDialog({ mode: "create" })}
          className="bg-axiom-primary hover:bg-axiom-primary/90 text-white gap-1.5 h-9 text-sm"
        >
          <Plus size={15} />
          {t("addCategoryButton")}
        </Button>
      </div>

      <div className="border border-axiom-border rounded-xl divide-y divide-axiom-border overflow-hidden">
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
                  className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.icon && <CategoryIcon name={cat.icon} size={16} className="text-white" />}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{cat.name}</p>
                  <p className="text-axiom-muted text-xs">{cat.color}</p>
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
