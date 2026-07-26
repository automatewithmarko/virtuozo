"use client";

import PromptBook from "@/components/settings/PromptBook";
import Button from "@/components/ui/Button";
import {
  activeConnection,
  getConnections,
  getOpenAiKey,
  notifyCredsChanged,
  saveConnections,
  setActiveConnectionId,
  setOpenAiKey,
  type Connection,
} from "@/lib/browser-store";
import { BookOpen, Check, ChevronDown, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft";

const digits = (s: string) => s.replace(/\D/g, "");

/** POST a validation action; returns the parsed JSON or throws its error. */
async function validate(body: Record<string, string>) {
  const res = await fetch("/api/meta/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Validation failed");
  return json as { ok: true; account_name?: string | null };
}

function ConnectionCard({
  conn,
  active,
  onSave,
  onDelete,
  onActivate,
}: {
  conn: Connection;
  active: boolean;
  onSave: (patch: Partial<Connection>) => Promise<void>;
  onDelete: () => void;
  onActivate: () => void;
}) {
  const [token, setToken] = useState(conn.token);
  const [pageId, setPageId] = useState(conn.page_id ?? "");
  const [adAccountId, setAdAccountId] = useState(conn.ad_account_id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const dirty =
    token !== conn.token ||
    pageId !== (conn.page_id ?? "") ||
    adAccountId !== (conn.ad_account_id ?? "");

  return (
    <div className={`rounded-xl border ${active ? "border-brand bg-brand-soft/30" : "border-line"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <p className="min-w-0 truncate text-[15px] font-bold">
          {conn.name ?? (adAccountId ? `Ad account ${adAccountId}` : "New connection")}
          {active && (
            <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
              Active
            </span>
          )}
        </p>
        <span className="flex shrink-0 items-center gap-2">
          {!active && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onActivate();
              }}
              className="cursor-pointer rounded-lg bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft/70"
            >
              Use this connection
            </span>
          )}
          <ChevronDown className={`size-4 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-muted">Access token</label>
            <textarea
              rows={3}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              spellCheck={false}
              className={`${inputCls} resize-none break-all font-mono text-xs`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Facebook Page ID</label>
              <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="numeric page id" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">Ad account ID</label>
              <input value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} placeholder="numeric, no act_ prefix" className={inputCls} />
            </div>
          </div>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              disabled={busy !== null || !dirty}
              onClick={async () => {
                setBusy("save");
                setError(null);
                try {
                  let name: string | null | undefined = conn.name;
                  if (token !== conn.token || digits(adAccountId) !== (conn.ad_account_id ?? "")) {
                    const r = await validate({ action: "validate_meta", token, ad_account_id: adAccountId });
                    name = r.account_name;
                  }
                  await onSave({
                    token,
                    page_id: digits(pageId) || undefined,
                    ad_account_id: digits(adAccountId) || undefined,
                    name: name ?? undefined,
                  });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === "save" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Verifying…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={busy !== null}
              onClick={() => window.confirm("Delete this connection?") && onDelete()}
            >
              <Trash2 className="size-3.5" /> Delete connection
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddConnectionForm({ onAdd }: { onAdd: (c: Omit<Connection, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-4 text-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:bg-brand-soft/40 hover:text-brand"
      >
        <Plus className="size-4" /> Add a connection
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-3 text-sm font-bold">New connection</p>
      <div className="space-y-3">
        <textarea
          rows={3}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Meta access token (ads_read + ads_management)"
          spellCheck={false}
          className={`${inputCls} resize-none break-all font-mono text-xs`}
        />
        <div className="grid grid-cols-2 gap-3">
          <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Facebook Page ID" className={inputCls} />
          <input value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} placeholder="Ad account ID (no act_)" className={inputCls} />
        </div>
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!token.trim() || busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const r = await validate({ action: "validate_meta", token, ad_account_id: adAccountId });
                onAdd({
                  token: token.trim(),
                  page_id: digits(pageId) || undefined,
                  ad_account_id: digits(adAccountId) || undefined,
                  name: r.account_name ?? undefined,
                });
                setOpen(false);
                setToken("");
                setPageId("");
                setAdAccountId("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Verifying…
              </>
            ) : (
              "Add connection"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: "connections", label: "Connections", icon: KeyRound },
  { key: "prompt-book", label: "Prompt Book", icon: BookOpen },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("connections");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [openaiKey, setOpenaiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [savingOpenai, setSavingOpenai] = useState(false);
  const [savedOpenai, setSavedOpenai] = useState(false);
  const [openaiError, setOpenaiError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    setConnections(getConnections());
    setActiveId(activeConnection()?.id);
    const key = getOpenAiKey();
    setOpenaiKey(key);
    setSavedKey(key);
    setReady(true);
  }, []);

  useEffect(reload, [reload]);

  const commit = useCallback(
    (next: Connection[], activate?: string) => {
      saveConnections(next);
      if (activate !== undefined) setActiveConnectionId(activate);
      notifyCredsChanged();
      reload();
    },
    [reload]
  );

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl gap-8">
      <nav className="w-44 shrink-0">
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Settings</h1>
        <ul className="space-y-1">
          {TABS.map((t) => (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  tab === t.key ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 space-y-6 pt-11">
        {tab === "prompt-book" ? (
          <PromptBook />
        ) : (
          <>
            <section className="rounded-xl border border-line bg-white p-6">
              <div className="mb-5 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/meta.svg" alt="Meta" className="h-6 w-auto shrink-0" />
                <div>
                  <h2 className="font-bold">Meta connections</h2>
                  <p className="text-sm text-ink-muted">
                    {connections.length
                      ? `${connections.length} connection${connections.length > 1 ? "s" : ""} saved in this browser`
                      : "Add a Meta access token to run real campaigns"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {connections.map((c) => (
                  <ConnectionCard
                    key={c.id}
                    conn={c}
                    active={c.id === activeId}
                    onActivate={() => commit(connections, c.id)}
                    onSave={async (patch) => {
                      commit(connections.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
                    }}
                    onDelete={() => {
                      const next = connections.filter((x) => x.id !== c.id);
                      commit(next, c.id === activeId ? next[0]?.id : undefined);
                    }}
                  />
                ))}
                <AddConnectionForm
                  onAdd={(c) => {
                    const created: Connection = { ...c, id: `conn-${Date.now()}` };
                    const next = [...connections, created];
                    commit(next, activeId ?? created.id);
                  }}
                />
              </div>
            </section>

            <section className="rounded-xl border border-line bg-white p-6">
              <div className="mb-5 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/openai.svg" alt="OpenAI" className="size-8 shrink-0" />
                <div>
                  <h2 className="font-bold">OpenAI API key</h2>
                  <p className="text-sm text-ink-muted">
                    Powers Studio&apos;s image and copy generation. Stored only in this browser.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <textarea
                  rows={2}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-…"
                  spellCheck={false}
                  className={`${inputCls} resize-none break-all font-mono text-xs`}
                />
                {openaiError && <p className="text-xs font-semibold text-red-600">{openaiError}</p>}
                <div className="flex items-center gap-3">
                  <Button
                    disabled={savingOpenai || !openaiKey.trim() || openaiKey === savedKey}
                    onClick={async () => {
                      setSavingOpenai(true);
                      setSavedOpenai(false);
                      setOpenaiError(null);
                      try {
                        await validate({ action: "validate_openai", openai_key: openaiKey });
                        setOpenAiKey(openaiKey.trim());
                        setSavedKey(openaiKey.trim());
                        notifyCredsChanged();
                        setSavedOpenai(true);
                      } catch (err) {
                        setOpenaiError(err instanceof Error ? err.message : "Failed");
                      } finally {
                        setSavingOpenai(false);
                      }
                    }}
                  >
                    {savingOpenai ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Verifying…
                      </>
                    ) : (
                      "Save OpenAI key"
                    )}
                  </Button>
                  {savedOpenai && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-positive">
                      <Check className="size-4" /> Saved
                    </span>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
