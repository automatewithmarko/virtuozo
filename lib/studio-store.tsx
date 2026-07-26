"use client";

import type { Edge } from "@xyflow/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AdFlowNode, StudioCanvas } from "./studio-types";

/** All Studio canvases live in this browser — no server, no account. */
const STORAGE_KEY = "virtuozo:canvases";
const SAVE_DEBOUNCE_MS = 500;

interface StudioStore {
  canvases: StudioCanvas[];
  /** false until the server has been consulted (avoids hydration mismatch) */
  hydrated: boolean;
  getCanvas: (id: string) => StudioCanvas | undefined;
  createCanvas: (name: string, initialNodes?: AdFlowNode[]) => StudioCanvas;
  renameCanvas: (id: string, name: string) => void;
  deleteCanvas: (id: string) => void;
  saveCanvas: (id: string, nodes: AdFlowNode[], edges: Edge[]) => void;
}

const StudioContext = createContext<StudioStore | null>(null);

/** Reload mid-generation leaves nodes stuck — resolve them on hydrate. */
function settleGeneratingNodes(canvases: StudioCanvas[]): StudioCanvas[] {
  return canvases.map((c) => ({
    ...c,
    nodes: c.nodes.map((n) =>
      n.data.variation?.status === "generating"
        ? {
            ...n,
            data: {
              ...n.data,
              variation: { ...n.data.variation, status: "ready" as const },
            },
          }
        : n
    ),
  }));
}

function readStoredCanvases(): StudioCanvas[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StudioCanvas[];
  } catch {
    // Corrupt storage — start empty.
  }
  return [];
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [canvases, setCanvases] = useState<StudioCanvas[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Ref so the debounced save always serializes the latest state.
  const canvasesRef = useRef(canvases);
  canvasesRef.current = canvases;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced write of the whole set to localStorage. (Takes an ignored id so
  // it can stand in for the old per-canvas scheduleSync callers.)
  const persist = useCallback((_id?: string) => {
    void _id;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(canvasesRef.current));
      } catch (err) {
        // Storage quota (image-heavy canvases can be large) — keep in memory.
        console.error("Saving canvases failed — browser storage is full", err);
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);
  const scheduleSync = persist;

  // Hydrate from localStorage once, on mount.
  useEffect(() => {
    setCanvases(
      settleGeneratingNodes(
        readStoredCanvases().sort((a, b) =>
          b.updated_at.localeCompare(a.updated_at)
        )
      )
    );
    setHydrated(true);
  }, []);

  const getCanvas = useCallback(
    (id: string) => canvases.find((c) => c.id === id),
    [canvases]
  );

  const createCanvas = useCallback(
    (name: string, initialNodes: AdFlowNode[] = []) => {
      const now = new Date().toISOString();
      const canvas: StudioCanvas = {
        id: `cv-${Date.now()}`,
        name,
        created_at: now,
        updated_at: now,
        nodes: initialNodes,
        edges: [],
      };
      setCanvases((prev) => [canvas, ...prev]);
      scheduleSync(canvas.id);
      return canvas;
    },
    [scheduleSync]
  );

  const renameCanvas = useCallback(
    (id: string, name: string) => {
      setCanvases((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name, updated_at: new Date().toISOString() } : c
        )
      );
      scheduleSync(id);
    },
    [scheduleSync]
  );

  const deleteCanvas = useCallback(
    (id: string) => {
      setCanvases((prev) => prev.filter((c) => c.id !== id));
      persist();
    },
    [persist]
  );

  const saveCanvas = useCallback(
    (id: string, nodes: AdFlowNode[], edges: Edge[]) => {
      setCanvases((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, nodes, edges, updated_at: new Date().toISOString() }
            : c
        )
      );
      scheduleSync(id);
    },
    [scheduleSync]
  );

  const value = useMemo(
    () => ({
      canvases,
      hydrated,
      getCanvas,
      createCanvas,
      renameCanvas,
      deleteCanvas,
      saveCanvas,
    }),
    [canvases, hydrated, getCanvas, createCanvas, renameCanvas, deleteCanvas, saveCanvas]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioStore {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}
