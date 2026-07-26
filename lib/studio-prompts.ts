/**
 * Prompt library for Studio's AI generation.
 *
 * Design principles:
 *  - Style variations PRESERVE content, redesign execution. The model is told
 *    exactly what "content" means (quotes, ratings, names, numbers, claims)
 *    and given concrete direct-response design levers to pull.
 *  - Content variations PRESERVE the visual system, replace the message.
 *  - Every prompt pushes toward what performs in the Meta feed: hook-first,
 *    mobile legibility, contrast against white feed UI, one clear idea.
 */

interface SourceAdCopy {
  headline: string;
  primary_text: string;
  cta: string;
}

function adContext(source: SourceAdCopy): string {
  return `For context, the ad's current copy is — headline: "${source.headline}"; primary text: "${source.primary_text}"; call-to-action button: "${source.cta}".`;
}

// ---------------------------------------------------------------------------
// Editable prompt blocks — the Prompt Book (Settings) can override any of
// these; the defaults below ship with the product.
// ---------------------------------------------------------------------------

export interface PromptBlocks {
  style_preserve: string;
  style_redesign: string;
  content_preserve: string;
  copy_system: string;
}

const STYLE_PRESERVE = `This is a paid social ad creative. First, identify what kind of ad it is (customer review/testimonial, comparison, product shot, offer/discount, UGC-style, feature callout, etc.) and identify its CONTENT: every piece of text on the image (quotes, star ratings, reviewer names, prices, percentages, product names, claims), the product or subject being shown, and the core message. All of that content must be preserved EXACTLY — same words, same numbers, same meaning. If it is a review ad, it must stay the same review, word for word, with the same rating.`;

const STYLE_REDESIGN = `Now completely redesign the VISUAL EXECUTION into a noticeably different style with higher scroll-stopping potential in the Facebook/Instagram feed. Change the layout and composition, the color palette, the background, the typography system, and the framing device — not the content. Make deliberate direct-response choices: one dominant focal point; a clear visual hierarchy where the most persuasive element (the quote, the rating, the price, the claim) is the largest and read first; strong contrast against a white feed background; big, extremely legible type sized for a phone screen; generous spacing; no clutter, no tiny text, no more than two font families. The result must look like a completely different, more premium, more thumb-stopping ad for the exact same message — the kind a top-performing DTC brand would run. Keep it brand-safe and realistic; do not add watermarks, platform UI, or fake buttons.`;

const CONTENT_PRESERVE = `This is a paid social ad creative. Study its VISUAL SYSTEM precisely: the color palette, typography (typefaces, weights, sizes, alignment), layout grid and composition, background treatment, framing devices, iconography, photography/illustration style, and overall mood. That visual system must be preserved so faithfully that the new ad looks like it came from the same design file by the same designer — an obvious sibling in the same campaign family.`;

export function buildStyleImagePrompt(
  userDirection: string | null,
  source: SourceAdCopy,
  blocks: PromptBlocks = DEFAULT_PROMPT_BLOCKS
): string {
  const direction = userDirection
    ? `Style direction from the advertiser, follow it while keeping all content intact: "${userDirection}".`
    : `No specific direction was given: you choose the single most promising alternative style yourself. Pick the style a senior creative strategist would test next against this ad (for example: bold editorial typography on a solid color, clean studio product aesthetic, lo-fi UGC/organic look, dark premium palette, playful color-blocked layout) — whichever contrasts most with the current execution while fitting the message.`;
  return [blocks.style_preserve, blocks.style_redesign, direction, adContext(source)].join(
    "\n\n"
  );
}

