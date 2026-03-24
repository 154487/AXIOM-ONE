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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { WealthItemSerialized } from "@/types/fire";
import { formatCurrency } from "@/lib/utils";
import { getLoanBankGroups, getLoanBankById } from "@/lib/loanBanks";

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

const LOAN_CATEGORIES = ["Empréstimo Pessoal", "Financiamento Imobiliário", "Financiamento Veicular"];

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
  userCategories?: { id: string; name: string; color: string }[];
  onSuccess: (item: WealthItemSerialized) => void;
  onClose: () => void;
}

export function WealthItemDialog({
  mode,
  defaultType = "ASSET",
  item,
  userCategories = [],
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
  const [rateFrequency, setRateFrequency] = useState<"MONTHLY" | "ANNUAL">(
    item?.rateFrequency ?? "ANNUAL"
  );
  const [loanBank, setLoanBank] = useState(item?.loanBank ?? "");
  const [loanInstallments, setLoanInstallments] = useState(
    item?.loanInstallments?.toString() ?? ""
  );
  const [loanStartDate, setLoanStartDate] = useState(
    item?.loanStartDate ? new Date(item.loanStartDate).toISOString().slice(0, 10) : ""
  );
  const [loanDueDay, setLoanDueDay] = useState(item?.loanDueDay?.toString() ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [linkedCategoryId, setLinkedCategoryId] = useState(item?.linkedCategoryId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setValue((item.baseValue ?? item.value).toString());
      setItemType(item.itemType);
      setCategory(item.category);
      setAppreciationRate(item.appreciationRate?.toString() ?? "");
      setRateFrequency(item.rateFrequency ?? "ANNUAL");
      setLoanBank(item.loanBank ?? "");
      setLoanInstallments(item.loanInstallments?.toString() ?? "");
      setLoanStartDate(item.loanStartDate ? new Date(item.loanStartDate).toISOString().slice(0, 10) : "");
      setLoanDueDay(item.loanDueDay?.toString() ?? "");
      setNotes(item.notes ?? "");
      setLinkedCategoryId(item.linkedCategoryId ?? "");
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
      setRateFrequency("ANNUAL");
    }
  }

  const presets = itemType === "ASSET" ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  const suggestion = RATE_SUGGESTIONS[category];
  const parsedRate = appreciationRate !== "" ? parseFloat(appreciationRate.replace(",", ".")) : null;

  // Preview: valor estimado com a taxa informada
  const parsedValue = parseFloat(value.replace(",", "."));
  const previewNext =
    !isNaN(parsedValue) && parsedRate !== null && parsedRate !== 0
      ? rateFrequency === "MONTHLY"
        ? parsedValue * Math.pow(1 + parsedRate / 100, 12)
        : parsedValue * Math.pow(1 + parsedRate / 100, 1)
      : null;

  const showLoanSection =
    itemType === "LIABILITY" && LOAN_CATEGORIES.includes(category);

  const parsedInstallments = loanInstallments !== "" ? parseInt(loanInstallments) : null;

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
          rateFrequency,
          loanBank: loanBank || null,
          loanInstallments: parsedInstallments || null,
          loanStartDate: loanStartDate || null,
          loanDueDay: loanDueDay ? parseInt(loanDueDay) : null,
          linkedCategoryId: linkedCategoryId || null,
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
              Taxa de correção (%){" "}
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
                  onClick={() => { setAppreciationRate(suggestion.rate.toString()); setRateFrequency("ANNUAL"); }}
                  className={`shrink-0 text-[10px] px-2 py-1.5 rounded-lg border transition-colors ${
                    parsedRate === suggestion.rate
                      ? "bg-axiom-primary/20 border-axiom-primary/40 text-axiom-primary"
                      : "border-axiom-border text-axiom-muted hover:text-white hover:border-axiom-muted"
                  }`}
                >
                  {suggestion.rate > 0 ? "+" : ""}{suggestion.rate}%
                </button>
              )}
              {/* Frequency toggle */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setRateFrequency("ANNUAL")}
                  className={`text-[10px] px-2 py-1.5 rounded-lg border transition-colors ${
                    rateFrequency === "ANNUAL"
                      ? "bg-axiom-primary/20 border-axiom-primary/40 text-axiom-primary"
                      : "border-axiom-border text-axiom-muted hover:text-white"
                  }`}
                >
                  % a.a.
                </button>
                <button
                  type="button"
                  onClick={() => setRateFrequency("MONTHLY")}
                  className={`text-[10px] px-2 py-1.5 rounded-lg border transition-colors ${
                    rateFrequency === "MONTHLY"
                      ? "bg-axiom-primary/20 border-axiom-primary/40 text-axiom-primary"
                      : "border-axiom-border text-axiom-muted hover:text-white"
                  }`}
                >
                  % a.m.
                </button>
              </div>
            </div>
            {suggestion && (
              <p className="text-[11px] text-axiom-muted">{suggestion.label}</p>
            )}
            {previewNext !== null && !isNaN(parsedValue) && (
              <p className="text-[11px] text-axiom-muted">
                {rateFrequency === "MONTHLY" ? "Em 12 meses" : "Em 1 ano"}:{" "}
                <span className={parsedRate! > 0 ? "text-axiom-income" : "text-axiom-expense"}>
                  {formatCurrency(previewNext, "pt-BR", "BRL")}
                </span>
                {parsedRate! > 0 ? " ↑" : " ↓"}
              </p>
            )}
          </div>

          {/* Seção de Empréstimo — apenas para passivos de categorias específicas */}
          {showLoanSection && (
            <>
              {/* Banco */}
              <div className="space-y-1.5">
                <Label className="text-axiom-muted text-sm">
                  Banco / Instituição{" "}
                  <span className="text-axiom-muted/60">(opcional)</span>
                </Label>
                <Select
                  value={loanBank}
                  onValueChange={(v) => {
                    setLoanBank(v ?? "");
                    const bankInfo = getLoanBankById(v ?? "");
                    if (bankInfo && !appreciationRate) {
                      setAppreciationRate(bankInfo.typicalRatePct.toString());
                      setRateFrequency(bankInfo.rateFrequency);
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
                    <SelectValue placeholder="Selecionar banco..." />
                  </SelectTrigger>
                  <SelectContent className="bg-axiom-card border-axiom-border max-h-72">
                    {getLoanBankGroups().map((group, gi) => (
                      <SelectGroup key={group.productType}>
                        {gi > 0 && <SelectSeparator />}
                        <SelectLabel className="text-axiom-muted/70 text-[10px] uppercase tracking-wider px-2 pt-1">
                          {group.productType}
                        </SelectLabel>
                        {group.banks.map((b) => (
                          <SelectItem
                            key={b.id}
                            value={b.id}
                            className="text-white hover:bg-axiom-hover focus:bg-axiom-hover pl-4"
                          >
                            <span className="text-sm">{b.bankName}</span>
                            {b.typicalRatePct > 0 ? (
                              <span className="text-axiom-expense text-xs font-semibold ml-2">
                                {b.typicalRatePct}%{b.rateFrequency === "MONTHLY" ? " a.m." : " a.a."}
                              </span>
                            ) : null}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Linha: total de parcelas + dia de vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="wealth-installments" className="text-axiom-muted text-sm">
                    Total de parcelas
                  </Label>
                  <Input
                    id="wealth-installments"
                    type="number"
                    min="1"
                    step="1"
                    value={loanInstallments}
                    onChange={(e) => setLoanInstallments(e.target.value)}
                    className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
                    placeholder="Ex: 360"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wealth-dueday" className="text-axiom-muted text-sm">
                    Dia de vencimento
                  </Label>
                  <Input
                    id="wealth-dueday"
                    type="number"
                    min="1"
                    max="28"
                    step="1"
                    value={loanDueDay}
                    onChange={(e) => setLoanDueDay(e.target.value)}
                    className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
                    placeholder="Ex: 10"
                  />
                </div>
              </div>

              {/* Data de início */}
              <div className="space-y-1.5">
                <Label htmlFor="wealth-startdate" className="text-axiom-muted text-sm">
                  Data do 1º vencimento{" "}
                  <span className="text-axiom-muted/60">(opcional)</span>
                </Label>
                <Input
                  id="wealth-startdate"
                  type="date"
                  value={loanStartDate}
                  onChange={(e) => setLoanStartDate(e.target.value)}
                  className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
                />
                {parsedInstallments && parsedInstallments > 0 && loanStartDate && (
                  <p className="text-xs text-axiom-muted">
                    Previsão de quitação:{" "}
                    <span className="text-white">
                      {(() => {
                        const start = new Date(loanStartDate);
                        const quitacao = new Date(start.getFullYear(), start.getMonth() + parsedInstallments, start.getDate());
                        return quitacao.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
                      })()}
                    </span>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Categoria de gastos vinculada (só LIABILITY) */}
          {itemType === "LIABILITY" && userCategories.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-axiom-muted text-sm">
                Categoria de gastos vinculada{" "}
                <span className="text-axiom-muted/60">(opcional)</span>
              </Label>
              <Select value={linkedCategoryId} onValueChange={(v) => setLinkedCategoryId(v ?? "")}>
                <SelectTrigger className="w-full bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent className="bg-axiom-card border-axiom-border">
                  <SelectItem value="" className="text-axiom-muted hover:bg-axiom-hover focus:bg-axiom-hover">
                    Nenhuma
                  </SelectItem>
                  {userCategories.map((cat) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="text-white hover:bg-axiom-hover focus:bg-axiom-hover"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-axiom-muted/60">
                Mostra quanto este passivo gera de gastos mensais
              </p>
            </div>
          )}

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
