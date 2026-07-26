"use client";

import Chip from "@/components/ui/Chip";
import { COUNTRIES, POPULAR_COUNTRIES } from "@/lib/targeting-data";
import { MapPin, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  selected: string[];
  onChange: (locations: string[]) => void;
}

export default function LocationPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const matches = COUNTRIES.filter(
    (c) =>
      c.toLowerCase().includes(query.toLowerCase()) && !selected.includes(c)
  ).slice(0, 8);

  const add = (c: string) => {
    onChange([...selected, c]);
    setQuery("");
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((loc) => (
            <Chip
              key={loc}
              selected
              onRemove={() => onChange(selected.filter((l) => l !== loc))}
            >
              {loc}
            </Chip>
          ))}
        </div>
      )}

      <div className="relative" ref={wrapRef}>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search any country…"
          className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
        {open && (query ? matches.length > 0 : true) && (
          <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg">
            {query ? (
              matches.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => add(c)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
                >
                  <MapPin className="size-3.5 text-ink-muted" />
                  {c}
                </button>
              ))
            ) : (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  Popular
                </p>
                {POPULAR_COUNTRIES.filter((c) => !selected.includes(c)).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => add(c)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
                  >
                    <MapPin className="size-3.5 text-ink-muted" />
                    {c}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
