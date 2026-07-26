"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { compressToJpeg, rasterizeToPng } from "@/lib/bake-filter";
import {
  generateContentVariation,
  generateStyleVariation,
} from "@/lib/mock-generation";
import { useStudio } from "@/lib/studio-store";
import {
  DEFAULT_PROMPT_BLOCKS,
  buildContentCopyUser,
  buildContentImagePrompt,
  buildRewriteCopyUser,
  buildStyleImagePrompt,
} from "@/lib/studio-prompts";
import { apiFetch, getPromptOverrides } from "@/lib/browser-store";
import {
  VARIATION_META,
  type AdFlowNode,
  type AdNodeData,
  type StudioCanvas,
  type VariationKind,
} from "@/lib/studio-types";
import type { Ad, Campaign } from "@/lib/types";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  NodeToolbar,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type OnConnectEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Check,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddAdPanel, {
  customAdToRootNode,
  type CustomAdInput,
} from "./AddAdPanel";
import { CanvasActionsContext } from "./canvas-actions";
import AdVariationNode from "./nodes/AdVariationNode";
import { adToRootNode } from "./NewCanvasModal";
import PublishModal from "./PublishModal";
import VariationDialog, { type VariationRequest } from "./VariationDialog";

const nodeTypes = { ad: AdVariationNode };

