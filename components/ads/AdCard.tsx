"use client";

import StatusPill from "@/components/ui/StatusPill";
import Toggle from "@/components/ui/Toggle";
import { useCampaigns } from "@/lib/campaign-context";
import {
  formatCompact,
  formatDateRange,
  formatMoney,
  type Ad,
  type Campaign,
} from "@/lib/types";
import { CalendarDays, GalleryHorizontal, Play, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

const VARIANT_LETTERS = "ABCDEF";

interface Props {
  campaign: Campaign;
  ad: Ad;
  index: number;
  isWinner?: boolean;
}

export default function AdCard({ campaign, ad, index, isWinner }: Props) {
  const router = useRouter();
  const { toggleAdStatus } = useCampaigns();

  const costPerResult =
    ad.insights.results > 0 ? ad.insights.spend / ad.insights.results : 0;
  const cpc = ad.insights.clicks > 0 ? ad.insights.spend / ad.insights.clicks : 0;

  return (
    <div
      onClick={() =>
        router.push(`/ads-manager/campaigns/${campaign.id}/ads/${ad.id}`)
      }
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md ${
        isWinner ? "border-brand ring-2 ring-brand-soft" : "border-line hover:border-ink-muted/30"
      }`}
    >
      <div className="relative">
        {ad.creative.format === "carousel" &&
        (ad.creative.carousel_cards?.length ?? 0) > 1 ? (
          <div className="flex aspect-[4/3] w-full snap-x snap-mandatory gap-1 overflow-x-auto bg-surface">
            {ad.creative.carousel_cards!.map((card, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={card.image_url}
                alt={card.headline ?? `Card ${i + 1}`}
                className="h-full w-[82%] shrink-0 snap-center object-cover"
              />
            ))}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
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
        )}
        {ad.creative.format === "video" && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur-sm">
              <Play className="ml-0.5 size-5" fill="currentColor" />
            </span>
          </span>
        )}
        {ad.creative.format === "carousel" && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-ink/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <GalleryHorizontal className="size-3" />
            {ad.creative.carousel_cards?.length ?? 0} cards
          </span>
        )}
        {campaign.ab_test && (
          <span className="absolute left-3 top-3 flex size-7 items-center justify-center rounded-full bg-white/95 text-sm font-extrabold text-brand shadow">
            {VARIANT_LETTERS[index] ?? "•"}
          </span>
        )}
        {isWinner && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white shadow">
            <Trophy className="size-3" />
            Winner so far
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-bold group-hover:text-brand">
              {ad.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
              {ad.creative.primary_text}
            </p>
          </div>
          <Toggle
            size="sm"
            checked={ad.status === "ACTIVE"}
            disabled={ad.status === "ENDED"}
            onChange={() => toggleAdStatus(campaign.id, ad.id)}
            label={`Toggle ${ad.name}`}
          />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <StatusPill status={ad.status} />
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
            {Math.round(ad.budget_share * 100)}% ·{" "}
            {formatMoney(Math.round(ad.budget_share * campaign.daily_budget))}/day
          </span>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <CalendarDays className="size-3.5" />
          {formatDateRange(
            ad.start_date ?? campaign.start_date,
            ad.end_date ?? campaign.end_date
          )}
        </p>

        <div className="mt-auto" />
        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-3">
          <div>
            <p className="text-xs text-ink-muted">Impressions</p>
            <p className="text-sm font-bold">
              {formatCompact(ad.insights.impressions)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Clicks</p>
            <p className="text-sm font-bold">
              {formatCompact(ad.insights.clicks)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">CPC</p>
            <p className="text-sm font-bold">
              {cpc > 0 ? formatMoney(Number(cpc.toFixed(2))) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Cost/result</p>
            <p className="text-sm font-bold">
              {costPerResult > 0 ? formatMoney(Number(costPerResult.toFixed(2))) : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
