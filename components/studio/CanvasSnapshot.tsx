"use client";

import { VARIATION_META, type StudioCanvas } from "@/lib/studio-types";

/**
 * Miniature schematic of a whole canvas: every node at its real position
 * with its creative, connected by its variation edges. Pure SVG scaled to
 * fit — always up to date, no screenshotting.
 */

// Approximate on-canvas node footprint (w-64 card + typical content height).
const NODE_W = 256;
const NODE_H = 400;
const PAD = 60;

export default function CanvasSnapshot({ canvas }: { canvas: StudioCanvas }) {
  const { nodes, edges } = canvas;
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.position.x)) - PAD;
  const minY = Math.min(...nodes.map((n) => n.position.y)) - PAD;
  const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_W)) + PAD;
  const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_H)) + PAD;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
    >
      {edges.map((e) => {
        const s = byId.get(e.source);
        const t = byId.get(e.target);
        if (!s || !t) return null;
        const sx = s.position.x + NODE_W;
        const sy =
          s.position.y + NODE_H * (e.sourceHandle === "content" ? 0.58 : 0.42);
        const tx = t.position.x;
        const ty = t.position.y + NODE_H * 0.5;
        const color =
          e.sourceHandle === "content"
            ? VARIATION_META.content.color
            : VARIATION_META.style.color;

        // Mirror the canvas's smoothstep edges: orthogonal Z with rounded
        // corners (horizontal → vertical → horizontal at the midpoint).
        const midX = sx + (tx - sx) / 2;
        const dy = ty - sy;
        const r = Math.min(16, Math.abs(tx - sx) / 2, Math.abs(dy) / 2);
        const vy = Math.sign(dy) || 1;
        const path =
          Math.abs(dy) < 2
            ? `M ${sx} ${sy} L ${tx} ${ty}`
            : `M ${sx} ${sy} ` +
              `L ${midX - r} ${sy} ` +
              `Q ${midX} ${sy}, ${midX} ${sy + r * vy} ` +
              `L ${midX} ${ty - r * vy} ` +
              `Q ${midX} ${ty}, ${midX + r} ${ty} ` +
              `L ${tx} ${ty}`;

        return (
          <path
            key={e.id}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={6}
            opacity={0.75}
          />
        );
      })}

      {nodes.map((n) => {
        const { x, y } = n.position;
        const badge = n.data.variation
          ? VARIATION_META[n.data.variation.kind].color
          : null;
        return (
          <g key={n.id}>
            <rect
              x={x}
              y={y}
              width={NODE_W}
              height={NODE_H}
              rx={18}
              fill="#ffffff"
              stroke="#E4E6EB"
              strokeWidth={3}
            />
            <image
              href={n.data.image_url}
              x={x + 12}
              y={y + 42}
              width={NODE_W - 24}
              height={NODE_H - 130}
              preserveAspectRatio="xMidYMid slice"
              style={
                n.data.style_filter
                  ? { filter: n.data.style_filter, clipPath: "inset(0 round 10px)" }
                  : { clipPath: "inset(0 round 10px)" }
              }
            />
            {/* headline + text placeholder lines */}
            <rect
              x={x + 12}
              y={y + NODE_H - 72}
              width={NODE_W * 0.6}
              height={16}
              rx={8}
              fill="#050505"
              opacity={0.85}
            />
            <rect
              x={x + 12}
              y={y + NODE_H - 44}
              width={NODE_W * 0.82}
              height={12}
              rx={6}
              fill="#65676B"
              opacity={0.45}
            />
            {badge && (
              <circle cx={x + 24} cy={y + 22} r={11} fill={badge} />
            )}
          </g>
        );
      })}
    </svg>
  );
}
