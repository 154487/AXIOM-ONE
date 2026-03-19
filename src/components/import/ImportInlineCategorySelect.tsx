"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryDialog } from "@/components/settings/CategoryDialog";
import type { Category } from "@/generated/prisma/client";

interface ImportInlineCategorySelectProps {
  value: string | null;
  onChange: (id: string) => void;
  categories: Category[];
  onCategoryCreated: (cat: Category) => void;
}

const NEW_CATEGORY_SENTINEL = "__new__";

export function ImportInlineCategorySelect({
  value,
  onChange,
  categories,
  onCategoryCreated,
}: ImportInlineCategorySelectProps) {
  const t = useTranslations("Import");
  const [showDialog, setShowDialog] = useState(false);

  function handleValueChange(val: string | null) {
    if (!val) return;
    if (val === NEW_CATEGORY_SENTINEL) {
      setShowDialog(true);
      return;
    }
    onChange(val);
  }

  function handleCategoryCreated(cat: Category) {
    onCategoryCreated(cat);
    onChange(cat.id);
    setShowDialog(false);
  }

  return (
    <>
      <Select value={value ?? ""} onValueChange={handleValueChange}>
        <SelectTrigger
          className={`bg-axiom-hover border-axiom-border h-8 text-xs ${
            !value ? "text-axiom-primary" : "text-white"
          }`}
        >
          <SelectValue placeholder={t("selectCategory")}>
            {value ? categories.find((c) => c.id === value)?.name : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-axiom-card border-axiom-border">
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id} className="text-white text-xs">
              {cat.name}
            </SelectItem>
          ))}
          <SelectItem value={NEW_CATEGORY_SENTINEL} className="text-axiom-primary text-xs font-medium">
            + {t("newCategory")}
          </SelectItem>
        </SelectContent>
      </Select>

      {showDialog && (
        <CategoryDialog
          mode="create"
          onSuccess={handleCategoryCreated}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
