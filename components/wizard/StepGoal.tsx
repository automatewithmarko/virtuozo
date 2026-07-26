"use client";

import { OBJECTIVE_LABELS, type CampaignObjective } from "@/lib/types";
import {
  Eye,
  Heart,
  MousePointerClick,
  ShoppingBag,
  UserPlus,
} from "lucide-react";
import type { WizardDraft } from "./wizard-types";

const GOALS: {
  value: CampaignObjective;
  icon: typeof ShoppingBag;
  blurb: string;
}[] = [
  { value: "sales", icon: ShoppingBag, blurb: "Sell products or services online." },
  { value: "leads", icon: UserPlus, blurb: "Collect signups, emails or contacts." },
  { value: "traffic", icon: MousePointerClick, blurb: "Send more people to your website." },
  { value: "awareness", icon: Eye, blurb: "Reach as many people as possible." },
  { value: "engagement", icon: Heart, blurb: "Get likes, comments and shares." },
];

interface Props {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
}

export default function StepGoal({ draft, onChange }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-center text-2xl font-extrabold tracking-tight">
        What do you want this campaign to achieve?
      </h1>
      <p className="mt-2 text-center text-ink-muted">
        Pick one goal — we&apos;ll optimize everything else around it.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GOALS.map((g) => {
          const selected = draft.objective === g.value;
          const Icon = g.icon;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => onChange({ objective: g.value })}
              className={`flex cursor-pointer flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-colors ${
                selected
                  ? "border-brand bg-brand-soft"
                  : "border-line bg-white hover:border-brand/40"
              }`}
            >
              <span
                className={`flex size-10 items-center justify-center rounded-lg ${
                  selected ? "bg-brand text-white" : "bg-surface text-brand"
                }`}
              >
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-bold">{OBJECTIVE_LABELS[g.value]}</span>
                <span className="mt-0.5 block text-sm text-ink-muted">{g.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <label className="mb-1 block text-sm font-semibold">Campaign name</label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={
            draft.objective
              ? `${OBJECTIVE_LABELS[draft.objective]} — July 2026`
              : "e.g. Summer Sale 2026"
          }
          className="w-full rounded-lg border border-line bg-white px-3 py-2.5 outline-none placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
        <p className="mt-1 text-xs text-ink-muted">
          Optional — we&apos;ll name it for you if you leave this empty.
        </p>
      </div>
    </div>
  );
}
