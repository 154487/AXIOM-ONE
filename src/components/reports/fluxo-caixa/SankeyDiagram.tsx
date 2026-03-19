"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CashflowData } from "../types";

interface SankeyDiagramProps {
  cashflowData: CashflowData;
}

export function SankeyDiagram({ cashflowData }: SankeyDiagramProps) {
  const t = useTranslations("Reports");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const { sankeyNodes, sankeyLinks } = cashflowData;
    if (sankeyNodes.length === 0 || sankeyLinks.length === 0) return;

    // Lazy import para evitar SSR issues
    Promise.all([
      import("chart.js").then((m) => m.Chart),
      import("chartjs-chart-sankey").then((m) => m.SankeyController),
      import("chartjs-chart-sankey").then((m) => m.Flow),
    ]).then(([ChartJS, SankeyController, Flow]) => {
      ChartJS.register(SankeyController, Flow);

      // Destruir chart anterior se existir
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;

      const labelMap = Object.fromEntries(sankeyNodes.map((n) => [n.id, n.label]));

      chartRef.current = new ChartJS(ctx, {
        type: "sankey" as const,
        data: {
          datasets: [
            {
              label: t("sankey"),
              data: sankeyLinks.map((l) => ({
                from: l.from,
                to: l.to,
                flow: l.value,
              })),
              colorFrom: "#FF6B35",
              colorTo: "#10B981",
              colorMode: "gradient",
              labels: labelMap,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#152030",
              borderColor: "#1E2D42",
              borderWidth: 1,
              titleColor: "#AAB2BD",
              bodyColor: "#fff",
            },
          },
        },
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [mounted, cashflowData, t]);

  const { sankeyNodes, sankeyLinks } = cashflowData;
  const hasData = sankeyNodes.length > 0 && sankeyLinks.length > 0;

  return (
    <div className="bg-axiom-card border border-axiom-border rounded-xl p-5 h-full flex flex-col">
      <h3 className="text-white font-semibold mb-4">{t("sankey")}</h3>
      <div className="flex-1 min-h-0" style={{ minHeight: 220 }}>
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
