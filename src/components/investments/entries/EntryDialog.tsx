"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssetType, EntryType } from "@/generated/prisma/client";

const ENTRY_TYPES: EntryType[] = ["PURCHASE", "SALE", "DIVIDEND", "SPLIT"];

interface AssetRaw {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  currentPrice: number | null;
}

interface EntryForm {
  id?: string;
  assetId?: string;
  type?: EntryType;
  date?: string;
  quantity?: number;
  price?: number;
  notes?: string | null;
}

interface EntryDialogProps {
  open: boolean;
  onClose: () => void;
  entry?: EntryForm | null;
  assets: AssetRaw[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (entry: any) => void;
}

export function EntryDialog({ open, onClose, entry, assets, onSave }: EntryDialogProps) {
  const t = useTranslations("Investments");
  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState<EntryType>("PURCHASE");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isSplit = type === "SPLIT";
  const total = !isSplit && quantity && price ? (Number(quantity) * Number(price)).toFixed(2) : null;

  useEffect(() => {
    if (open) {
      setAssetId(entry?.assetId ?? (assets[0]?.id ?? ""));
      setType(entry?.type ?? "PURCHASE");
      setDate(entry?.date ? entry.date.substring(0, 10) : new Date().toISOString().substring(0, 10));
      setQuantity(entry?.quantity != null ? String(entry.quantity) : "");
      setPrice(entry?.price != null ? String(entry.price) : "");
      setNotes(entry?.notes ?? "");
      setError("");
    }
  }, [open, entry, assets]);

  async function handleSave() {
    if (!assetId) { setError("Ativo obrigatório"); return; }
    if (!quantity || Number(quantity) <= 0) { setError("Quantidade deve ser maior que zero"); return; }
    if (!isSplit && (!price || Number(price) <= 0)) { setError("Preço deve ser maior que zero"); return; }

    setSaving(true);
    setError("");
    try {
      const body = {
        assetId,
        type,
        date,
        quantity: Number(quantity),
        price: isSplit ? 0 : Number(price),
        notes: notes || null,
      };
      const url = entry?.id ? `/api/investments/entries/${entry.id}` : "/api/investments/entries";
      const method = entry?.id ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar"); return; }
      onSave(data);
      onClose();
    } catch {
      setError("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-axiom-card border-axiom-border text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{entry?.id ? t("dialog.editEntry") : t("dialog.newEntry")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-axiom-muted text-sm">{t("table.asset")} *</Label>
            <Select value={assetId} onValueChange={(v) => setAssetId(v ?? "")}>
              <SelectTrigger className="bg-axiom-bg border-axiom-border text-white">
                <SelectValue placeholder="Selecionar ativo" />
              </SelectTrigger>
              <SelectContent className="bg-axiom-card border-axiom-border">
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-white hover:bg-axiom-hover">
                    {a.ticker ? `${a.ticker} — ` : ""}{a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
                <SelectTrigger className="bg-axiom-bg border-axiom-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-axiom-card border-axiom-border">
                  {ENTRY_TYPES.map((et) => (
                    <SelectItem key={et} value={et} className="text-white hover:bg-axiom-hover">{t(`entryTypes.${et}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">Data *</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="bg-axiom-bg border-axiom-border text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">
                {isSplit ? "Novo Total de Cotas *" : `${t("table.quantity")} *`}
              </Label>
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" step="0.000001" min="0" placeholder="0" className="bg-axiom-bg border-axiom-border text-white" />
            </div>
            {!isSplit && (
              <div className="flex flex-col gap-1">
                <Label className="text-axiom-muted text-sm">{t("table.price")} *</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" min="0" placeholder="0,00" className="bg-axiom-bg border-axiom-border text-white" />
              </div>
            )}
          </div>

          {total && (
            <div className="bg-axiom-bg rounded-lg px-4 py-2 flex justify-between items-center">
              <span className="text-axiom-muted text-sm">{t("table.total")}</span>
              <span className="text-white font-semibold">R$ {total}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Label className="text-axiom-muted text-sm">{t("table.notes")}</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." className="bg-axiom-bg border-axiom-border text-white" />
          </div>

          {error && <p className="text-axiom-expense text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-axiom-border text-axiom-muted hover:text-white">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-axiom-primary text-white hover:opacity-90">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
