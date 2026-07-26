"use client";

import Modal from "@/components/ui/Modal";
import { useStudio } from "@/lib/studio-store";
import type { AdFlowNode } from "@/lib/studio-types";
import type { Ad, Campaign } from "@/lib/types";
import { FilePlus2, Images } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AddAdPanel, {
  customAdToRootNode,
  type CustomAdInput,
} from "./AddAdPanel";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function adToRootNode(campaign: Campaign, ad: Ad, position = { x: 80, y: 120 }): AdFlowNode {
  return {
    id: `node-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
    type: "ad",
    position,
    data: {
      image_url: ad.creative.image_url,
      headline: ad.creative.headline,
      primary_text: ad.creative.primary_text,
      cta: ad.creative.cta,
      link_url: ad.creative.link_url,
      style_filter: ad.creative.image_filter,
      source_label: `${campaign.name} · ${ad.name}`,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      ad_name: ad.name,
    },
  };
}

export default function NewCanvasModal({ open, onClose }: Props) {
  const router = useRouter();
  const { createCanvas } = useStudio();
  const [mode, setMode] = useState<"choose" | "existing">("choose");

  const close = () => {
    setMode("choose");
    onClose();
  };

  const startBlank = () => {
    const canvas = createCanvas("Untitled canvas");
    close();
    router.push(`/studio/${canvas.id}`);
  };

  const startFromAd = (campaign: Campaign, ad: Ad) => {
    const canvas = createCanvas(`${ad.name} — variations`, [
      adToRootNode(campaign, ad),
    ]);
    close();
    router.push(`/studio/${canvas.id}`);
  };

  const startFromCustom = (input: CustomAdInput) => {
    const canvas = createCanvas(`${input.headline} — variations`, [
      customAdToRootNode(input),
    ]);
    close();
    router.push(`/studio/${canvas.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={mode === "choose" ? "New canvas" : "Start from an ad"}
    >
      {mode === "choose" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={startBlank}
            className="flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 border-line p-5 text-left transition-colors hover:border-brand/40"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-surface text-ink-muted">
              <FilePlus2 className="size-5" />
            </span>
            <span>
              <span className="block font-bold">Start from scratch</span>
              <span className="mt-0.5 block text-sm text-ink-muted">
                An empty canvas — add ads to it whenever you like.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className="flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 border-brand bg-brand-soft p-5 text-left"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand text-white">
              <Images className="size-5" />
            </span>
            <span>
              <span className="block font-bold">Start from an ad</span>
              <span className="mt-0.5 block text-sm text-ink-muted">
                Pick a campaign ad or upload a new one, then spin off variations.
              </span>
            </span>
          </button>
        </div>
      ) : (
        <AddAdPanel
          onSelectExisting={startFromAd}
          onCreateCustom={startFromCustom}
        />
      )}
    </Modal>
  );
}
