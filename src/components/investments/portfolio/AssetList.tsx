"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EntryDialog } from "../entries/EntryDialog";
import type { AssetPosition } from "@/app/api/investments/portfolio/route";
import type { AssetType } from "@/generated/prisma/client";

const TYPE_COLORS: Partial<Record<AssetType, string>> = {
  STOCK: "#FF6B35",
  FII: "#F7931E",
  ETF: "#FFB347",
  BDR: "#FF8C42",
  CRYPTO: "#A78BFA",
  STOCK_INT: "#3B82F6",
  OTHER: "#6B7280",
  CDB: "#10B981",
  RDB: "#059669",
  LCI: "#34D399",
  LCA: "#6EE7B7",
  TESOURO: "#0EA5E9",
  POUPANCA: "#94A3B8",
  FIXED_INCOME: "#2DD4BF",
};

interface AssetRaw {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  currentPrice: number | null;
}

interface AssetListProps {
  positions: AssetPosition[];
  assets: AssetRaw[];
  loading: boolean;
  currency: string;
  locale: string;
  onRefresh: () => void;
  onNewAsset?: (asset: AssetRaw) => void;
}

export function AssetList({ positions, assets, loading, currency, locale, onRefresh, onNewAsset }: AssetListProps) {
  const t = useTranslations("Investments");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);

  const totalPortfolioValue = positions.reduce((acc, p) => acc + p.currentValue, 0);

  const groups = useMemo(() => {
    const map = new Map<AssetType, AssetPosition[]>();
    for (const pos of positions) {
      if (!map.has(pos.type)) map.set(pos.type, []);
      map.get(pos.type)!.push(pos);
    }
    return [...map.entries()].sort((a, b) => {
      const aVal = a[1].reduce((s, p) => s + p.currentValue, 0);
      const bVal = b[1].reduce((s, p) => s + p.currentValue, 0);
      return bVal - aVal;
    });
  }, [positions]);

  function toggleGroup(type: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
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
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-axiom-card border border-axiom-border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-8 text-center flex flex-col items-center gap-3">
        <p className="text-axiom-muted text-sm">{t("empty")}</p>
        <Button size="sm" onClick={() => setEntryDialogOpen(true)} className="bg-axiom-primary text-white hover:opacity-90 gap-1">
          <Plus size={14} /> {t("dialog.newEntry")}
        </Button>
        <EntryDialog
          open={entryDialogOpen}
          onClose={() => setEntryDialogOpen(false)}
          entry={null}
          assets={assets}
          onSave={() => { setEntryDialogOpen(false); onRefresh(); }}
          onNewAsset={onNewAsset}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deleteError && <p className="text-axiom-expense text-sm">{deleteError}</p>}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEntryDialogOpen(true)} className="bg-axiom-primary text-white hover:opacity-90 gap-1">
          <Plus size={14} /> {t("dialog.newEntry")}
        </Button>
      </div>

      <EntryDialog
        open={entryDialogOpen}
        onClose={() => setEntryDialogOpen(false)}
        entry={null}
        assets={assets}
        onSave={() => { setEntryDialogOpen(false); onRefresh(); }}
        onNewAsset={onNewAsset}
      />

      {groups.map(([type, groupPositions]) => {
        const groupValue = groupPositions.reduce((s, p) => s + p.currentValue, 0);
        const groupInvested = groupPositions.reduce((s, p) => s + p.totalInvested, 0);
        const groupPnl = groupValue - groupInvested;
        const groupPnlPct = groupInvested > 0 ? (groupPnl / groupInvested) * 100 : 0;
        const groupDailyChange = groupPositions.reduce((s, p) => s + p.dailyChangeAmount, 0);
        const prevValue = groupValue - groupDailyChange;
        const groupDailyChangePct = prevValue > 0 ? (groupDailyChange / prevValue) * 100 : 0;
        const groupPct = totalPortfolioValue > 0 ? (groupValue / totalPortfolioValue) * 100 : 0;
        const isCollapsed = collapsedGroups.has(type);
        const color = TYPE_COLORS[type] ?? "#6B7280";
        const pnlPositive = groupPnl >= 0;
        const dailyPositive = groupDailyChange >= 0;
        const hasDailyData = groupPositions.some((p) => p.dailyChangeAmount !== 0);

        return (
          <div key={type} className="bg-axiom-card border border-axiom-border rounded-xl overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(type)}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-axiom-hover transition-colors text-left"
            >
              {/* Name + count */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color }}>
                  {t(`assetTypes.${type}`)}
                </p>
                <p className="text-xs text-axiom-muted">
                  {groupPositions.length} ativo{groupPositions.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Var. Total */}
              <div className="hidden sm:flex flex-col items-end min-w-[140px]">
                <span className="text-xs text-axiom-muted">Var. Total</span>
                <span className={`text-xs font-medium ${pnlPositive ? "text-axiom-income" : "text-axiom-expense"}`}>
                  {pnlPositive ? "▲" : "▼"} {Math.abs(groupPnlPct).toFixed(2)}%
                </span>
                <span className="text-xs text-axiom-muted">
                  ({pnlPositive ? "+" : "-"}{formatCurrency(Math.abs(groupPnl), locale, currency)})
                </span>
              </div>

              {/* Var. Hoje */}
              <div className="hidden lg:flex flex-col items-end min-w-[140px]">
                <span className="text-xs text-axiom-muted">Var. Hoje</span>
                {hasDailyData ? (
                  <>
                    <span className={`text-xs font-medium ${dailyPositive ? "text-axiom-income" : "text-axiom-expense"}`}>
                      {dailyPositive ? "▲" : "▼"} {Math.abs(groupDailyChangePct).toFixed(2)}%
                    </span>
                    <span className="text-xs text-axiom-muted">
                      ({dailyPositive ? "+" : "-"}{formatCurrency(Math.abs(groupDailyChange), locale, currency)})
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-axiom-muted">—</span>
                )}
              </div>

              {/* Total value + bar */}
              <div className="flex flex-col items-end min-w-[160px]">
                <span className="text-sm font-semibold text-white">
                  {formatCurrency(groupValue, locale, currency)}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-20 h-1.5 bg-axiom-hover rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(groupPct, 100)}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs text-axiom-muted">{groupPct.toFixed(2)}%</span>
                </div>
              </div>

              {isCollapsed ? (
                <ChevronDown size={16} className="text-axiom-muted flex-shrink-0" />
              ) : (
                <ChevronUp size={16} className="text-axiom-muted flex-shrink-0" />
              )}
            </button>

            {/* Assets Table */}
            {!isCollapsed && (
              <div className="border-t border-axiom-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-axiom-border hover:bg-transparent">
                      <TableHead className="text-axiom-muted text-xs">{t("table.asset")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("table.avgCost")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("table.currentPrice")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("table.quantity")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">Patr. Atual</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">Var. Hoje</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">Var. Total</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">% Cart.</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupPositions.map((pos) => {
                      const posPct =
                        totalPortfolioValue > 0 ? (pos.currentValue / totalPortfolioValue) * 100 : 0;
                      const pnlPos = pos.pnl >= 0;
                      const dailyPos = pos.dailyChangeAmount >= 0;
                      const hasDaily = pos.dailyChangeAmount !== 0;
                      const qty = pos.totalQuantity;
                      const qtyDisplay = qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(4);

                      return (
                        <TableRow key={pos.id} className="border-axiom-border hover:bg-axiom-hover">
                          {/* Ativo */}
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: `${color}22`, color }}
                              >
                                {(pos.ticker ?? pos.name).slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {pos.ticker ?? pos.name}
                                </p>
                                {pos.ticker && (
                                  <p className="text-xs text-axiom-muted">{pos.name}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Preço Médio */}
                          <TableCell className="text-right text-sm text-white py-2.5">
                            {formatCurrency(pos.avgCost, locale, pos.currency)}
                          </TableCell>

                          {/* Preço Atual */}
                          <TableCell className="text-right text-sm py-2.5">
                            <p className="text-white">
                              {formatCurrency(pos.currentPrice, locale, pos.currency)}
                            </p>
                            {hasDaily && (
                              <p className={`text-xs ${dailyPos ? "text-axiom-income" : "text-axiom-expense"}`}>
                                {dailyPos ? "▲" : "▼"} {Math.abs(pos.dailyChangePct).toFixed(2)}%
                              </p>
                            )}
                          </TableCell>

                          {/* Qtd */}
                          <TableCell className="text-right text-sm text-white py-2.5">
                            {qtyDisplay}
                          </TableCell>

                          {/* Patr. Atual */}
                          <TableCell className="text-right text-sm text-white py-2.5">
                            {formatCurrency(pos.currentValue, locale, currency)}
                          </TableCell>

                          {/* Var. Hoje */}
                          <TableCell className="text-right text-sm py-2.5">
                            {hasDaily ? (
                              <span className={dailyPos ? "text-axiom-income" : "text-axiom-expense"}>
                                {dailyPos ? "+" : ""}
                                {formatCurrency(pos.dailyChangeAmount, locale, currency)}
                              </span>
                            ) : (
                              <span className="text-axiom-muted">—</span>
                            )}
                          </TableCell>

                          {/* Var. Total */}
                          <TableCell className="text-right text-sm py-2.5">
                            <p className={`font-medium ${pnlPos ? "text-axiom-income" : "text-axiom-expense"}`}>
                              {pnlPos ? "+" : ""}
                              {formatCurrency(pos.pnl, locale, currency)}
                            </p>
                            <p className={`text-xs ${pnlPos ? "text-axiom-income" : "text-axiom-expense"}`}>
                              {pnlPos ? "▲" : "▼"} {Math.abs(pos.pnlPct).toFixed(2)}%
                            </p>
                          </TableCell>

                          {/* % Cart. */}
                          <TableCell className="text-right text-sm text-axiom-muted py-2.5">
                            {posPct.toFixed(2)}%
                          </TableCell>

                          {/* Ação */}
                          <TableCell className="py-2.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-axiom-muted hover:text-axiom-expense"
                              onClick={() => handleDelete(pos.id)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
