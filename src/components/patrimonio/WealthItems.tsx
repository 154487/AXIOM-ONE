"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Pencil, Trash2, Plus } from "lucide-react";
import { WealthItemDialog } from "./WealthItemDialog";
import { formatCurrency } from "@/lib/utils";
import type { WealthItemSerialized } from "@/app/api/patrimonio/items/route";

interface WealthItemsProps {
  items: WealthItemSerialized[];
  totalAssets: number;
  totalLiabilities: number;
  net: number;
  currency: string;
  locale: string;
  onRefresh: () => void;
}

export function WealthItems({
  items,
  totalAssets,
  totalLiabilities,
  net,
  currency,
  locale,
  onRefresh,
}: WealthItemsProps) {
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<WealthItemSerialized | null>(null);
  const [defaultType, setDefaultType] = useState<"ASSET" | "LIABILITY">("ASSET");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate(type: "ASSET" | "LIABILITY") {
    setDefaultType(type);
    setEditingItem(null);
    setDialogMode("create");
  }

  function openEdit(item: WealthItemSerialized) {
    setEditingItem(item);
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingItem(null);
  }

  function handleSuccess() {
    closeDialog();
    onRefresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/patrimonio/items/${id}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  const assets = items.filter((i) => i.itemType === "ASSET");
  const liabilities = items.filter((i) => i.itemType === "LIABILITY");

  return (
    <>
      <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-white">Bens e Passivos</h3>
            <p className="text-xs text-axiom-muted mt-0.5">Patrimônio além das transações</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openCreate("ASSET")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-axiom-income/10 border border-axiom-income/20 text-axiom-income text-xs font-medium hover:bg-axiom-income/20 transition-colors"
            >
              <Plus size={12} />
              Ativo
            </button>
            <button
              onClick={() => openCreate("LIABILITY")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-axiom-expense/10 border border-axiom-expense/20 text-axiom-expense text-xs font-medium hover:bg-axiom-expense/20 transition-colors"
            >
              <Plus size={12} />
              Passivo
            </button>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-axiom-hover">
            <span className="text-xs text-axiom-muted">Ativos</span>
            <span className="text-sm font-bold text-axiom-income">
              {formatCurrency(totalAssets, locale, currency)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-axiom-hover">
            <span className="text-xs text-axiom-muted">Passivos</span>
            <span className="text-sm font-bold text-axiom-expense">
              {formatCurrency(totalLiabilities, locale, currency)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 p-3 rounded-lg bg-axiom-hover">
            <span className="text-xs text-axiom-muted">Líquido</span>
            <span
              className={`text-sm font-bold ${net >= 0 ? "text-axiom-income" : "text-axiom-expense"}`}
            >
              {formatCurrency(net, locale, currency)}
            </span>
          </div>
        </div>

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <p className="text-sm text-axiom-muted italic">Nenhum bem ou passivo cadastrado</p>
            <div className="flex gap-2">
              <button
                onClick={() => openCreate("ASSET")}
                className="px-3 py-1.5 rounded-lg bg-axiom-primary text-white text-xs font-medium hover:bg-axiom-primary/90 transition-colors"
              >
                + Adicionar bem
              </button>
              <button
                onClick={() => openCreate("LIABILITY")}
                className="px-3 py-1.5 rounded-lg bg-axiom-hover border border-axiom-border text-axiom-muted text-xs hover:text-white transition-colors"
              >
                + Adicionar passivo
              </button>
            </div>
          </div>
        )}

        {/* Lista de Ativos */}
        {assets.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-axiom-income">
              <TrendingUp size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Ativos</span>
            </div>
            <div className="flex flex-col gap-1">
              {assets.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  currency={currency}
                  deleting={deletingId === item.id}
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Lista de Passivos */}
        {liabilities.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-axiom-expense">
              <TrendingDown size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Passivos</span>
            </div>
            <div className="flex flex-col gap-1">
              {liabilities.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  currency={currency}
                  deleting={deletingId === item.id}
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      {dialogMode && (
        <WealthItemDialog
          mode={dialogMode}
          defaultType={defaultType}
          item={editingItem ?? undefined}
          onSuccess={handleSuccess}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

function ItemRow({
  item,
  locale,
  currency,
  deleting,
  onEdit,
  onDelete,
}: {
  item: WealthItemSerialized;
  locale: string;
  currency: string;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasDrift = item.appreciationRate && item.value !== item.baseValue;
  const gain = item.value - item.baseValue;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-axiom-hover group transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-wrap">
        <span className="text-sm text-white truncate">{item.name}</span>
        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-axiom-hover text-axiom-muted border border-axiom-border">
          {item.category}
        </span>
        {/* Badge de taxa de correção */}
        {item.appreciationRate ? (
          <span
            className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
              item.appreciationRate > 0
                ? "text-axiom-income bg-axiom-income/10 border-axiom-income/20"
                : "text-axiom-expense bg-axiom-expense/10 border-axiom-expense/20"
            }`}
            title={`Taxa de correção: ${item.appreciationRate > 0 ? "+" : ""}${item.appreciationRate}% a.a.`}
          >
            {item.appreciationRate > 0 ? "↑" : "↓"} {Math.abs(item.appreciationRate)}%/a
          </span>
        ) : null}
        {item.notes && (
          <span className="text-[10px] text-axiom-muted/60 truncate hidden sm:block" title={item.notes}>
            {item.notes}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end">
          <span
            className={`text-sm font-semibold ${item.itemType === "ASSET" ? "text-axiom-income" : "text-axiom-expense"}`}
          >
            {item.itemType === "LIABILITY" ? "−" : ""}
            {formatCurrency(item.value, locale, currency)}
          </span>
          {/* Diferença entre base e calculado */}
          {hasDrift && (
            <span className={`text-[10px] ${gain >= 0 ? "text-axiom-income/70" : "text-axiom-expense/70"}`}>
              {gain >= 0 ? "+" : ""}{formatCurrency(gain, locale, currency)}
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 rounded text-axiom-muted hover:text-white transition-colors"
            title="Editar"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-1 rounded text-axiom-muted hover:text-axiom-expense transition-colors disabled:opacity-50"
            title="Remover"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
