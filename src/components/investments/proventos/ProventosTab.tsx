"use client";

import { useEffect, useState } from "react";
import type { ProventosData } from "./types";
import { ProventosKPIs } from "./ProventosKPIs";
import { ProventosChart } from "./ProventosChart";
import { ProventosTable } from "./ProventosTable";

interface ProventosTabProps {
  currency: string;
  locale: string;
}

export function ProventosTab({ currency, locale }: ProventosTabProps) {
  const [data, setData] = useState<ProventosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/investments/proventos")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <ProventosKPIs data={data} loading={loading} currency={currency} locale={locale} />
      <ProventosChart
        monthly={data?.monthly ?? []}
        byCategory={data?.byCategory ?? []}
        loading={loading}
        currency={currency}
        locale={locale}
      />
      <ProventosTable
        assets={data?.assets ?? []}
        loading={loading}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}
