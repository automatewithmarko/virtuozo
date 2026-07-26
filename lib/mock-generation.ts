import type { AdNodeData } from "./studio-types";

/**
 * Mock AI generation. Style variations re-render the same creative through a
 * CSS filter; content variations rewrite the copy from the prompt. Both keep
 * everything else identical, mirroring how the real image model will behave.
 */

interface StylePreset {
  name: string;
  filter: string;
  keywords: string[];
}

const STYLE_PRESETS: StylePreset[] = [
  {
    name: "warm film",
    filter: "sepia(0.45) saturate(1.3) contrast(1.05)",
    keywords: ["warm", "film", "vintage", "retro", "golden"],
  },
  {
    name: "cool editorial",
    filter: "hue-rotate(35deg) saturate(0.85) brightness(1.05)",
    keywords: ["cool", "editorial", "calm", "blue", "clean"],
  },
  {
    name: "high-contrast mono",
    filter: "grayscale(1) contrast(1.35) brightness(1.05)",
    keywords: ["black", "white", "mono", "minimal", "b&w", "noir"],
  },
  {
    name: "vivid pop",
    filter: "saturate(1.9) contrast(1.15)",
    keywords: ["vivid", "pop", "bold", "bright", "punchy", "colorful"],
  },
  {
    name: "faded matte",
    filter: "saturate(0.6) brightness(1.12) contrast(0.88)",
    keywords: ["faded", "matte", "soft", "pastel", "muted"],
  },
  {
    name: "dark & moody",
    filter: "brightness(0.72) contrast(1.25) saturate(1.15)",
    keywords: ["dark", "moody", "dramatic", "night", "premium"],
  },
  {
    name: "neon shift",
    filter: "hue-rotate(140deg) saturate(1.6) contrast(1.1)",
    keywords: ["neon", "cyber", "futuristic", "electric", "synth"],
  },
  {
    name: "sun-washed",
    filter: "hue-rotate(-20deg) saturate(1.2) brightness(1.15)",
    keywords: ["sunny", "summer", "beach", "light", "airy"],
  },
];

const AUTO_HEADLINES = [
  (h: string) => `${h} — see why everyone's switching`,
  (h: string) => `Rated 4.9★: ${h.toLowerCase()}`,
  (h: string) => `Last chance: ${h.toLowerCase()}`,
  (h: string) => `The smarter way — ${h.toLowerCase()}`,
];

const AUTO_SUBTEXTS = [
  "Thousands of happy customers can't be wrong. See what the hype is about.",
  "Compared side-by-side, it's not even close. Find out for yourself.",
  "Loved by 12,000+ customers. Try it risk-free with easy returns.",
  "Why settle? Get more for less — today only.",
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const GENERATION_MS = 2500;

export async function generateStyleVariation(
  prompt: string | null,
  source: AdNodeData
): Promise<Partial<AdNodeData>> {
  await delay(GENERATION_MS);

  let preset: StylePreset | undefined;
  if (prompt) {
    const p = prompt.toLowerCase();
    preset = STYLE_PRESETS.find((s) => s.keywords.some((k) => p.includes(k)));
  }
  // Avoid re-picking the exact filter already on the source.
  preset ??= pick(STYLE_PRESETS.filter((s) => s.filter !== source.style_filter));

  return { style_filter: preset.filter };
}

export async function generateContentVariation(
  prompt: string | null,
  source: AdNodeData
): Promise<Partial<AdNodeData>> {
  await delay(GENERATION_MS);

  if (!prompt) {
    return {
      headline: pick(AUTO_HEADLINES)(source.headline),
      primary_text: pick(AUTO_SUBTEXTS),
    };
  }

  const p = prompt.toLowerCase();
  if (p.includes("comparison") || p.includes(" vs") || p.includes("versus")) {
    const vsMatch = prompt.match(/(?:vs\.?|versus)\s+([\w .&'-]+)/i);
    const rival = vsMatch ? vsMatch[1].trim().replace(/[.,;].*$/, "") : "the rest";
    return {
      headline: `Us vs. ${rival} — see the difference`,
      primary_text: `We put them side by side so you don't have to. Better value, better results than ${rival}. The numbers speak for themselves.`,
    };
  }
  if (p.includes("review") || p.includes("testimonial")) {
    return {
      headline: "“I'll never go back” — ★★★★★",
      primary_text:
        "Real reviews from real customers. Join 12,000+ five-star fans and see what you've been missing.",
    };
  }
  if (p.includes("discount") || p.includes("sale") || p.includes("offer") || p.includes("%")) {
    return {
      headline: "Limited-time offer — don't miss it",
      primary_text: `${prompt.replace(/^[a-z]/, (c) => c.toUpperCase())}. Only while stock lasts.`,
    };
  }
  if (p.includes("urgency") || p.includes("scarcity") || p.includes("last chance")) {
    return {
      headline: "Almost gone — last chance",
      primary_text: "Stock is running low and this won't come back. Get yours before it's too late.",
    };
  }

  // Generic: build copy around the prompt itself.
  const clean = prompt.trim().replace(/[.?!]+$/, "");
  return {
    headline: clean.length <= 45 ? clean.replace(/^[a-z]/, (c) => c.toUpperCase()) : `${clean.slice(0, 42)}…`,
    primary_text: `${clean.replace(/^[a-z]/, (c) => c.toUpperCase())} — crafted in the same style you already love.`,
  };
}
