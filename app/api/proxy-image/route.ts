import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin image proxy so canvas rasterization of remote ad creatives
 * (Meta CDN) doesn't taint the canvas. Host-allowlisted to avoid being an
 * open proxy.
 */

const ALLOWED_HOST_SUFFIXES = [
  ".fbcdn.net",
  ".facebook.com",
  ".fbsbx.com",
  ".akamaihd.net",
  ".cdninstagram.com",
];

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const hostAllowed =
    url.protocol === "https:" &&
    ALLOWED_HOST_SUFFIXES.some(
      (suffix) => url.hostname.endsWith(suffix) || url.hostname === suffix.slice(1)
    );
  if (!hostAllowed) {
    return NextResponse.json(
      { error: `Host not allowed: ${url.hostname}` },
      { status: 403 }
    );
  }

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: 502 }
    );
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
