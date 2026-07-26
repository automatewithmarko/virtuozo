import type { EntityStatus } from "@/lib/types";

const STYLES: Record<EntityStatus, { dot: string; bg: string; label: string }> =
  {
    ACTIVE: { dot: "bg-positive", bg: "bg-positive-soft text-positive", label: "Active" },
    PAUSED: { dot: "bg-warning", bg: "bg-warning-soft text-[#93700a]", label: "Paused" },
    ENDED: { dot: "bg-ink-muted", bg: "bg-surface text-ink-muted", label: "Ended" },
  };

export default function StatusPill({ status }: { status: EntityStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg}`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
