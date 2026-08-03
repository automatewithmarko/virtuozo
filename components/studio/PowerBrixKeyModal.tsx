"use client";

import Button from "@/components/ui/Button";
import { notifyCredsChanged, setPowerBrixKey } from "@/lib/browser-store";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called after a key is successfully validated and saved. */
  onSaved?: () => void;
}

/**
 * Prompts for a PowerBrix key (mnt_…). Studio generation needs one, and canvas
 * creation is gated on it — without a key, variations fall back to a simulated
 * preview. The key is validated against the provider, then kept in this
 * browser's localStorage. Controlled by the Studio page.
 */
export default function PowerBrixKeyModal({ open, onClose, onSaved }: Props) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_powerbrix",
          powerbrix_key: key,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setPowerBrixKey(key.trim());
      notifyCredsChanged();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-ink-muted hover:bg-surface"
        >
          <X className="size-5" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/powerbrix/PowerBrixLogo.png"
          alt="PowerBrix"
          className="mx-auto size-16"
        />

        <h2 className="mt-4 text-xl font-extrabold tracking-tight">
          Connect API Key
        </h2>
        <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-muted">
          Studio uses your PowerBrix key to generate real ad images and copy.
        </p>

        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="mnt_…"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter" && key.trim() && !saving) save();
          }}
          className="mt-6 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-center font-mono text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
        {error && (
          <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
        )}

        <div className="mt-5 flex items-center justify-center gap-3">
          <a
            href="https://api.powerbrix.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black/85"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/powerbrix/PowerBrixLogo.png"
              alt=""
              className="size-4 shrink-0"
            />
            Get API Key
          </a>
          <Button disabled={saving || !key.trim()} onClick={save}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
