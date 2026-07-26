import { errorPayload, graphPost } from "@/lib/meta/graph";
import { metaContext } from "@/lib/meta/user-store";
import { NextRequest, NextResponse } from "next/server";

/**
 * Whitelisted in-place updates on live Meta objects:
 *  - status: ACTIVE | PAUSED (campaigns, ad sets, ads)
 *  - daily_budget_cents (ad sets)
 * Nothing destructive is exposed.
 */
export async function POST(req: NextRequest) {
  const ctx = await metaContext();
  if (!ctx) {
    return NextResponse.json({ error: "Meta is not configured" }, { status: 400 });
  }
  const { id, fields } = (await req.json()) as {
    id: string;
    fields: { status?: string; daily_budget_cents?: number };
  };

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid object id" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (fields.status === "ACTIVE" || fields.status === "PAUSED") {
    updates.status = fields.status;
  }
  if (
    typeof fields.daily_budget_cents === "number" &&
    fields.daily_budget_cents >= 100
  ) {
    updates.daily_budget = String(Math.round(fields.daily_budget_cents));
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates" }, { status: 400 });
  }

  try {
    await graphPost(ctx.token, id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(errorPayload(err), { status: 502 });
  }
}
