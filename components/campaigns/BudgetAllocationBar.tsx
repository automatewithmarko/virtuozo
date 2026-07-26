import { formatMoney, type Ad } from "@/lib/types";

export const ALLOCATION_COLORS = [
  "#1877F2",
  "#5A9BF6",
  "#8BB9F9",
  "#BDD7FC",
  "#0E4DA4",
  "#3D6FD9",
];

export default function BudgetAllocationBar({
  ads,
  dailyBudget,
}: {
  ads: Ad[];
  dailyBudget: number;
}) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface">
        {ads.map((ad, i) => (
          <div
            key={ad.id}
            style={{
              width: `${ad.budget_share * 100}%`,
              background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
            }}
            title={`${ad.name}: ${Math.round(ad.budget_share * 100)}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {ads.map((ad, i) => (
          <span key={ad.id} className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span
              className="size-2 rounded-full"
              style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
            />
            <span className="max-w-32 truncate font-medium text-ink">{ad.name}</span>
            {Math.round(ad.budget_share * 100)}% ·{" "}
            {formatMoney(Math.round(ad.budget_share * dailyBudget))}/day
          </span>
        ))}
      </div>
    </div>
  );
}
