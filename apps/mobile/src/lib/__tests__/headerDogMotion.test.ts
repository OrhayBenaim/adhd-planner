import { accelerometerXToTiltPx } from "../headerDogMotion";

describe("accelerometerXToTiltPx", () => {
  it("maps tilt and clamps to max offset", () => {
    expect(accelerometerXToTiltPx(0)).toBe(0);
    expect(accelerometerXToTiltPx(1)).toBe(10);
    expect(accelerometerXToTiltPx(-1)).toBe(-10);
    expect(accelerometerXToTiltPx(2)).toBe(10);
  });
});
