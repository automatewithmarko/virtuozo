"use client";

import Button from "@/components/ui/Button";
import type { AdFlowNode } from "@/lib/studio-types";
import { CTA_OPTIONS, type Ad, type Campaign } from "@/lib/types";
import { ImagePlus, Megaphone, Upload } from "lucide-react";
import { useRef, useState } from "react";
import AdPicker from "./AdPicker";

export interface CustomAdInput {
  image_url: string;
  headline: string;
  primary_text: string;
  cta: string;
}

export function customAdToRootNode(
  input: CustomAdInput,
  position = { x: 80, y: 120 }
): AdFlowNode {
  return {
    id: `node-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
    type: "ad",
    position,
    data: {
      image_url: input.image_url,
      headline: input.headline,
      primary_text: input.primary_text,
      cta: input.cta,
      source_label: "Custom upload",
      ad_name: input.headline,
    },
  };
}

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft";

interface Props {
  onSelectExisting: (campaign: Campaign, ad: Ad) => void;
  onCreateCustom: (input: CustomAdInput) => void;
}

/** Tabbed panel: start from a campaign ad, or upload a brand-new one. */
export default function AddAdPanel({ onSelectExisting, onCreateCustom }: Props) {
  const [tab, setTab] = useState<"existing" | "upload">("existing");
  const [image, setImage] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState<string>("Learn More");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-surface p-1">
        {(
          [
            { key: "existing", label: "From your campaigns", icon: Megaphone },
            { key: "upload", label: "Upload new", icon: Upload },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === key ? "bg-white text-brand shadow-sm" : "text-ink-muted"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "existing" ? (
        <AdPicker onSelect={onSelectExisting} />
      ) : (
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {image ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative block w-full cursor-pointer overflow-hidden rounded-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="Uploaded creative"
                className="aspect-square max-h-64 w-full object-cover"
              />
              <span className="absolute inset-0 hidden items-center justify-center bg-ink/40 text-sm font-semibold text-white group-hover:flex">
                Change image
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
              className="flex aspect-[2/1] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-ink-muted transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
            >
              <ImagePlus className="size-8" />
              <span className="text-sm font-semibold">
                Click or drop an image here
              </span>
              <span className="text-xs">PNG, JPG — your ad creative</span>
            </button>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Headline
            </label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Short and punchy"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Primary text
            </label>
            <textarea
              rows={3}
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              placeholder="Tell people what you're promoting…"
              className={`${inputCls} resize-none`}
            />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="w-40">
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                Button
              </label>
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                {CTA_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <Button
              disabled={!image || !headline.trim()}
              onClick={() =>
                onCreateCustom({
                  image_url: image!,
                  headline: headline.trim(),
                  primary_text: primaryText.trim(),
                  cta,
                })
              }
            >
              <ImagePlus className="size-4" />
              Add to canvas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
