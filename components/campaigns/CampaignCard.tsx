"use client";

import StatusPill from "@/components/ui/StatusPill";
import Toggle from "@/components/ui/Toggle";
import { useCampaigns } from "@/lib/campaign-context";
import {
  OBJECTIVE_LABELS,
  RESULT_LABELS,
  formatCompact,
  formatDateRange,
  formatMoney,
  type Campaign,
} from "@/lib/types";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  FlaskConical,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function CampaignCard({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const { toggleCampaignStatus, archivedIds, setCampaignArchived } =
    useCampaigns();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isArchived = archivedIds.has(campaign.id);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const spend =
    campaign.insights?.spend ??
    campaign.ads.reduce((s, a) => s + a.insights.spend, 0);
  const results =
    campaign.insights?.results ??
    campaign.ads.reduce((s, a) => s + a.insights.results, 0);
  const clicks =
    campaign.insights?.impressions !== undefined
      ? campaign.insights.clicks
      : campaign.ads.reduce((s, a) => s + a.insights.clicks, 0);
  const cpc = clicks > 0 ? spend / clicks : 0;

  return (
    <div
      onClick={() => router.push(`/ads-manager/campaigns/${campaign.id}`)}
      className="group flex cursor-pointer flex-col rounded-xl border border-line bg-white p-5 transition-shadow hover:border-ink-muted/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-bold group-hover:text-brand">
            {campaign.name}
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            {OBJECTIVE_LABELS[campaign.objective]}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Toggle
            size="sm"
            checked={campaign.status === "ACTIVE"}
            disabled={campaign.status === "ENDED"}
            onChange={() => toggleCampaignStatus(campaign.id)}
            label={`Toggle ${campaign.name}`}
          />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Campaign menu"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className="rounded-full p-1 text-ink-muted hover:bg-surface cursor-pointer"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-white p-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCampaignArchived(campaign.id, !isArchived);
                    setMenuOpen(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore className="size-3.5" />
                      Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="size-3.5" />
                      Archive
                    </>
                  )}
                </button>
                <p className="px-3 pb-1.5 pt-0.5 text-[10px] leading-snug text-ink-muted">
                  Organizes your dashboard only — nothing changes on Meta.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <StatusPill status={campaign.status} />
        {campaign.ab_test && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
            <FlaskConical className="size-3" />
            A/B test
          </span>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
        <CalendarDays className="size-3.5" />
        {formatDateRange(campaign.start_date, campaign.end_date)}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line pt-4">
        <div>
          <p className="text-xs text-ink-muted">Budget</p>
          <p className="text-sm font-bold">
            {formatMoney(campaign.daily_budget)}/day
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Spent</p>
          <p className="text-sm font-bold">{formatMoney(spend)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">
            {RESULT_LABELS[campaign.objective]}
          </p>
          <p className="text-sm font-bold text-brand">
            {formatCompact(results)}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-muted">Avg. CPC</p>
          <p className="text-sm font-bold">
            {cpc > 0 ? formatMoney(Number(cpc.toFixed(2))) : "—"}
          </p>
        </div>
      </div>

      <div className="group/thumbs relative mt-4 flex w-fit items-center gap-2">
        <div className="flex -space-x-2">
          {campaign.ads.slice(0, 4).map((ad) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={ad.id}
              src={ad.creative.image_url}
              alt={ad.name}
              style={
                ad.creative.image_filter
                  ? { filter: ad.creative.image_filter }
                  : undefined
              }
              className="size-8 rounded-lg border-2 border-white object-cover shadow-sm"
            />
          ))}
        </div>
        <span className="text-xs font-medium text-ink-muted">
          {campaign.ads.length} {campaign.ads.length === 1 ? "ad" : "ads"}
        </span>

        {/* Hover peek: every ad creative in this campaign */}
        {campaign.ads.length > 0 && (
          <div className="invisible absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-line bg-white p-3 opacity-0 shadow-xl transition-all duration-150 group-hover/thumbs:visible group-hover/thumbs:opacity-100">
            <p className="mb-2 text-xs font-semibold text-ink-muted">
              Ads in this campaign
            </p>
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
              {campaign.ads.map((ad) => (
                <button
                  key={ad.id}
                  type="button"
                  title={ad.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(
                      `/ads-manager/campaigns/${campaign.id}/ads/${ad.id}`
                    );
                  }}
                  className="cursor-pointer text-left"
                >
                  <div className="relative overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ad.creative.image_url}
                      alt={ad.name}
                      style={
                        ad.creative.image_filter
                          ? { filter: ad.creative.image_filter }
                          : undefined
                      }
                      className="aspect-square w-full object-cover transition-transform hover:scale-105"
                    />
                    <span
                      className={`absolute right-1.5 top-1.5 size-2 rounded-full border border-white ${
                        ad.status === "ACTIVE"
                          ? "bg-positive"
                          : ad.status === "PAUSED"
                            ? "bg-warning"
                            : "bg-ink-muted"
                      }`}
                    />
                  </div>
                  <p className="mt-1 truncate text-[10px] font-medium text-ink-muted">
                    {ad.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
