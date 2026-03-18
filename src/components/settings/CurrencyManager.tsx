"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Star, Trash2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
  isDefault: boolean;
}

const AVAILABLE_CURRENCIES = [
  { code: "BRL", symbol: "R$", name: "Real Brasileiro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
  { code: "ARS", symbol: "$", name: "Argentine Peso" },
  { code: "CLP", symbol: "$", name: "Chilean Peso" },
  { code: "COP", symbol: "$", name: "Colombian Peso" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar" },
];

interface CurrencyManagerProps {
  initialCurrencies: Currency[];
}

export function CurrencyManager({ initialCurrencies }: CurrencyManagerProps) {
  const t = useTranslations("Settings");
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies);

  async function handleAdd(code: string, symbol: string, name: string) {
    const already = currencies.find((c) => c.code === code);
    if (already) {
      toast.error("", t("currencyAlreadyAdded"));
      return;
    }

    try {
      const res = await fetch("/api/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, symbol, name }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrencies((prev) => [...prev, data]);
        toast.success("", t("currencyAdded"));
      } else if (data.error === "already_added") {
        toast.error("", t("currencyAlreadyAdded"));
      }
    } catch {
      toast.error("Erro", "Erro de conexão");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/currencies/${id}`, { method: "PATCH" });
      if (res.ok) {
        setCurrencies((prev) =>
          prev.map((c) => ({ ...c, isDefault: c.id === id }))
        );
        toast.success("", t("currencySetDefault"));
      }
    } catch {
      toast.error("Erro", "Erro de conexão");
    }
  }

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/currencies/${id}`, { method: "DELETE" });
      if (res.ok) {
        const removed = currencies.find((c) => c.id === id);
        const remaining = currencies.filter((c) => c.id !== id);
        // If removed was default, first remaining becomes default client-side
        const updated = remaining.map((c, i) =>
          removed?.isDefault && i === 0 ? { ...c, isDefault: true } : c
        );
        setCurrencies(updated);
        toast.success("", t("currencyRemoved"));
      }
    } catch {
      toast.error("Erro", "Erro de conexão");
    }
  }

  const addedCodes = new Set(currencies.map((c) => c.code));
  const available = AVAILABLE_CURRENCIES.filter((c) => !addedCodes.has(c.code));

  return (
    <div className="space-y-3 mt-4">
      {currencies.length === 0 ? (
        <p className="text-axiom-muted text-sm">{t("noCurrencies")}</p>
      ) : (
        <div className="space-y-2">
          {currencies.map((currency) => (
            <div
              key={currency.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-axiom-hover border border-axiom-border"
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-base w-8 text-center">
                  {currency.symbol}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{currency.code}</span>
                    {currency.isDefault && (
                      <Badge className="bg-axiom-primary/20 text-axiom-primary border-0 text-xs px-1.5 py-0">
                        {t("defaultBadge")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-axiom-muted text-xs">{currency.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {!currency.isDefault && (
                  <button
                    onClick={() => handleSetDefault(currency.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-axiom-muted hover:text-axiom-primary hover:bg-axiom-primary/10 transition-colors"
                    title={t("setDefaultButton")}
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleRemove(currency.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-axiom-muted hover:text-axiom-expense hover:bg-axiom-expense/10 transition-colors"
                  title={t("removeCurrencyButton")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-axiom-border text-axiom-muted hover:text-white hover:bg-axiom-hover transition-colors text-sm focus:outline-none">
            <Plus size={14} />
            {t("addCurrencyButton")}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="bg-axiom-card border-axiom-border text-white w-56 max-h-64 overflow-y-auto"
          >
            {available.map((c) => (
              <DropdownMenuItem
                key={c.code}
                onClick={() => handleAdd(c.code, c.symbol, c.name)}
                className="text-axiom-muted hover:text-white hover:bg-axiom-hover focus:bg-axiom-hover focus:text-white cursor-pointer gap-2"
              >
                <span className="font-bold w-6 text-center text-white">{c.symbol}</span>
                <span>{c.code}</span>
                <span className="text-xs text-axiom-muted truncate">{c.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
