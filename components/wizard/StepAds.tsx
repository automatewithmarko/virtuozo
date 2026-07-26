"use client";

import AdEditorCard, { emptyAdDraft } from "@/components/ads/AdEditorCard";
import Toggle from "@/components/ui/Toggle";
import { equalShares, rebalanceShares } from "@/lib/budget";
import {
  MIN_DAILY_BUDGET_CONVERSIONS,
  MIN_DAILY_BUDGET_IMPRESSIONS,
} from "@/lib/meta-mapping";
import { formatMoney } from "@/lib/types";
import { AlertTriangle, FlaskConical, Plus } from "lucide-react";
import { ALLOCATION_COLORS } from "@/components/campaigns/BudgetAllocationBar";
import type { WizardDraft } from "./wizard-types";

const VARIANT_LETTERS = "ABCDEF";
const MAX_ADS = 6;

interface Props {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
}

export default function StepAds({ draft, onChange }: Props) {
  const { ads, ab_test, daily_budget } = draft;

  // Each ad carries its own budget on Meta (one ad set per ad), so every
  // share has to clear Meta's per-ad-set daily minimums.
  const lowestAllocation = Math.min(...ads.map((a) => a.budget_share * daily_budget));
  const belowHardMinimum = lowestAllocation < MIN_DAILY_BUDGET_IMPRESSIONS;
  const belowRecommended = lowestAllocation < MIN_DAILY_BUDGET_CONVERSIONS;

  const addAd = () => {
    if (ads.length >= MAX_ADS) return;
    const next = [...ads, emptyAdDraft(`draft-${ads.length + 1}`, ads.length + 1)];
    const shares = equalShares(next.length);
    onChange({ ads: next.map((a, i) => ({ ...a, budget_share: shares[i] })) });
  };

  const removeAd = (index: number) => {
    const next = ads.filter((_, i) => i !== index);
    const shares = equalShares(next.length);
    onChange({ ads: next.map((a, i) => ({ ...a, budget_share: shares[i] })) });
  };

  const setShare = (index: number, value: number) => {
    const shares = rebalanceShares(
      ads.map((a) => a.budget_share),
      index,
      value
    );
    onChange({ ads: ads.map((a, i) => ({ ...a, budget_share: shares[i] })) });
  };

  const setAbTest = (on: boolean) => {
    const shares = equalShares(ads.length);
    onChange({
      ab_test: on,
      ads: on ? ads.map((a, i) => ({ ...a, budget_share: shares[i] })) : ads,
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-center text-2xl font-extrabold tracking-tight">
        Create your ads
      </h1>
      <p className="mt-2 text-center text-ink-muted">
        Add one ad — or a few variations. No ad sets, no spreadsheets.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ads.map((ad, i) => (
          <AdEditorCard
            key={ad.id}
            draft={ad}
            variantLabel={ab_test ? VARIANT_LETTERS[i] : undefined}
            onChange={(patch) =>
              onChange({
                ads: ads.map((a, j) => (j === i ? { ...a, ...patch } : a)),
              })
            }
            onRemove={ads.length > 1 ? () => removeAd(i) : undefined}
          />
        ))}
        {ads.length < MAX_ADS && (
          <button
            type="button"
            onClick={addAd}
            className="flex min-h-72 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-ink-muted transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
          >
            <Plus className="size-7" />
            <span className="font-semibold">Add another ad</span>
          </button>
        )}
      </div>

      <div className="mt-8 space-y-5 rounded-xl border border-line bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">
              Daily campaign budget
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-ink-muted">$</span>
              <input
                type="number"
                min={1}
                value={daily_budget}
                onChange={(e) =>
                  onChange({ daily_budget: Math.max(1, Number(e.target.value)) })
                }
                className="w-28 rounded-lg border border-line bg-white px-3 py-2 text-lg font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
              <span className="text-sm text-ink-muted">/day</span>
            </div>
          </div>

          {ads.length > 1 && (
            <label className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft px-4 py-3">
              <FlaskConical className="size-5 text-brand" />
              <span>
                <span className="block text-sm font-semibold">A/B test these ads</span>
                <span className="block text-xs text-ink-muted">
                  Equal budgets — we&apos;ll show you the winner.
                </span>
              </span>
              <Toggle checked={ab_test} onChange={setAbTest} label="A/B test" />
            </label>
          )}
        </div>

        {belowHardMinimum ? (
          <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            <AlertTriangle className="size-3.5 shrink-0" />
            At this split, an ad would get less than{" "}
            {formatMoney(MIN_DAILY_BUDGET_IMPRESSIONS)}/day — below Meta&apos;s
            minimum ad budget. Raise the budget or remove an ad.
          </p>
        ) : belowRecommended ? (
          <p className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs font-medium text-[#93700a]">
            <AlertTriangle className="size-3.5 shrink-0" />
            Meta recommends at least {formatMoney(MIN_DAILY_BUDGET_CONVERSIONS)}
            /day per ad for sales, leads and conversion goals.
          </p>
        ) : null}

        {ads.length > 1 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-muted">
              Budget split
              {ab_test && (
                <span className="ml-2 font-normal">— locked to equal while A/B testing</span>
              )}
            </p>
            <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-surface">
              {ads.map((ad, i) => (
                <div
                  key={ad.id}
                  className="transition-[width]"
                  style={{
                    width: `${ad.budget_share * 100}%`,
                    background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
                  }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {ads.map((ad, i) => (
                <div key={ad.id} className="flex items-center gap-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                  />
                  <span className="w-28 truncate text-sm font-medium">{ad.name}</span>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={Math.round(ad.budget_share * 100)}
                    disabled={ab_test}
                    onChange={(e) => setShare(i, Number(e.target.value) / 100)}
                    className="flex-1 accent-brand disabled:opacity-40"
                    aria-label={`Budget share for ${ad.name}`}
                  />
                  <span className="w-28 shrink-0 text-right text-sm font-bold">
                    {Math.round(ad.budget_share * 100)}% ·{" "}
                    {formatMoney(Math.round(ad.budget_share * daily_budget))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
