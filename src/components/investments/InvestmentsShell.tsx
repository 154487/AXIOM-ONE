"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioSummaryCards } from "./portfolio/PortfolioSummaryCards";
import { PortfolioDonut } from "./portfolio/PortfolioDonut";
import { AssetList } from "./portfolio/AssetList";
import { EntryList } from "./entries/EntryList";
import type { AssetPosition } from "@/app/api/investments/portfolio/route";
import type { AssetType } from "@/generated/prisma/client";

interface PortfolioData {
  assets: AssetPosition[];
  totals: {
    totalInvested: number;
    totalCurrentValue: number;
    totalPnl: number;
    totalPnlPct: number;
  };
  allocationByType: Partial<Record<AssetType, number>>;
}

interface AssetRaw {
  id: string;
  name: string;
  ticker: string | null;
  type: AssetType;
  currency: string;
  currentPrice: number | null;
  createdAt: string;
}

interface InvestmentsShellProps {
  initialCurrency: string;
  initialLocale: string;
}

export function InvestmentsShell({ initialCurrency, initialLocale }: InvestmentsShellProps) {
  const t = useTranslations("Investments");
  const [activeTab, setActiveTab] = useState<"portfolio" | "entries">("portfolio");
  const [portfolioKey, setPortfolioKey] = useState(0);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [assets, setAssets] = useState<AssetRaw[]>([]);

  const triggerPortfolioRefresh = useCallback(() => setPortfolioKey((k) => k + 1), []);

  const fetchPortfolio = useCallback(async () => {
    setPortfolioLoading(true);
    try {
      const [portfolioRes, assetsRes] = await Promise.all([
        fetch("/api/investments/portfolio"),
        fetch("/api/investments/assets"),
      ]);
      const [portfolio, assetsList] = await Promise.all([portfolioRes.json(), assetsRes.json()]);
      setPortfolioData(portfolio);
      setAssets(assetsList);
    } catch {
      // silent fail
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio, portfolioKey]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-white">{t("title")}</h1>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "portfolio" | "entries")}>
        <TabsList className="bg-axiom-card border border-axiom-border">
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-axiom-primary data-[state=active]:text-white">
            {t("tabs.portfolio")}
          </TabsTrigger>
          <TabsTrigger value="entries" className="data-[state=active]:bg-axiom-primary data-[state=active]:text-white">
            {t("tabs.entries")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-6 flex flex-col gap-6">
          <PortfolioSummaryCards
            totals={portfolioData?.totals ?? null}
            loading={portfolioLoading}
            currency={initialCurrency}
            locale={initialLocale}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <PortfolioDonut
                allocationByType={portfolioData?.allocationByType ?? {}}
                loading={portfolioLoading}
              />
            </div>
            <div className="lg:col-span-2">
              <AssetList
                positions={portfolioData?.assets ?? []}
                assets={assets}
                loading={portfolioLoading}
                currency={initialCurrency}
                locale={initialLocale}
                onRefresh={triggerPortfolioRefresh}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="entries" className="mt-6">
          <EntryList
            assets={assets}
            currency={initialCurrency}
            locale={initialLocale}
            onEntryCreated={triggerPortfolioRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
