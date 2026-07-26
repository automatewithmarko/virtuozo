/**
 * Set shares[index] to value (0–1) and proportionally rebalance the other
 * shares so the total stays at 1. Used by the linked allocation sliders.
 */
export function rebalanceShares(
  shares: number[],
  index: number,
  value: number
): number[] {
  const clamped = Math.min(Math.max(value, 0.01), shares.length > 1 ? 0.99 : 1);
  const othersTotal = shares.reduce((s, v, i) => (i === index ? s : s + v), 0);
  const remaining = 1 - clamped;

  return shares.map((s, i) => {
    if (i === index) return clamped;
    if (othersTotal <= 0) return remaining / (shares.length - 1);
    return (s / othersTotal) * remaining;
  });
}

export function equalShares(count: number): number[] {
  return Array.from({ length: count }, () => 1 / count);
}
