"use client";

import CanvasCard from "@/components/studio/CanvasCard";
import NewCanvasModal from "@/components/studio/NewCanvasModal";
import Button from "@/components/ui/Button";
import { useStudio } from "@/lib/studio-store";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";

export default function StudioPage() {
  const { canvases, hydrated } = useStudio();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Virtuozo Studio
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Spin your best ads into new styles and new angles — on a canvas.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4" />
          New canvas
        </Button>
      </div>

      {hydrated && canvases.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-line py-24 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Sparkles className="size-7" />
          </div>
          <p className="mt-4 font-semibold">Your canvas gallery is empty</p>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            Start from one of your ads and drag out style or content variations.
          </p>
          <Button className="mt-5" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Create your first canvas
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {canvases.map((c) => (
            <CanvasCard key={c.id} canvas={c} />
          ))}
        </div>
      )}

      <NewCanvasModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
