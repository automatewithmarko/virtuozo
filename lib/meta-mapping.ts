import type { CampaignObjective, EntityStatus } from "./types";

/**
 * The Virtuozo → Meta Marketing API integration contract.
 *
 * Every UI concept in Virtuozo maps to a real Marketing API structure.
 * This module encodes the mapping so integration can't drift from the UI.
 *
 * Structure mapping (the big one):
 *   Virtuozo Campaign  →  Meta Campaign (ODAX objective, NO campaign budget)
 *   Virtuozo Ad        →  Meta Ad Set (carries the budget) + one Meta Ad
 *
 * Per-ad budget shares require AD SET budgets (ABO). With Advantage campaign
 * budget (CBO) Meta only allows spend *limits*, not fixed per-ad-set budgets,
 * so publishing computes: adset.daily_budget = round(share × campaign budget).
 *
 * A/B test toggle → Ad Study (type SPLIT_TEST) with one cell per Virtuozo ad,
 * equal treatment percentages — which is why the UI locks shares to an equal
 * split while the toggle is on.
 *
 * Advantage+ audience toggle → adset.targeting_automation.advantage_audience
 * (must be sent explicitly as 1 or 0 since API v23).
 *
 * "Ended" status is derived, not settable: Meta statuses are ACTIVE / PAUSED /
 * DELETED / ARCHIVED; a campaign past its end_time reports it via
 * effective_status / delivery. The UI already treats ENDED as read-only.
 *
 * Studio style variations: CSS filters are a mock. At real publish time the
 * filter is baked into pixels (see lib/bake-filter.ts) because /adimages
 * uploads need an actual image file — Meta cannot apply CSS to a creative.
 *
 * Estimated audience size: reachestimate / delivery_estimate return a RANGE
 * (estimate_ready lower/upper bounds), never an exact count — the UI shows a
 * range for the same reason.
 *
 * Interests & locations: values in lib/targeting-data.ts mirror the shape of
 * Targeting Search API results (type=adinterest / adgeolocation); swap the
 * static catalogs for live search at integration time.
 */

/** Virtuozo goal → ODAX campaign objective. */
export const OBJECTIVE_TO_META: Record<CampaignObjective, string> = {
  sales: "OUTCOME_SALES",
  leads: "OUTCOME_LEADS",
  traffic: "OUTCOME_TRAFFIC",
  awareness: "OUTCOME_AWARENESS",
  engagement: "OUTCOME_ENGAGEMENT",
};

/** Virtuozo CTA label → ad creative call_to_action.type enum. */
export const CTA_TO_META: Record<string, string> = {
  "Shop Now": "SHOP_NOW",
  "Learn More": "LEARN_MORE",
  "Sign Up": "SIGN_UP",
  "Get Offer": "GET_OFFER",
  "Contact Us": "CONTACT_US",
  Download: "DOWNLOAD",
  "Book Now": "BOOK_NOW",
};

/** Settable Meta statuses. ENDED is derived from end_time, never written. */
export const STATUS_TO_META: Record<Exclude<EntityStatus, "ENDED">, string> = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
};

/**
 * Meta ad set daily-budget minimums (approximate, currency/billing dependent):
 * ~$1/day when billed by impressions, ~$5/day for click/conversion-optimized
 * goals. The Ads step warns when a budget share would fall below these.
 */
export const MIN_DAILY_BUDGET_IMPRESSIONS = 1;
export const MIN_DAILY_BUDGET_CONVERSIONS = 5;

/** Ads targeting on Meta requires 18+ (teen targeting is age/location only). */
export const MIN_TARGETING_AGE = 18;
export const MAX_TARGETING_AGE = 65; // 65 = "65+"
