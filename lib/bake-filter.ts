/**
 * Canvas-based image utilities (client-side).
 */

/**
 * Remote images (e.g. Meta CDN creatives) would taint the canvas and make
 * toDataURL throw — route them through our same-origin proxy.
 */
function canvasSafeSrc(src: string): string {
  if (
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.startsWith("/") ||
    (typeof window !== "undefined" && src.startsWith(window.location.origin))
  ) {
    return src;
  }
  return `/api/proxy-image?url=${encodeURIComponent(src)}`;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = canvasSafeSrc(src);
  await img.decode();
  return img;
}

/**
 * Render any image source (SVG, data URL, remote) to a PNG data URL,
 * optionally baking a CSS filter in. Used to prepare AI-edit inputs.
 * Returns dimensions so generation can match the source aspect ratio.
 */
export async function rasterizeToPng(
  src: string,
  filter?: string,
  maxDim = 1024
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(src);
  const w = img.naturalWidth || maxDim;
  const h = img.naturalHeight || maxDim;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  if (filter && typeof ctx.filter === "string") ctx.filter = filter;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Compress a (typically AI-generated PNG) data URL to JPEG so canvases
 * stay well under the localStorage quota.
 */
export async function compressToJpeg(
  src: string,
  maxDim = 1024,
  quality = 0.85
): Promise<string> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Bake a CSS filter into actual image pixels via canvas. Meta's /adimages
 * endpoint needs a real image file — it can't apply CSS filters — so style
 * variations are flattened at publish time. Falls back to keeping the CSS
 * filter (demo-only rendering) if the canvas 2D filter API is unavailable.
 */
export async function bakeImageFilter(
  src: string,
  filter?: string
): Promise<{ image_url: string; image_filter?: string }> {
  if (!filter) return { image_url: src };
  try {
    const img = await loadImage(src);

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1080;
    canvas.height = img.naturalHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof ctx.filter !== "string") {
      return { image_url: src, image_filter: filter };
    }
    ctx.filter = filter;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { image_url: canvas.toDataURL("image/png") };
  } catch {
    return { image_url: src, image_filter: filter };
  }
}
