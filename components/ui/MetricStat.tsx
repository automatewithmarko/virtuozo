interface Props {
  label: string;
  value: string;
  sub?: string;
}

export default function MetricStat({ label, value, sub }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
