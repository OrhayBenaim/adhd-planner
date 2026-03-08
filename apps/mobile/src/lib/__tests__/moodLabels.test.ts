import { getMoodLabel, getDifficultyLabel } from "../moodLabels";

describe("getMoodLabel", () => {
  it("returns Exhausted for 0", () => expect(getMoodLabel(0)).toBe("Exhausted"));
  it("returns Exhausted for 20", () => expect(getMoodLabel(20)).toBe("Exhausted"));
  it("returns Low Energy for 21", () => expect(getMoodLabel(21)).toBe("Low Energy"));
  it("returns Focused for 50", () => expect(getMoodLabel(50)).toBe("Focused"));
  it("returns Motivated for 70", () => expect(getMoodLabel(70)).toBe("Motivated"));
  it("returns Super Motivated for 100", () => expect(getMoodLabel(100)).toBe("Super Motivated"));
});

describe("getDifficultyLabel", () => {
  it("returns Very Easy for 0", () => expect(getDifficultyLabel(0)).toBe("Very Easy"));
  it("returns Medium for 60", () => expect(getDifficultyLabel(60)).toBe("Medium"));
  it("returns Very Hard for 100", () => expect(getDifficultyLabel(100)).toBe("Very Hard"));
});
