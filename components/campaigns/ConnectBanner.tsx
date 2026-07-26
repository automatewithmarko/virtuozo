"use client";

import Button from "@/components/ui/Button";
import {
  getConnections,
  notifyCredsChanged,
  saveConnections,
  setActiveConnectionId,
  type Connection,
} from "@/lib/browser-store";
import { useCampaigns } from "@/lib/campaign-context";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

const LIVE_DISMISSED_KEY = "connect-banner-live-dismissed";
const digits = (s: string) => s.replace(/\D/g, "");

export default function ConnectBanner() {
  const { connection } = useCampaigns();
  const [dismissed, setDismissed] = useState(false);
  const [liveDismissed, setLiveDismissed] = useState(false);

  useEffect(() => {
    setLiveDismissed(localStorage.getItem(LIVE_DISMISSED_KEY) === "1");
  }, []);

  const dismissLive = () => {
    localStorage.setItem(LIVE_DISMISSED_KEY, "1");
    setLiveDismissed(true);
  };

  const [token, setToken] = useState("");
  const [adAccount, setAdAccount] = useState("");
  const [pageId, setPageId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const connect = async () => {
    if (!token.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/meta/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate_meta",
          token,
          ad_account_id: adAccount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not connect");
      const created: Connection = {
        id: `conn-${Date.now()}`,
        token: token.trim(),
        ad_account_id: digits(adAccount) || undefined,
        page_id: digits(pageId) || undefined,
        name: json.account_name ?? undefined,
      };
      saveConnections([...getConnections(), created]);
      setActiveConnectionId(created.id);
      notifyCredsChanged();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setSaving(false);
    }
  };

  if (dismissed || connection.mode === "loading") return null;

  if (connection.mode === "live") {
    if (liveDismissed) return null;
    return (
      <div className="flex items-center gap-4 rounded-xl border border-positive/25 bg-positive-soft px-5 py-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-positive" />
        </span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-bold">Connected to {connection.account?.name}</span>{" "}
          <span className="text-ink-muted">
            · live Meta data · {connection.account?.currency} · everything you
            publish starts paused
          </span>
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismissLive}
          className="cursor-pointer rounded-full p-1.5 text-ink-muted hover:bg-white"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  if (connection.mode === "error") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
        <AlertTriangle className="size-5 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Meta connection problem</p>
          <p className="text-sm text-ink-muted">
            {connection.error ?? "Check your token and ad account in Settings."}{" "}
            Showing demo data meanwhile.
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="cursor-pointer rounded-full p-1.5 text-ink-muted hover:bg-white"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  // Demo mode — connect right here.
  return (
    <div className="flex items-start gap-4 rounded-xl border border-brand/20 bg-brand-soft px-5 py-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand pb-1 font-serif text-2xl font-bold text-white">
        f
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Connect your Meta account (demo data shown)</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          Paste a Marketing API access token (with{" "}
          <code className="rounded bg-white px-1 text-xs">ads_read</code> +{" "}
          <code className="rounded bg-white px-1 text-xs">ads_management</code>)
          and the numeric ad account id. Everything is stored only in this browser.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Meta access token"
            aria-label="Meta access token"
            className="h-9 w-64 rounded-lg border border-line bg-white px-3 font-mono text-xs outline-none placeholder:font-sans placeholder:text-sm placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-white"
          />
          <input
            value={adAccount}
            onChange={(e) => setAdAccount(e.target.value)}
            placeholder="Ad account ID (no act_)"
            aria-label="Ad account ID"
            className="h-9 w-52 rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-white"
          />
          <input
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="Facebook Page ID (optional)"
            aria-label="Facebook Page ID"
            className="h-9 w-52 rounded-lg border border-line bg-white px-3 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-white"
          />
          <Button size="sm" disabled={!token.trim() || saving} onClick={connect}>
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Verifying…
              </>
            ) : (
              "Save & connect"
            )}
          </Button>
        </div>
        {saveError && <p className="mt-2 text-xs font-semibold text-red-600">{saveError}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="cursor-pointer rounded-full p-1.5 text-ink-muted hover:bg-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function ConnectionLoading() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 text-sm text-ink-muted">
      <Loader2 className="size-4 animate-spin text-brand" />
      Checking Meta connection…
    </div>
  );
}
