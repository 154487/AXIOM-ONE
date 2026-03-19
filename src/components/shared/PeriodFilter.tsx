"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

export type TipoFiltro = "dia" | "mes" | "ano" | "periodo";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentDate() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function getCurrentYear() {
  return String(new Date().getFullYear());
}

/** Converte tipo+valor+de+ate para um par de strings ISO (YYYY-MM-DD) */
function resolveISO(
  tipo: TipoFiltro,
  valor: string,
  de: string,
  ate: string
): { start: string; end: string } {
  const now = new Date();

  if (tipo === "dia") {
    const d = valor || getCurrentDate();
    return { start: d, end: d };
  }

  if (tipo === "ano") {
    const y = valor || getCurrentYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }

  if (tipo === "periodo") {
    return {
      start: de || getCurrentDate(),
      end: ate || getCurrentDate(),
    };
  }

  // mes (default)
  const m = valor || getCurrentMonth();
  const [year, month] = m.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${m}-01`,
    end: `${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

interface PeriodFilterProps {
  /** Se fornecido: modo callback (Reports). Sem ele: modo URL (Dashboard). */
  onChange?: (start: string, end: string) => void;
}

/**
 * Seletor de período compartilhado entre Dashboard (URL) e Reports (callback).
 * Dashboard: atualiza URL via router.push.
 * Reports: chama onChange(isoStart, isoEnd) com estado local.
 */
export function PeriodFilter({ onChange }: PeriodFilterProps) {
  const t = useTranslations("DashboardFilters");

  // --- Modo URL (Dashboard) ---
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Modo local (Reports) ---
  const [localTipo, setLocalTipo] = useState<TipoFiltro>("mes");
  const [localValor, setLocalValor] = useState(getCurrentMonth());
  const [localDe, setLocalDe] = useState(getCurrentDate());
  const [localAte, setLocalAte] = useState(getCurrentDate());

  const isCallback = !!onChange;

  const tipo = isCallback ? localTipo : ((searchParams.get("tipo") as TipoFiltro) ?? "mes");
  const valor = isCallback ? localValor : (searchParams.get("valor") ?? "");
  const de = isCallback ? localDe : (searchParams.get("de") ?? "");
  const ate = isCallback ? localAte : (searchParams.get("ate") ?? "");

  const pushURL = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) sp.set(k, v);
      });
      router.push(`/dashboard?${sp.toString()}`);
    },
    [router]
  );

  function applyCallback(
    nextTipo: TipoFiltro,
    nextValor: string,
    nextDe: string,
    nextAte: string
  ) {
    const { start, end } = resolveISO(nextTipo, nextValor, nextDe, nextAte);
    onChange!(start, end);
  }

  function handleTipo(next: TipoFiltro) {
    if (isCallback) {
      setLocalTipo(next);
      if (next === "mes") {
        setLocalValor(getCurrentMonth());
        applyCallback(next, getCurrentMonth(), localDe, localAte);
      } else if (next === "dia") {
        setLocalValor(getCurrentDate());
        applyCallback(next, getCurrentDate(), localDe, localAte);
      } else if (next === "ano") {
        setLocalValor(getCurrentYear());
        applyCallback(next, getCurrentYear(), localDe, localAte);
      } else {
        applyCallback(next, localValor, getCurrentDate(), getCurrentDate());
        setLocalDe(getCurrentDate());
        setLocalAte(getCurrentDate());
      }
    } else {
      if (next === "mes") pushURL({ tipo: next, valor: getCurrentMonth() });
      else if (next === "dia") pushURL({ tipo: next, valor: getCurrentDate() });
      else if (next === "ano") pushURL({ tipo: next, valor: getCurrentYear() });
      else pushURL({ tipo: next, de: getCurrentDate(), ate: getCurrentDate() });
    }
  }

  const inputClass =
    "bg-axiom-hover border border-axiom-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-axiom-primary";

  const TIPOS: { key: TipoFiltro; label: string }[] = [
    { key: "dia", label: t("day") },
    { key: "mes", label: t("month") },
    { key: "ano", label: t("year") },
    { key: "periodo", label: t("period") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Pills */}
      <div className="flex bg-axiom-hover rounded-lg p-1 gap-1">
        {TIPOS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTipo(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tipo === key
                ? "bg-axiom-primary text-white"
                : "text-axiom-muted hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mes */}
      {tipo === "mes" && (
        <input
          type="month"
          value={valor || getCurrentMonth()}
          onChange={(e) => {
            if (isCallback) {
              setLocalValor(e.target.value);
              applyCallback(localTipo, e.target.value, localDe, localAte);
            } else {
              pushURL({ tipo: "mes", valor: e.target.value });
            }
          }}
          className={inputClass}
        />
      )}

      {/* Dia */}
      {tipo === "dia" && (
        <input
          type="date"
          value={valor || getCurrentDate()}
          onChange={(e) => {
            if (isCallback) {
              setLocalValor(e.target.value);
              applyCallback(localTipo, e.target.value, localDe, localAte);
            } else {
              pushURL({ tipo: "dia", valor: e.target.value });
            }
          }}
          className={inputClass}
        />
      )}

      {/* Ano */}
      {tipo === "ano" && (
        <select
          value={valor || getCurrentYear()}
          onChange={(e) => {
            if (isCallback) {
              setLocalValor(e.target.value);
              applyCallback(localTipo, e.target.value, localDe, localAte);
            } else {
              pushURL({ tipo: "ano", valor: e.target.value });
            }
          }}
          className={inputClass}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const y = new Date().getFullYear() - i;
            return (
              <option key={y} value={String(y)}>
                {y}
              </option>
            );
          })}
        </select>
      )}

      {/* Período */}
      {tipo === "periodo" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={de || getCurrentDate()}
            onChange={(e) => {
              if (isCallback) {
                setLocalDe(e.target.value);
                applyCallback(localTipo, localValor, e.target.value, localAte);
              } else {
                pushURL({ tipo: "periodo", de: e.target.value, ate: ate || getCurrentDate() });
              }
            }}
            className={inputClass}
          />
          <span className="text-axiom-muted text-sm">{t("to")}</span>
          <input
            type="date"
            value={ate || getCurrentDate()}
            min={de || undefined}
            onChange={(e) => {
              if (isCallback) {
                setLocalAte(e.target.value);
                applyCallback(localTipo, localValor, localDe, e.target.value);
              } else {
                pushURL({ tipo: "periodo", de: de || getCurrentDate(), ate: e.target.value });
              }
            }}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
