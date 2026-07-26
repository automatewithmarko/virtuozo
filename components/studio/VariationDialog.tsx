"use client";

import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import { compressToJpeg } from "@/lib/bake-filter";
import { VARIATION_META, type VariationKind } from "@/lib/studio-types";
import {
  ImagePlus,
  Minus,
  PenLine,
  Plus,
  Sparkles,
  Type,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface VariationRequest {
  kind: VariationKind;
  sourceNodeId: string;
  /** Where the connection was dropped, in flow coordinates */
  flowPosition: { x: number; y: number };
  /** Where to render this dialog, in viewport coordinates */
  screenPosition: { x: number; y: number };
}

const PLACEHOLDERS: Record<VariationKind, string> = {
  style: "e.g. dark and moody, vintage film, minimal black & white…",
  content:
    "e.g. make it a comparison ad: our product vs Brand X on comfort and price…",
};

const HINTS: Record<VariationKind, string> = {
  style:
    "Keeps the ad's content identical — only the visual style of the image changes.",
  content:
    "Keeps the visual style identical — only the message changes (reviews, comparisons, offers…).",
};

const MAX_VARIATIONS = 10;

interface Props {
  request: VariationRequest;
  onConfirm: (
    prompt: string | null,
    referenceImages: string[],
    regenerateCaption: boolean,
    count: number
  ) => void;
  onCancel: () => void;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function VariationDialog({ request, onConfirm, onCancel }: Props) {
  const [prompt, setPrompt] = useState("");
  const [promptMode, setPromptMode] = useState(false);
  const [references, setReferences] = useState<string[]>([]);
  const [regenerateCaption, setRegenerateCaption] = useState(false);
  const [count, setCount] = useState(1);
  const fileInput = useRef<HTMLInputElement>(null);
  const meta = VARIATION_META[request.kind];

  const addReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    // Compress before storing — these travel with the prompt and get saved
    // onto the node for regeneration.
    const urls = await Promise.all(
      Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map(async (f) => compressToJpeg(await fileToDataUrl(f)))
    );
    setReferences((prev) => [...prev, ...urls].slice(0, 6));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const width = 340;
  const left = Math.max(
    12,
    Math.min(request.screenPosition.x - 30, window.innerWidth - width - 12)
  );
  const top = Math.max(
    70,
    Math.min(request.screenPosition.y - 20, window.innerHeight - 440)
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} />
      <div
        className="fixed z-50 rounded-xl border border-line bg-white p-4 shadow-xl"
        style={{ left, top, width }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: meta.softBg, color: meta.color }}
          >
            <Wand2 className="size-4 shrink-0" />
          </span>
          <div>
            <p className="font-bold leading-tight">New {meta.label.toLowerCase()}</p>
            <p className="text-xs text-ink-muted">{HINTS[request.kind]}</p>
          </div>
        </div>

        {!promptMode ? (
          <div className="space-y-2">
            {/* How many variations to spin off from this post */}
            <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
              <div>
                <p className="text-sm font-bold leading-tight">
                  Number of variations
                </p>
                <p className="text-xs text-ink-muted">
                  Each gets its own connected card.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Fewer variations"
                  disabled={count <= 1}
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-line font-bold text-ink-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={MAX_VARIATIONS}
                  value={count}
                  onChange={(e) =>
                    setCount(
                      Math.max(
                        1,
                        Math.min(
                          MAX_VARIATIONS,
                          Math.round(Number(e.target.value) || 1)
                        )
                      )
                    )
                  }
                  className="w-10 rounded-lg border border-line py-1 text-center text-sm font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Number of variations"
                />
                <button
                  type="button"
                  aria-label="More variations"
                  disabled={count >= MAX_VARIATIONS}
                  onClick={() =>
                    setCount((c) => Math.min(MAX_VARIATIONS, c + 1))
                  }
                  className="flex size-7 cursor-pointer items-center justify-center rounded-lg border border-line font-bold text-ink-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onConfirm(null, [], regenerateCaption, count)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-brand bg-brand-soft p-3 text-left transition-colors"
            >
              <Sparkles className="size-5 shrink-0 text-brand" />
              <span>
                <span className="block text-sm font-bold">Auto-generate</span>
                <span className="block text-xs text-ink-muted">
                  Let AI pick a direction for you.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPromptMode(true)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-line p-3 text-left transition-colors hover:border-brand/40"
            >
              <PenLine className="size-5 shrink-0 text-ink-muted" />
              <span>
                <span className="block text-sm font-bold">Guide it with a prompt</span>
                <span className="block text-xs text-ink-muted">
                  Describe exactly what you want.
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              autoFocus
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && prompt.trim()) {
                  e.preventDefault();
                  onConfirm(prompt.trim(), references, regenerateCaption, count);
                }
              }}
              placeholder={PLACEHOLDERS[request.kind]}
              className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />

            {/* Reference images the model should draw from */}
            {references.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {references.map((src, i) => (
                  <div key={i} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Reference ${i + 1}`}
                      className="h-16 w-full rounded-lg border border-line object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remove reference ${i + 1}`}
                      onClick={() =>
                        setReferences((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute -right-1.5 -top-1.5 hidden size-5 cursor-pointer items-center justify-center rounded-full bg-ink text-white shadow group-hover:flex"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void addReferences(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={references.length >= 6}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImagePlus className="size-3.5" />
              {references.length
                ? `Add more reference images (${references.length}/6)`
                : "Upload reference images (optional)"}
            </button>

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPromptMode(false)}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={!prompt.trim()}
                onClick={() =>
                  onConfirm(prompt.trim(), references, regenerateCaption, count)
                }
              >
                <Sparkles className="size-3.5" />
                Generate{count > 1 ? ` ${count}` : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Caption handling — applies to both auto-generate and prompt paths */}
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3">
          <Type className="mt-0.5 size-4 shrink-0 text-ink-muted" />
          <span className="flex-1">
            <span className="block text-sm font-bold">
              Regenerate the caption
            </span>
            <span className="block text-xs text-ink-muted">
              {regenerateCaption
                ? request.kind === "style"
                  ? "Keeps the same meaning, re-writes for better conversion"
                  : "Writes a new caption for the new AD"
                : "Keeps the original caption — only the creative changes."}
            </span>
          </span>
          <Toggle
            checked={regenerateCaption}
            onChange={setRegenerateCaption}
            size="sm"
            label="Regenerate the caption"
          />
        </label>
      </div>
    </>
  );
}
