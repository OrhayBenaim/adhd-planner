/** Floating physics: tilt drives acceleration, not position. */
export type FloatState = { x: number; v: number };
export type FloatBounds = { min: number; max: number };

const ACCEL = 900; // px/s^2 at full tilt (1g sideways)
const DRAG = 3.2; // velocity damping per second
const BOUNCE = 0.35; // energy kept when hitting the edge

/** One physics step. x/v in px and px/s, tilt is accelerometer x (g), dt in seconds. */
export function stepFloat(
  { x, v }: FloatState,
  tilt: number,
  dt: number,
  bounds: FloatBounds
): FloatState {
  "worklet";
  let nextV = v + tilt * ACCEL * dt;
  nextV -= nextV * Math.min(DRAG * dt, 1);
  let nextX = x + nextV * dt;

  if (nextX > bounds.max) {
    nextX = bounds.max;
    nextV = -nextV * BOUNCE;
  } else if (nextX < bounds.min) {
    nextX = bounds.min;
    nextV = -nextV * BOUNCE;
  }

  return { x: nextX, v: nextV };
}

// The header wave is a single cubic bezier, "M0 2 C140 42 258 -20 393 7", drawn
// 20px tall and stretched across the screen (preserveAspectRatio="none"). Its x
// control points are near-uniform, so normalized x stands in for the bezier's t.
const WAVE_Y = [2, 42, -20, 7];

/** Height of the water surface, in px from the top of the 20px wave strip. */
export function waveSurfaceY(normalizedX: number): number {
  "worklet";
  const t = Math.min(1, Math.max(0, normalizedX));
  const u = 1 - t;
  return (
    u * u * u * WAVE_Y[0] +
    3 * u * u * t * WAVE_Y[1] +
    3 * u * t * t * WAVE_Y[2] +
    t * t * t * WAVE_Y[3]
  );
}
