import { calcPointsEarned, applyPoints, xpPercent, INITIAL_PROGRESS } from "../points";

describe("calcPointsEarned", () => {
  it("returns 1 for difficulty 0", () => expect(calcPointsEarned(0)).toBe(1));
  it("returns 6 for difficulty 50", () => expect(calcPointsEarned(50)).toBe(6));
  it("returns 11 for difficulty 100", () => expect(calcPointsEarned(100)).toBe(11));
});

describe("applyPoints", () => {
  it("adds points without leveling up", () => {
    const { next, earned, leveledUp } = applyPoints(INITIAL_PROGRESS, 50);
    expect(earned).toBe(6);
    expect(next.points).toBe(6);
    expect(next.level).toBe(1);
    expect(leveledUp).toBe(false);
  });

  it("levels up when points reach threshold", () => {
    const progress = { level: 1, points: 45, pointsToNextLevel: 50 };
    const { next, leveledUp } = applyPoints(progress, 50); // earns 6
    expect(leveledUp).toBe(true);
    expect(next.level).toBe(2);
    expect(next.points).toBe(1); // 45 + 6 - 50 = 1
    expect(next.pointsToNextLevel).toBe(75); // 50 * 1.5
  });
});

describe("xpPercent", () => {
  it("returns 0 at start", () => expect(xpPercent(INITIAL_PROGRESS)).toBe(0));
  it("returns 0.5 at half", () => {
    expect(xpPercent({ level: 1, points: 25, pointsToNextLevel: 50 })).toBe(0.5);
  });
  it("caps at 1", () => {
    expect(xpPercent({ level: 1, points: 60, pointsToNextLevel: 50 })).toBe(1);
  });
});
