"use client";

import { useCampaigns } from "@/lib/campaign-context";
import { OBJECTIVE_LABELS, type Ad, type Campaign } from "@/lib/types";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  onSelect: (campaign: Campaign, ad: Ad) => void;
}

/** Two-step campaign → ad picker, used when starting a canvas or adding an ad to one. */
export default function AdPicker({ onSelect }: Props) {
  const { campaigns } = useCampaigns();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  if (!campaign) {
    return (
      <div className="space-y-2">
        <p className="mb-3 text-sm text-ink-muted">
          Pick the campaign that contains the ad you want to start from.
        </p>
        {campaigns.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCampaign(c)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition-colors hover:border-brand hover:bg-brand-soft/40"
          >
            <div className="flex -space-x-2">
              {c.ads.slice(0, 3).map((ad) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={ad.id}
                  src={ad.creative.image_url}
                  alt=""
                  className="size-9 rounded-lg border-2 border-white object-cover"
                />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.name}</p>
              <p className="text-xs text-ink-muted">
                {OBJECTIVE_LABELS[c.objective]} · {c.ads.length}{" "}
                {c.ads.length === 1 ? "ad" : "ads"}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-ink-muted" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setCampaign(null)}
        className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <ArrowLeft className="size-4" />
        {campaign.name}
      </button>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {campaign.ads.map((ad) => (
          <button
            key={ad.id}
            type="button"
            onClick={() => onSelect(campaign, ad)}
            className="group cursor-pointer overflow-hidden rounded-xl border border-line bg-white text-left transition-all hover:border-brand hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.creative.image_url}
              alt={ad.name}
              style={
                ad.creative.image_filter
                  ? { filter: ad.creative.image_filter }
                  : undefined
              }
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="p-2.5">
              <p className="truncate text-sm font-semibold group-hover:text-brand">
                {ad.name}
              </p>
              <p className="truncate text-xs text-ink-muted">
                {ad.creative.headline}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
