"use client";

import { useCampaigns } from "@/lib/campaign-context";
import { VARIATION_META, type AdNodeData } from "@/lib/studio-types";
import {
  Handle,
  NodeToolbar,
  Position,
  useStore,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import {
  Globe,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Send,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCanvasActions } from "../canvas-actions";

type AdNode = Node<AdNodeData, "ad">;

function domainOf(url?: string, fallback?: string): string {
  try {
    if (url) return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // fall through
  }
  return fallback ?? "virtuozo.demo";
}

export default function AdVariationNode({ id, data, selected }: NodeProps<AdNode>) {
  const { deleteNode, regenerateNode, publishNode } = useCanvasActions();
  const { connection } = useCampaigns();
  const generating = data.variation?.status === "generating";
  // When several nodes are selected the shared selection toolbar takes over —
  // suppress this node's own toolbar so they don't stack.
  const multiSelected = useStore(
    (s) => s.nodes.filter((n) => n.selected).length > 1
  );
  const meta = data.variation ? VARIATION_META[data.variation.kind] : null;

  const pageName = connection.page?.name ?? "Virtuozo Demo Store";
  const domain = domainOf(data.link_url, connection.link_domain);

  return (
    <div
      className={`relative w-64 rounded-xl border bg-white shadow-sm transition-shadow ${
        selected ? "border-brand ring-2 ring-brand-soft" : "border-line"
      } ${generating ? "animate-pulse" : ""}`}
    >
      <NodeToolbar
        isVisible={selected && !generating && !multiSelected}
        position={Position.Top}
      >
        <div className="flex gap-1 rounded-lg border border-line bg-white p-1 shadow-md">
          <button
            type="button"
            onClick={() => publishNode(id)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
          >
            <Send className="size-3.5" />
            Publish
          </button>
          {data.variation && (
            <button
              type="button"
              onClick={() => regenerateNode(id)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold hover:bg-surface"
            >
              <RefreshCw className="size-3.5" />
              Regenerate
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteNode(id)}
            className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      </NodeToolbar>

      {/* Node meta strip (above the "post"): source or variation badge + prompt */}
      <div className="flex items-center justify-between gap-2 rounded-t-xl border-b border-line bg-surface px-3 py-1.5">
        {meta ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: meta.softBg, color: meta.color }}
          >
            <Wand2 className="size-2.5" />
            {meta.label}
          </span>
        ) : (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {data.source_label ?? "Ad"}
          </p>
        )}
        {data.variation && (
          <span className="truncate text-[10px] italic text-ink-muted">
            {data.variation.prompt ? `“${data.variation.prompt}”` : "Auto-generated"}
          </span>
        )}
      </div>

      {data.variation?.error && (
        <p className="border-b border-red-100 bg-red-50 px-3 py-1.5 text-[10px] font-semibold text-red-600">
          {data.variation.error}
        </p>
      )}

      {/* Feed post — mirrors how the ad looks on Facebook */}
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {pageName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold leading-tight">{pageName}</p>
          <p className="flex items-center gap-1 text-[10px] text-ink-muted">
            Sponsored · <Globe className="size-2.5" />
          </p>
        </div>
        <MoreHorizontal className="size-4 shrink-0 text-ink-muted" />
      </div>

      {/* `nowheel` lets this area scroll without zooming the canvas */}
      <div className="nowheel max-h-24 min-h-12 overflow-y-auto px-3 pb-2 pt-1.5">
        <p className="text-xs leading-4.5">{data.primary_text}</p>
      </div>

      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={data.image_url}
          alt={data.headline}
          draggable={false}
          style={data.style_filter ? { filter: data.style_filter } : undefined}
          className="h-auto w-full select-none"
        />
        {generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/75 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-brand" />
            <p className="text-xs font-semibold text-ink">
              Generating {data.variation?.kind} variation…
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-b-xl bg-surface px-3 py-2">
        <div className="min-w-0">
          <p
            className={`truncate text-xs font-bold ${generating ? "text-ink-muted" : ""}`}
          >
            {data.headline}
          </p>
          <p className="truncate text-[10px] uppercase text-ink-muted">{domain}</p>
        </div>
        <span className="shrink-0 rounded-md bg-line px-2.5 py-1 text-[11px] font-semibold">
          {data.cta}
        </span>
      </div>

      {/* Incoming connection (variations only) */}
      {data.variation && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          isConnectable={false}
          className="!size-2.5 !border-2 !border-white !bg-ink-muted"
        />
      )}

      {/* Outgoing variation handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="style"
        isConnectable={!generating}
        style={{ top: "42%" }}
        className="!size-4 !border-2 !border-white !bg-brand shadow-md transition-transform hover:!scale-125"
      />
      <span className="pointer-events-none absolute left-full top-[42%] ml-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-bold text-brand shadow-sm">
        Style variation
      </span>

      <Handle
        type="source"
        position={Position.Right}
        id="content"
        isConnectable={!generating}
        style={{ top: "58%" }}
        className="!size-4 !border-2 !border-white !bg-positive shadow-md transition-transform hover:!scale-125"
      />
      <span className="pointer-events-none absolute left-full top-[58%] ml-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-bold text-positive shadow-sm">
        Content variation
      </span>
    </div>
  );
}
