import { stepFloat, waveSurfaceY } from "../headerDogMotion";

const bounds = { min: -200, max: 74 };

describe("stepFloat", () => {
  it("builds velocity in the tilt direction", () => {
    const next = stepFloat({ x: 0, v: 0 }, 1, 0.016, bounds);
    expect(next.v).toBeGreaterThan(0);
    expect(next.x).toBeGreaterThan(0);
  });

  it("coasts and slows down with no tilt", () => {
    const next = stepFloat({ x: 0, v: 100 }, 0, 0.016, bounds);
    expect(next.x).toBeGreaterThan(0);
    expect(next.v).toBeLessThan(100);
  });

  it("clamps at the right edge and bounces back", () => {
    const next = stepFloat({ x: 73, v: 400 }, 1, 0.016, bounds);
    expect(next.x).toBe(74);
    expect(next.v).toBeLessThan(0);
  });

  it("clamps at the left edge and bounces back", () => {
    const next = stepFloat({ x: -199, v: -400 }, -1, 0.016, bounds);
    expect(next.x).toBe(-200);
    expect(next.v).toBeGreaterThan(0);
  });
})

describe("waveSurfaceY", () => {
  it("matches the bezier endpoints", () => {
    expect(waveSurfaceY(0)).toBeCloseTo(2);
    expect(waveSurfaceY(1)).toBeCloseTo(7);
  });

  it("rides high on the left and low on the right (y grows downward)", () => {
    expect(waveSurfaceY(0.25)).toBeGreaterThan(waveSurfaceY(0.75));
  });

  it("clamps outside the strip", () => {
    expect(waveSurfaceY(-0.5)).toBeCloseTo(waveSurfaceY(0));
    expect(waveSurfaceY(1.5)).toBeCloseTo(waveSurfaceY(1));
  });
});
