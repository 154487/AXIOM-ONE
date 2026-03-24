"use client";

import { formatCurrency } from "@/lib/utils";

interface CoastFireCardProps {
  coastFireNumber: number;
  firePatrimony: number;
  fiNumber: number;
  retirementYears: number;
  cdiAnual?: number | null;
  targetMonthlyContrib?: number | null;
  ipcaAnual?: number | null;
  currency: string;
  locale: string;
}

function monthsToTarget(
  current: number,
  target: number,
  monthlyContrib: number,
  annualRate: number
): number | null {
  if (current >= target) return 0;
  if (monthlyContrib <= 0 && annualRate <= 0) return null;
  const r = (1 + annualRate) ** (1 / 12) - 1;
  let p = current;
  for (let m = 1; m <= 600; m++) {
    p = p * (1 + r) + monthlyContrib;
    if (p >= target) return m;
  }
  return null;
}

export function CoastFireCard({
  coastFireNumber,
  firePatrimony,
  fiNumber,
  retirementYears,
  cdiAnual,
  targetMonthlyContrib,
  ipcaAnual,
  currency,
  locale,
}: CoastFireCardProps) {
  const fmt = (v: number) => formatCurrency(v, locale, currency);
  const coastProgress =
    coastFireNumber > 0 ? Math.min(100, (firePatrimony / coastFireNumber) * 100) : 0;
  const hasReachedCoast = firePatrimony >= coastFireNumber;

  const coastRate = cdiAnual != null && cdiAnual > 0 ? cdiAnual / 100 : 0.08;
  const futureValueNoContrib = firePatrimony * Math.pow(1 + coastRate, retirementYears);
  const faltaParaCoast = Math.max(0, coastFireNumber - firePatrimony);

  // — Tempo até Coast FIRE —
  const monthsToCoast =
    targetMonthlyContrib && targetMonthlyContrib > 0
      ? monthsToTarget(firePatrimony, coastFireNumber, targetMonthlyContrib, coastRate)
      : null;
  const currentYear = new Date().getFullYear();
  const coastYear =
    monthsToCoast !== null && monthsToCoast !== undefined
      ? currentYear + Math.ceil(monthsToCoast / 12)
      : null;

  // — Impacto da inflação —
  const ipca = ipcaAnual != null && ipcaAnual > 0 ? ipcaAnual / 100 : 0.045;
  const fiInflated = fiNumber * Math.pow(1 + ipca, retirementYears);

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-6 flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-white">Coast FIRE</h3>
        <p className="text-xs text-axiom-muted mt-0.5">
          O ponto onde você pode parar de aportar e ainda chegar à independência em {retirementYears} anos
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-axiom-muted">Progresso Coast FIRE</span>
          <span className="text-xs font-semibold text-white">{coastProgress.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-axiom-hover rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              hasReachedCoast ? "bg-axiom-income" : "bg-blue-500"
            }`}
            style={{ width: `${coastProgress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-axiom-muted">
          <span>{fmt(firePatrimony)}</span>
          <span>{fmt(coastFireNumber)}</span>
        </div>
      </div>

      {/* Mensagem condicional */}
      {hasReachedCoast ? (
        <div className="bg-axiom-income/10 border border-axiom-income/30 rounded-lg p-3">
          <p className="text-sm font-semibold text-axiom-income">
            🎉 Você já pode parar de aportar!
          </p>
          <p className="text-xs text-axiom-muted mt-1">
            Com o patrimônio atual e sem novos aportes, você chegará à Meta Investida em ~{retirementYears} anos.
            Continue aportando para chegar mais rápido.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-axiom-hover/60 rounded-lg p-2.5">
              <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Coast FIRE Number</p>
              <p className="text-sm font-bold text-white mt-0.5">{fmt(coastFireNumber)}</p>
            </div>
            <div className="bg-axiom-hover/60 rounded-lg p-2.5">
              <p className="text-[11px] text-axiom-muted uppercase tracking-wide">Falta para Coastar</p>
              <p className="text-sm font-bold text-white mt-0.5">{fmt(faltaParaCoast)}</p>
            </div>
          </div>
          <p className="text-xs text-axiom-muted">
            Em {retirementYears} anos sem aportes, o patrimônio atual cresceria para{" "}
            <span className="text-white font-medium">{fmt(futureValueNoContrib)}</span>{" "}
            {futureValueNoContrib >= fiNumber ? "(≥ Meta ✓)" : `(Meta: ${fmt(fiNumber)})`}
          </p>
        </div>
      )}

      <div className="h-px bg-axiom-border" />

      {/* Tempo até Coast FIRE */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-axiom-muted uppercase tracking-wide">Tempo até Coast FIRE</p>
        {monthsToCoast === null || monthsToCoast === undefined ? (
          <p className="text-sm text-axiom-muted">
            Defina seu aporte em{" "}
            <span className="text-axiom-primary">Configurações do Plano</span>
          </p>
        ) : monthsToCoast === 0 ? (
          <p className="text-base font-bold text-axiom-income">Já atingido 🎉</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-bold text-white">
                {monthsToCoast < 12
                  ? `${monthsToCoast} meses`
                  : `${Math.ceil(monthsToCoast / 12)} anos`}
              </p>
              {coastYear && (
                <p className="text-xs text-axiom-muted">previsão {coastYear}</p>
              )}
            </div>
            <p className="text-xs text-axiom-muted">
              Aportando {fmt(targetMonthlyContrib ?? 0)}/mês a {(coastRate * 100).toFixed(1)}% a.a.{cdiAnual ? " (CDI)" : ""}
            </p>
          </>
        )}
      </div>

      <div className="h-px bg-axiom-border" />

      {/* Impacto da inflação */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-axiom-muted uppercase tracking-wide">Sua meta corrigida pela inflação</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-white">{fmt(fiInflated)}</p>
          <p className="text-xs text-axiom-muted">em {retirementYears} anos</p>
        </div>
        <p className="text-xs text-axiom-muted">
          {fmt(fiNumber)} hoje → {fmt(fiInflated)} em {currentYear + retirementYears}
          {" · "}IPCA {(ipca * 100).toFixed(1)}%{ipcaAnual ? " (real)" : " (est.)"}
        </p>
      </div>
    </div>
  );
}
