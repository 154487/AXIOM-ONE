"use client";

import { useState, FormEvent, useEffect } from "react";
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
import type { WealthItemSerialized } from "@/app/api/patrimonio/items/route";
import { formatCurrency } from "@/lib/utils";

const ASSET_CATEGORIES = [
  "Imóvel",
  "Veículo",
  "Investimento Externo",
  "Conta Bancária",
  "Previdência",
  "Outro",
];

const LIABILITY_CATEGORIES = [
  "Financiamento Imobiliário",
  "Financiamento Veicular",
  "Empréstimo Pessoal",
  "Cartão de Crédito",
  "Outro",
];

// Sugestões de taxa por categoria (% a.a.)
const RATE_SUGGESTIONS: Record<string, { rate: number; label: string }> = {
  "Imóvel":                  { rate: 6,   label: "imóveis costumam valorizar ~6% a.a." },
  "Veículo":                 { rate: -10, label: "carros depreciam ~10% a.a." },
  "Investimento Externo":    { rate: 8,   label: "sugestão de referência: +8% a.a." },
  "Previdência":             { rate: 8,   label: "sugestão de referência: +8% a.a." },
  "Financiamento Imobiliário": { rate: -2, label: "saldo devedor diminui com os pagamentos" },
  "Financiamento Veicular":  { rate: -12, label: "veículo + dívida depreciam rapidamente" },
};

interface WealthItemDialogProps {
  mode: "create" | "edit";
  defaultType?: "ASSET" | "LIABILITY";
  item?: WealthItemSerialized;
  onSuccess: (item: WealthItemSerialized) => void;
  onClose: () => void;
}

