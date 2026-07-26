"use client";

import {
  OBJECTIVE_LABELS,
  audienceSummary,
  formatCompact,
  formatMoney,
} from "@/lib/types";
import { estimateAudienceRange, type WizardDraft } from "./wizard-types";

interface Props {
  draft: WizardDraft;
  onChange: (patch: Partial<WizardDraft>) => void;
  goToStep: (index: number) => void;
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-semibold text-brand cursor-pointer hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export default function StepReview({ draft, onChange, goToStep }: Props) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-center text-2xl font-extrabold tracking-tight">
        Ready to launch?
      </h1>
      <p className="mt-2 text-center text-ink-muted">
        One last look — you can edit anything before it goes live.
      </p>

      <div className="mt-8 space-y-4">
        <ReviewCard title="Goal" onEdit={() => goToStep(0)}>
          <p className="text-sm">
            <span className="font-semibold">
              {draft.objective ? OBJECTIVE_LABELS[draft.objective] : "—"}
            </span>
            {draft.name && <span className="text-ink-muted"> · {draft.name}</span>}
          </p>
        </ReviewCard>

        <ReviewCard title="Audience" onEdit={() => goToStep(1)}>
          <p className="text-sm">{audienceSummary(draft.audience)}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Estimated audience:{" "}
            {estimateAudienceRange(draft.audience)
              .map((n) => formatCompact(n))
              .join(" – ")}{" "}
            people
          </p>
        </ReviewCard>

        <ReviewCard title={`Ads (${draft.ads.length})`} onEdit={() => goToStep(2)}>
          <div className="space-y-3">
            {draft.ads.map((ad) => (
              <div key={ad.id} className="flex items-center gap-3">
                {ad.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ad.image_url}
                    alt=""
                    className="size-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="size-12 rounded-lg bg-surface" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ad.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {ad.headline || ad.primary_text || "No text yet"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold">
                  {Math.round(ad.budget_share * 100)}%
                </span>
              </div>
            ))}
          </div>
          {draft.ab_test && (
            <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-xs font-semibold text-brand">
              A/B test is on — budget splits equally and we&apos;ll highlight the winner.
            </p>
          )}
        </ReviewCard>

        <ReviewCard title="Budget & schedule" onEdit={() => goToStep(2)}>
          <p className="text-sm font-semibold">
            {formatMoney(draft.daily_budget)}/day
          </p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                Start date
              </label>
              <input
                type="date"
                value={draft.start_date}
                onChange={(e) => onChange({ start_date: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
              <p className="mt-1 text-xs text-ink-muted">Empty = start right away</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-muted">
                End date
              </label>
              <input
                type="date"
                value={draft.end_date}
                onChange={(e) => onChange({ end_date: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
              />
              <p className="mt-1 text-xs text-ink-muted">Empty = run until paused</p>
            </div>
          </div>
        </ReviewCard>
      </div>
    </div>
  );
}
