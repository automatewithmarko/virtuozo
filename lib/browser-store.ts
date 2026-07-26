"use client";

/**
 * The open-source build has no server database and no accounts — everything a
 * user configures (Meta connections, the OpenAI key, Prompt Book overrides and
 * Studio canvases) lives in this browser's localStorage. The stateless API
 * routes receive the credentials they need as request headers, injected by
 * apiFetch() below, so keys never leave the machine except to call Meta/OpenAI.
 */

export interface Connection {
  id: string;
  token: string;
  page_id?: string;
  ad_account_id?: string;
  name?: string;
}

const K = {
  connections: "virtuozo:connections",
  activeConn: "virtuozo:active-connection",
  activeAccount: "virtuozo:active-account",
  openai: "virtuozo:openai-key",
  prompts: "virtuozo:prompt-overrides",
} as const;

/** Fired whenever credentials change, so the app can re-read Meta state. */
export const CREDS_EVENT = "virtuozo:creds-updated";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / disabled — keep going with in-memory only
  }
}

export const getConnections = () => read<Connection[]>(K.connections, []);
export const saveConnections = (c: Connection[]) => write(K.connections, c);

export const getActiveConnectionId = () => read<string | null>(K.activeConn, null);
export const setActiveConnectionId = (id: string | null) => write(K.activeConn, id);

export function activeConnection(): Connection | undefined {
  const conns = getConnections();
  const id = getActiveConnectionId();
  return conns.find((c) => c.id === id) ?? conns[0];
}

export const getActiveAccountId = () => read<string | null>(K.activeAccount, null);
export const setActiveAccountId = (id: string | null) => write(K.activeAccount, id);

export const getOpenAiKey = () => read<string>(K.openai, "");
export const setOpenAiKey = (key: string) => write(K.openai, key);

export const getPromptOverrides = () =>
  read<Record<string, string>>(K.prompts, {});
export const setPromptOverrides = (o: Record<string, string>) =>
  write(K.prompts, o);

/** Tell the rest of the app that credentials changed (Meta state re-reads). */
export function notifyCredsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CREDS_EVENT));
  }
}

/** The credentials the stateless API routes read out of the request headers. */
export function credentialHeaders(): Record<string, string> {
  const conn = activeConnection();
  const account = getActiveAccountId() || conn?.ad_account_id || "";
  const headers: Record<string, string> = {};
  if (conn?.token) headers["x-meta-token"] = conn.token;
  if (account) headers["x-meta-account"] = account;
  if (conn?.page_id) headers["x-meta-page"] = conn.page_id;
  const key = getOpenAiKey();
  if (key) headers["x-openai-key"] = key;
  return headers;
}

/** fetch() that forwards the browser-stored credentials to our API routes. */
export function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: {
      ...credentialHeaders(),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
}
