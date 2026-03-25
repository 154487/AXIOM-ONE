"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import type { AssetType } from "@/generated/prisma/client";

const ASSET_TYPES: AssetType[] = [
  "CDB", "RDB", "LCI", "LCA", "TESOURO", "POUPANCA", "FIXED_INCOME",
  "STOCK", "FII", "ETF", "BDR", "STOCK_INT", "CRYPTO", "OTHER",
];

interface TickerSuggestion {
  ticker: string;
  name: string;
  price: number | null;
  assetType: AssetType;
  currency: string;
}

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

  // Search state (only for new assets)
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isEditing = !!asset?.id;

  useEffect(() => {
    if (open) {
      setName(asset?.name ?? "");
      setTicker(asset?.ticker ?? "");
      setType(asset?.type ?? "STOCK");
      setCurrency(asset?.currency ?? "BRL");
      setCurrentPrice(asset?.currentPrice != null ? String(asset.currentPrice) : "");
      setError("");
      setSearch("");
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [open, asset]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/investments/ticker-search?q=${encodeURIComponent(q)}`);
      const data: TickerSuggestion[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (isEditing) return;
    const timer = setTimeout(() => fetchSuggestions(search), 300);
    return () => clearTimeout(timer);
  }, [search, isEditing, fetchSuggestions]);

  function handleSelect(s: TickerSuggestion) {
    setTicker(s.ticker);
    setName(s.name);
    setType(s.assetType);
    setCurrency(s.currency);
    if (s.price != null) setCurrentPrice(String(s.price));
    setSearch("");
    setShowSuggestions(false);
  }

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
          <DialogTitle>{isEditing ? t("dialog.editAsset") : t("dialog.newAsset")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">

          {/* Search autocomplete — only for new assets */}
          {!isEditing && (
            <div ref={searchRef} className="relative">
              <Label className="text-axiom-muted text-sm mb-1 block">Buscar ativo</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-axiom-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="PETR4, Petrobras, HGLG11..."
                  className="bg-axiom-bg border-axiom-border text-white pl-8 pr-8"
                  autoComplete="off"
                />
                {searching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-axiom-muted animate-spin" />
                )}
              </div>

              {showSuggestions && (
                <div className="absolute z-50 w-full mt-1 bg-axiom-card border border-axiom-border rounded-lg shadow-xl overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s.ticker}
                      type="button"
                      onClick={() => handleSelect(s)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-axiom-hover text-left transition-colors"
                    >
                      <div>
                        <span className="text-white font-medium text-sm">{s.ticker}</span>
                        <span className="text-axiom-muted text-xs ml-2">{s.name}</span>
                      </div>
                      {s.price != null && (
                        <span className="text-axiom-income text-xs font-medium">
                          R$ {s.price.toFixed(2)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fields — always shown, pre-filled after search selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">{t("dialog.name")} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Petrobras PN" className="bg-axiom-bg border-axiom-border text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">{t("dialog.ticker")}</Label>
              <Input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="PETR4" className="bg-axiom-bg border-axiom-border text-white" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-axiom-muted text-sm">Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as AssetType)}>
              <SelectTrigger className="bg-axiom-bg border-axiom-border text-white">
                <SelectValue>{t(`assetTypes.${type}`)}</SelectValue>
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
