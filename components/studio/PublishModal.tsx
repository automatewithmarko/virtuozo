"use client";

import InterestPicker from "@/components/targeting/InterestPicker";
import LocationPicker from "@/components/targeting/LocationPicker";
import Button from "@/components/ui/Button";
import { bakeImageFilter } from "@/lib/bake-filter";
import Chip from "@/components/ui/Chip";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import { useCampaigns } from "@/lib/campaign-context";
import type { AdNodeData } from "@/lib/studio-types";
import {
  OBJECTIVE_LABELS,
  type Ad,
  type Audience,
  type Campaign,
  type CampaignObjective,
  type Gender,
} from "@/lib/types";
import { Check, FolderPlus, Megaphone, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GENDERS: { label: string; value: Gender }[] = [
  { label: "All", value: "all" },
  { label: "Men", value: "men" },
  { label: "Women", value: "women" },
];

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft";

type Step = "destination" | "same" | "new" | "success";

interface Props {
  /** One ad = regular publish; several = published together as an A/B test. */
  ads: AdNodeData[];
  onClose: () => void;
}

function publishedAdName(data: AdNodeData): string {
  const base = data.ad_name ?? data.headline ?? "Studio ad";
  if (!data.variation) return `${base} (Studio)`;
  return `${base} — ${data.variation.kind} variation`;
}

/** Names for the batch, de-duplicated so Meta doesn't see identical ad names. */
function publishedAdNames(ads: AdNodeData[]): string[] {
  const seen = new Map<string, number>();
  return ads.map((d) => {
    const base = publishedAdName(d);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

/**
 * Builds the published Ad, baking any Studio style filter into real pixels
 * first — Meta's /adimages upload needs an actual image, not CSS.
 */
async function adFromNode(
  data: AdNodeData,
  id: string,
  budget_share: number,
  name: string
): Promise<Ad> {
  const baked = await bakeImageFilter(data.image_url, data.style_filter);
  return {
    id,
    name,
    status: "ACTIVE",
    budget_share,
    creative: {
      image_url: baked.image_url,
      primary_text: data.primary_text,
      headline: data.headline,
      cta: data.cta,
      link_url: data.link_url,
      image_filter: baked.image_filter,
    },
    insights: { impressions: 0, clicks: 0, spend: 0, results: 0 },
  };
}

export default function PublishModal({ ads, onClose }: Props) {
  const router = useRouter();
  const {
    campaigns,
    getCampaign,
    launchCampaign,
    addAdsToCampaign,
    updateCampaign,
    connection,
  } = useCampaigns();
  const isLive = connection.mode === "live";

  // Several ads at once = an A/B test: equal budget split, ab_test flag on.
  const abTest = ads.length > 1;
  const data = ads[0];
  const adNames = publishedAdNames(ads);

  // Prefer the stored campaign id; fall back to matching by name for nodes
  // saved before campaign lineage was stored (source_label = "Campaign · Ad").
  const sourceCampaign =
    (data.campaign_id ? getCampaign(data.campaign_id) : undefined) ??
    campaigns.find((c) => c.name === data.campaign_name) ??
    campaigns.find((c) => data.source_label?.startsWith(`${c.name} · `));

  const [step, setStep] = useState<Step>("destination");
  const [publishedTo, setPublishedTo] = useState<Campaign | null>(null);
  const [publishedLive, setPublishedLive] = useState(false);
  const [publishedToNewLive, setPublishedToNewLive] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // New-campaign settings
  const [name, setName] = useState(`${data.headline || "Studio ad"} — campaign`);
  const [objective, setObjective] = useState<CampaignObjective>("sales");
  const [budget, setBudget] = useState(50);
  const [advantagePlus, setAdvantagePlus] = useState(true);
  const [locations, setLocations] = useState<string[]>(["United States"]);
  const [interests, setInterests] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState<Gender>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const publishToSame = async () => {
    if (!sourceCampaign || publishing) return;
    const c = sourceCampaign;
    const newShare = 1 / (c.ads.length + ads.length);
    // A/B test (or an already-A/B campaign): every ad gets an equal slice.
    // Otherwise existing ads shrink proportionally to make room.
    const shares =
      abTest || c.ab_test
        ? c.ads.map(() => newShare)
        : c.ads.map((a) => a.budget_share * (1 - newShare * ads.length));

    setPublishing(true);
    setPublishError(null);
    try {
      const stamp = Date.now();
      const newAds = await Promise.all(
        ads.map((d, i) =>
          adFromNode(d, `${c.id}-a${stamp + i}`, newShare, adNames[i])
        )
      );
      const result = await addAdsToCampaign(c, newAds, shares);
      if (abTest && !c.ab_test) updateCampaign(c.id, { ab_test: true });
      setPublishedLive(result.live);
      setPublishedTo(c);
      setStep("success");
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setPublishing(false);
    }
  };

  const publishToNew = async () => {
    if (publishing) return;
    const id = `c-${Date.now()}`;
    const audience: Audience = {
      locations,
      age_min: ageMin,
      age_max: ageMax,
      gender,
      interests: advantagePlus ? [] : interests,
      advantage_plus: advantagePlus,
    };
    const campaign: Campaign = {
      id,
      name: name.trim() || "Studio campaign",
      objective,
      status: "ACTIVE",
      daily_budget: budget,
      ab_test: abTest,
      audience,
      ads: await Promise.all(
        ads.map((d, i) =>
          adFromNode(d, `${id}-a${i + 1}`, 1 / ads.length, adNames[i])
        )
      ),
      created_at: new Date().toISOString().slice(0, 10),
      start_date: startDate || new Date().toISOString().slice(0, 10),
      end_date: endDate || undefined,
    };
    setPublishing(true);
    setPublishError(null);
    try {
      const result = await launchCampaign(campaign);
      setPublishedLive(result.live);
      setPublishedToNewLive(result.live);
      setPublishedTo(campaign);
      setStep("success");
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setPublishing(false);
    }
  };

  const adSummary = (
    <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
      {abTest && (
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          A/B test · {ads.length} ads · budget split equally
        </p>
      )}
      {ads.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={d.image_url}
            alt=""
            style={d.style_filter ? { filter: d.style_filter } : undefined}
            className="size-14 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{adNames[i]}</p>
            <p className="truncate text-xs text-ink-muted">
              {d.headline} · {d.cta}
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={
        step === "destination"
          ? abTest
            ? `Publish A/B test (${ads.length} ads)`
            : "Publish this ad"
          : step === "same"
            ? `Publish to ${sourceCampaign?.name}`
            : step === "new"
              ? "New campaign settings"
              : "Published"
      }
      footer={
        step === "same" ? (
          <>
            {publishError && (
              <span className="mr-auto max-w-56 truncate self-center text-xs font-semibold text-red-600" title={publishError}>
                {publishError}
              </span>
            )}
            <Button variant="ghost" onClick={() => setStep("destination")}>
              Back
            </Button>
            <Button disabled={publishing} onClick={publishToSame}>
              <Megaphone className="size-4" />
              {publishing
                ? "Publishing…"
                : isLive
                  ? "Publish to Meta (paused)"
                  : abTest
                    ? "Publish A/B test"
                    : "Publish ad"}
            </Button>
          </>
        ) : step === "new" ? (
          <>
            {publishError && (
              <span className="mr-auto max-w-56 truncate self-center text-xs font-semibold text-red-600" title={publishError}>
                {publishError}
              </span>
            )}
            <Button variant="ghost" onClick={() => setStep("destination")}>
              Back
            </Button>
            <Button
              disabled={publishing || (!advantagePlus && locations.length === 0)}
              onClick={publishToNew}
            >
              <Megaphone className="size-4" />
              {publishing
                ? "Publishing…"
                : isLive
                  ? "Create on Meta (paused)"
                  : "Create campaign & publish"}
            </Button>
          </>
        ) : undefined
      }
    >
      {step === "destination" && (
        <div className="space-y-4">
          {adSummary}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!sourceCampaign}
              onClick={() => setStep("same")}
              className="flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 border-line p-4 text-left transition-colors hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-surface text-brand">
                <Megaphone className="size-4.5" />
              </span>
              <span>
                <span className="block text-sm font-bold">
                  Same campaign
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {sourceCampaign
                    ? `Add this ad to “${sourceCampaign.name}” — budgets rebalance automatically.`
                    : "This ad isn't linked to a campaign."}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep("new")}
              className="flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 border-brand bg-brand-soft p-4 text-left"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
                <FolderPlus className="size-4.5" />
              </span>
              <span>
                <span className="block text-sm font-bold">Create a new campaign</span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  Set goal, audience and budget — without leaving the studio.
                </span>
              </span>
            </button>
          </div>
        </div>
      )}

      {step === "same" && sourceCampaign && (
        <div className="space-y-4">
          {adSummary}
          <div className="rounded-xl border border-line p-4 text-sm">
            <p>
              {abTest ? `These ${ads.length} ads` : "This ad"} will go live in{" "}
              <span className="font-bold">{sourceCampaign.name}</span> alongside its{" "}
              {sourceCampaign.ads.length} existing{" "}
              {sourceCampaign.ads.length === 1 ? "ad" : "ads"}.
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              {abTest
                ? "Published as an A/B test — the campaign budget will split equally across all ads so the variants compete fairly."
                : sourceCampaign.ab_test
                  ? "A/B test is on — the budget will split equally across all ads."
                  : "The campaign budget will be rebalanced proportionally to make room for this ad."}
            </p>
          </div>
        </div>
      )}

      {step === "new" && (
        <div className="space-y-5">
          {adSummary}

          <div>
            <label className="mb-1 block text-sm font-semibold">Campaign name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Goal</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(OBJECTIVE_LABELS) as CampaignObjective[]).map((o) => (
                <Chip key={o} selected={objective === o} onClick={() => setObjective(o)}>
                  {OBJECTIVE_LABELS[o]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand-soft px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-brand" />
              Let Meta optimize the audience (Advantage+)
            </span>
            <Toggle checked={advantagePlus} onChange={setAdvantagePlus} label="Advantage+" />
          </div>

          {!advantagePlus && (
            <div className="space-y-4 rounded-xl border border-line p-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-ink-muted">
                  Locations
                </label>
                <LocationPicker selected={locations} onChange={setLocations} />
              </div>
              <div>
                <label className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-muted">
                  Age range
                  <span className="font-bold text-ink">
                    {ageMin} – {ageMax === 65 ? "65+" : ageMax}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={18}
                    max={64}
                    value={ageMin}
                    onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 1))}
                    className="w-full accent-brand"
                    aria-label="Minimum age"
                  />
                  <input
                    type="range"
                    min={19}
                    max={65}
                    value={ageMax}
                    onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 1))}
                    className="w-full accent-brand"
                    aria-label="Maximum age"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-ink-muted">
                  Gender
                </label>
                <div className="inline-flex rounded-lg border border-line p-0.5">
                  {GENDERS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value)}
                      className={`rounded-md px-4 py-1 text-sm font-semibold transition-colors cursor-pointer ${
                        gender === g.value
                          ? "bg-brand text-white"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-ink-muted">
                  Interests (optional)
                </label>
                <InterestPicker selected={interests} onChange={setInterests} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                Daily budget
              </label>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-ink-muted">$</span>
                <input
                  type="number"
                  min={1}
                  value={budget}
                  onChange={(e) => setBudget(Math.max(1, Number(e.target.value)))}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      {step === "success" && publishedTo && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-positive-soft text-positive">
            <Check className="size-7" strokeWidth={3} />
          </div>
          <p className="mt-4 text-lg font-extrabold">
            {abTest ? "A/B test published 🎉" : "Ad published 🎉"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            {publishedLive ? (
              <>
                {abTest ? `${ads.length} ads were` : `“${adNames[0]}” was`}{" "}
                created on Meta in{" "}
                <span className="font-semibold text-ink">{publishedTo.name}</span>{" "}
                — <span className="font-semibold text-ink">paused</span> for
                safety. Activate {abTest ? "them" : "it"} when you&apos;re ready
                to spend.
              </>
            ) : (
              <>
                {abTest ? `${ads.length} ads are` : `“${adNames[0]}” is`} now
                live in{" "}
                <span className="font-semibold text-ink">{publishedTo.name}</span>{" "}
                (demo mode).
              </>
            )}
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              Keep working
            </Button>
            <Button
              onClick={() =>
                router.push(
                  publishedToNewLive
                    ? "/ads-manager"
                    : `/ads-manager/campaigns/${publishedTo.id}`
                )
              }
            >
              {publishedToNewLive ? "Go to dashboard" : "View campaign"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
