"use client";

import { useState, FormEvent, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/generated/prisma/client";

const PALETTE = [
  "#FF6B35",
  "#10B981",
  "#EF4444",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#AAB2BD",
  "#0D1B2A",
];

interface CategoryDialogProps {
  mode: "create" | "edit";
  category?: Category;
  onSuccess: (category: Category) => void;
  onClose: () => void;
}

export function CategoryDialog({ mode, category, onSuccess, onClose }: CategoryDialogProps) {
  const t = useTranslations("Settings");
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? PALETTE[0]);
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
      setIcon(category.icon ?? "");
    }
  }, [category]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("categoryNameRequired"));
      return;
    }

    setSaving(true);
    try {
      const url = mode === "create" ? "/api/categories" : `/api/categories/${category!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, icon: icon.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("categorySaveError"));
        return;
      }

      onSuccess(data);
    } catch {
      setError(t("connectionError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-axiom-card border-axiom-border text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === "create" ? t("categoryDialogCreateTitle") : t("categoryDialogEditTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name" className="text-axiom-muted text-sm">{t("categoryNameLabel")}</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder={t("categoryNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-axiom-muted text-sm">{t("categoryColorLabel")}</Label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color === c ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-7 h-7 rounded-full border border-axiom-border shrink-0" style={{ backgroundColor: color }} />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary text-sm h-8 w-28"
                placeholder="#FF6B35"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-icon" className="text-axiom-muted text-sm">{t("categoryIconLabel")}</Label>
            <Input
              id="cat-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder={t("categoryIconPlaceholder")}
            />
          </div>

          {error && <p className="text-axiom-expense text-sm">{error}</p>}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-axiom-border text-axiom-muted hover:text-white hover:bg-axiom-hover"
            >
              {t("cancelButton")}
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-axiom-primary hover:bg-axiom-primary/90 text-white"
            >
              {saving
                ? t("creatingButton")
                : mode === "create"
                ? t("createButton")
                : t("updateButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
