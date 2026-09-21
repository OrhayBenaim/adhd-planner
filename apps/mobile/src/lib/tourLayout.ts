/** Prefer the requested side, flip if needed, and keep the tooltip in the viewport. */
export function getTourTooltipTop(target: { y: number; height: number }, tooltipHeight: number, viewportHeight: number, side: "above" | "below"): number {
  const above = target.y - tooltipHeight - 14;
  const below = target.y + target.height + 14;
  const fitsAbove = above >= 12;
  const fitsBelow = below + tooltipHeight <= viewportHeight - 12;
  const preferred = side === "above" ? (fitsAbove ? above : below) : (fitsBelow ? below : above);
  return Math.max(12, Math.min(preferred, viewportHeight - tooltipHeight - 12));
}
