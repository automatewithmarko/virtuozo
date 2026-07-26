import { errorPayload, graphGet } from "@/lib/meta/graph";
import { metaContext } from "@/lib/meta/user-store";
import { NextResponse } from "next/server";

interface AdAccountsResponse {
  data: { name: string; account_id: string }[];
}

export async function GET() {
  const ctx = await metaContext();
  if (!ctx) {
    return NextResponse.json({ accounts: [] });
  }
  try {
    const res = await graphGet<AdAccountsResponse>(ctx.token, "me/adaccounts", {
      fields: "name,account_id",
      limit: "50",
    });
    return NextResponse.json({
      accounts: res.data.map((a) => ({ id: a.account_id, name: a.name })),
    });
  } catch (err) {
    return NextResponse.json(errorPayload(err), { status: 502 });
  }
}
