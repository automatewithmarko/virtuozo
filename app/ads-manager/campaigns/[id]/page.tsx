"use client";

import AdCard from "@/components/ads/AdCard";
import AdEditorCard, {
  emptyAdDraft,
  type AdDraft,
} from "@/components/ads/AdEditorCard";
import BudgetAllocationBar from "@/components/campaigns/BudgetAllocationBar";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import StatusPill from "@/components/ui/StatusPill";
import Toggle from "@/components/ui/Toggle";
import { useCampaigns } from "@/lib/campaign-context";
import { equalShares } from "@/lib/budget";
import {
  OBJECTIVE_LABELS,
  audienceSummary,
  formatDateRange,
  formatMoney,
  type Ad,
} from "@/lib/types";
import { ArrowLeft, FlaskConical, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getCampaign, updateCampaign, toggleCampaignStatus, addAdsToCampaign } =
    useCampaigns();
  const campaign = getCampaign(id);

  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<AdDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!campaign) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold">Campaign not found</p>
        <Link href="/ads-manager" className="mt-2 inline-block text-sm font-semibold text-brand">
          ← Back to Ads Manager
        </Link>
      </div>
    );
  }

  // "Winner so far" = most results per dollar among active ads.
  const winnerId =
    campaign.ab_test && campaign.ads.length > 1
      ? [...campaign.ads]
          .filter((a) => a.insights.spend > 0)
          .sort(
            (a, b) =>
              b.insights.results / b.insights.spend -
              a.insights.results / a.insights.spend
          )[0]?.id
      : undefined;

  const openAddAd = () => {
    setDraft(emptyAdDraft(`${campaign.id}-a${campaign.ads.length + 1}`, campaign.ads.length + 1));
    setAddOpen(true);
  };

  const saveNewAd = async () => {
    if (!draft || !draft.image_url || saving) return;
    const shares = campaign.ab_test
      ? equalShares(campaign.ads.length + 1)
      : (() => {
          const newShare = 1 / (campaign.ads.length + 1);
          return [
            ...campaign.ads.map((a) => a.budget_share * (1 - newShare)),
            newShare,
          ];
        })();

    const newAd: Ad = {
      id: draft.id,
      name: draft.name,
      status: campaign.is_live ? "PAUSED" : "ACTIVE",
      budget_share: shares[shares.length - 1],
      creative: {
        image_url: draft.image_url,
        primary_text: draft.primary_text,
        headline: draft.headline,
        cta: draft.cta,
      },
      insights: { impressions: 0, clicks: 0, spend: 0, results: 0 },
    };

    setSaving(true);
    setSaveError(null);
    try {
      await addAdsToCampaign(campaign, [newAd], shares.slice(0, -1));
      setAddOpen(false);
      setDraft(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setSaving(false);
    }
  };

  const setAbTest = (on: boolean) => {
    updateCampaign(campaign.id, {
      ab_test: on,
      ads: on
        ? campaign.ads.map((a) => ({
            ...a,
            budget_share: 1 / campaign.ads.length,
          }))
        : campaign.ads,
    });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/ads-manager"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft className="size-4" />
        All campaigns
      </Link>

      <div className="rounded-xl border border-line bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">
                {campaign.name}
              </h1>
              <StatusPill status={campaign.status} />
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {OBJECTIVE_LABELS[campaign.objective]} ·{" "}
              {formatMoney(campaign.daily_budget)}/day ·{" "}
              {formatDateRange(campaign.start_date, campaign.end_date)}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-sm text-ink-muted">
              <Users className="size-3.5" />
              {audienceSummary(campaign.audience)}
              <button type="button" className="ml-1 font-semibold text-brand cursor-pointer hover:underline">
                Edit
              </button>
            </p>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <FlaskConical className="size-4 text-brand" />
                A/B test
              </span>
              <Toggle
                checked={campaign.ab_test}
                onChange={setAbTest}
                disabled={campaign.status === "ENDED"}
                label="A/B test"
              />
            </label>
            <label className="flex items-center gap-2.5">
              <span className="text-sm font-semibold">
                {campaign.status === "ACTIVE" ? "Running" : "Paused"}
              </span>
              <Toggle
                checked={campaign.status === "ACTIVE"}
                disabled={campaign.status === "ENDED"}
                onChange={() => toggleCampaignStatus(campaign.id)}
                label="Campaign status"
              />
            </label>
          </div>
        </div>

        {campaign.ads.length > 1 && (
          <div className="mt-5 border-t border-line pt-5">
            <p className="mb-2 text-sm font-semibold text-ink-muted">
              Budget allocation
              {campaign.ab_test && (
                <span className="ml-2 font-normal">
                  — equal split while A/B testing
                </span>
              )}
            </p>
            <BudgetAllocationBar ads={campaign.ads} dailyBudget={campaign.daily_budget} />
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-ink-muted">
          Ads in this campaign ({campaign.ads.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaign.ads.map((ad, i) => (
            <AdCard
              key={ad.id}
              campaign={campaign}
              ad={ad}
              index={i}
              isWinner={ad.id === winnerId}
            />
          ))}
          <button
            type="button"
            onClick={openAddAd}
            className="flex min-h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-ink-muted transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
          >
            <Plus className="size-7" />
            <span className="font-semibold">Add ad</span>
          </button>
        </div>
      </section>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add an ad to this campaign"
        footer={
          <>
            {saveError && (
              <span className="mr-auto max-w-56 truncate self-center text-xs font-semibold text-red-600" title={saveError}>
                {saveError}
              </span>
            )}
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveNewAd} disabled={!draft?.image_url || saving}>
              {saving
                ? "Publishing…"
                : campaign.is_live
                  ? "Add to Meta (paused)"
                  : "Add ad"}
            </Button>
          </>
        }
      >
        {draft && (
          <AdEditorCard
            draft={draft}
            onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          />
        )}
        <p className="mt-3 text-xs text-ink-muted">
          Budget will be rebalanced automatically across all ads
          {campaign.ab_test ? " (equal split — A/B test is on)." : "."}
        </p>
      </Modal>
    </div>
  );
}
