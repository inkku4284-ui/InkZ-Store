/** Aggregate sales ratio, not customer attribution; the caller must align reporting windows. */
export function observedOrderRate(live: boolean, orders: number, visitors: number): number | null {
  if (!live || !Number.isSafeInteger(orders) || orders < 0 || !Number.isSafeInteger(visitors) || visitors <= 0) return null;
  return orders / visitors * 100;
}
