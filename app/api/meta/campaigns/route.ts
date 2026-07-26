import { errorPayload, graphGet } from "@/lib/meta/graph";
import {
  collectEnrichmentRefs,
  transformCampaigns,
  type Enrichment,
  type RawCampaign,
} from "@/lib/meta/transform";
import { metaContext } from "@/lib/meta/user-store";
import { NextRequest, NextResponse } from "next/server";

const CAMPAIGN_FIELDS = [
  "id",
  "name",
  "objective",
  "status",
  "effective_status",
  "daily_budget",
  "created_time",
  "start_time",
  "stop_time",
  "insights.date_preset(maximum){impressions,clicks,spend,reach,actions}",
  "adsets.limit(50){id,name,status,daily_budget,start_time,end_time,targeting}",
  // thumbnail_width/height: Meta's default thumbnail_url is 64px (pixelated)
  "ads.limit(100){id,name,status,effective_status,adset_id," +
    "creative.thumbnail_width(1080).thumbnail_height(1080)" +
    "{id,title,body,image_url,thumbnail_url,call_to_action_type,video_id,object_story_spec}," +
    "insights.date_preset(maximum){impressions,clicks,spend,reach,actions}}",
].join(",");

/** Resolve video sources/posters and carousel image hashes in follow-ups. */
async function fetchEnrichment(
  token: string,
  account: string,
  raw: RawCampaign[]
): Promise<Enrichment> {
  const { videoIds, imageHashes } = collectEnrichmentRefs(raw);
  const enrichment: Enrichment = { videos: {}, images: {} };

  if (videoIds.length > 0) {
    try {
      const res = await graphGet<
        Record<string, { source?: string; picture?: string }>
      >(token, "", {
        ids: videoIds.slice(0, 50).join(","),
        fields: "source,picture",
      });
      for (const [id, v] of Object.entries(res)) {
        enrichment.videos![id] = { source: v.source, picture: v.picture };
      }
    } catch {
      // No video permission — posters fall back to creative thumbnails.
    }
  }

  if (imageHashes.length > 0) {
    try {
      const res = await graphGet<{ data: { hash: string; url: string }[] }>(
        token,
        `act_${account}/adimages`,
        {
          hashes: JSON.stringify(imageHashes.slice(0, 100)),
          fields: "hash,url",
        }
      );
      for (const img of res.data) enrichment.images![img.hash] = img.url;
    } catch {
      // Carousel cards fall back to their `picture` field when present.
    }
  }

  return enrichment;
}

export async function GET(req: NextRequest) {
  const ctx = await metaContext();
  if (!ctx) {
    return NextResponse.json({ error: "Meta is not configured" }, { status: 400 });
  }
  const account = req.nextUrl.searchParams.get("account") || ctx.adAccountId;
  try {
    const res = await graphGet<{ data: RawCampaign[] }>(
      ctx.token,
      `act_${account}/campaigns`,
      { fields: CAMPAIGN_FIELDS, limit: "50" }
    );
    const enrichment = await fetchEnrichment(ctx.token, account, res.data);
    return NextResponse.json({
      campaigns: transformCampaigns(res.data, enrichment),
    });
  } catch (err) {
    return NextResponse.json(errorPayload(err), { status: 502 });
  }
}
