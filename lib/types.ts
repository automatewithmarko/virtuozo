export type CampaignObjective =
  | "sales"
  | "leads"
  | "traffic"
  | "awareness"
  | "engagement";

export type EntityStatus = "ACTIVE" | "PAUSED" | "ENDED";

export type Gender = "all" | "men" | "women";

export interface CarouselCard {
  image_url: string;
  headline?: string;
  link?: string;
}

export interface AdCreative {
  image_url: string;
  primary_text: string;
  headline: string;
  description?: string;
  cta: string;
  /** Destination URL of the ad (link_data.link on Meta) */
  link_url?: string;
  format?: "image" | "video" | "carousel";
  /** Playable video source (video ads) */
  video_url?: string;
  /** All cards of a carousel ad */
  carousel_cards?: CarouselCard[];
  /** CSS filter from Studio style variations (mock of a restyled image) */
  image_filter?: string;
}

export interface AdInsights {
  impressions: number;
  clicks: number;
  spend: number;
  results: number;
}

/**
 * A Virtuozo "ad" — will map to one Meta ad set + one ad at integration
 * time, which is what makes per-ad budget_share and split tests possible.
 */
export interface Ad {
  id: string;
  name: string;
  status: EntityStatus;
  /** Fraction of the campaign budget allocated to this ad (0–1). */
  budget_share: number;
  /** Meta ad set backing this ad (live campaigns only). */
  adset_id?: string;
  /** Ad set schedule (live campaigns) */
  start_date?: string;
  end_date?: string;
  creative: AdCreative;
  insights: AdInsights;
}

export interface Audience {
  saved_audience?: string;
  locations: string[];
  age_min: number;
  age_max: number;
  gender: Gender;
  interests: string[];
  advantage_plus: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: EntityStatus;
  daily_budget: number;
  ab_test: boolean;
  audience: Audience;
  ads: Ad[];
  created_at: string;
  start_date?: string;
  end_date?: string;
  /** True when this campaign exists on Meta (not just local demo state). */
  is_live?: boolean;
  /**
   * Campaign-level totals from Meta (includes deleted ads' history).
   * When absent, UIs fall back to summing the current ads.
   */
  insights?: AdInsights;
}

export const OBJECTIVE_LABELS: Record<CampaignObjective, string> = {
  sales: "Get sales",
  leads: "Get leads",
  traffic: "Get website visits",
  awareness: "Get more reach",
  engagement: "Promote a post",
};

export const RESULT_LABELS: Record<CampaignObjective, string> = {
  sales: "Purchases",
  leads: "Leads",
  traffic: "Link clicks",
  awareness: "Reach",
  engagement: "Engagements",
};

export const CTA_OPTIONS = [
  "Shop Now",
  "Learn More",
  "Sign Up",
  "Get Offer",
  "Contact Us",
  "Download",
  "Book Now",
] as const;

export function audienceSummary(a: Audience): string {
  if (a.advantage_plus) return "Advantage+ (Meta optimized)";
  const parts = [
    a.locations.join(", "),
    `${a.age_min}–${a.age_max}`,
    a.gender === "all" ? "All genders" : a.gender === "men" ? "Men" : "Women",
  ];
  if (a.interests.length > 0) parts.push(a.interests.slice(0, 3).join(", "));
  return parts.join(" · ");
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

export function formatDate(iso?: string): string {
  if (!iso) return "Undefined";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Undefined";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Jun 1, 2026 → Undefined" — end shows Undefined when open-ended. */
export function formatDateRange(start?: string, end?: string): string {
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export function formatCompact(n: number): string {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
