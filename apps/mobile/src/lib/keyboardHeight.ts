/** Android keyboard overlap from window metrics (screenY is often more reliable than height). */
export function readAndroidKeyboardOverlap(
  windowHeight: number,
  screenY: number,
  reportedHeight: number,
): number {
  return Math.max(reportedHeight, windowHeight - screenY);
}
