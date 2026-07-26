"use client";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  size = "md",
}: Props) {
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const knob = size === "sm" ? "size-3.5" : "size-4.5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${track} ${
        checked ? "bg-brand" : "bg-line"
      }`}
    >
      <span
        className={`absolute left-1 rounded-full bg-white shadow transition-transform ${knob} ${
          checked ? shift : "translate-x-0"
        }`}
      />
    </button>
  );
}
