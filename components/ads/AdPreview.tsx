"use client";

import { useCampaigns } from "@/lib/campaign-context";
import type { AdCreative } from "@/lib/types";
import {
  Globe,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { useState } from "react";

const TABS = ["Feed", "Story"] as const;

export default function AdPreview({
  creative,
  pageName: pageNameProp,
}: {
  creative: AdCreative;
  pageName?: string;
}) {
  const { connection } = useCampaigns();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Feed");

  const pageName =
    pageNameProp ?? connection.page?.name ?? "Virtuozo Demo Store";
  const domain = (() => {
    try {
      if (creative.link_url) {
        return new URL(creative.link_url).hostname.replace(/^www\./, "");
      }
    } catch {
      // fall through
    }
    return connection.link_domain ?? "virtuozo.demo";
  })();

  return (
    <div>
      <div className="mb-3 flex justify-center gap-1 rounded-lg bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              t === tab ? "bg-white text-brand shadow-sm" : "text-ink-muted"
            }`}
          >
            {t} preview
          </button>
        ))}
      </div>

      {tab === "Feed" ? (
        <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
              {pageName[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">{pageName}</p>
              <p className="flex items-center gap-1 text-xs text-ink-muted">
                Sponsored · <Globe className="size-3" />
              </p>
            </div>
            <MoreHorizontal className="size-5 text-ink-muted" />
          </div>

          <p className="px-4 pb-3 text-sm">
            {creative.primary_text || (
              <span className="text-ink-muted">Your primary text goes here…</span>
            )}
          </p>

          {creative.format === "video" && creative.video_url ? (
            <video
              src={creative.video_url}
              poster={creative.image_url || undefined}
              controls
              playsInline
              preload="metadata"
              className="max-h-96 w-full bg-ink object-contain"
            />
          ) : creative.format === "carousel" &&
            (creative.carousel_cards?.length ?? 0) > 1 ? (
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto bg-surface p-2">
              {creative.carousel_cards!.map((card, i) => (
                <div
                  key={i}
                  className="w-64 shrink-0 snap-center overflow-hidden rounded-lg border border-line bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image_url}
                    alt={card.headline ?? `Card ${i + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  {card.headline && (
                    <p className="truncate px-2.5 py-2 text-xs font-bold">
                      {card.headline}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : creative.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creative.image_url}
              alt="Ad creative"
              style={
                creative.image_filter ? { filter: creative.image_filter } : undefined
              }
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-surface text-sm text-ink-muted">
              Add a creative to preview
            </div>
          )}

          <div className="flex items-center justify-between bg-surface px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {creative.headline || (
                  <span className="font-normal text-ink-muted">Headline…</span>
                )}
              </p>
              <p className="truncate text-xs uppercase text-ink-muted">{domain}</p>
            </div>
            <span className="shrink-0 rounded-md bg-line px-3 py-1.5 text-sm font-semibold">
              {creative.cta}
            </span>
          </div>

          <div className="flex justify-around border-t border-line px-4 py-2 text-ink-muted">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <ThumbsUp className="size-4" /> Like
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <MessageCircle className="size-4" /> Comment
            </span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Share2 className="size-4" /> Share
            </span>
          </div>
        </div>
      ) : (
        <div className="relative mx-auto aspect-[9/16] max-w-60 overflow-hidden rounded-2xl border border-line bg-ink shadow-sm">
          {creative.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creative.image_url}
              alt="Ad creative"
              style={
                creative.image_filter ? { filter: creative.image_filter } : undefined
              }
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-3">
            <p className="text-sm font-bold text-white">{pageName}</p>
            <p className="text-xs text-white/80">Sponsored</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10">
            <p className="line-clamp-2 text-xs text-white/90">
              {creative.primary_text}
            </p>
            <span className="mt-2 block rounded-full bg-white py-1.5 text-center text-sm font-bold text-ink">
              {creative.cta}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
