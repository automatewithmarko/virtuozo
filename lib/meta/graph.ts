import "server-only";

/**
 * Thin server-side Meta Graph API client. Tokens come from the signed-in
 * user's saved connections (lib/meta/user-store) and are passed explicitly —
 * there are no global/env token fallbacks.
 */

const VERSION = process.env.META_API_VERSION || "v23.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

export class MetaApiError extends Error {
  code?: number;
  subcode?: number;
  fbtype?: string;
  userMessage?: string;

  constructor(message: string) {
    super(message);
    this.name = "MetaApiError";
  }
}

export function defaultLinkUrl(): string {
  return process.env.META_DEFAULT_LINK_URL || "https://example.com";
}

interface GraphErrorShape {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
  };
}

async function parse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as GraphErrorShape & T;
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    const err = new MetaApiError(
      e.error_user_msg || e.message || `Graph API error (HTTP ${res.status})`
    );
    err.code = e.code;
    err.subcode = e.error_subcode;
    err.fbtype = e.type;
    err.userMessage = e.error_user_msg;
    throw err;
  }
  return json;
}

export async function graphGet<T>(
  token: string,
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${BASE}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  return parse<T>(res);
}

export async function graphPost<T>(
  token: string,
  path: string,
  body: Record<string, string>
): Promise<T> {
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.set(k, v);
  form.set("access_token", token);
  const res = await fetch(`${BASE}/${path.replace(/^\//, "")}`, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  return parse<T>(res);
}

/** Error → JSON-safe payload for API route responses. */
export function errorPayload(err: unknown): { error: string; code?: number } {
  if (err instanceof MetaApiError) {
    return { error: err.message, code: err.code };
  }
  return { error: err instanceof Error ? err.message : "Unknown error" };
}
