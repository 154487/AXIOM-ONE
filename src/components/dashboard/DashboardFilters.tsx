"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
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

export function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("DashboardFilters");

  const tipo = (searchParams.get("tipo") as TipoFiltro) ?? "mes";
  const valor = searchParams.get("valor") ?? "";
  const de = searchParams.get("de") ?? "";
  const ate = searchParams.get("ate") ?? "";

  const push = useCallback(
    (params: Record<string, string>) => {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
      router.push(`/dashboard?${sp.toString()}`);
    },
    [router]
  );

  function handleTipo(next: TipoFiltro) {
    if (next === "mes") push({ tipo: next, valor: getCurrentMonth() });
    else if (next === "dia") push({ tipo: next, valor: getCurrentDate() });
    else if (next === "ano") push({ tipo: next, valor: getCurrentYear() });
    else push({ tipo: next, de: getCurrentDate(), ate: getCurrentDate() });
  }

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

      {/* Inputs por tipo */}
      {tipo === "mes" && (
        <input
          type="month"
          value={valor || getCurrentMonth()}
          onChange={(e) => push({ tipo: "mes", valor: e.target.value })}
          className="bg-axiom-hover border border-axiom-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-axiom-primary"
        />
      )}

      {tipo === "dia" && (
        <input
          type="date"
          value={valor || getCurrentDate()}
          onChange={(e) => push({ tipo: "dia", valor: e.target.value })}
          className="bg-axiom-hover border border-axiom-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-axiom-primary"
        />
      )}

      {tipo === "ano" && (
        <select
          value={valor || getCurrentYear()}
          onChange={(e) => push({ tipo: "ano", valor: e.target.value })}
          className="bg-axiom-hover border border-axiom-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-axiom-primary"
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

      {tipo === "periodo" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={de || getCurrentDate()}
            onChange={(e) => push({ tipo: "periodo", de: e.target.value, ate: ate || getCurrentDate() })}
            className="bg-axiom-hover border border-axiom-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-axiom-primary"
          />
          <span className="text-axiom-muted text-sm">{t("to")}</span>
          <input
            type="date"
            value={ate || getCurrentDate()}
            min={de || undefined}
            onChange={(e) => push({ tipo: "periodo", de: de || getCurrentDate(), ate: e.target.value })}
            className="bg-axiom-hover border border-axiom-border text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-axiom-primary"
          />
        </div>
      )}
    </div>
  );
}