export function buildContentImagePrompt(
  contentDescription: string | null,
  source: SourceAdCopy,
  blocks: PromptBlocks = DEFAULT_PROMPT_BLOCKS
): string {
  const replacement = contentDescription
    ? `Replace the CONTENT of the ad with this new concept, expressing it in the same visual system: "${contentDescription}". Translate the concept into the strongest possible on-image execution: if it's a comparison, a clean two-column us-vs-them; if it's a review, a quote with star rating; if it's an offer, the discount as the hero element. Keep any product imagery consistent with the original product.`
    : `Invent the single most promising alternative MESSAGE for this ad while keeping the visual system identical. Pick a different proven direct-response angle than the current one (if it's a review, try a comparison or a bold offer; if it's a product shot, try social proof or a stat-led claim) and execute it as the hero of the image.`;
  return [blocks.content_preserve, replacement, `On-image text must be short, large and phone-legible. All claims must come from the concept described — do not invent specific fake statistics, prices or named reviews unless they were provided.`, adContext(source)].join("\n\n");
}

// ---------------------------------------------------------------------------
// COPY (headline + primary text) — used for content variations
// ---------------------------------------------------------------------------

export const COPY_SYSTEM = `You are a senior direct-response copywriter who has spent $100M+ on Meta ads. You write copy that stops the scroll and converts, without hype or clickbait.

Rules you always follow:
- The primary text opens with a hook in the first 6–10 words — a specific benefit, tension, or curiosity gap — because everything after two lines is truncated behind "See more".
- 1–3 short sentences total. Concrete beats clever. One idea per ad. No emoji walls (max one, only if it earns its place), no ALL CAPS, no exclamation marks stacked.
- The headline (the bold line next to the CTA button) is a punchy ≤40-character payoff or offer, never a repeat of the primary text.
- Match the message to the awareness level implied by the concept: cold audiences get the problem/outcome, warm audiences get proof and specificity, hot audiences get the offer and urgency.
- Never fabricate specific numbers, testimonials, or guarantees that weren't provided.

Respond with JSON: { "headline": string, "primary_text": string }.`;

export const DEFAULT_PROMPT_BLOCKS: PromptBlocks = {
  style_preserve: STYLE_PRESERVE,
  style_redesign: STYLE_REDESIGN,
  content_preserve: CONTENT_PRESERVE,
  copy_system: COPY_SYSTEM,
};

/** Prompt Book metadata for the Settings UI. */
export const PROMPT_BLOCK_META: Record<
  keyof PromptBlocks,
  { title: string; description: string }
> = {
  style_preserve: {
    title: "Style variation — what must be preserved",
    description:
      "Tells the image model what counts as content (reviews, ratings, prices, claims) and that it must survive the restyle untouched.",
  },
  style_redesign: {
    title: "Style variation — how to redesign",
    description:
      "The creative brief for the new look: what to change and the direct-response design rules the new style must follow.",
  },
  content_preserve: {
    title: "Content variation — keeping the visual system",
    description:
      "Tells the image model how faithfully to preserve the design (palette, typography, layout) while the message changes.",
  },
  copy_system: {
    title: "Copywriting system prompt",
    description:
      "The persona and rules for headline & primary-text generation on content variations.",
  },
};

export function buildContentCopyUser(
  contentDescription: string | null,
  source: SourceAdCopy
): string {
  const base = `Here is the current ad copy.\nHeadline: "${source.headline}"\nPrimary text: "${source.primary_text}"\nCTA button: "${source.cta}"\n\n`;
  return contentDescription
    ? `${base}Write new copy for a variation of this ad based on this concept, keeping the same brand voice and the same offer/product: "${contentDescription}".`
    : `${base}Write new copy for the most promising alternative angle for the same product/offer — a different proven direct-response approach than the current one (e.g. social proof → comparison, feature → outcome, description → offer). Same brand voice.`;
}

// ---------------------------------------------------------------------------
// CAPTION/HEADLINE REWRITE — style variations keep content but can get a
// light copy polish when explicitly requested later; exported for reuse.
// ---------------------------------------------------------------------------

export function buildRewriteCopyUser(source: SourceAdCopy): string {
  return `Here is existing ad copy that already works — same message, same offer.\nHeadline: "${source.headline}"\nPrimary text: "${source.primary_text}"\nCTA button: "${source.cta}"\n\nRewrite both to be sharper and more scroll-stopping while keeping the exact same message, claims and offer. Do not change what is being said — only how well it is said.`;
}
