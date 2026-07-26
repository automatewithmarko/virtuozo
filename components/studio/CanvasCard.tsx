"use client";

import type { StudioCanvas } from "@/lib/studio-types";
import { useStudio } from "@/lib/studio-store";
import { GitBranch, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import CanvasSnapshot from "./CanvasSnapshot";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function CanvasCard({ canvas }: { canvas: StudioCanvas }) {
  const router = useRouter();
  const { renameCanvas, deleteCanvas } = useStudio();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(canvas.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const edited = new Date(canvas.updated_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const commitRename = () => {
    setRenaming(false);
    if (name.trim() && name.trim() !== canvas.name) {
      renameCanvas(canvas.id, name.trim());
    } else {
      setName(canvas.name);
    }
  };

  return (
    <div
      onClick={() => !renaming && router.push(`/studio/${canvas.id}`)}
      className="group cursor-pointer rounded-xl border border-line bg-white transition-shadow hover:border-ink-muted/30 hover:shadow-md"
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-t-xl bg-surface bg-[radial-gradient(circle,#d5d8dd_1px,transparent_1px)] [background-size:14px_14px] p-2">
        {canvas.nodes.length > 0 ? (
          <CanvasSnapshot canvas={canvas} />
        ) : (
          <GitBranch className="size-8 text-ink-muted/50" />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <div className="min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === "Enter" && commitRename()}
              className="w-full rounded-md border border-brand px-1.5 py-0.5 font-bold outline-none ring-2 ring-brand-soft"
            />
          ) : (
            <p className="truncate font-bold group-hover:text-brand">{canvas.name}</p>
          )}
          <p className="mt-0.5 text-xs text-ink-muted">
            {canvas.nodes.length} {canvas.nodes.length === 1 ? "node" : "nodes"} ·
            edited {edited}
          </p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Canvas menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="rounded-full p-1.5 text-ink-muted hover:bg-surface cursor-pointer"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-line bg-white p-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setRenaming(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
              >
                <Pencil className="size-3.5" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => deleteCanvas(canvas.id)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
