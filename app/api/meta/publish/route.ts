import { countryNameToCode } from "@/lib/countries";
import {
  defaultLinkUrl,
  errorPayload,
  graphGet,
  graphPost,
  MetaApiError,
} from "@/lib/meta/graph";
import { metaContext, type MetaContext } from "@/lib/meta/user-store";
import { OBJECTIVE_TO_META, CTA_TO_META } from "@/lib/meta-mapping";
import type { Ad, Audience, Campaign, CampaignObjective } from "@/lib/types";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

/**
 * Publishes Virtuozo entities to Meta. Everything is created PAUSED —
 * activation is always an explicit user action.
 *
 * mode "new_campaign": { campaign } → campaign + (adset + creative + ad) per ad
 * mode "add_ads":      { campaign_id, daily_budget, ads } → new adset/ad pairs
 */

const OPTIMIZATION_GOAL: Record<CampaignObjective, string> = {
  // LINK_CLICKS keeps publishing pixel-free; upgrade sales/leads to
  // OFFSITE_CONVERSIONS / LEAD_GENERATION once a pixel & forms are configured.
  sales: "LINK_CLICKS",
  leads: "LINK_CLICKS",
  traffic: "LINK_CLICKS",
  awareness: "REACH",
  engagement: "POST_ENGAGEMENT",
};

async function imageBytes(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) {
    return imageUrl.split(",")[1];
  }
  if (imageUrl.startsWith("/")) {
    const file = await fs.readFile(path.join(process.cwd(), "public", imageUrl));
    return file.toString("base64");
  }
  const res = await fetch(imageUrl);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

async function uploadImage(ctx: MetaContext, imageUrl: string): Promise<string> {
  const bytes = await imageBytes(imageUrl);
  const res = await graphPost<{ images: Record<string, { hash: string }> }>(
    ctx.token,
    `act_${ctx.adAccountId}/adimages`,
    { bytes }
  );
  const first = Object.values(res.images)[0];
  if (!first?.hash) throw new MetaApiError("Image upload returned no hash");
  return first.hash;
}

const interestIdCache = new Map<string, string | null>();

async function resolveInterestId(
  ctx: MetaContext,
  name: string
): Promise<string | null> {
  if (interestIdCache.has(name)) return interestIdCache.get(name)!;
  try {
    const res = await graphGet<{ data: { id: string; name: string }[] }>(
      ctx.token,
      "search",
      { type: "adinterest", q: name, limit: "3" }
    );
    const exact =
      res.data.find((i) => i.name.toLowerCase() === name.toLowerCase()) ??
      res.data[0];
    interestIdCache.set(name, exact?.id ?? null);
    return exact?.id ?? null;
  } catch {
    interestIdCache.set(name, null);
    return null;
  }
}

async function buildTargeting(
  ctx: MetaContext,
  audience: Audience
): Promise<object> {
  const countries = audience.locations
    .map(countryNameToCode)
    .filter((c): c is string => Boolean(c));
  const base = {
    geo_locations: { countries: countries.length > 0 ? countries : ["US"] },
  };

  if (audience.advantage_plus) {
    return { ...base, targeting_automation: { advantage_audience: 1 } };
  }

  const interests = (
    await Promise.all(
      audience.interests.map(async (name) => ({
        id: await resolveInterestId(ctx, name),
        name,
      }))
    )
  ).filter((i): i is { id: string; name: string } => i.id !== null);

  return {
    ...base,
    age_min: Math.max(audience.age_min, 18),
    age_max: audience.age_max,
    ...(audience.gender === "men"
      ? { genders: [1] }
      : audience.gender === "women"
        ? { genders: [2] }
        : {}),
    ...(interests.length > 0 ? { flexible_spec: [{ interests }] } : {}),
    targeting_automation: { advantage_audience: 0 },
  };
}

interface PublishedAd {
  ad_id: string;
  adset_id: string;
  creative_id: string;
  name: string;
}

