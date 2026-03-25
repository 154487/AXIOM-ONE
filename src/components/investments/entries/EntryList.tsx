"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
import { EntryDialog } from "./EntryDialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { AssetType, EntryType } from "@/generated/prisma/client";

interface AssetRaw {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  currentPrice: number | null;
}

interface Entry {
  id: string;
  assetId: string;
  type: EntryType;
  date: string;
  quantity: number;
  price: number;
  amount: number;
  notes: string | null;
  asset: { id: string; name: string; ticker: string | null; type: string; currency: string };
}

interface EntryListProps {
  assets: AssetRaw[];
  currency: string;
  locale: string;
  onEntryCreated: () => void;
  onNewAsset?: (asset: AssetRaw) => void;
}

const ENTRY_BADGE_COLORS: Record<EntryType, string> = {
  PURCHASE: "border-axiom-income text-axiom-income",
  SALE: "border-axiom-expense text-axiom-expense",
  DIVIDEND: "border-axiom-primary text-axiom-primary",
  SPLIT: "border-axiom-border text-axiom-muted",
};

export function EntryList({ assets, currency, locale, onEntryCreated, onNewAsset }: EntryListProps) {
  const t = useTranslations("Investments");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/investments/entries");
      const data = await res.json();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  function handleEdit(entry: Entry) {
    setSelectedEntry(entry);
    setDialogOpen(true);
  }

  function handleNew() {
    setSelectedEntry(null);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/investments/entries/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      onEntryCreated();
    }
  }

  function handleSave(saved: Entry) {
    if (selectedEntry) {
      setEntries((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
    } else {
      setEntries((prev) => [saved, ...prev]);
      onEntryCreated();
      // Propagar novo ativo ao shell se foi criado inline
      if (saved.asset && !assets.find((a) => a.id === saved.asset.id)) {
        onNewAsset?.({
          id: saved.asset.id,
          name: saved.asset.name,
          ticker: saved.asset.ticker,
          type: saved.asset.type as AssetRaw["type"],
          currency: saved.asset.currency,
          currentPrice: null,
        });
      }
    }
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-axiom-muted">{t("tabs.entries")}</h3>
        <Button size="sm" onClick={handleNew} className="bg-axiom-primary text-white hover:opacity-90 gap-1">
          <Plus size={14} /> {t("dialog.newEntry")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-axiom-hover rounded animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-axiom-muted text-sm text-center py-8">{t("emptyEntries")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-axiom-border hover:bg-transparent">
              <TableHead className="text-axiom-muted">{t("table.date")}</TableHead>
              <TableHead className="text-axiom-muted">{t("table.asset")}</TableHead>
              <TableHead className="text-axiom-muted">{t("table.type")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.quantity")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.price")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.total")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id} className="border-axiom-border hover:bg-axiom-hover cursor-pointer" onClick={() => handleEdit(entry)}>
                <TableCell className="text-axiom-muted text-sm">{formatDate(entry.date, locale)}</TableCell>
                <TableCell className="text-white text-sm">
                  {entry.asset.ticker ? `${entry.asset.ticker} ` : ""}{entry.asset.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${ENTRY_BADGE_COLORS[entry.type]}`}>
                    {t(`entryTypes.${entry.type}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-white text-sm">{entry.quantity.toFixed(4)}</TableCell>
                <TableCell className="text-right text-white text-sm">
                  {entry.type === "SPLIT" ? "—" : formatCurrency(entry.price, locale, entry.asset.currency)}
                </TableCell>
                <TableCell className="text-right text-white text-sm">
                  {entry.type === "SPLIT" ? "—" : formatCurrency(entry.amount, locale, currency)}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-axiom-muted hover:text-white" onClick={() => handleEdit(entry)}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-axiom-muted hover:text-axiom-expense" onClick={() => handleDelete(entry.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        entry={selectedEntry}
        assets={assets}
        onSave={handleSave}
        onNewAsset={onNewAsset}
      />
    </div>
  );
}
