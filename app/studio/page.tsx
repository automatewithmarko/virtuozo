"use client";

import CanvasCard from "@/components/studio/CanvasCard";
import NewCanvasModal from "@/components/studio/NewCanvasModal";
import PowerBrixKeyModal from "@/components/studio/PowerBrixKeyModal";
import Button from "@/components/ui/Button";
import { getPowerBrixKey } from "@/lib/browser-store";
import { useStudio } from "@/lib/studio-store";
import { Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function StudioPage() {
  const { canvases, hydrated } = useStudio();
  const [modalOpen, setModalOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  // undefined = not yet read (SSR), false = no key, true = key present.
  const [hasKey, setHasKey] = useState<boolean | undefined>(undefined);

  // localStorage is only available after mount; prompt immediately if no key.
  useEffect(() => {
    const present = Boolean(getPowerBrixKey());
    setHasKey(present);
    if (!present) setKeyModalOpen(true);
  }, []);

  // Canvas creation is gated on a PowerBrix key — without one, generation only
  // returns a simulated preview, so send the user to add a key first.
  const newCanvas = () => {
    if (hasKey) setModalOpen(true);
    else setKeyModalOpen(true);
  };

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
        <Button onClick={newCanvas}>
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
          <Button className="mt-5" onClick={newCanvas}>
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
      <PowerBrixKeyModal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onSaved={() => setHasKey(true)}
      />
    </div>
  );
}
