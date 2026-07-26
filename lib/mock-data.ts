import { Ad, AdInsights, Campaign } from "./types";

function insights(
  impressions: number,
  ctr: number,
  spend: number,
  results: number
): AdInsights {
  return {
    impressions,
    clicks: Math.round(impressions * ctr),
    spend,
    results,
  };
}

function ad(
  id: string,
  name: string,
  image: string,
  primary_text: string,
  headline: string,
  cta: string,
  budget_share: number,
  ins: AdInsights,
  status: Ad["status"] = "ACTIVE"
): Ad {
  return {
    id,
    name,
    status,
    budget_share,
    creative: { image_url: `/creatives/${image}.svg`, primary_text, headline, cta },
    insights: ins,
  };
}

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    name: "Summer Sale 2026",
    objective: "sales",
    status: "ACTIVE",
    daily_budget: 120,
    ab_test: true,
    audience: {
      locations: ["United States", "Canada"],
      age_min: 25,
      age_max: 54,
      gender: "all",
      interests: ["Online shopping", "Summer fashion", "Deals"],
      advantage_plus: false,
    },
    ads: [
      ad(
        "c1-a1",
        "Sunny hero",
        "summer-sale",
        "Our biggest sale of the year is here. Up to 50% off everything — but only while summer lasts. ☀️",
        "Up to 50% off sitewide",
        "Shop Now",
        0.5,
        insights(182_400, 0.021, 1_260, 214)
      ),
      ad(
        "c1-a2",
        "New arrivals angle",
        "new-arrivals",
        "Fresh styles just landed — and they're already on sale. Grab your favorites before they're gone.",
        "New arrivals, now on sale",
        "Shop Now",
        0.5,
        insights(164_900, 0.017, 1_190, 168)
      ),
    ],
    created_at: "2026-06-01",
    start_date: "2026-06-01",
  },
  {
    id: "c2",
    name: "Free Trial Signups",
    objective: "leads",
    status: "ACTIVE",
    daily_budget: 80,
    ab_test: false,
    audience: {
      locations: ["United States"],
      age_min: 22,
      age_max: 45,
      gender: "all",
      interests: ["Productivity software", "Small business", "Entrepreneurship"],
      advantage_plus: false,
    },
    ads: [
      ad(
        "c2-a1",
        "Trial offer",
        "free-trial",
        "Stop juggling five tools. Run your whole workflow in one place — free for 30 days, no card required.",
        "Try it free for 30 days",
        "Sign Up",
        0.7,
        insights(96_300, 0.024, 1_680, 412)
      ),
      ad(
        "c2-a2",
        "Webinar invite",
        "webinar",
        "Join our live demo and see how teams save 10+ hours a week. Seats are limited.",
        "Save your seat — live demo",
        "Sign Up",
        0.3,
        insights(41_200, 0.019, 710, 133)
      ),
    ],
    created_at: "2026-05-12",
    start_date: "2026-05-12",
  },
  {
    id: "c3",
    name: "Fitness App — Spring Push",
    objective: "traffic",
    status: "PAUSED",
    daily_budget: 45,
    ab_test: false,
    audience: {
      locations: ["United Kingdom", "Ireland"],
      age_min: 18,
      age_max: 40,
      gender: "all",
      interests: ["Fitness", "Running", "Home workouts"],
      advantage_plus: true,
    },
    ads: [
      ad(
        "c3-a1",
        "App promo",
        "fitness-app",
        "Your personal trainer, in your pocket. 500+ workouts that adapt to your level.",
        "Train smarter with AI workouts",
        "Download",
        1,
        insights(220_800, 0.013, 2_140, 2_870),
        "PAUSED"
      ),
    ],
    created_at: "2026-03-02",
    start_date: "2026-03-02",
    end_date: "2026-06-15",
  },
  {
    id: "c4",
    name: "Sneaker Drop — Retargeting",
    objective: "sales",
    status: "ACTIVE",
    daily_budget: 200,
    ab_test: true,
    audience: {
      saved_audience: "Website visitors — 30 days",
      locations: ["United States"],
      age_min: 18,
      age_max: 34,
      gender: "all",
      interests: ["Sneakers", "Streetwear"],
      advantage_plus: false,
    },
    ads: [
      ad(
        "c4-a1",
        "Drop hero",
        "sneaker-drop",
        "The drop you've been waiting for. Limited pairs — once they're gone, they're gone.",
        "The V2 drop is live",
        "Shop Now",
        0.34,
        insights(310_500, 0.028, 2_940, 486)
      ),
      ad(
        "c4-a2",
        "Coffee collab",
        "coffee-blend",
        "Sneakers × your morning ritual. The limited collab pack: V2s + our signature roast.",
        "Limited collab pack",
        "Shop Now",
        0.33,
        insights(287_100, 0.022, 2_810, 391)
      ),
      ad(
        "c4-a3",
        "Gift angle",
        "holiday-gift",
        "Know someone who'd lose it over these? Gift cards ship instantly.",
        "The perfect gift, instantly",
        "Get Offer",
        0.33,
        insights(198_400, 0.015, 2_620, 247)
      ),
    ],
    created_at: "2026-06-20",
    start_date: "2026-06-20",
  },
  {
    id: "c5",
    name: "Skincare Launch — Awareness",
    objective: "awareness",
    status: "ACTIVE",
    daily_budget: 60,
    ab_test: false,
    audience: {
      locations: ["Australia", "New Zealand"],
      age_min: 21,
      age_max: 55,
      gender: "women",
      interests: ["Skincare", "Clean beauty", "Self care"],
      advantage_plus: false,
    },
    ads: [
      ad(
        "c5-a1",
        "Launch film",
        "skincare",
        "Three ingredients. Zero fillers. Meet the routine your skin has been asking for.",
        "Clean skincare, finally",
        "Learn More",
        1,
        insights(540_200, 0.008, 1_820, 498_000)
      ),
    ],
    created_at: "2026-06-28",
    start_date: "2026-07-01",
  },
  {
    id: "c6",
    name: "Travel Deals — Q1",
    objective: "engagement",
    status: "ENDED",
    daily_budget: 35,
    ab_test: false,
    audience: {
      locations: ["Germany", "Austria", "Switzerland"],
      age_min: 25,
      age_max: 65,
      gender: "all",
      interests: ["Travel", "Beach holidays"],
      advantage_plus: true,
    },
    ads: [
      ad(
        "c6-a1",
        "Beach post",
        "travel-deal",
        "Winter at home or €299 round-trip to the sun? Yeah, we thought so. ✈️",
        "Escape winter from €299",
        "Book Now",
        1,
        insights(410_700, 0.011, 2_980, 12_400),
        "ENDED"
      ),
    ],
    created_at: "2026-01-05",
    start_date: "2026-01-10",
    end_date: "2026-03-31",
  },
];

export const SAVED_AUDIENCES = [
  "Website visitors — 30 days",
  "Past purchasers — 180 days",
  "Instagram engagers — 90 days",
  "Lookalike (1%) — Purchasers US",
];

export const INTEREST_SUGGESTIONS = [
  "Online shopping",
  "Fitness",
  "Running",
  "Travel",
  "Cooking",
  "Technology",
  "Small business",
  "Entrepreneurship",
  "Skincare",
  "Streetwear",
  "Gaming",
  "Parenting",
  "Photography",
  "Yoga",
  "Coffee",
  "Sustainable living",
];

export const SAMPLE_CREATIVES = [
  "/creatives/summer-sale.svg",
  "/creatives/new-arrivals.svg",
  "/creatives/free-trial.svg",
  "/creatives/webinar.svg",
  "/creatives/fitness-app.svg",
  "/creatives/coffee-blend.svg",
  "/creatives/sneaker-drop.svg",
  "/creatives/travel-deal.svg",
  "/creatives/skincare.svg",
  "/creatives/holiday-gift.svg",
];

export const AD_ACCOUNTS = [
  { id: "act_1042", name: "Virtuozo Demo Store" },
  { id: "act_2201", name: "Acme Fitness" },
];