function Editor({ canvas }: { canvas: StudioCanvas }) {
  const { saveCanvas, renameCanvas } = useStudio();
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<AdFlowNode>(canvas.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(canvas.edges);
  const [request, setRequest] = useState<VariationRequest | null>(null);
  const [addAdOpen, setAddAdOpen] = useState(false);
  const [publishData, setPublishData] = useState<AdNodeData[] | null>(null);
  const [name, setName] = useState(canvas.name);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  // Debounced autosave to localStorage.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaveState("saving");
    const t = setTimeout(() => {
      saveCanvas(canvas.id, nodes, edges);
      setSaveState("saved");
    }, 600);
    return () => clearTimeout(t);
  }, [nodes, edges, canvas.id, saveCanvas]);

  const runGeneration = useCallback(
    async (
      nodeId: string,
      kind: VariationKind,
      prompt: string | null,
      sourceData: AdNodeData,
      referenceImages?: string[],
      regenerateCaption?: boolean
    ) => {
      let patch: Partial<AdNodeData>;
      let error: string | undefined;

      try {
        // Prepare the source: bake CSS filters, convert SVG/local to PNG.
        const raster = await rasterizeToPng(
          sourceData.image_url,
          sourceData.style_filter
        );
        // Prompt Book blocks: defaults + the user's overrides (from the
        // browser). Generation runs on our stateless /api/studio/generate
        // route, which uses the OpenAI key apiFetch forwards from the browser.
        const blocks = { ...DEFAULT_PROMPT_BLOCKS, ...getPromptOverrides() };

        const sourceCopy = {
          headline: sourceData.headline,
          primary_text: sourceData.primary_text,
          cta: sourceData.cta,
        };
        let res: Response;
        try {
          res = await apiFetch(
            "/api/studio/generate",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                image_png: raster.dataUrl,
                width: raster.width,
                height: raster.height,
                ...(referenceImages?.length
                  ? { reference_images: referenceImages }
                  : {}),
                image_prompt:
                  kind === "style"
                    ? buildStyleImagePrompt(prompt, sourceCopy, blocks)
                    : buildContentImagePrompt(prompt, sourceCopy, blocks),
                // Caption: only regenerate when asked. A content variation
                // gets fresh copy for its new concept; a style variation keeps
                // the message but sharpens the hook & CTA.
                ...(regenerateCaption
                  ? {
                      copy_system: blocks.copy_system,
                      copy_user:
                        kind === "content"
                          ? buildContentCopyUser(prompt, sourceCopy)
                          : buildRewriteCopyUser(sourceCopy),
                    }
                  : {}),
              }),
            }
          );
        } catch {
          throw new Error(
            "Couldn't reach the generation service — check your internet connection and hit Regenerate."
          );
        }

        if (!res.ok || !res.body) {
          const json = await res.json().catch(() => ({}));
          if (json.code === "NO_API_KEY") {
            // Simulated fallback keeps the canvas usable without a key.
            patch =
              kind === "style"
                ? await generateStyleVariation(prompt, sourceData)
                : await generateContentVariation(prompt, sourceData);
            error = `${json.error} This is a simulated preview, not a real AI generation.`;
          } else {
            throw new Error(
              json.error ??
                `Generation service error (HTTP ${res.status}) — hit Regenerate.`
            );
          }
        } else {
          // NDJSON stream: copy text arrives token-by-token (patched onto the
          // node live), the image lands as the final event.
          const streamPatch = (p: Partial<AdNodeData>) =>
            setNodes((ns) =>
              ns.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, ...p } } : n
              )
            );
          let imageUrl: string | undefined;
          let copy: Partial<Pick<AdNodeData, "headline" | "primary_text">> = {};
          const handleEvent = (event: {
            type: string;
            image_url?: string;
            headline?: string;
            primary_text?: string;
            message?: string;
          }) => {
            if (event.type === "copy_delta" || event.type === "copy") {
              copy = {
                ...copy,
                ...(event.headline ? { headline: event.headline } : {}),
                ...(event.primary_text
                  ? { primary_text: event.primary_text }
                  : {}),
              };
              streamPatch(copy);
            } else if (event.type === "image") {
              imageUrl = event.image_url;
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Generation failed");
            }
          };

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          // The server heartbeats every 5s — 45s of silence means the
          // connection is dead, so fail loudly instead of spinning forever.
          const readNext = () => {
            let watchdog: ReturnType<typeof setTimeout>;
            return Promise.race([
              reader.read(),
              new Promise<never>((_, reject) => {
                watchdog = setTimeout(
                  () =>
                    reject(
                      new Error(
                        "The generation stream went silent — connection dropped. Hit Regenerate."
                      )
                    ),
                  45_000
                );
              }),
            ]).finally(() => clearTimeout(watchdog));
          };
          for (;;) {
            const { done, value } = await readNext();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop()!;
            for (const line of lines) if (line.trim()) handleEvent(JSON.parse(line));
          }
          if (buffer.trim()) handleEvent(JSON.parse(buffer));

          if (!imageUrl)
            throw new Error(
              "Generation ended without an image — OpenAI dropped the request. Hit Regenerate."
            );
          patch = {
            image_url: await compressToJpeg(imageUrl),
            style_filter: undefined,
            ...copy,
          };
        }
      } catch (err) {
        patch = {};
        error = err instanceof Error ? err.message : "Generation failed";
      }

      setNodes((ns) =>
        ns.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  ...patch,
                  variation: {
                    ...n.data.variation!,
                    status: "ready" as const,
                    error,
                  },
                },
              }
            : n
        )
      );
      setEdges((es) =>
        es.map((e) => (e.target === nodeId ? { ...e, animated: false } : e))
      );
    },
    [setNodes, setEdges]
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return;
      const { fromNode, fromHandle, toNode } = connectionState;
      if (!fromNode || !fromHandle || toNode) return;
      if (fromHandle.type !== "source") return;
      const kind = fromHandle.id as VariationKind;
      if (kind !== "style" && kind !== "content") return;

      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;

      setRequest({
        kind,
        sourceNodeId: fromNode.id,
        screenPosition: { x: clientX, y: clientY },
        flowPosition: screenToFlowPosition({ x: clientX, y: clientY }),
      });
    },
    [screenToFlowPosition]
  );

  const confirmVariation = useCallback(
    (
      prompt: string | null,
      referenceImages: string[] = [],
      regenerateCaption = false,
      count = 1
    ) => {
      if (!request) return;
      const source = getNodes().find((n) => n.id === request.sourceNodeId) as
        | AdFlowNode
        | undefined;
      if (!source) return;

      // Fan the requested number of variations into a vertical column at the
      // drop point, each wired back to the source. Card height tracks the
      // image aspect, and every variation reuses the source's image — so the
      // source's actual rendered height is the right basis for a gap that
      // never overlaps (plus a margin; fall back to a tall-card estimate).
      const n = Math.max(1, Math.round(count));
      const gap = (source.measured?.height ?? 560) + 48;
      const colX = request.flowPosition.x - 20;
      const centerY = request.flowPosition.y - 150;
      const stamp = Date.now();

      const newNodes: AdFlowNode[] = [];
      const newEdges: Edge[] = [];
      for (let i = 0; i < n; i++) {
        const newId = `node-${stamp}-${i}`;
        newNodes.push({
          id: newId,
          type: "ad",
          position: {
            x: colX,
            y: centerY + (i - (n - 1) / 2) * gap,
          },
          data: {
            image_url: source.data.image_url,
            headline: source.data.headline,
            primary_text: source.data.primary_text,
            cta: source.data.cta,
            link_url: source.data.link_url,
            style_filter: source.data.style_filter,
            campaign_id: source.data.campaign_id,
            campaign_name: source.data.campaign_name,
            ad_name: source.data.ad_name,
            variation: {
              kind: request.kind,
              prompt,
              status: "generating",
              ...(referenceImages.length
                ? { reference_images: referenceImages }
                : {}),
              ...(regenerateCaption ? { regenerate_caption: true } : {}),
            },
          },
        });
        newEdges.push({
          id: `edge-${newId}`,
          source: source.id,
          sourceHandle: request.kind,
          target: newId,
          targetHandle: "in",
          type: "smoothstep",
          animated: true,
          style: { stroke: VARIATION_META[request.kind].color, strokeWidth: 2 },
        });
      }

      setNodes((ns) => [...ns, ...newNodes]);
      setEdges((es) => [...es, ...newEdges]);
      setRequest(null);
      // Kick off every generation — each streams into its own node.
      newNodes.forEach((node) =>
        runGeneration(
          node.id,
          request.kind,
          prompt,
          source.data,
          referenceImages,
          regenerateCaption
        )
      );
    },
    [request, getNodes, setNodes, setEdges, runGeneration]
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((ns) => ns.filter((n) => n.id !== id));
      setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  const regenerateNode = useCallback(
    (id: string) => {
      const node = getNodes().find((n) => n.id === id) as AdFlowNode | undefined;
      const variation = node?.data.variation;
      if (!node || !variation) return;

      const incoming = getEdges().find((e) => e.target === id);
      const source = incoming
        ? (getNodes().find((n) => n.id === incoming.source) as AdFlowNode | undefined)
        : undefined;
      const sourceData = source?.data ?? node.data;

      setNodes((ns) =>
        ns.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  variation: { ...variation, status: "generating" as const },
                },
              }
            : n
        )
      );
      setEdges((es) =>
        es.map((e) => (e.target === id ? { ...e, animated: true } : e))
      );
      void runGeneration(
        id,
        variation.kind,
        variation.prompt,
        sourceData,
        variation.reference_images,
        variation.regenerate_caption
      );
    },
    [getNodes, getEdges, setNodes, setEdges, runGeneration]
  );

  const publishNodes = useCallback(
    (ids: string[]) => {
      const allNodes = getNodes() as AdFlowNode[];
      const allEdges = getEdges();

      const resolved = ids
        .map((id) => allNodes.find((n) => n.id === id))
        .filter(
          (n): n is AdFlowNode =>
            !!n && n.data.variation?.status !== "generating"
        )
        .map((node) => {
          // Walk up the variation tree to the root ad — its campaign is what
          // "publish to the same campaign" refers to, even for older canvases
          // whose variation nodes didn't store campaign lineage themselves.
          let root = node;
          const visited = new Set<string>([root.id]);
          for (;;) {
            const incoming = allEdges.find((e) => e.target === root.id);
            const parent = incoming
              ? allNodes.find((n) => n.id === incoming.source)
              : undefined;
            if (!parent || visited.has(parent.id)) break;
            visited.add(parent.id);
            root = parent;
          }

          return {
            ...node.data,
            campaign_id: node.data.campaign_id ?? root.data.campaign_id,
            campaign_name: node.data.campaign_name ?? root.data.campaign_name,
            ad_name: node.data.ad_name ?? root.data.ad_name,
            source_label: node.data.source_label ?? root.data.source_label,
          };
        });

      if (resolved.length) setPublishData(resolved);
    },
    [getNodes, getEdges]
  );

  const publishNode = useCallback(
    (id: string) => publishNodes([id]),
    [publishNodes]
  );

  const actions = useMemo(
    () => ({ deleteNode, regenerateNode, publishNode }),
    [deleteNode, regenerateNode, publishNode]
  );

  // Multi-selection (shift-click / shift-drag): one shared toolbar above the
  // selection replaces the per-node ones (which auto-hide when >1 selected).
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedIds = selectedNodes.map((n) => n.id);
  const selectionBusy = selectedNodes.some(
    (n) => n.data.variation?.status === "generating"
  );
  const regenerableIds = selectedNodes
    .filter((n) => n.data.variation && n.data.variation.status !== "generating")
    .map((n) => n.id);

  const deleteSelection = useCallback(() => {
    const ids = new Set(selectedIds);
    setNodes((ns) => ns.filter((n) => !ids.has(n.id)));
    setEdges((es) =>
      es.filter((e) => !ids.has(e.source) && !ids.has(e.target))
    );
  }, [selectedIds, setNodes, setEdges]);

  const nextRootPosition = useCallback(() => {
    const existing = getNodes();
    if (existing.length === 0) {
      return screenToFlowPosition({
        x: window.innerWidth / 2 - 120,
        y: window.innerHeight / 2 - 180,
      });
    }
    const rightmost = existing.reduce((max, n) => Math.max(max, n.position.x), 0);
    return { x: rightmost + 380, y: 120 };
  }, [getNodes, screenToFlowPosition]);

  const addRootAd = useCallback(
    (campaign: Campaign, ad: Ad) => {
      setNodes((ns) => [...ns, adToRootNode(campaign, ad, nextRootPosition())]);
      setAddAdOpen(false);
    },
    [nextRootPosition, setNodes]
  );

  const addCustomAd = useCallback(
    (input: CustomAdInput) => {
      setNodes((ns) => [...ns, customAdToRootNode(input, nextRootPosition())]);
      setAddAdOpen(false);
    },
    [nextRootPosition, setNodes]
  );

  const commitRename = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== canvas.name) {
      renameCanvas(canvas.id, trimmed);
    } else {
      setName(canvas.name);
    }
  };

  return (
    <CanvasActionsContext.Provider value={actions}>
      <div className="fixed inset-x-0 bottom-0 top-14 bg-surface">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnectEnd={onConnectEnd}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.35, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={1.75}
          connectionLineStyle={{ stroke: "#1877F2", strokeWidth: 2 }}
          defaultEdgeOptions={{ type: "smoothstep" }}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1.5}
            color="#d5d8dd"
          />
          {/* Shared toolbar centered above a multi-selection */}
          {selectedIds.length > 1 && (
            <NodeToolbar
              nodeId={selectedIds}
              isVisible
              position={Position.Top}
              offset={16}
            >
              <div className="flex gap-1 rounded-lg border border-line bg-white p-1 shadow-md">
                <button
                  type="button"
                  disabled={selectedNodes.length < 2 || selectionBusy}
                  onClick={() => publishNodes(selectedIds)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FlaskConical className="size-3.5" />
                  Publish A/B test ({selectedIds.length})
                </button>
                <button
                  type="button"
                  disabled={regenerableIds.length === 0}
                  onClick={() => regenerableIds.forEach(regenerateNode)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="size-3.5" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={deleteSelection}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </button>
              </div>
            </NodeToolbar>
          )}

          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeStrokeWidth={3}
            nodeColor={(n) => {
              const data = n.data as AdNodeData | undefined;
              return data?.variation
                ? VARIATION_META[data.variation.kind].color
                : "#65676B";
            }}
          />
        </ReactFlow>

        {/* Floating toolbar */}
        <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-xl border border-line bg-white p-1.5 shadow-md">
          <Link
            href="/studio"
            aria-label="Back to gallery"
            className="rounded-lg p-2 text-ink-muted hover:bg-surface hover:text-ink"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="w-48 rounded-lg border border-transparent px-2 py-1.5 font-bold outline-none hover:border-line focus:border-brand focus:ring-2 focus:ring-brand-soft"
            aria-label="Canvas name"
          />
          <span className="flex w-20 items-center gap-1 px-1 text-xs font-medium text-ink-muted">
            {saveState === "saving" ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Check className="size-3 text-positive" />
                Saved
              </>
            )}
          </span>
          <Button size="sm" onClick={() => setAddAdOpen(true)}>
            <Plus className="size-3.5" />
            Add ad
          </Button>
        </div>

        {/* Hint when the canvas is empty */}
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-dashed border-line bg-white/80 px-6 py-4 text-center backdrop-blur-sm">
              <p className="font-semibold">This canvas is empty</p>
              <p className="mt-1 text-sm text-ink-muted">
                Click <span className="font-semibold text-brand">Add ad</span> to
                start from one of your ads — or upload a brand-new image.
              </p>
            </div>
          </div>
        )}

        {request && (
          <VariationDialog
            request={request}
            onConfirm={confirmVariation}
            onCancel={() => setRequest(null)}
          />
        )}

        <Modal
          open={addAdOpen}
          onClose={() => setAddAdOpen(false)}
          title="Add an ad to the canvas"
        >
          <AddAdPanel onSelectExisting={addRootAd} onCreateCustom={addCustomAd} />
        </Modal>

        {publishData && (
          <PublishModal ads={publishData} onClose={() => setPublishData(null)} />
        )}
      </div>
    </CanvasActionsContext.Provider>
  );
}

export default function CanvasEditor({ canvas }: { canvas: StudioCanvas }) {
  return (
    <ReactFlowProvider>
      <Editor canvas={canvas} />
    </ReactFlowProvider>
  );
}
