import { NextRequest, NextResponse } from "next/server";

/**
 * Stateless credential validation for the open-source build. There is no
 * database — the browser keeps the Meta connections and OpenAI key. This route
 * only checks a credential against the provider (and, for Meta, resolves the
 * ad-account name) before the browser saves it.
 */

const VERSION = process.env.META_API_VERSION || "v23.0";

async function fetchAccountName(
  token: string,
  adAccountId?: string
): Promise<string | null> {
  if (!adAccountId) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${VERSION}/act_${adAccountId}?fields=name&access_token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    const json = await res.json();
    if (res.ok && !json.error) return json.name ?? null;
  } catch {
    // token can't see this account — the id fallback is fine
  }
  return null;
}

async function validateMetaToken(token: string): Promise<string | null> {
  if (token.length < 20) return "That doesn't look like a Meta access token.";
  const res = await fetch(
    `https://graph.facebook.com/${VERSION}/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    return json.error?.message ?? "Meta rejected this token.";
  }
  return null;
}

async function validateOpenAiKey(key: string): Promise<string | null> {
  if (!key.startsWith("sk-")) return "OpenAI keys start with sk-.";
  const res = await fetch("https://api.openai.com/v1/models?limit=1", {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    return json.error?.message ?? "OpenAI rejected this key.";
  }
  return null;
}

const digits = (s?: string) => s?.trim().replace(/\D/g, "") ?? "";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action?: string;
    token?: string;
    ad_account_id?: string;
    openai_key?: string;
  };

  try {
    switch (body.action) {
      case "validate_meta": {
        const token = body.token?.trim() ?? "";
        const error = await validateMetaToken(token);
        if (error) return NextResponse.json({ error }, { status: 400 });
        const account_name = await fetchAccountName(
          token,
          digits(body.ad_account_id) || undefined
        );
        return NextResponse.json({ ok: true, account_name });
      }
      case "validate_openai": {
        const error = await validateOpenAiKey(body.openai_key?.trim() ?? "");
        if (error) return NextResponse.json({ error }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Validation failed" },
      { status: 500 }
    );
  }
}
