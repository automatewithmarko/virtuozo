"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

export default function Chip({ children, selected, onClick, onRemove }: Props) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
        selected
          ? "border-brand bg-brand-soft text-brand"
          : "border-line bg-white text-ink hover:bg-surface"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-brand/10 cursor-pointer"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}
