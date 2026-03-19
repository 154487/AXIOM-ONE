"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";
import { AssetDialog } from "./AssetDialog";
import { formatCurrency } from "@/lib/utils";
import type { AssetPosition } from "@/app/api/investments/portfolio/route";
import type { AssetType } from "@/generated/prisma/client";

interface AssetRaw {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  currentPrice: number | null;
  createdAt: string;
}

interface AssetListProps {
  positions: AssetPosition[];
  assets: AssetRaw[];
  loading: boolean;
  currency: string;
  locale: string;
  onRefresh: () => void;
}

export function AssetList({ positions, assets, loading, currency, locale, onRefresh }: AssetListProps) {
  const t = useTranslations("Investments");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRaw | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleEdit(position: AssetPosition) {
    const raw = assets.find((a) => a.id === position.id) ?? null;
    setSelectedAsset(raw);
    setDialogOpen(true);
  }

  function handleNew() {
    setSelectedAsset(null);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    const res = await fetch(`/api/investments/assets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "Erro ao excluir");
      return;
    }
    onRefresh();
  }

  if (loading) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-axiom-hover rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-axiom-muted">{t("tabs.portfolio")}</h3>
        <Button size="sm" onClick={handleNew} className="bg-axiom-primary text-white hover:opacity-90 gap-1">
          <Plus size={14} /> {t("dialog.newAsset")}
        </Button>
      </div>

      {deleteError && (
        <p className="text-axiom-expense text-sm mb-3">{deleteError}</p>
      )}

      {positions.length === 0 ? (
        <p className="text-axiom-muted text-sm text-center py-8">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-axiom-border hover:bg-transparent">
              <TableHead className="text-axiom-muted">{t("table.asset")}</TableHead>
              <TableHead className="text-axiom-muted">{t("table.type")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.quantity")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.avgCost")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.currentPrice")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.currentValue")}</TableHead>
              <TableHead className="text-axiom-muted text-right">{t("table.pnl")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((pos) => {
              const pnlPositive = pos.pnl >= 0;
              return (
                <TableRow key={pos.id} className="border-axiom-border hover:bg-axiom-hover cursor-pointer" onClick={() => handleEdit(pos)}>
                  <TableCell className="font-medium text-white">
                    <div>
                      <p>{pos.name}</p>
                      {pos.ticker && <p className="text-axiom-muted text-xs">{pos.ticker}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-axiom-border text-axiom-muted text-xs">
                      {t(`assetTypes.${pos.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-white">{pos.totalQuantity.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-white">{formatCurrency(pos.avgCost, locale, pos.currency)}</TableCell>
                  <TableCell className="text-right text-white">{formatCurrency(pos.currentPrice, locale, pos.currency)}</TableCell>
                  <TableCell className="text-right text-white">{formatCurrency(pos.currentValue, locale, currency)}</TableCell>
                  <TableCell className={`text-right font-medium ${pnlPositive ? "text-axiom-income" : "text-axiom-expense"}`}>
                    {pnlPositive ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-axiom-muted hover:text-white" onClick={() => handleEdit(pos)}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-axiom-muted hover:text-axiom-expense" onClick={() => handleDelete(pos.id)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AssetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        asset={selectedAsset}
        onSave={() => { setDialogOpen(false); onRefresh(); }}
      />
    </div>
  );
}
