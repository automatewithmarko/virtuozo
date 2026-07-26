"use client";

import Button from "@/components/ui/Button";
import { getPromptOverrides, setPromptOverrides } from "@/lib/browser-store";
import {
  DEFAULT_PROMPT_BLOCKS,
  PROMPT_BLOCK_META,
  type PromptBlocks,
} from "@/lib/studio-prompts";
import { BookOpen, Check, ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

type BlockKey = keyof PromptBlocks;

interface PromptData {
  defaults: PromptBlocks;
  overrides: Partial<PromptBlocks>;
}

function PromptCard({
  blockKey,
  data,
  onSaved,
}: {
  blockKey: BlockKey;
  data: PromptData;
  onSaved: (key: BlockKey, value: string | null) => void;
}) {
  const meta = PROMPT_BLOCK_META[blockKey];
  const current = data.overrides[blockKey] ?? data.defaults[blockKey];
  const overridden = data.overrides[blockKey] !== undefined;

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== current;

  const save = async (next: string | null) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (next !== null && next.trim().length < 20) {
        throw new Error("Prompt is too short — give the model real instructions.");
      }
      const overrides = getPromptOverrides();
      if (next === null) delete overrides[blockKey];
      else overrides[blockKey] = next.trim();
      setPromptOverrides(overrides);
      if (next === null) setValue(data.defaults[blockKey]);
      setSaved(true);
      onSaved(blockKey, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-line bg-white">
      {/* Collapsed header — click to expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <h3 className="min-w-0 truncate font-bold">
          {meta.title}
          {overridden && (
            <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
              Customized
            </span>
          )}
        </h3>
        <ChevronDown
          className={`size-4 shrink-0 text-ink-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-line px-5 pb-5 pt-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="text-sm text-ink-muted">{meta.description}</p>
            {overridden && (
              <button
                type="button"
                disabled={busy}
                onClick={() => save(null)}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface hover:text-ink"
              >
                <RotateCcw className="size-3" />
                Reset to default
              </button>
            )}
          </div>

          <textarea
            rows={8}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-xs leading-5 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />

          <div className="mt-3 flex items-center gap-3">
            <Button size="sm" disabled={!dirty || busy} onClick={() => save(value)}>
              {busy ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save prompt"
              )}
            </Button>
            {saved && !dirty && (
              <span className="flex items-center gap-1 text-sm font-semibold text-positive">
                <Check className="size-4" />
                Saved — the studio uses this now
              </span>
            )}
            {error && (
              <span className="text-xs font-semibold text-red-600">{error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PromptBook() {
  const [data, setData] = useState<PromptData | null>(null);

  useEffect(() => {
    setData({
      defaults: DEFAULT_PROMPT_BLOCKS,
      overrides: getPromptOverrides() as Partial<PromptBlocks>,
    });
  }, []);

  const onSaved = (key: BlockKey, value: string | null) => {
    setData((prev) => {
      if (!prev) return prev;
      const overrides = { ...prev.overrides };
      if (value === null) delete overrides[key];
      else overrides[key] = value;
      return { ...prev, overrides };
    });
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft px-5 py-4">
        <BookOpen className="size-5 shrink-0 text-brand" />
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">
            These prompts drive Studio generation.
          </span>{" "}
          Edit, extend or fully replace them — every style and content
          variation you create uses the versions saved here.
        </p>
      </div>
      {(Object.keys(PROMPT_BLOCK_META) as BlockKey[]).map((key) => (
        <PromptCard key={key} blockKey={key} data={data} onSaved={onSaved} />
      ))}
    </div>
  );
}
