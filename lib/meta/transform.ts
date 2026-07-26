import { countryCodeToName } from "@/lib/countries";
import { CTA_TO_META } from "@/lib/meta-mapping";
import type {
  Ad,
  Audience,
  Campaign,
  CampaignObjective,
  EntityStatus,
} from "@/lib/types";

/**
 * Meta Graph API entities → Virtuozo model.
 * Each Meta ad becomes a Virtuozo ad; its ad set contributes the budget share.
 */

// ---- Raw Graph API shapes (only the fields we request) ----

export interface RawInsights {
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  actions?: { action_type: string; value: string }[];
}

export interface RawChildAttachment {
  link?: string;
  name?: string;
  image_hash?: string;
  picture?: string;
  video_id?: string;
}

export interface RawCreative {
  id: string;
  title?: string;
  body?: string;
  image_url?: string;
  thumbnail_url?: string;
  call_to_action_type?: string;
  video_id?: string;
  object_story_spec?: {
    link_data?: { link?: string; child_attachments?: RawChildAttachment[] };
    video_data?: {
      video_id?: string;
      image_url?: string;
      title?: string;
      message?: string;
      call_to_action?: { type?: string; value?: { link?: string } };
    };
  };
}

/** Extra lookups the campaigns route resolves in follow-up Graph calls. */
export interface Enrichment {
  /** video id → playable source + hi-res poster */
  videos?: Record<string, { source?: string; picture?: string }>;
  /** image hash → url (carousel cards) */
  images?: Record<string, string>;
}

export interface RawAd {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  adset_id?: string;
  creative?: RawCreative;
  insights?: { data: RawInsights[] };
}

export interface RawTargeting {
  geo_locations?: { countries?: string[] };
  age_min?: number;
  age_max?: number;
  genders?: number[];
  flexible_spec?: { interests?: { id: string; name: string }[] }[];
  interests?: { id: string; name: string }[];
  targeting_automation?: { advantage_audience?: number };
}

export interface RawAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  targeting?: RawTargeting;
}

export interface RawCampaign {
  id: string;
  name: string;
  objective?: string;
  status: string;
  effective_status?: string;
  daily_budget?: string;
  created_time?: string;
  start_time?: string;
  stop_time?: string;
  insights?: { data: RawInsights[] };
  adsets?: { data: RawAdSet[] };
  ads?: { data: RawAd[] };
}

// ---- Mapping tables ----

const META_OBJECTIVE_TO_VIRTUOZO: Record<string, CampaignObjective> = {
  OUTCOME_SALES: "sales",
  OUTCOME_LEADS: "leads",
  OUTCOME_TRAFFIC: "traffic",
  OUTCOME_AWARENESS: "awareness",
  OUTCOME_ENGAGEMENT: "engagement",
  // Legacy (pre-ODAX) objectives still present on old campaigns
  CONVERSIONS: "sales",
  PRODUCT_CATALOG_SALES: "sales",
  STORE_VISITS: "sales",
  LEAD_GENERATION: "leads",
  LINK_CLICKS: "traffic",
  BRAND_AWARENESS: "awareness",
  REACH: "awareness",
  POST_ENGAGEMENT: "engagement",
  PAGE_LIKES: "engagement",
  VIDEO_VIEWS: "engagement",
};

const META_CTA_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(CTA_TO_META).map(([label, meta]) => [meta, label])
);

// Ordered by specificity — first match wins, mirroring how Ads Manager
// picks the "Results" column for each objective.
const RESULT_ACTION_TYPES: Record<CampaignObjective, string[]> = {
  sales: [
    "omni_purchase",
    "purchase",
    "offsite_conversion.fb_pixel_purchase",
    "onsite_conversion.purchase",
    "onsite_web_purchase",
  ],
  leads: [
    "lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
    "onsite_conversion.messaging_conversation_started_7d",
  ],
  traffic: ["landing_page_view", "link_click"],
  awareness: [],
  engagement: [
    "post_engagement",
    "page_engagement",
    "onsite_conversion.messaging_conversation_started_7d",
    "video_view",
  ],
};

// ---- Transforms ----

export function metaObjective(objective?: string): CampaignObjective {
  return (objective && META_OBJECTIVE_TO_VIRTUOZO[objective]) || "traffic";
}

function deriveStatus(raw: {
  status: string;
  effective_status?: string;
  stop_time?: string;
}): EntityStatus {
  if (raw.stop_time && new Date(raw.stop_time).getTime() < Date.now()) {
    return "ENDED";
  }
  if (raw.effective_status === "ARCHIVED" || raw.status === "ARCHIVED") {
    return "ENDED";
  }
  return raw.status === "ACTIVE" ? "ACTIVE" : "PAUSED";
}

function cents(value?: string): number {
  return value ? Number(value) / 100 : 0;
}

function parseInsights(
  row: RawInsights | undefined,
  objective: CampaignObjective
) {
  if (!row) return { impressions: 0, clicks: 0, spend: 0, results: 0 };
  const impressions = Number(row.impressions ?? 0);
  const clicks = Number(row.clicks ?? 0);
  const spend = Number(row.spend ?? 0);
  let results = 0;
  if (objective === "awareness") {
    results = Number(row.reach ?? impressions);
  } else {
    for (const type of RESULT_ACTION_TYPES[objective]) {
      const action = row.actions?.find((a) => a.action_type === type);
      if (action) {
        results = Number(action.value);
        break;
      }
    }
  }
  return { impressions, clicks, spend, results };
}

