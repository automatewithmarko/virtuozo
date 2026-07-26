"use client";

import CanvasEditor from "@/components/studio/CanvasEditor";
import { useStudio } from "@/lib/studio-store";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function CanvasPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const { getCanvas, hydrated } = useStudio();

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  const canvas = getCanvas(canvasId);

  if (!canvas) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold">Canvas not found</p>
        <Link
          href="/studio"
          className="mt-2 inline-block text-sm font-semibold text-brand"
        >
          ← Back to Studio
        </Link>
      </div>
    );
  }

  return <CanvasEditor key={canvas.id} canvas={canvas} />;
}
