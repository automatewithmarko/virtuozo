import type { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export default function Card({
  children,
  interactive = false,
  className = "",
  ...rest
}: Props) {
  return (
    <div
      className={`rounded-xl border border-line bg-white ${
        interactive
          ? "transition-shadow hover:shadow-md hover:border-ink-muted/30 cursor-pointer"
          : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
