import { getPowerBrixKey } from "@/lib/meta/user-store";
import { NextRequest, NextResponse } from "next/server";

/**
 * Studio AI generation. The user's PowerBrix key (mnt_…) arrives on the
 * x-powerbrix-key header (from the browser); image + text generation go through
 * the PowerBrix Super API — an OpenAI-compatible router — instead of calling
 * OpenAI directly. We edit the source ad with the image model and, when asked,
 * stream fresh copy with the text model. The response is NDJSON so the canvas
 * can show copy tokens live and the image as the final event.
 *
 * Runs on the Node runtime so long image edits aren't cut off — for a
 * self-hosted app there's no serverless timeout in the way.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// PowerBrix Super API — OpenAI-compatible router. api.powerbrix.ai and
// platform.thementorprogram.xyz serve the same gateway.
const POWERBRIX_BASE = process.env.POWERBRIX_BASE_URL || "https://api.powerbrix.ai";
// Model ids are the gateway's namespaced slugs (provider/model).
const IMAGE_MODEL = process.env.POWERBRIX_IMAGE_MODEL || "openai/gpt-image-2";
const TEXT_MODEL = process.env.POWERBRIX_TEXT_MODEL || "openai/gpt-5";

interface GenerateBody {
  image_png: string;
  width?: number;
  height?: number;
  image_prompt: string;
  reference_images?: string[];
  copy_system?: string;
  copy_user?: string;
}

type StreamEvent =
  | { type: "ping" }
  | { type: "copy_delta"; headline?: string; primary_text?: string }
  | { type: "copy"; headline: string; primary_text: string }
  | { type: "image"; image_url: string }
  | { type: "error"; message: string };

function fail(status: number, code: string, error: string): NextResponse {
  return NextResponse.json({ code, error }, { status });
}

/** gpt-image supports arbitrary sizes; match the source aspect where we can. */
function matchingSize(width?: number, height?: number): string {
  if (!width || !height) return "1024x1024";
  const ratio = Math.min(3, Math.max(1 / 3, width / height));
  const snap = (n: number) => Math.max(16, Math.round(n / 16) * 16);
  return ratio >= 1
    ? `${1024}x${snap(1024 / ratio)}`
    : `${snap(1024 * ratio)}x${1024}`;
}

async function apiErrorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error?.message ?? `HTTP ${res.status}`;
}

/**
 * Edit the source image with a prompt via PowerBrix's /images/edits router;
 * returns a PNG data URL. The endpoint accepts base64/data-URL images inline
 * (JSON body) and swaps in the model's edit variant for us — no multipart.
 */
async function imageEdit(
  apiKey: string,
  imageDataUrl: string,
  prompt: string,
  size: string,
  references: string[] = []
): Promise<string> {
  const body: Record<string, unknown> = { model: IMAGE_MODEL, size, n: 1 };
  if (references.length) {
    // Multiple inputs: first the ad to edit, then the reference images.
    body.images = [imageDataUrl, ...references];
    body.prompt = `${prompt}\n\nThe FIRST input image is the ad creative to edit. The other ${references.length} input image(s) are reference images uploaded by the advertiser — use them as visual/content reference exactly as the instructions above direct, but the output must still be an edit of the first image.`;
  } else {
    body.image = imageDataUrl;
    body.prompt = prompt;
  }

  const res = await fetch(`${POWERBRIX_BASE}/api/v1/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PowerBrix image generation failed: ${await apiErrorMessage(res)}`);
  }
  const data = (await res.json()) as {
    data: { b64_json?: string; url?: string }[];
  };
  const first = data.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  throw new Error("PowerBrix returned no image — try again.");
}

async function streamCopy(
  apiKey: string,
  system: string,
  user: string,
  onDelta: (rawJson: string) => void
): Promise<{ headline: string; primary_text: string }> {
  const res = await fetch(`${POWERBRIX_BASE}/api/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ad_copy",
          strict: true,
          schema: {
            type: "object",
            properties: {
              headline: {
                type: "string",
                description: "Punchy ad headline, max ~40 characters",
              },
              primary_text: {
                type: "string",
                description:
                  "Primary text above the creative: hook first, 1–3 short sentences",
              },
            },
            required: ["headline", "primary_text"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`PowerBrix copywriting failed: ${await apiErrorMessage(res)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const delta = JSON.parse(data).choices?.[0]?.delta?.content;
      if (delta) {
        content += delta;
        onDelta(content);
      }
    }
  }
  return JSON.parse(content);
}

function extractPartialCopy(raw: string): {
  headline?: string;
  primary_text?: string;
} {
  const grab = (key: string): string | undefined => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`));
    if (!m) return undefined;
    const partial = m[1].replace(/\\$/, "");
    try {
      return JSON.parse(`"${partial}"`) as string;
    } catch {
      return partial;
    }
  };
  return { headline: grab("headline"), primary_text: grab("primary_text") };
}

export async function POST(req: NextRequest) {
  const apiKey = await getPowerBrixKey();
  if (!apiKey) {
    return fail(
      422,
      "NO_API_KEY",
      "No PowerBrix API key — add it in Settings → PowerBrix."
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return fail(400, "BAD_REQUEST", "Request body was not valid JSON.");
  }
  if (!body.image_png?.startsWith("data:image/") || !body.image_prompt) {
    return fail(400, "BAD_REQUEST", "Missing source image or prompt.");
  }

  const size = matchingSize(body.width, body.height);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      const heartbeat = setInterval(() => send({ type: "ping" }), 5000);

      (async () => {
        const imagePromise = imageEdit(
          apiKey,
          body.image_png,
          body.image_prompt,
          size,
          body.reference_images ?? []
        );
        imagePromise.catch(() => {});

        if (body.copy_system && body.copy_user) {
          const copy = await streamCopy(
            apiKey,
            body.copy_system,
            body.copy_user,
            (raw) => {
              const partial = extractPartialCopy(raw);
              if (partial.headline || partial.primary_text) {
                send({ type: "copy_delta", ...partial });
              }
            }
          );
          send({ type: "copy", ...copy });
        }

        send({ type: "image", image_url: await imagePromise });
      })()
        .catch((err) =>
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Generation failed",
          })
        )
        .finally(() => {
          clearInterval(heartbeat);
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
