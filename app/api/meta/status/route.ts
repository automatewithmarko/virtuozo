import { defaultLinkUrl, errorPayload, graphGet } from "@/lib/meta/graph";
import { metaContext } from "@/lib/meta/user-store";
import { NextResponse } from "next/server";

interface AccountInfo {
  name: string;
  currency: string;
  account_status: number;
}

export async function GET() {
  const ctx = await metaContext();
  if (!ctx) {
    return NextResponse.json({ mode: "demo" });
  }
  try {
    const info = await graphGet<AccountInfo>(ctx.token, `act_${ctx.adAccountId}`, {
      fields: "name,currency,account_status",
    });

    let page: { id: string; name: string } | undefined;
    if (ctx.pageId) {
      try {
        const p = await graphGet<{ name: string }>(ctx.token, ctx.pageId, {
          fields: "name",
        });
        page = { id: ctx.pageId, name: p.name };
      } catch {
        // missing pages permission — previews fall back to a placeholder name
      }
    }

    let link_domain: string | undefined;
    try {
      link_domain = new URL(defaultLinkUrl()).hostname.replace(/^www\./, "");
    } catch {
      // unset/invalid default link
    }

    return NextResponse.json({
      mode: "live",
      account: { id: ctx.adAccountId, name: info.name, currency: info.currency },
      page,
      link_domain,
    });
  } catch (err) {
    return NextResponse.json({ mode: "error", ...errorPayload(err) });
  }
}
