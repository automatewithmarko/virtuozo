"use client";

import { emptyAdDraft } from "@/components/ads/AdEditorCard";
import Button from "@/components/ui/Button";
import StepIndicator from "@/components/ui/StepIndicator";
import StepAds from "@/components/wizard/StepAds";
import StepAudience from "@/components/wizard/StepAudience";
import StepGoal from "@/components/wizard/StepGoal";
import StepReview from "@/components/wizard/StepReview";
import {
  WIZARD_STEPS,
  initialDraft,
  type WizardDraft,
} from "@/components/wizard/wizard-types";
import { useCampaigns } from "@/lib/campaign-context";
import { OBJECTIVE_LABELS, type Campaign } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, Rocket, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewCampaignPage() {
  const router = useRouter();
  const { launchCampaign, connection } = useCampaigns();

  const [draft, setDraft] = useState<WizardDraft>(() =>
    initialDraft(emptyAdDraft("draft-1", 1))
  );
  const [step, setStep] = useState(0);
  const [launchedId, setLaunchedId] = useState<string | null>(null);
  const [launchedLive, setLaunchedLive] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const onChange = (patch: Partial<WizardDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const canContinue = (() => {
    switch (step) {
      case 0:
        return draft.objective !== null;
      case 1:
        return draft.audience.advantage_plus || draft.audience.locations.length > 0;
      case 2:
        return (
          draft.daily_budget > 0 && draft.ads.every((a) => a.image_url !== null)
        );
      default:
        return true;
    }
  })();

  const continueHint = (() => {
    if (canContinue) return null;
    if (step === 0) return "Pick a goal to continue";
    if (step === 1) return "Add at least one location";
    if (step === 2) return "Every ad needs a creative";
    return null;
  })();

  const launch = async () => {
    const id = `c-${Date.now()}`;
    const campaign: Campaign = {
      id,
      name:
        draft.name.trim() ||
        `${OBJECTIVE_LABELS[draft.objective!]} — ${new Date().toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" }
        )}`,
      objective: draft.objective!,
      status: "ACTIVE",
      daily_budget: draft.daily_budget,
      ab_test: draft.ab_test && draft.ads.length > 1,
      audience: draft.audience,
      ads: draft.ads.map((a, i) => ({
        id: `${id}-a${i + 1}`,
        name: a.name,
        status: "ACTIVE" as const,
        budget_share: a.budget_share,
        creative: {
          image_url: a.image_url!,
          primary_text: a.primary_text,
          headline: a.headline,
          cta: a.cta,
        },
        insights: { impressions: 0, clicks: 0, spend: 0, results: 0 },
      })),
      created_at: new Date().toISOString().slice(0, 10),
      start_date: draft.start_date || new Date().toISOString().slice(0, 10),
      end_date: draft.end_date || undefined,
    };
    setLaunching(true);
    setLaunchError(null);
    try {
      const result = await launchCampaign(campaign);
      setLaunchedLive(result.live);
      setLaunchedId(id);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setLaunching(false);
    }
  };

  if (launchedId) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-positive-soft text-positive">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
          Campaign created 🎉
        </h1>
        <p className="mt-2 max-w-md text-ink-muted">
          {launchedLive ? (
            <>
              Created on Meta in{" "}
              <span className="font-semibold text-ink">
                {connection.account?.name}
              </span>{" "}
              — <span className="font-semibold text-ink">paused</span> for
              safety. Flip it on from the dashboard when you&apos;re ready to
              spend.
            </>
          ) : (
            <>
              Your campaign is live (in demo mode). You&apos;ll find it at the
              top of your dashboard.
            </>
          )}
        </p>
        <div className="mt-8 flex gap-3">
          <Button variant="ghost" onClick={() => router.push("/ads-manager")}>
            Back to dashboard
          </Button>
          {!launchedLive && (
            <Button
              onClick={() => router.push(`/ads-manager/campaigns/${launchedId}`)}
            >
              View campaign
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="w-24">
          <Link
            href="/ads-manager"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-muted hover:bg-surface hover:text-ink"
          >
            <X className="size-4" />
            Cancel
          </Link>
        </div>
        <StepIndicator steps={WIZARD_STEPS} current={step} onStepClick={setStep} />
        <div className="w-24" />
      </div>

      {step === 0 && <StepGoal draft={draft} onChange={onChange} />}
      {step === 1 && <StepAudience draft={draft} onChange={onChange} />}
      {step === 2 && <StepAds draft={draft} onChange={onChange} />}
      {step === 3 && (
        <StepReview draft={draft} onChange={onChange} goToStep={setStep} />
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="w-32">
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
          </div>
          <p className="hidden truncate text-sm text-ink-muted sm:block">
            {draft.objective ? OBJECTIVE_LABELS[draft.objective] : "No goal yet"} ·{" "}
            {draft.ads.length} {draft.ads.length === 1 ? "ad" : "ads"} · $
            {draft.daily_budget}/day
            {draft.ab_test && draft.ads.length > 1 ? " · A/B test" : ""}
          </p>
          <div className="flex w-72 items-center justify-end gap-3">
            {launchError && (
              <span className="max-w-44 truncate text-xs font-semibold text-red-600" title={launchError}>
                {launchError}
              </span>
            )}
            {continueHint && (
              <span className="hidden text-xs text-ink-muted md:block">
                {continueHint}
              </span>
            )}
            {step < WIZARD_STEPS.length - 1 ? (
              <Button disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button size="lg" disabled={launching} onClick={launch}>
                <Rocket className="size-4" />
                {launching
                  ? "Publishing…"
                  : connection.mode === "live"
                    ? "Publish to Meta (paused)"
                    : "Launch campaign"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
