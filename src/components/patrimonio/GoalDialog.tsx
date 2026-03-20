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
import type { FinancialGoalSerialized } from "@/app/api/patrimonio/goals/route";
import { getBankGroups } from "@/lib/brazilianBanks";

interface GoalDialogProps {
  mode: "create" | "edit";
  goal?: FinancialGoalSerialized;
  onSuccess: (goal: FinancialGoalSerialized) => void;
  onClose: () => void;
}

export function GoalDialog({ mode, goal, onSuccess, onClose }: GoalDialogProps) {
  const [name, setName] = useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() ?? "");
  const [savedAmount, setSavedAmount] = useState(goal?.savedAmount?.toString() ?? "0");
  const [contributionAmount, setContributionAmount] = useState(
    goal?.contributionAmount?.toString() ?? ""
  );
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">(
    goal?.contributionFrequency ?? "MONTHLY"
  );
  const [bank, setBank] = useState<string>(goal?.bank ?? "");
  const [notes, setNotes] = useState(goal?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(goal.targetAmount.toString());
      setSavedAmount(goal.savedAmount.toString());
      setContributionAmount(goal.contributionAmount.toString());
      setFrequency(goal.contributionFrequency);
      setBank(goal.bank ?? "");
      setNotes(goal.notes ?? "");
    }
  }, [goal]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedTarget = parseFloat(targetAmount.replace(",", "."));
    const parsedSaved = parseFloat(savedAmount.replace(",", "."));
    const parsedContrib = parseFloat(contributionAmount.replace(",", "."));

    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError("Valor alvo deve ser maior que zero");
      return;
    }
    if (isNaN(parsedSaved) || parsedSaved < 0) {
      setError("Valor poupado não pode ser negativo");
      return;
    }
    if (isNaN(parsedContrib) || parsedContrib <= 0) {
      setError("Aporte deve ser maior que zero");
      return;
    }

    setSaving(true);
    try {
      const url =
        mode === "create" ? "/api/patrimonio/goals" : `/api/patrimonio/goals/${goal!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: parsedTarget,
          savedAmount: parsedSaved,
          contributionAmount: parsedContrib,
          contributionFrequency: frequency,
          bank: bank || null,
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
            {mode === "create" ? "Nova Meta" : "Editar Meta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-name" className="text-axiom-muted text-sm">
              Nome
            </Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder="Ex: Casa própria"
            />
          </div>

          {/* Valor alvo */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-target" className="text-axiom-muted text-sm">
              Valor alvo
            </Label>
            <Input
              id="goal-target"
              type="number"
              min="0.01"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder="Quanto quer acumular"
            />
          </div>

          {/* Já poupado */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-saved" className="text-axiom-muted text-sm">
              Já poupado
            </Label>
            <Input
              id="goal-saved"
              type="number"
              min="0"
              step="0.01"
              value={savedAmount}
              onChange={(e) => setSavedAmount(e.target.value)}
              className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
              placeholder="Quanto já tem guardado para esta meta"
            />
          </div>

          {/* Aporte e Frequência — grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-contrib" className="text-axiom-muted text-sm">
                Aporte
              </Label>
              <Input
                id="goal-contrib"
                type="number"
                min="0.01"
                step="0.01"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary"
                placeholder="Valor"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-axiom-muted text-sm">Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency((v ?? "MONTHLY") as "DAILY" | "WEEKLY" | "MONTHLY")}>
                <SelectTrigger className="bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-axiom-card border-axiom-border">
                  <SelectItem value="DAILY" className="text-white hover:bg-axiom-hover focus:bg-axiom-hover">
                    Diário
                  </SelectItem>
                  <SelectItem value="WEEKLY" className="text-white hover:bg-axiom-hover focus:bg-axiom-hover">
                    Semanal
                  </SelectItem>
                  <SelectItem value="MONTHLY" className="text-white hover:bg-axiom-hover focus:bg-axiom-hover">
                    Mensal
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Banco */}
          <div className="space-y-1.5">
            <Label className="text-axiom-muted text-sm">
              Banco / Onde está guardado{" "}
              <span className="text-axiom-muted/60">(opcional)</span>
            </Label>
            <Select value={bank} onValueChange={(v) => setBank(v ?? "")}>
              <SelectTrigger className="w-full bg-axiom-hover border-axiom-border text-white focus:border-axiom-primary">
                <SelectValue placeholder="Selecionar banco e produto..." />
              </SelectTrigger>
              <SelectContent className="bg-axiom-card border-axiom-border max-h-72">
                {getBankGroups().map((group, gi) => (
                  <SelectGroup key={group.bankName}>
                    {gi > 0 && <SelectSeparator />}
                    <SelectLabel className="text-axiom-muted/70 text-[10px] uppercase tracking-wider px-2 pt-1">
                      {group.bankName}
                    </SelectLabel>
                    {group.products.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className="text-white hover:bg-axiom-hover focus:bg-axiom-hover pl-4"
                      >
                        <span className="text-sm">{p.productName}</span>
                        {p.cdiPct > 0 ? (
                          <span className="text-axiom-primary text-xs font-semibold ml-2">
                            {p.cdiPct}% CDI
                          </span>
                        ) : (
                          <span className="text-axiom-muted/50 text-xs ml-2">sem rendimento</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <Label htmlFor="goal-notes" className="text-axiom-muted text-sm">
              Notas <span className="text-axiom-muted/60">(opcional)</span>
            </Label>
            <textarea
              id="goal-notes"
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
              {saving ? "Salvando..." : mode === "create" ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
