"use client";

import { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Category } from "@/generated/prisma/client";
import type { Transaction } from "./TransactionTable";

interface TransactionDialogProps {
  mode: "create" | "edit";
  transaction?: Transaction;
  categories: Category[];
  onSuccess: (tx: Transaction) => void;
  onClose: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionDialog({
  mode,
  transaction,
  categories,
  onSuccess,
  onClose,
}: TransactionDialogProps) {
  const t = useTranslations("Transactions");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [type, setType] = useState<"INCOME" | "EXPENSE">(transaction?.type ?? "EXPENSE");
  const [categoryId, setCategoryId] = useState<string>(transaction?.categoryId ?? "");
  const [date, setDate] = useState(transaction ? transaction.date.slice(0, 10) : todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setType(transaction.type);
      setCategoryId(transaction.categoryId);
      setDate(transaction.date.slice(0, 10));
    }
  }, [transaction]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError(t("errorDescription"));
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t("errorAmountInvalid"));
      return;
    }
    if (!categoryId) {
      setError(t("errorCategory"));
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/transactions"
          : `/api/transactions/${transaction!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), amount: amountNum, type, categoryId, date }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("saveError"));
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
            {mode === "create" ? t("dialogCreateTitle") : t("dialogEditTitle")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tx-description" className="text-axiom-muted text-sm">
              {t("descriptionLabel")}
            </Label>
            <Input
              id="tx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-amount" className="text-axiom-muted text-sm">
              {t("amountLabel")}
            </Label>
            <Input
              id="tx-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder={t("amountPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-axiom-muted text-sm">{t("typeLabel")}</Label>
            <Select value={type} onValueChange={(v) => setType(v as "INCOME" | "EXPENSE")}>
              <SelectTrigger className="bg-axiom-hover border-axiom-border text-white">
                <SelectValue>{type === "INCOME" ? t("typeIncome") : t("typeExpense")}</SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-axiom-card border-axiom-border">
                <SelectItem value="EXPENSE" className="text-white">{t("typeExpense")}</SelectItem>
                <SelectItem value="INCOME" className="text-white">{t("typeIncome")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-axiom-muted text-sm">{t("categoryLabel")}</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger className="bg-axiom-hover border-axiom-border text-white">
                <SelectValue placeholder={t("categoryPlaceholder")}>
                  {categoryId ? categories.find((c) => c.id === categoryId)?.name : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-axiom-card border-axiom-border">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-white">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tx-date" className="text-axiom-muted text-sm">
              {t("dateLabel")}
            </Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
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
