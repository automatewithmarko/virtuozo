import "server-only";
import { headers } from "next/headers";

/**
 * In the open-source build there is no database. Credentials live in the user's
 * browser and are forwarded on each request as headers (see lib/browser-store
 * → apiFetch). These helpers just read them back out — the API route handlers
 * don't change.
 */

/** Resolved per-request Meta context, or null when not connected. */
export interface MetaContext {
  token: string;
  adAccountId: string;
  pageId: string;
}

export async function metaContext(): Promise<MetaContext | null> {
  const h = await headers();
  const token = h.get("x-meta-token")?.trim();
  const adAccountId = h.get("x-meta-account")?.trim();
  if (!token || !adAccountId) return null;
  return { token, adAccountId, pageId: h.get("x-meta-page")?.trim() || "" };
}

export async function getPowerBrixKey(): Promise<string | null> {
  const h = await headers();
  return h.get("x-powerbrix-key")?.trim() || null;
}
