import type { AdDraft } from "@/components/ads/AdEditorCard";
import type { Audience, CampaignObjective } from "@/lib/types";

export interface WizardDraft {
  name: string;
  objective: CampaignObjective | null;
  audience: Audience;
  ads: AdDraft[];
  daily_budget: number;
  ab_test: boolean;
  start_date: string;
  end_date: string;
}

export const WIZARD_STEPS = ["Goal", "Audience", "Ads", "Review & Launch"];

export function initialDraft(firstAd: AdDraft): WizardDraft {
  return {
    name: "",
    objective: null,
    audience: {
      locations: ["United States"],
      age_min: 18,
      age_max: 65,
      gender: "all",
      interests: [],
      advantage_plus: false,
    },
    ads: [firstAd],
    daily_budget: 50,
    ab_test: false,
    start_date: "",
    end_date: "",
  };
}

/**
 * Meta's reach APIs return a range, never an exact count — mirror that.
 */
export function estimateAudienceRange(a: Audience): [number, number] {
  const size = estimateAudience(a);
  return [Math.round(size * 0.85), Math.round(size * 1.15)];
}

/** Deterministic mock estimate of audience size. */
export function estimateAudience(a: Audience): number {
  if (a.advantage_plus) return 210_000_000;
  const base = 68_000_000 * Math.max(a.locations.length, 1);
  const ageFactor = (a.age_max - a.age_min + 1) / 48;
  const genderFactor = a.gender === "all" ? 1 : 0.49;
  const interestFactor = a.interests.length > 0 ? Math.max(0.08, 0.5 / a.interests.length) : 1;
  return Math.round(base * ageFactor * genderFactor * interestFactor);
}
