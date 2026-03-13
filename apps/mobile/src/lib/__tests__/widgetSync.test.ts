import { formatWidgetData, type WidgetData } from "../widgetSync";

describe("formatWidgetData", () => {
  it("formats complete data correctly", () => {
    const input: WidgetData = {
      isPremium: true,
      streak: 5,
      suggestedTask: "Go for a walk",
      level: 3,
      points: 45,
      pointsToNextLevel: 100,
      moodLevel: 70,
      todayTaskCount: 4,
      todayCompletedCount: 2,
    };
    const json = formatWidgetData(input);
    const parsed = JSON.parse(json);
    expect(parsed.streak).toBe(5);
    expect(parsed.suggestedTask).toBe("Go for a walk");
    expect(parsed.isPremium).toBe(true);
    expect(parsed.moodLevel).toBe(70);
  });

  it("handles null suggestedTask", () => {
    const input: WidgetData = {
      isPremium: false,
      streak: 0,
      suggestedTask: null,
      level: 1,
      points: 0,
      pointsToNextLevel: 100,
      moodLevel: 50,
      todayTaskCount: 0,
      todayCompletedCount: 0,
    };
    const json = formatWidgetData(input);
    const parsed = JSON.parse(json);
    expect(parsed.suggestedTask).toBeNull();
    expect(parsed.isPremium).toBe(false);
  });
});
