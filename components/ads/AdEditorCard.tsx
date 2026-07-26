"use client";

import { SAMPLE_CREATIVES } from "@/lib/mock-data";
import { CTA_OPTIONS } from "@/lib/types";
import { ImagePlus, Trash2 } from "lucide-react";
import { useState } from "react";

export interface AdDraft {
  id: string;
  name: string;
  image_url: string | null;
  primary_text: string;
  headline: string;
  cta: string;
  budget_share: number;
}

export function emptyAdDraft(id: string, n: number): AdDraft {
  return {
    id,
    name: `Ad ${n}`,
    image_url: null,
    primary_text: "",
    headline: "",
    cta: "Learn More",
    budget_share: 1,
  };
}

interface Props {
  draft: AdDraft;
  onChange: (patch: Partial<AdDraft>) => void;
  onRemove?: () => void;
  variantLabel?: string;
}

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft";

export default function AdEditorCard({ draft, onChange, onRemove, variantLabel }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {variantLabel && (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-extrabold text-brand">
              {variantLabel}
            </span>
          )}
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full truncate rounded-md border border-transparent px-1 py-0.5 font-bold outline-none hover:border-line focus:border-brand"
            aria-label="Ad name"
          />
        </div>
        {onRemove && (
          <button
            type="button"
            aria-label="Remove ad"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {draft.image_url ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="group relative block w-full cursor-pointer overflow-hidden rounded-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.image_url}
            alt="Ad creative"
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="absolute inset-0 hidden items-center justify-center bg-ink/40 text-sm font-semibold text-white group-hover:flex">
            Change creative
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line text-ink-muted transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
        >
          <ImagePlus className="size-7" />
          <span className="text-sm font-semibold">Add image or video</span>
        </button>
      )}

      {pickerOpen && (
        <div className="mt-3 rounded-lg border border-line bg-surface p-3">
          <p className="mb-2 text-xs font-semibold text-ink-muted">
            Pick a creative (demo library)
          </p>
          <div className="grid grid-cols-5 gap-2">
            {SAMPLE_CREATIVES.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => {
                  onChange({ image_url: src });
                  setPickerOpen(false);
                }}
                className={`cursor-pointer overflow-hidden rounded-md ring-offset-1 transition-shadow hover:ring-2 hover:ring-brand ${
                  draft.image_url === src ? "ring-2 ring-brand" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-muted">
            Primary text
          </label>
          <textarea
            rows={2}
            value={draft.primary_text}
            onChange={(e) => onChange({ primary_text: e.target.value })}
            placeholder="Tell people what you're promoting…"
            className={`${inputCls} resize-none`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Headline
            </label>
            <input
              value={draft.headline}
              onChange={(e) => onChange({ headline: e.target.value })}
              placeholder="Short and punchy"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">
              Button
            </label>
            <select
              value={draft.cta}
              onChange={(e) => onChange({ cta: e.target.value })}
              className={`${inputCls} cursor-pointer`}
            >
              {CTA_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
