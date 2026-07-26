import { errorPayload, graphGet } from "@/lib/meta/graph";
import { metaContext } from "@/lib/meta/user-store";
import { NextRequest, NextResponse } from "next/server";

const PERIOD_TO_PRESET: Record<string, string> = {
  "7d": "last_7d",
  "30d": "last_30d",
  max: "maximum",
};

interface AccountInsightsRow {
  impressions?: string;
  clicks?: string;
  spend?: string;
}

/**
 * Account-level insights straight from Meta — the same numbers Ads Manager's
 * account view shows for the selected date range (not client-side estimates).
 */
export async function GET(req: NextRequest) {
  const ctx = await metaContext();
  if (!ctx) {
    return NextResponse.json({ error: "Meta is not configured" }, { status: 400 });
  }
  const account = req.nextUrl.searchParams.get("account") || ctx.adAccountId;
  const preset =
    PERIOD_TO_PRESET[req.nextUrl.searchParams.get("period") ?? "30d"] ??
    "last_30d";

  try {
    const res = await graphGet<{ data: AccountInsightsRow[] }>(
      ctx.token,
      `act_${account}/insights`,
      { fields: "impressions,clicks,spend", date_preset: preset }
    );
    const row = res.data?.[0] ?? {};
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const spend = Number(row.spend ?? 0);
    return NextResponse.json({
      impressions,
      clicks,
      spend,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    });
  } catch (err) {
    return NextResponse.json(errorPayload(err), { status: 502 });
  }
}
