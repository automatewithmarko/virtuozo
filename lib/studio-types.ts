import type { Edge, Node } from "@xyflow/react";

export type VariationKind = "style" | "content";

export interface VariationInfo {
  kind: VariationKind;
  /** null = auto-generated */
  prompt: string | null;
  status: "generating" | "ready";
  /** Set when the last generation attempt failed — shown on the node */
  error?: string;
  /** CSS filter string that mocks the AI restyle */
  style_filter?: string;
  /** Advertiser-uploaded reference images (compressed data URLs) sent to the model */
  reference_images?: string[];
  /** When true, regenerate the caption (hook + CTA) instead of keeping the source's */
  regenerate_caption?: boolean;
  [key: string]: unknown;
}

export interface AdNodeData {
  image_url: string;
  headline: string;
  primary_text: string;
  cta: string;
  /** Destination URL inherited from the source ad */
  link_url?: string;
  /** e.g. "Summer Sale 2026 · Sunny hero" — set on root ad nodes */
  source_label?: string;
  /** Where this ad (or its root ancestor) came from — used by Publish */
  campaign_id?: string;
  campaign_name?: string;
  ad_name?: string;
  /** Inherited + own style filter applied to the creative */
  style_filter?: string;
  /** Present on variation nodes only */
  variation?: VariationInfo;
  [key: string]: unknown;
}

export type AdFlowNode = Node<AdNodeData, "ad">;

export interface StudioCanvas {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  nodes: AdFlowNode[];
  edges: Edge[];
}

export const VARIATION_META: Record<
  VariationKind,
  { label: string; color: string; softBg: string }
> = {
  style: { label: "Style variation", color: "#1877F2", softBg: "#E7F0FE" },
  content: { label: "Content variation", color: "#31A24C", softBg: "#E6F4EA" },
};
