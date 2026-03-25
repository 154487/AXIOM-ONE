"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, X } from "lucide-react";
import type { AssetType, EntryType } from "@/generated/prisma/client";

const ENTRY_TYPES: EntryType[] = ["PURCHASE", "SALE", "DIVIDEND", "SPLIT"];

// Renda fixa primeiro — mais comum para novos usuários
const ASSET_TYPES_GROUPED: AssetType[] = [
  "CDB", "RDB", "LCI", "LCA", "TESOURO", "POUPANCA", "FIXED_INCOME",
  "STOCK", "FII", "ETF", "BDR", "STOCK_INT", "CRYPTO", "OTHER",
];

const TYPE_BADGE: Partial<Record<AssetType, string>> = {
  STOCK: "Ação", FII: "FII", ETF: "ETF", BDR: "BDR",
  CRYPTO: "Crypto", FIXED_INCOME: "RF", STOCK_INT: "Int'l",
  CDB: "CDB", RDB: "RDB", LCI: "LCI", LCA: "LCA",
  TESOURO: "Tesouro", POUPANCA: "Poup.", OTHER: "Outro",
};

type AssetMode = "existing" | "new" | "ticker";

interface AssetRaw {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  currentPrice: number | null;
}

interface TickerSuggestion {
  ticker: string;
  name: string;
  price: number | null;
  assetType: AssetType;
  currency: string;
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
  onNewAsset?: (asset: AssetRaw) => void;
}

