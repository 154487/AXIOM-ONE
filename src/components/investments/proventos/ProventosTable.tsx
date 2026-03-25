"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { AssetType } from "@/generated/prisma/client";
import type { ProventosAsset } from "./types";

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

interface ProventosTableProps {
  assets: ProventosAsset[];
  loading: boolean;
  currency: string;
  locale: string;
}

function formatPct(value: number | null): string {
  if (value === null || value === 0) return "—";
  return `${value.toFixed(2)}%`;
}

function formatDate(isoDate: string | null, locale: string): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function ProventosTable({ assets, loading, currency, locale }: ProventosTableProps) {
  const t = useTranslations("Investments");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<AssetType, ProventosAsset[]>();
    for (const a of assets) {
      if (!map.has(a.type)) map.set(a.type, []);
      map.get(a.type)!.push(a);
    }
    return [...map.entries()].sort((a, b) => {
      const aTotal = a[1].reduce((s, x) => s + x.totalDividends, 0);
      const bTotal = b[1].reduce((s, x) => s + x.totalDividends, 0);
      return bTotal - aTotal;
    });
  }, [assets]);

  function toggleGroup(type: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-axiom-card border border-axiom-border rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-8 text-center">
        <p className="text-axiom-muted text-sm">
          Sem proventos registrados. Adicione lançamentos do tipo Dividendo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-white">{t("proventos.tableTitle")}</h2>
      {groups.map(([type, groupAssets]) => {
        const groupTotal = groupAssets.reduce((s, a) => s + a.totalDividends, 0);
        const isCollapsed = collapsedGroups.has(type);
        const color = TYPE_COLORS[type] ?? "#6B7280";

        return (
          <div
            key={type}
            className="bg-axiom-card border border-axiom-border rounded-xl overflow-hidden"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(type)}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-axiom-hover transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color }}>
                  {t(`assetTypes.${type}`)}
                </p>
                <p className="text-xs text-axiom-muted">
                  {groupAssets.length} ativo{groupAssets.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex flex-col items-end min-w-[160px]">
                <span className="text-sm font-semibold text-axiom-income">
                  {formatCurrency(groupTotal, locale, currency)}
                </span>
                <span className="text-xs text-axiom-muted">total recebido</span>
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
                      <TableHead className="text-axiom-muted text-xs">{t("proventos.col.asset")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("proventos.col.qty")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("proventos.col.avgCost")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("proventos.col.yoc")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("proventos.col.dy")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("proventos.col.lastDividend")}</TableHead>
                      <TableHead className="text-axiom-muted text-xs text-right">{t("proventos.col.total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupAssets.map((asset) => {
                      const qty = asset.totalQuantity;
                      const qtyDisplay = qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(4);
                      return (
                        <TableRow key={asset.id} className="border-axiom-border hover:bg-axiom-hover">
                          {/* Ativo */}
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: `${color}22`, color }}
                              >
                                {(asset.ticker ?? asset.name).slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {asset.ticker ?? asset.name}
                                </p>
                                {asset.ticker && (
                                  <p className="text-xs text-axiom-muted">{asset.name}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {/* Qtd */}
                          <TableCell className="text-right text-sm text-white py-2.5">
                            {qtyDisplay}
                          </TableCell>
                          {/* PM */}
                          <TableCell className="text-right text-sm text-white py-2.5">
                            {asset.avgCost > 0
                              ? formatCurrency(asset.avgCost, locale, currency)
                              : "—"}
                          </TableCell>
                          {/* YoC */}
                          <TableCell className="text-right text-sm py-2.5">
                            <span
                              className={
                                asset.yieldOnCost > 0
                                  ? "text-axiom-income"
                                  : "text-axiom-muted"
                              }
                            >
                              {formatPct(asset.yieldOnCost)}
                            </span>
                          </TableCell>
                          {/* DY */}
                          <TableCell className="text-right text-sm py-2.5">
                            <span
                              className={
                                asset.dy !== null && asset.dy > 0
                                  ? "text-axiom-income"
                                  : "text-axiom-muted"
                              }
                            >
                              {formatPct(asset.dy)}
                            </span>
                          </TableCell>
                          {/* Último Provento */}
                          <TableCell className="text-right text-sm text-white py-2.5">
                            <p>{formatDate(asset.lastDividendDate, locale)}</p>
                            {asset.lastDividendAmount > 0 && (
                              <p className="text-xs text-axiom-income">
                                {formatCurrency(asset.lastDividendAmount, locale, currency)}
                              </p>
                            )}
                          </TableCell>
                          {/* Total Acumulado */}
                          <TableCell className="text-right text-sm font-medium text-axiom-income py-2.5">
                            {formatCurrency(asset.totalDividends, locale, currency)}
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
