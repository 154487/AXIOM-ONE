"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";
import { useLocale } from "next-intl";

interface RecurringItem {
  description: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly";
  lastDate: string;
  isNew: boolean;
  monthlyEquivalent: number;
}

interface RecurringListProps {
  currency: string;
}

const FREQ_LABEL: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  yearly: "Anual",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}m`;
}

export function RecurringList({ currency }: RecurringListProps) {
  const t = useTranslations("Reports");
  const locale = useLocale();
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/recurring")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalMonthly = items.reduce((acc, item) => acc + item.monthlyEquivalent, 0);

  const grouped = {
    monthly: items.filter((i) => i.frequency === "monthly"),
    weekly: items.filter((i) => i.frequency === "weekly"),
    yearly: items.filter((i) => i.frequency === "yearly"),
  };

  if (loading) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">{t("recurring")}</h3>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-axiom-hover rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">{t("recurring")}</h3>
        <p className="text-axiom-muted text-sm">
          Nenhuma assinatura ou recorrência detectada. São necessárias pelo menos 3 ocorrências do mesmo gasto.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{t("recurring")}</h3>
        <div className="text-right">
          <p className="text-axiom-muted text-xs">Total mensal equiv.</p>
          <p className="text-axiom-expense font-semibold text-sm">
            {formatCurrency(totalMonthly, locale, currency)}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {(["monthly", "weekly", "yearly"] as const).map((freq) => {
          const section = grouped[freq];
          if (section.length === 0) return null;
          return (
            <div key={freq}>
              <p className="text-axiom-muted text-xs font-medium uppercase tracking-wide mb-2">
                {FREQ_LABEL[freq]}s
              </p>
              <div className="space-y-1">
                {section.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-axiom-hover transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-white text-sm truncate">{item.description}</p>
                      {item.isNew && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-axiom-primary/20 text-axiom-primary rounded-full shrink-0">
                          Nova
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-axiom-muted text-xs">{timeAgo(item.lastDate)}</span>
                      <span className="text-axiom-expense text-sm font-medium">
                        {formatCurrency(item.amount, locale, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