export function EntryDialog({ open, onClose, entry, assets, onSave, onNewAsset }: EntryDialogProps) {
  const t = useTranslations("Investments");

  // Asset selection state
  const [assetMode, setAssetMode] = useState<AssetMode>("existing");
  const [assetId, setAssetId] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetType, setNewAssetType] = useState<AssetType>("CDB");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ticker search state
  const [tickerSearch, setTickerSearch] = useState("");
  const [tickerSuggestions, setTickerSuggestions] = useState<TickerSuggestion[]>([]);
  const [tickerSearching, setTickerSearching] = useState(false);
  const [showTickerSuggestions, setShowTickerSuggestions] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Entry fields
  const [type, setType] = useState<EntryType>("PURCHASE");
  const [date, setDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [creatingTicker, setCreatingTicker] = useState(false);

  const isSplit = type === "SPLIT";
  const total = !isSplit && quantity && price ? (Number(quantity) * Number(price)).toFixed(2) : null;

  // Filtered assets for dropdown
  const filteredAssets = useMemo(
    () => assets.filter((a) =>
      a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      (a.ticker ?? "").toLowerCase().includes(assetSearch.toLowerCase())
    ),
    [assets, assetSearch]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (tickerRef.current && !tickerRef.current.contains(e.target as Node)) {
        setShowTickerSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      const defaultAssetId = entry?.assetId ?? (assets[0]?.id ?? "");
      const defaultAsset = assets.find((a) => a.id === defaultAssetId);

      setAssetMode("existing");
      setAssetId(defaultAssetId);
      setAssetSearch(defaultAsset ? (defaultAsset.ticker ? `${defaultAsset.ticker} — ${defaultAsset.name}` : defaultAsset.name) : "");
      setShowDropdown(false);
      setNewAssetName("");
      setNewAssetType("CDB");
      setTickerSearch("");
      setTickerSuggestions([]);
      setShowTickerSuggestions(false);

      setType(entry?.type ?? "PURCHASE");
      setDate(entry?.date ? entry.date.substring(0, 10) : new Date().toISOString().substring(0, 10));
      setQuantity(entry?.quantity != null ? String(entry.quantity) : "");
      if (entry?.price != null) {
        setPrice(String(entry.price));
      } else {
        setPrice(defaultAsset?.currentPrice != null ? String(defaultAsset.currentPrice) : "");
      }
      setNotes(entry?.notes ?? "");
      setError("");
    }
  }, [open, entry, assets]);

  // Ticker search with debounce
  const fetchTickerSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setTickerSuggestions([]); setShowTickerSuggestions(false); return; }
    setTickerSearching(true);
    try {
      const res = await fetch(`/api/investments/ticker-search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setTickerSuggestions(data);
        setShowTickerSuggestions(true);
      }
    } finally {
      setTickerSearching(false);
    }
  }, []);

  useEffect(() => {
    if (assetMode !== "ticker") return;
    const timer = setTimeout(() => fetchTickerSuggestions(tickerSearch), 300);
    return () => clearTimeout(timer);
  }, [tickerSearch, assetMode, fetchTickerSuggestions]);

  function selectExistingAsset(a: AssetRaw) {
    setAssetId(a.id);
    setAssetSearch(a.ticker ? `${a.ticker} — ${a.name}` : a.name);
    setShowDropdown(false);
    setAssetMode("existing");
    if (a.currentPrice != null) setPrice(String(a.currentPrice));
  }

  function enterNewAssetMode(name: string) {
    setNewAssetName(name);
    setAssetMode("new");
    setShowDropdown(false);
    setType("PURCHASE"); // SALE não faz sentido para ativo novo
  }

  async function selectTickerSuggestion(s: TickerSuggestion) {
    setShowTickerSuggestions(false);
    setTickerSearch("");

    // Verificar se ativo já existe na lista
    const existing = assets.find((a) => a.ticker === s.ticker);
    if (existing) {
      selectExistingAsset(existing);
      setAssetMode("existing");
      return;
    }

    // Criar ativo via POST /api/investments/assets
    setCreatingTicker(true);
    try {
      const res = await fetch("/api/investments/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: s.name,
          ticker: s.ticker,
          type: s.assetType,
          currency: s.currency,
          currentPrice: s.price,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        onNewAsset?.(created);
        setAssetId(created.id);
        setAssetSearch(`${s.ticker} — ${s.name}`);
        setAssetMode("existing");
        if (s.price != null) setPrice(String(s.price));
      } else {
        setError("Erro ao criar ativo da B3");
      }
    } finally {
      setCreatingTicker(false);
    }
  }

  async function handleSave() {
    if (assetMode === "existing" && !assetId) { setError("Selecione ou crie um ativo"); return; }
    if (assetMode === "new" && !newAssetName.trim()) { setError("Nome do ativo obrigatório"); return; }
    if (!quantity || Number(quantity) <= 0) { setError("Quantidade deve ser maior que zero"); return; }
    if (!isSplit && (!price || Number(price) <= 0)) { setError("Preço deve ser maior que zero"); return; }

    setSaving(true);
    setError("");
    try {
      const base = {
        type,
        date,
        quantity: Number(quantity),
        price: isSplit ? 0 : Number(price),
        notes: notes || null,
      };
      const body = assetMode === "new"
        ? { ...base, assetId: null, newAsset: { name: newAssetName.trim(), type: newAssetType } }
        : { ...base, assetId };

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

  const selectedAssetLabel = assetMode === "new"
    ? newAssetName
    : assetMode === "ticker"
    ? ""
    : assetSearch;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-axiom-card border-axiom-border text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{entry?.id ? t("dialog.editEntry") : t("dialog.newEntry")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">

          {/* ── Campo Ativo ── */}
          <div className="flex flex-col gap-2">
            <Label className="text-axiom-muted text-sm">{t("table.asset")} *</Label>

            {/* Modo existing: combobox filtrado */}
            {assetMode !== "ticker" && (
              <div className="relative" ref={dropdownRef}>
                <Input
                  value={assetMode === "new" ? "" : selectedAssetLabel}
                  onChange={(e) => {
                    setAssetSearch(e.target.value);
                    setAssetId("");
                    setAssetMode("existing");
                    setShowDropdown(true);
                  }}
                  onFocus={() => { if (assetMode !== "new") setShowDropdown(true); }}
                  placeholder={assetMode === "new" ? "Nome do ativo definido abaixo" : "Buscar ativo ou digitar nome..."}
                  readOnly={assetMode === "new"}
                  className="bg-axiom-bg border-axiom-border text-white"
                />
                {showDropdown && assetMode !== "new" && (
                  <div className="absolute z-50 w-full mt-1 bg-axiom-card border border-axiom-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {filteredAssets.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => selectExistingAsset(a)}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-axiom-hover flex items-center gap-2"
                      >
                        <span className="text-axiom-muted text-xs bg-axiom-hover px-1.5 py-0.5 rounded shrink-0">
                          {TYPE_BADGE[a.type] ?? a.type}
                        </span>
                        <span className="truncate">{a.ticker ? `${a.ticker} — ` : ""}{a.name}</span>
                      </button>
                    ))}
                    {assetSearch.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => enterNewAssetMode(assetSearch.trim())}
                        className="w-full text-left px-3 py-2 text-sm text-axiom-primary hover:bg-axiom-hover border-t border-axiom-border"
                      >
                        + Criar &quot;{assetSearch.trim()}&quot; como novo ativo
                      </button>
                    )}
                    {filteredAssets.length === 0 && assetSearch.trim().length === 0 && (
                      <p className="px-3 py-2 text-xs text-axiom-muted">Nenhum ativo cadastrado ainda</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Modo new: nome fixo + select de tipo */}
            {assetMode === "new" && (
              <div className="flex items-center gap-2 bg-axiom-bg border border-axiom-border rounded-lg px-3 py-2">
                <span className="text-sm text-white flex-1 truncate">{newAssetName}</span>
                <Select value={newAssetType} onValueChange={(v) => setNewAssetType(v as AssetType)}>
                  <SelectTrigger className="w-36 bg-axiom-hover border-axiom-border text-white text-xs h-7">
                    <SelectValue>{t(`assetTypes.${newAssetType}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-axiom-card border-axiom-border">
                    {ASSET_TYPES_GROUPED.map((at) => (
                      <SelectItem key={at} value={at} className="text-white hover:bg-axiom-hover text-xs">
                        {t(`assetTypes.${at}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => { setAssetMode("existing"); setAssetSearch(""); }}
                  className="text-axiom-muted hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Modo ticker: pesquisa na B3/Cripto */}
            {assetMode === "ticker" && (
              <div className="relative" ref={tickerRef}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-axiom-muted" />
                  <Input
                    value={tickerSearch}
                    onChange={(e) => setTickerSearch(e.target.value)}
                    placeholder="Ex: PETR4, MXRF11, BTC..."
                    className="bg-axiom-bg border-axiom-border text-white pl-8 pr-8"
                    autoFocus
                  />
                  {tickerSearching || creatingTicker ? (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-axiom-muted" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAssetMode("existing"); setTickerSearch(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-axiom-muted hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {showTickerSuggestions && tickerSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-axiom-card border border-axiom-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {tickerSuggestions.map((s) => (
                      <button
                        key={s.ticker}
                        type="button"
                        onClick={() => selectTickerSuggestion(s)}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-axiom-hover flex justify-between items-center"
                      >
                        <span>{s.ticker} — {s.name}</span>
                        {s.price != null && (
                          <span className="text-axiom-muted text-xs">R$ {s.price.toFixed(2)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Toggle pesquisa B3 */}
            <button
              type="button"
              onClick={() => setAssetMode(assetMode === "ticker" ? "existing" : "ticker")}
              className="text-axiom-primary text-xs hover:underline flex items-center gap-1 w-fit"
            >
              <Search size={11} />
              {assetMode === "ticker" ? t("cancelTickerSearch") : t("tickerSearchToggle")}
            </button>
          </div>

          {/* ── Tipo + Data ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
                <SelectTrigger className="bg-axiom-bg border-axiom-border text-white">
                  <SelectValue>{t(`entryTypes.${type}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-axiom-card border-axiom-border">
                  {ENTRY_TYPES.map((et) => (
                    <SelectItem
                      key={et}
                      value={et}
                      disabled={assetMode === "new" && et !== "PURCHASE"}
                      className="text-white hover:bg-axiom-hover disabled:opacity-40"
                    >
                      {t(`entryTypes.${et}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">Data *</Label>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="bg-axiom-bg border-axiom-border text-white"
              />
            </div>
          </div>

          {/* ── Quantidade + Preço ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-axiom-muted text-sm">
                {isSplit ? "Novo Total de Cotas *" : `${t("table.quantity")} *`}
              </Label>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                step="0.000001"
                min="0"
                placeholder="0"
                className="bg-axiom-bg border-axiom-border text-white"
              />
            </div>
            {!isSplit && (
              <div className="flex flex-col gap-1">
                <Label className="text-axiom-muted text-sm">{t("table.price")} *</Label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="bg-axiom-bg border-axiom-border text-white"
                />
              </div>
            )}
          </div>

          {/* ── Total ── */}
          {total && (
            <div className="bg-axiom-bg rounded-lg px-4 py-2 flex justify-between items-center">
              <span className="text-axiom-muted text-sm">{t("table.total")}</span>
              <span className="text-white font-semibold">R$ {total}</span>
            </div>
          )}

          {/* ── Notas ── */}
          <div className="flex flex-col gap-1">
            <Label className="text-axiom-muted text-sm">{t("table.notes")}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações..."
              className="bg-axiom-bg border-axiom-border text-white"
            />
          </div>

          {error && <p className="text-axiom-expense text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="border-axiom-border text-axiom-muted hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || creatingTicker}
              className="bg-axiom-primary text-white hover:opacity-90"
            >
              {saving || creatingTicker ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
