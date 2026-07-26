"use client";

import MetricStat from "@/components/ui/MetricStat";
import { apiFetch } from "@/lib/browser-store";
import { useCampaigns } from "@/lib/campaign-context";
import { formatCompact, formatMoney, type Campaign } from "@/lib/types";
import { useEffect, useState } from "react";

const PERIODS = [
  { label: "Last 7 days", param: "7d" },
  { label: "Last 30 days", param: "30d" },
  { label: "Lifetime", param: "max" },
] as const;

interface Overview {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
}

export default function OverviewStats({ campaigns }: { campaigns: Campaign[] }) {
  const { connection } = useCampaigns();
  const isLive = connection.mode === "live";
  const accountId = connection.account?.id;

  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[1]);
  const [cache, setCache] = useState<Record<string, Overview>>({});
  const [errorFor, setErrorFor] = useState<{ key: string; message: string } | null>(
    null
  );

  const cacheKey = `${accountId ?? "demo"}:${period.param}`;
  const live = cache[cacheKey];
  const error = errorFor?.key === cacheKey ? errorFor.message : null;

  useEffect(() => {
    if (!isLive || cache[cacheKey]) return;
    let cancelled = false;
    apiFetch(`/api/meta/overview?period=${period.param}&account=${accountId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load stats");
        if (!cancelled) setCache((prev) => ({ ...prev, [cacheKey]: json }));
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorFor({
            key: cacheKey,
            message: err instanceof Error ? err.message : "Failed to load stats",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLive, cacheKey, period.param, accountId, cache]);

  // Demo fallback: derive plausible numbers from the mock ads.
  const demoFactor =
    period.param === "7d" ? 0.18 : period.param === "30d" ? 0.62 : 1;
  const ads = campaigns.flatMap((c) => c.ads);
  const demo: Overview = (() => {
    const impressions =
      ads.reduce((s, a) => s + a.insights.impressions, 0) * demoFactor;
    const clicks = ads.reduce((s, a) => s + a.insights.clicks, 0) * demoFactor;
    const spend = ads.reduce((s, a) => s + a.insights.spend, 0) * demoFactor;
    return {
      impressions,
      clicks,
      spend,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    };
  })();

  const stats = isLive ? live : demo;
  const loading = isLive && !live && !error;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-muted">
          Account overview
          {isLive && (
            <span className="ml-2 font-normal">— live from Meta</span>
          )}
        </h2>
        <div className="flex rounded-lg border border-line p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.param}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                p.param === period.param
                  ? "bg-brand-soft text-brand"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Couldn&apos;t load account stats: {error}
        </p>
      ) : loading || !stats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricStat
            label="Total spend"
            value={formatMoney(Math.round(stats.spend * 100) / 100)}
          />
          <MetricStat
            label="Impressions"
            value={formatCompact(Math.round(stats.impressions))}
          />
          <MetricStat
            label="Clicks"
            value={formatCompact(Math.round(stats.clicks))}
            sub={stats.cpc > 0 ? `${formatMoney(Number(stats.cpc.toFixed(2)))} avg. CPC` : undefined}
          />
          <MetricStat label="CTR" value={`${stats.ctr.toFixed(2)}%`} />
        </div>
      )}
    </section>
  );
}
