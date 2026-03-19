"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { formatCurrency } from "@/lib/utils";

interface Merchant {
  name: string;
  total: number;
  count: number;
  pctOfTotal: number;
  categoryName: string;
  categoryColor: string;
  lastDate: string;
}

interface MerchantSpotlightProps {
  currency: string;
  period: { start: string; end: string };
}

export function MerchantSpotlight({ currency, period }: MerchantSpotlightProps) {
  const t = useTranslations("Reports");
  const locale = useLocale();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/merchants?start=${period.start}&end=${period.end}`)
      .then((res) => (res.ok ? res.json() : { merchants: [] }))
      .then((data) => {
        setMerchants(data.merchants ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period.start, period.end]);

  if (loading) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">{t("merchantSpotlight")}</h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-axiom-hover rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (merchants.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">{t("merchantSpotlight")}</h3>
        <p className="text-axiom-muted text-sm">{t("noData")}</p>
      </div>
    );
  }

  const maxTotal = merchants[0]?.total ?? 1;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">{t("merchantSpotlight")}</h3>

      <div className="space-y-3">
        {merchants.map((m, i) => (
          <div key={m.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-axiom-muted text-xs font-medium w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: m.categoryColor }}
                  />
                  <p className="text-white text-sm truncate">{m.name}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="text-white text-sm font-medium">
                  {formatCurrency(m.total, locale, currency)}
                </p>
                <p className="text-axiom-muted text-xs">
                  {m.pctOfTotal.toFixed(1)}% · {m.count}x
                </p>
              </div>
            </div>
            {/* Barra proporcional */}
            <div className="ml-6 w-full h-1 bg-axiom-hover rounded-full">
              <div
                className="h-1 rounded-full transition-all duration-700"
                style={{
                  width: `${(m.total / maxTotal) * 100}%`,
                  backgroundColor: m.categoryColor,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
