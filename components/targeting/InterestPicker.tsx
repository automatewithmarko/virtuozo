"use client";

import Chip from "@/components/ui/Chip";
import { ALL_INTERESTS, INTEREST_CATEGORIES } from "@/lib/targeting-data";
import { BookOpen, Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  selected: string[];
  onChange: (interests: string[]) => void;
}

export default function InterestPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(
    INTEREST_CATEGORIES[0].name
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((i) => i !== name)
        : [...selected, name]
    );
  };

  const matches = ALL_INTERESTS.filter(
    (i) =>
      i.name.toLowerCase().includes(query.toLowerCase()) &&
      !selected.includes(i.name)
  ).slice(0, 8);

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((i) => (
            <Chip key={i} selected onRemove={() => toggle(i)}>
              {i}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1" ref={wrapRef}>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search interests, e.g. fitness, travel, coffee…"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft"
          />
          {dropdownOpen && query && matches.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg">
              {matches.map((i) => (
                <button
                  key={i.name}
                  type="button"
                  onClick={() => {
                    toggle(i.name);
                    setQuery("");
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
                >
                  {i.name}
                  <span className="shrink-0 text-[10px] text-ink-muted">
                    {i.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setBrowseOpen((o) => !o)}
          className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            browseOpen
              ? "border-brand bg-brand-soft text-brand"
              : "border-line text-ink-muted hover:bg-surface hover:text-ink"
          }`}
        >
          {browseOpen ? <X className="size-3.5" /> : <BookOpen className="size-3.5" />}
          Browse all
        </button>
      </div>

      {browseOpen && (
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-line bg-white">
          {INTEREST_CATEGORIES.map((cat) => {
            const openCat = openCategory === cat.name;
            const selectedCount = cat.interests.filter((i) =>
              selected.includes(i)
            ).length;
            return (
              <div key={cat.name} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenCategory(openCat ? null : cat.name)}
                  className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left hover:bg-surface"
                >
                  <span className="text-sm font-semibold">
                    {cat.name}
                    {selectedCount > 0 && (
                      <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                        {selectedCount}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`size-4 text-ink-muted transition-transform ${
                      openCat ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openCat && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {cat.interests.map((i) => {
                      const isSelected = selected.includes(i);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggle(i)}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                            isSelected
                              ? "border-brand bg-brand-soft text-brand"
                              : "border-line bg-white hover:bg-surface"
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                          {i}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
