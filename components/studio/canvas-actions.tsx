"use client";

import { createContext, useContext } from "react";

export interface CanvasActions {
  deleteNode: (id: string) => void;
  regenerateNode: (id: string) => void;
  publishNode: (id: string) => void;
}

export const CanvasActionsContext = createContext<CanvasActions | null>(null);

export function useCanvasActions(): CanvasActions {
  const ctx = useContext(CanvasActionsContext);
  if (!ctx) {
    throw new Error("useCanvasActions must be used within CanvasEditor");
  }
  return ctx;
}