async function publishAd(
  ctx: MetaContext,
  campaignId: string,
  objective: CampaignObjective,
  audience: Audience,
  ad: Ad,
  dailyBudgetDollars: number,
  schedule: { start_time?: string; end_time?: string }
): Promise<PublishedAd> {
  if (!ctx.pageId) {
    throw new MetaApiError(
      "No Facebook Page ID on this connection — publishing needs a Page (Settings → Connections)"
    );
  }
  const link = ad.creative.link_url || defaultLinkUrl();
  const imageHash = await uploadImage(ctx, ad.creative.image_url);
  const targeting = await buildTargeting(ctx, audience);
  const account = ctx.adAccountId;

  const adset = await graphPost<{ id: string }>(
    ctx.token,
    `act_${account}/adsets`,
    {
      name: `${ad.name} — ad set`,
      campaign_id: campaignId,
      status: "PAUSED",
      daily_budget: String(Math.max(100, Math.round(dailyBudgetDollars * 100))),
      billing_event: "IMPRESSIONS",
      optimization_goal: OPTIMIZATION_GOAL[objective],
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: JSON.stringify(targeting),
      ...(schedule.start_time ? { start_time: schedule.start_time } : {}),
      ...(schedule.end_time ? { end_time: schedule.end_time } : {}),
    }
  );

  const creative = await graphPost<{ id: string }>(
    ctx.token,
    `act_${account}/adcreatives`,
    {
      name: `${ad.name} — creative`,
      object_story_spec: JSON.stringify({
        page_id: ctx.pageId,
        link_data: {
          message: ad.creative.primary_text,
          name: ad.creative.headline,
          link,
          image_hash: imageHash,
          call_to_action: {
            type: CTA_TO_META[ad.creative.cta] ?? "LEARN_MORE",
            value: { link },
          },
        },
      }),
    }
  );

  const created = await graphPost<{ id: string }>(
    ctx.token,
    `act_${account}/ads`,
    {
      name: ad.name,
      adset_id: adset.id,
      creative: JSON.stringify({ creative_id: creative.id }),
      status: "PAUSED",
    }
  );

  return {
    ad_id: created.id,
    adset_id: adset.id,
    creative_id: creative.id,
    name: ad.name,
  };
}

export async function POST(req: NextRequest) {
  const ctx = await metaContext();
  if (!ctx) {
    return NextResponse.json({ error: "Meta is not configured" }, { status: 400 });
  }
  const account = ctx.adAccountId;
  const body = await req.json();
  const warnings: string[] = [];

  try {
    if (body.mode === "new_campaign") {
      const campaign = body.campaign as Campaign;
      const created = await graphPost<{ id: string }>(
        ctx.token,
        `act_${account}/campaigns`,
        {
          name: campaign.name,
          objective: OBJECTIVE_TO_META[campaign.objective],
          status: "PAUSED",
          special_ad_categories: "[]",
          buying_type: "AUCTION",
        }
      );

      const schedule = {
        start_time: campaign.start_date
          ? `${campaign.start_date}T00:00:00+0000`
          : undefined,
        end_time: campaign.end_date
          ? `${campaign.end_date}T23:59:59+0000`
          : undefined,
      };

      const publishedAds: PublishedAd[] = [];
      for (const ad of campaign.ads) {
        publishedAds.push(
          await publishAd(
            ctx,
            created.id,
            campaign.objective,
            campaign.audience,
            ad,
            ad.budget_share * campaign.daily_budget,
            schedule
          )
        );
      }

      if (campaign.ab_test && publishedAds.length > 1) {
        try {
          const start = Math.floor(Date.now() / 1000) + 3600;
          await graphPost(ctx.token, `act_${account}/ad_studies`, {
            name: `${campaign.name} — A/B test`,
            type: "SPLIT_TEST",
            start_time: String(start),
            end_time: String(start + 7 * 24 * 3600),
            cells: JSON.stringify(
              publishedAds.map((a, i) => ({
                name: `Variant ${String.fromCharCode(65 + i)}`,
                treatment_percentage: Math.floor(100 / publishedAds.length),
                adsets: [a.adset_id],
              }))
            ),
          });
        } catch (err) {
          warnings.push(
            `Ads created, but the formal A/B study could not be set up: ${
              err instanceof Error ? err.message : "unknown error"
            }`
          );
        }
      }

      return NextResponse.json({
        campaign_id: created.id,
        ads: publishedAds,
        warnings,
      });
    }

    if (body.mode === "add_ads") {
      const { campaign_id, daily_budget, objective, audience, ads } = body as {
        campaign_id: string;
        daily_budget: number;
        objective: CampaignObjective;
        audience: Audience;
        ads: Ad[];
      };
      const publishedAds: PublishedAd[] = [];
      for (const ad of ads) {
        publishedAds.push(
          await publishAd(
            ctx,
            campaign_id,
            objective,
            audience,
            ad,
            ad.budget_share * daily_budget,
            {}
          )
        );
      }
      return NextResponse.json({ campaign_id, ads: publishedAds, warnings });
    }

    return NextResponse.json({ error: "Unknown publish mode" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(errorPayload(err), { status: 502 });
  }
}
