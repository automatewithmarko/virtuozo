"use client";

import CampaignCard from "@/components/campaigns/CampaignCard";
import ConnectBanner from "@/components/campaigns/ConnectBanner";
import OverviewStats from "@/components/campaigns/OverviewStats";
import Button from "@/components/ui/Button";
import { useCampaigns } from "@/lib/campaign-context";
import type { EntityStatus } from "@/lib/types";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Filter = EntityStatus | "ALL" | "ARCHIVED";

const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Ended", value: "ENDED" },
  { label: "Archived", value: "ARCHIVED" },
];

export default function AdsManagerPage() {
  const { campaigns, connection, archivedIds } = useCampaigns();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  if (connection.mode === "loading") {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-xl bg-surface" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const visible = campaigns.filter((c) => {
    const archived = archivedIds.has(c.id);
    const matchesFilter =
      filter === "ARCHIVED"
        ? archived
        : !archived && (filter === "ALL" || c.status === filter);
    return matchesFilter && c.name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <ConnectBanner />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ads Manager</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Your campaigns, without the spreadsheet.
          </p>
        </div>
        <Link href="/ads-manager/new">
          <Button>
            <Plus className="size-4" />
            New campaign
          </Button>
        </Link>
      </div>

      <OverviewStats campaigns={campaigns} />

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                  filter === f.value
                    ? "bg-brand text-white"
                    : "bg-surface text-ink-muted hover:bg-line/60 hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              placeholder="Search campaigns"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-56 rounded-lg border border-line bg-white pl-9 pr-3 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line py-16 text-center">
            <p className="font-semibold">
              {filter === "ARCHIVED" ? "No archived campaigns" : "No campaigns found"}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {filter === "ARCHIVED"
                ? "Archive campaigns from their card menu to tidy up your dashboard."
                : "Try a different filter, or create a new campaign."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
