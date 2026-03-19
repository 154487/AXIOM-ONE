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
  const [value, setValue] = useState(item?.value?.toString() ?? "");
  const [itemType, setItemType] = useState<"ASSET" | "LIABILITY">(
    item?.itemType ?? defaultType
  );
  const [category, setCategory] = useState(
    item?.category ?? (defaultType === "ASSET" ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0])
  );
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when item changes (edit mode)
  useEffect(() => {
    if (item) {
      setName(item.name);
      setValue(item.value.toString());
      setItemType(item.itemType);
      setCategory(item.category);
      setNotes(item.notes ?? "");
    }
  }, [item]);

  function handleTypeChange(type: "ASSET" | "LIABILITY") {
    setItemType(type);
    setCategory(type === "ASSET" ? ASSET_CATEGORIES[0] : LIABILITY_CATEGORIES[0]);
  }

  const presets = itemType === "ASSET" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedValue = parseFloat(value.replace(",", "."));
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setError("Valor deve ser maior que zero");
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/patrimonio/items"
          : `/api/patrimonio/items/${item!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          value: parsedValue,
          ...(mode === "create" && { itemType }),
          category,
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
              <SelectTrigger className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
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
            <Label htmlFor="wealth-value" className="text-axiom-muted text-sm">Valor atual (R$)</Label>
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
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-axiom-muted text-sm">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? presets[0])}>
              <SelectTrigger className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
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
