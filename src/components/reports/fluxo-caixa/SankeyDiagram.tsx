"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CashflowData } from "../types";

// Cores por papel do nó
const COLOR_INCOME  = "#10B981"; // verde — fontes de receita
const COLOR_MIDDLE  = "#FF6B35"; // laranja — nó "Disponível"
const COLOR_EXPENSE = "#EF4444"; // vermelho — despesas
const COLOR_SAVINGS = "#3B82F6"; // azul — poupança

// Espessura mínima de um fluxo em relação ao maior (4%)
const MIN_FLOW_RATIO = 0.04;

interface SankeyDiagramProps {
  cashflowData: CashflowData;
}

export function SankeyDiagram({ cashflowData }: SankeyDiagramProps) {
  const t = useTranslations("Reports");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  const { sankeyNodes, sankeyLinks } = cashflowData;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    if (sankeyNodes.length === 0 || sankeyLinks.length === 0) return;

    Promise.all([
      import("chart.js").then((m) => m.Chart),
      import("chartjs-chart-sankey").then((m) => m.SankeyController),
      import("chartjs-chart-sankey").then((m) => m.Flow),
    ]).then(([ChartJS, SankeyController, Flow]) => {
      ChartJS.register(SankeyController, Flow);

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;

      const labelMap = Object.fromEntries(sankeyNodes.map((n) => [n.id, n.label]));

      // Garante espessura mínima para fluxos pequenos (evita linhas invisíveis)
      const maxFlow = Math.max(...sankeyLinks.map((l) => l.value), 1);
      const minFlow = maxFlow * MIN_FLOW_RATIO;
      const normalizedData = sankeyLinks.map((l) => ({
        from: l.from,
        to: l.to,
        flow: Math.max(l.value, minFlow),
      }));

      chartRef.current = new ChartJS(ctx, {
        type: "sankey" as const,
        data: {
          datasets: [
            {
              label: t("sankey"),
              data: normalizedData,
              // Cor da borda esquerda do fluxo (fonte)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              colorFrom: (c: any) => {
                const flow = c.dataset.data[c.dataIndex];
                if (!flow) return COLOR_MIDDLE;
                if (flow.from === "disponivel") return COLOR_MIDDLE;
                return COLOR_INCOME;
              },
              // Cor da borda direita do fluxo (destino)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              colorTo: (c: any) => {
                const flow = c.dataset.data[c.dataIndex];
                if (!flow) return COLOR_MIDDLE;
                if (flow.to === "disponivel") return COLOR_MIDDLE;
                if (flow.to === "poupanca") return COLOR_SAVINGS;
                return COLOR_EXPENSE;
              },
              colorMode: "gradient",
              labels: labelMap,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          // Cor global — controla o texto das labels dos nós
          color: "#ffffff",
          animation: { duration: 800 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#0D1B2A",
              borderColor: "#1E2D42",
              borderWidth: 1,
              titleColor: "#ffffff",
              bodyColor: "#AAB2BD",
              padding: 12,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              callbacks: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                label: (ctx: any) => {
                  const raw = ctx.dataset.data[ctx.dataIndex];
                  const labels = ctx.dataset.labels ?? {};
                  const fromLabel = labels[raw?.from] ?? raw?.from ?? "";
                  const toLabel   = labels[raw?.to]   ?? raw?.to   ?? "";
                  // Mostrar valor real (não normalizado)
                  const orig = sankeyLinks.find(
                    (l) => l.from === raw?.from && l.to === raw?.to
                  );
                  const val = orig?.value ?? 0;
                  return `  ${fromLabel} → ${toLabel}: ${val.toLocaleString("pt-BR", {
                    style: "decimal",
                    maximumFractionDigits: 0,
                  })}`;
                },
              },
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [mounted, cashflowData, sankeyLinks, t]);

  const hasData = sankeyNodes.length > 0 && sankeyLinks.length > 0;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 flex flex-col" style={{ minHeight: 320 }}>
      <h3 className="text-white font-semibold mb-4">{t("sankey")}</h3>
      <div className="flex-1" style={{ minHeight: 260 }}>
        {!hasData ? (
          <div className="flex items-center justify-center h-full text-axiom-muted text-sm">
            {t("noData")}
          </div>
        ) : mounted ? (
          <canvas ref={canvasRef} />
        ) : (
          <div className="w-full h-full rounded-lg bg-axiom-hover animate-pulse" />
        )}
      </div>
    </div>
  );
}
