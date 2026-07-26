"use client";

import AdPreview from "@/components/ads/AdPreview";
import StatusPill from "@/components/ui/StatusPill";
import Toggle from "@/components/ui/Toggle";
import { rebalanceShares } from "@/lib/budget";
import { useCampaigns } from "@/lib/campaign-context";
import {
  CTA_OPTIONS,
  formatCompact,
  formatDateRange,
  formatMoney,
} from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft";

export default function AdDetailPage() {
  const { id, adId } = useParams<{ id: string; adId: string }>();
  const {
    getCampaign,
    updateAd,
    updateCampaign,
    toggleAdStatus,
    syncBudgetShares,
  } = useCampaigns();

  const campaign = getCampaign(id);
  const ad = campaign?.ads.find((a) => a.id === adId);

  if (!campaign || !ad) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold">Ad not found</p>
        <Link href="/ads-manager" className="mt-2 inline-block text-sm font-semibold text-brand">
          ← Back to Ads Manager
        </Link>
      </div>
    );
  }

  const setCreative = (patch: Partial<typeof ad.creative>) =>
    updateAd(campaign.id, ad.id, { creative: { ...ad.creative, ...patch } });

  const setShare = (value: number) => {
    const index = campaign.ads.findIndex((a) => a.id === ad.id);
    const shares = rebalanceShares(
      campaign.ads.map((a) => a.budget_share),
      index,
      value
    );
    updateCampaign(campaign.id, {
      ads: campaign.ads.map((a, i) => ({ ...a, budget_share: shares[i] })),
    });
  };

  const ctr =
    ad.insights.impressions > 0
      ? ((ad.insights.clicks / ad.insights.impressions) * 100).toFixed(2)
      : "0.00";
  const costPerResult =
    ad.insights.results > 0 ? ad.insights.spend / ad.insights.results : 0;

  return (
    <div className="space-y-6">
      <Link
        href={`/ads-manager/campaigns/${campaign.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft className="size-4" />
        {campaign.name}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">
              {ad.name}
            </h1>
            <StatusPill status={ad.status} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Runs{" "}
            {formatDateRange(
              ad.start_date ?? campaign.start_date,
              ad.end_date ?? campaign.end_date
            )}
          </p>
        </div>
        <label className="flex items-center gap-2.5">
          <span className="text-sm font-semibold">
            {ad.status === "ACTIVE" ? "Running" : "Paused"}
          </span>
          <Toggle
            checked={ad.status === "ACTIVE"}
            disabled={ad.status === "ENDED"}
            onChange={() => toggleAdStatus(campaign.id, ad.id)}
            label="Ad status"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-6">
          <AdPreview creative={ad.creative} />
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-white p-6">
            <h2 className="mb-4 font-bold">
              Edit ad
              {campaign.is_live && (
                <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold text-[#93700a]">
                  Text edits not yet synced to Meta
                </span>
              )}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-muted">
                  Primary text
                </label>
                <textarea
                  rows={3}
                  value={ad.creative.primary_text}
                  onChange={(e) => setCreative({ primary_text: e.target.value })}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-muted">
                    Headline
                  </label>
                  <input
                    value={ad.creative.headline}
                    onChange={(e) => setCreative({ headline: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-muted">
                    Button
                  </label>
                  <select
                    value={ad.creative.cta}
                    onChange={(e) => setCreative({ cta: e.target.value })}
                    className={`${inputCls} cursor-pointer`}
                  >
                    {CTA_OPTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-muted">
                  Budget share
                  <span className="text-sm font-bold text-ink">
                    {Math.round(ad.budget_share * 100)}% ·{" "}
                    {formatMoney(Math.round(ad.budget_share * campaign.daily_budget))}/day
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={Math.round(ad.budget_share * 100)}
                  disabled={campaign.ab_test || campaign.ads.length < 2}
                  onChange={(e) => setShare(Number(e.target.value) / 100)}
                  onPointerUp={() => syncBudgetShares(campaign.id)}
                  onKeyUp={() => syncBudgetShares(campaign.id)}
                  className="w-full accent-brand disabled:opacity-40"
                />
                {campaign.ab_test && (
                  <p className="mt-1 text-xs text-ink-muted">
                    Locked to an equal split while A/B testing.
                  </p>
                )}
                {campaign.is_live && !campaign.ab_test && campaign.ads.length > 1 && (
                  <p className="mt-1 text-xs text-ink-muted">
                    Changes sync to your Meta ad set budgets.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white p-6">
            <h2 className="mb-4 font-bold">Performance</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-muted">Spend</p>
                <p className="text-lg font-bold">{formatMoney(ad.insights.spend)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Impressions</p>
                <p className="text-lg font-bold">
                  {formatCompact(ad.insights.impressions)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Clicks</p>
                <p className="text-lg font-bold">{formatCompact(ad.insights.clicks)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">CTR</p>
                <p className="text-lg font-bold">{ctr}%</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">CPC</p>
                <p className="text-lg font-bold">
                  {ad.insights.clicks > 0
                    ? formatMoney(
                        Number((ad.insights.spend / ad.insights.clicks).toFixed(2))
                      )
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Results</p>
                <p className="text-lg font-bold text-brand">
                  {formatCompact(ad.insights.results)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Cost / result</p>
                <p className="text-lg font-bold">
                  {costPerResult > 0
                    ? formatMoney(Number(costPerResult.toFixed(2)))
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
