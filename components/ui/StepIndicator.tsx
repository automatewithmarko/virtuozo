"use client";

import { Check } from "lucide-react";
import { Fragment } from "react";

interface Props {
  steps: string[];
  current: number;
  onStepClick?: (index: number) => void;
}

export default function StepIndicator({ steps, current, onStepClick }: Props) {
  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-3">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = done && onStepClick;
        return (
          <Fragment key={step}>
            {i > 0 && (
              <span
                className={`h-px w-6 sm:w-10 ${done || active ? "bg-brand" : "bg-line"}`}
              />
            )}
            <li>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick(i)}
                className={`flex items-center gap-2 ${clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-sm font-bold ${
                    done
                      ? "bg-brand text-white"
                      : active
                        ? "border-2 border-brand text-brand"
                        : "border-2 border-line text-ink-muted"
                  }`}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                <span
                  className={`hidden text-sm font-semibold sm:block ${
                    active ? "text-ink" : done ? "text-brand" : "text-ink-muted"
                  }`}
                >
                  {step}
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
