import { getTourTooltipTop } from "../tourLayout";

describe("guided tour tooltip placement", () => {
  it("keeps the Add tooltip above the bottom navigation", () => {
    expect(getTourTooltipTop({ y: 720, height: 60 }, 155, 800, "above")).toBe(551);
  });
  it("flips below a high target when there is no space above", () => {
    expect(getTourTooltipTop({ y: 80, height: 54 }, 180, 800, "above")).toBe(148);
  });
  it("flips above a low task action on a short screen", () => {
    const top = getTourTooltipTop({ y: 490, height: 54 }, 180, 640, "below");
    expect(top + 180).toBeLessThan(490);
    expect(top).toBeGreaterThanOrEqual(12);
  });
});
