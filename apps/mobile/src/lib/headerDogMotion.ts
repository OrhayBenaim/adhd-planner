/** ponytail: linear map + clamp; upgrade with low-pass filter if jitter shows on device. */
export function accelerometerXToTiltPx(x: number, gain = 14, max = 10): number {
  return Math.min(max, Math.max(-max, x * gain));
}
