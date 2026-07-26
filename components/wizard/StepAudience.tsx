"use client";

import InterestPicker from "@/components/targeting/InterestPicker";
import LocationPicker from "@/components/targeting/LocationPicker";
import Toggle from "@/components/ui/Toggle";
import { SAVED_AUDIENCES } from "@/lib/mock-data";
import { formatCompact, type Audience, type Gender } from "@/lib/types";
import { Sparkles, Users } from "lucide-react";
import {
  estimateAudience,
  estimateAudienceRange,
  type WizardDraft,
} from "./wizard-types";

const GENDERS: { label: string; value: Gender }[] = [
  { label: "All", value: "all" },
  { label: "Men", value: "men" },
  { label: "Women", value: "women" },
];

interface Props {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
}

export default function StepAudience({ draft, onChange }: Props) {
  const a = draft.audience;

  const setAudience = (patch: Partial<Audience>) =>
    onChange({ audience: { ...a, ...patch } });

  const size = estimateAudience(a);
  const [sizeLow, sizeHigh] = estimateAudienceRange(a);
  // Position of the gauge needle: broad → right, narrow → left.
  const gauge = Math.min(Math.max(Math.log10(size / 200_000) / 3, 0.05), 0.95);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-center text-2xl font-extrabold tracking-tight">
        Who should see your ads?
      </h1>
      <p className="mt-2 text-center text-ink-muted">
        Keep it broad — Meta&apos;s delivery works best with room to optimize.
      </p>

      <div className="mt-8 space-y-5">
        <div className="rounded-xl border border-line bg-white p-5">
          <label className="mb-2 block text-sm font-semibold">
            Start from a saved audience
          </label>
          <select
            value={a.saved_audience ?? ""}
            onChange={(e) =>
              setAudience({ saved_audience: e.target.value || undefined })
            }
            className="w-full cursor-pointer rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
          >
            <option value="">None — build from scratch</option>
            {SAVED_AUDIENCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-brand" />
            <div>
              <p className="font-semibold">Let Meta optimize (Advantage+)</p>
              <p className="text-sm text-ink-muted">
                Meta finds your audience automatically. Usually the best starting point.
              </p>
            </div>
          </div>
          <Toggle
            checked={a.advantage_plus}
            onChange={(v) => setAudience({ advantage_plus: v })}
            label="Advantage+"
          />
        </div>

        {!a.advantage_plus && (
          <div className="space-y-5 rounded-xl border border-line bg-white p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">Locations</label>
              <LocationPicker
                selected={a.locations}
                onChange={(locations) => setAudience({ locations })}
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold">
                Age range
                <span className="text-sm font-bold text-brand">
                  {a.age_min} – {a.age_max === 65 ? "65+" : a.age_max}
                </span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={18}
                  max={64}
                  value={a.age_min}
                  onChange={(e) =>
                    setAudience({
                      age_min: Math.min(Number(e.target.value), a.age_max - 1),
                    })
                  }
                  className="w-full accent-brand"
                  aria-label="Minimum age"
                />
                <input
                  type="range"
                  min={19}
                  max={65}
                  value={a.age_max}
                  onChange={(e) =>
                    setAudience({
                      age_max: Math.max(Number(e.target.value), a.age_min + 1),
                    })
                  }
                  className="w-full accent-brand"
                  aria-label="Maximum age"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Gender</label>
              <div className="inline-flex rounded-lg border border-line p-0.5">
                {GENDERS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setAudience({ gender: g.value })}
                    className={`rounded-md px-5 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                      a.gender === g.value
                        ? "bg-brand text-white"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Interests <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <InterestPicker
                selected={a.interests}
                onChange={(interests) => setAudience({ interests })}
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-brand" />
              Estimated audience size
            </p>
            <p className="text-lg font-extrabold text-brand">
              {formatCompact(sizeLow)} – {formatCompact(sizeHigh)} people
            </p>
          </div>
          <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-warning via-positive to-brand">
            <span
              className="absolute -top-1 size-4 -translate-x-1/2 rounded-full border-2 border-white bg-ink shadow"
              style={{ left: `${gauge * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-ink-muted">
            <span>Specific</span>
            <span>Broad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
