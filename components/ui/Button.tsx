"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-dark disabled:bg-brand/40 shadow-sm",
  secondary:
    "bg-brand-soft text-brand hover:bg-brand-soft/70 disabled:opacity-50",
  ghost:
    "bg-transparent text-ink hover:bg-surface disabled:opacity-50 border border-line",
  danger: "bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-[15px]",
  lg: "h-12 px-6 text-base",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