function insightsOf(ad: RawAd, objective: CampaignObjective) {
  return parseInsights(ad.insights?.data?.[0], objective);
}

function audienceOf(adset?: RawAdSet): Audience {
  const t = adset?.targeting;
  const interests = [
    ...(t?.interests ?? []),
    ...(t?.flexible_spec?.flatMap((f) => f.interests ?? []) ?? []),
  ].map((i) => i.name);
  const genders = t?.genders ?? [];
  return {
    locations: (t?.geo_locations?.countries ?? []).map(countryCodeToName),
    age_min: t?.age_min ?? 18,
    age_max: t?.age_max ?? 65,
    gender:
      genders.length !== 1 ? "all" : genders[0] === 1 ? "men" : "women",
    interests: [...new Set(interests)],
    advantage_plus: t?.targeting_automation?.advantage_audience === 1,
  };
}

export function transformCampaign(
  raw: RawCampaign,
  enrichment?: Enrichment
): Campaign {
  const objective = metaObjective(raw.objective);
  const adsets = raw.adsets?.data ?? [];
  const ads = raw.ads?.data ?? [];
  const adsetById = new Map(adsets.map((s) => [s.id, s]));

  // Budgets: ABO (per ad set) is our native model; CBO campaigns carry the
  // campaign-level budget and get equal shares.
  const adsetBudgets = ads.map((ad) =>
    cents(ad.adset_id ? adsetById.get(ad.adset_id)?.daily_budget : undefined)
  );
  const totalAdsetBudget = adsetBudgets.reduce((s, b) => s + b, 0);
  const campaignBudget = cents(raw.daily_budget);
  const dailyBudget = campaignBudget > 0 ? campaignBudget : totalAdsetBudget;

  const virtuozoAds: Ad[] = ads.map((ad, i) => {
    const creative = ad.creative;
    const adset = ad.adset_id ? adsetById.get(ad.adset_id) : undefined;
    const spec = creative?.object_story_spec;
    const videoData = spec?.video_data;
    const children = spec?.link_data?.child_attachments ?? [];
    const videoId = videoData?.video_id ?? creative?.video_id;
    const video = videoId ? enrichment?.videos?.[videoId] : undefined;

    const format: "image" | "video" | "carousel" = videoId
      ? "video"
      : children.length > 1
        ? "carousel"
        : "image";

    const carousel_cards =
      format === "carousel"
        ? children
            .map((c) => ({
              image_url:
                (c.image_hash && enrichment?.images?.[c.image_hash]) ||
                c.picture ||
                "",
              headline: c.name,
              link: c.link,
            }))
            .filter((c) => c.image_url)
        : undefined;

    const ctaType =
      creative?.call_to_action_type ?? videoData?.call_to_action?.type;

    return {
      id: ad.id,
      name: ad.name,
      status: deriveStatus(ad),
      budget_share:
        totalAdsetBudget > 0
          ? adsetBudgets[i] / totalAdsetBudget
          : ads.length > 0
            ? 1 / ads.length
            : 1,
      adset_id: ad.adset_id,
      start_date: adset?.start_time?.slice(0, 10),
      end_date: adset?.end_time?.slice(0, 10),
      creative: {
        image_url:
          videoData?.image_url ||
          video?.picture ||
          creative?.image_url ||
          carousel_cards?.[0]?.image_url ||
          creative?.thumbnail_url ||
          "",
        primary_text: creative?.body ?? videoData?.message ?? "",
        headline: creative?.title ?? videoData?.title ?? "",
        cta: ctaType
          ? (META_CTA_TO_LABEL[ctaType] ?? ctaType)
          : "Learn More",
        link_url:
          spec?.link_data?.link ?? videoData?.call_to_action?.value?.link,
        format,
        video_url: video?.source,
        carousel_cards,
      },
      insights: insightsOf(ad, objective),
    };
  });

  return {
    id: raw.id,
    name: raw.name,
    objective,
    status: deriveStatus(raw),
    daily_budget: dailyBudget,
    ab_test: false, // read back from ad studies in a later pass
    audience: audienceOf(adsets[0]),
    ads: virtuozoAds,
    // Campaign-level insights are authoritative: they include history from
    // deleted/archived ads that per-ad rows can't see.
    insights: parseInsights(raw.insights?.data?.[0], objective),
    created_at: raw.created_time?.slice(0, 10) ?? "",
    start_date: raw.start_time?.slice(0, 10),
    end_date: raw.stop_time?.slice(0, 10),
    is_live: true,
  };
}

export function transformCampaigns(
  raw: RawCampaign[],
  enrichment?: Enrichment
): Campaign[] {
  return raw.map((c) => transformCampaign(c, enrichment));
}

/** Collect the follow-up lookups a set of raw campaigns needs. */
export function collectEnrichmentRefs(raw: RawCampaign[]): {
  videoIds: string[];
  imageHashes: string[];
} {
  const videoIds = new Set<string>();
  const imageHashes = new Set<string>();
  for (const c of raw) {
    for (const ad of c.ads?.data ?? []) {
      const spec = ad.creative?.object_story_spec;
      const vid = spec?.video_data?.video_id ?? ad.creative?.video_id;
      if (vid) videoIds.add(vid);
      for (const child of spec?.link_data?.child_attachments ?? []) {
        if (child.image_hash) imageHashes.add(child.image_hash);
      }
    }
  }
  return { videoIds: [...videoIds], imageHashes: [...imageHashes] };
}
