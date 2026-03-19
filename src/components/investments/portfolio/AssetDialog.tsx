"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssetType } from "@/generated/prisma/client";

const ASSET_TYPES: AssetType[] = ["STOCK", "FII", "ETF", "BDR", "CRYPTO", "FIXED_INCOME", "STOCK_INT", "OTHER"];

interface AssetForm {
  id?: string;
  name?: string;
  ticker?: string | null;
  type?: AssetType;
  currency?: string;
  currentPrice?: number | null;
}

interface AssetDialogProps {
  open: boolean;
  onClose: () => void;
  asset?: AssetForm | null;
  onSave: (asset: AssetForm & { id: string }) => void;
}

export function AssetDialog({ open, onClose, asset, onSave }: AssetDialogProps) {
  const t = useTranslations("Investments");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState<AssetType>("STOCK");
  const [currency, setCurrency] = useState("BRL");
  const [currentPrice, setCurrentPrice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(asset?.name ?? "");
      setTicker(asset?.ticker ?? "");
      setType(asset?.type ?? "STOCK");
      setCurrency(asset?.currency ?? "BRL");
      setCurrentPrice(asset?.currentPrice != null ? String(asset.currentPrice) : "");
      setError("");
    }
  }, [open, asset]);

  async function handleSave() {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    if (currentPrice && isNaN(Number(currentPrice))) { setError("Preço inválido"); return; }

    setSaving(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        ticker: ticker.trim() || null,
        type,
        currency,
        currentPrice: currentPrice ? Number(currentPrice) : null,
      };
      const url = asset?.id ? `/api/investments/assets/${asset.id}` : "/api/investments/assets";
      const method = asset?.id ? "PATCH" : "POST";
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
          <DialogTitle>{asset?.id ? t("dialog.editAsset") : t("dialog.newAsset")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-axiom-muted text-sm">{t("dialog.name")} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Petrobras PN" className="bg-axiom-bg border-axiom-border text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-axiom-muted text-sm">{t("dialog.ticker")}</Label>
            <Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="PETR4" className="bg-axiom-bg border-axiom-border text-white" />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-axiom-muted text-sm">Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
              <SelectTrigger className="bg-axiom-bg border-axiom-border text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-axiom-card border-axiom-border">
                {ASSET_TYPES.map((at) => (
                  <SelectItem key={at} value={at} className="text-white hover:bg-axiom-hover">{t(`assetTypes.${at}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">{t("dialog.currency")}</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="BRL" className="bg-axiom-bg border-axiom-border text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">{t("dialog.currentPrice")}</Label>
              <Input value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} placeholder="0,00" type="number" step="0.01" min="0" className="bg-axiom-bg border-axiom-border text-white" />
            </div>
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