export function WealthItemDialog({
  mode,
  defaultType = "ASSET",
  item,
  onSuccess,
  onClose,
}: WealthItemDialogProps) {
  const [name, setName] = useState(item?.name ?? "");
  // No edit mode, show baseValue (original) so the user can update the reference price
  const [value, setValue] = useState((item?.baseValue ?? item?.value)?.toString() ?? "");
  const [itemType, setItemType] = useState<"ASSET" | "LIABILITY">(
    item?.itemType ?? defaultType
  );
  const [category, setCategory] = useState(
    item?.category ?? (defaultType === "ASSET" ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0])
  );
  const [appreciationRate, setAppreciationRate] = useState(
    item?.appreciationRate?.toString() ?? ""
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setValue((item.baseValue ?? item.value).toString());
      setItemType(item.itemType);
      setCategory(item.category);
      setAppreciationRate(item.appreciationRate?.toString() ?? "");
      setNotes(item.notes ?? "");
    }
  }, [item]);

  function handleTypeChange(type: "ASSET" | "LIABILITY") {
    setItemType(type);
    setCategory(type === "ASSET" ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0]);
  }

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    // Auto-sugerir taxa se o campo estiver vazio
    if (!appreciationRate && RATE_SUGGESTIONS[cat]) {
      setAppreciationRate(RATE_SUGGESTIONS[cat].rate.toString());
    }
  }

  const presets = itemType === "ASSET" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  const suggestion = RATE_SUGGESTIONS[category];
  const parsedRate = appreciationRate !== "" ? parseFloat(appreciationRate.replace(",", ".")) : null;

  // Preview: valor estimado em 1 ano com a taxa informada
  const parsedValue = parseFloat(value.replace(",", "."));
  const previewNext =
    !isNaN(parsedValue) && parsedRate !== null && parsedRate !== 0
      ? parsedValue * Math.pow(1 + parsedRate / 100, 1)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedV = parseFloat(value.replace(",", "."));
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (isNaN(parsedV) || parsedV <= 0) {
      setError("Valor deve ser maior que zero");
      return;
    }
    if (parsedRate !== null && !isNaN(parsedRate) && (parsedRate < -100 || parsedRate > 100)) {
      setError("Taxa deve estar entre -100% e +100%");
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/patrimonio/items"
          : `/api/patrimonio/items/${item!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const rateToSend =
        appreciationRate !== "" && parsedRate !== null && !isNaN(parsedRate)
          ? parsedRate
          : null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          value: parsedV,
          ...(mode === "create" && { itemType }),
          category,
          appreciationRate: rateToSend,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar. Tente novamente.");
        return;
      }

      onSuccess(data);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-axiom-card border-axiom-border text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === "create"
              ? itemType === "ASSET"
                ? "Adicionar Ativo"
                : "Adicionar Passivo"
              : "Editar Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="space-y-1.5">
            <Label className="text-axiom-muted text-sm">Tipo</Label>
            <Select
              value={itemType}
              onValueChange={(v) => handleTypeChange(v as "ASSET" | "LIABILITY")}
              disabled={mode === "edit"}
            >
              <SelectTrigger className="w-full bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-axiom-card border-axiom-border">
                <SelectItem value="ASSET" className="text-white hover:bg-axiom-hover focus:bg-axiom-hover">
                  Ativo
                </SelectItem>
                <SelectItem value="LIABILITY" className="text-white hover:bg-axiom-hover focus:bg-axiom-hover">
                  Passivo
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="wealth-name" className="text-axiom-muted text-sm">Nome</Label>
            <Input
              id="wealth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder={itemType === "ASSET" ? "Ex: Apartamento Centro" : "Ex: Financiamento Caixa"}
            />
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label htmlFor="wealth-value" className="text-axiom-muted text-sm">
              {mode === "edit" && item?.appreciationRate
                ? "Valor base (referência para cálculo)"
                : "Valor atual (R$)"}
            </Label>
            <Input
              id="wealth-value"
              type="number"
              min="0.01"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder="0,00"
            />
            {mode === "edit" && item?.appreciationRate && item.value !== item.baseValue && (
              <p className="text-[11px] text-axiom-muted">
                Valor calculado atual:{" "}
                <span className={item.value >= item.baseValue ? "text-axiom-income" : "text-axiom-expense"}>
                  {formatCurrency(item.value, "pt-BR", "BRL")}
                </span>
                {" — ao atualizar o valor base, o cálculo reinicia a partir de hoje"}
              </p>
            )}
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-axiom-muted text-sm">Categoria</Label>
            <Select value={category} onValueChange={(v) => handleCategoryChange(v ?? presets[0])}>
              <SelectTrigger className="w-full bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-axiom-card border-axiom-border">
                {presets.map((p) => (
                  <SelectItem
                    key={p}
                    value={p}
                    className="text-white hover:bg-axiom-hover focus:bg-axiom-hover"
                  >
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Taxa de valorização/depreciação */}
          <div className="space-y-1.5">
            <Label htmlFor="wealth-rate" className="text-axiom-muted text-sm">
              Taxa de correção anual (%){" "}
              <span className="text-axiom-muted/60">(opcional)</span>
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="wealth-rate"
                type="number"
                step="0.1"
                value={appreciationRate}
                onChange={(e) => setAppreciationRate(e.target.value)}
                className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
                placeholder="Ex: 6 ou -10"
              />
              {/* Quick presets */}
              {suggestion && (
                <button
                  type="button"
                  onClick={() => setAppreciationRate(suggestion.rate.toString())}
                  className={`shrink-0 text-[10px] px-2 py-1.5 rounded-lg border transition-colors ${
                    parsedRate === suggestion.rate
                      ? "bg-axiom-primary/20 border-axiom-primary/40 text-axiom-primary"
                      : "border-axiom-border text-axiom-muted hover:text-white hover:border-axiom-muted"
                  }`}
                >
                  {suggestion.rate > 0 ? "+" : ""}{suggestion.rate}%
                </button>
              )}
            </div>
            {suggestion && (
              <p className="text-[11px] text-axiom-muted">{suggestion.label}</p>
            )}
            {previewNext !== null && !isNaN(parsedValue) && (
              <p className="text-[11px] text-axiom-muted">
                Em 1 ano:{" "}
                <span className={parsedRate! > 0 ? "text-axiom-income" : "text-axiom-expense"}>
                  {formatCurrency(previewNext, "pt-BR", "BRL")}
                </span>
                {parsedRate! > 0 ? " ↑" : " ↓"}
              </p>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="wealth-notes" className="text-axiom-muted text-sm">
              Notas <span className="text-axiom-muted/60">(opcional)</span>
            </Label>
            <textarea
              id="wealth-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observações adicionais..."
              className="bg-axiom-hover border border-axiom-border rounded-lg px-3 py-2 text-white text-sm placeholder:text-axiom-muted focus:outline-none focus:border-axiom-primary w-full resize-none"
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
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-axiom-primary hover:bg-axiom-primary/90 text-white"
            >
              {saving ? "Salvando..." : mode === "create" ? "Adicionar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
