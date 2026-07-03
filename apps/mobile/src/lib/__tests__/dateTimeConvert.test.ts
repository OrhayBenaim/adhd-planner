import {
  getLocalDateString,
  getLocalToday,
  getUtcDateString,
  getLocalDateStringDaysAhead,
  formatDueDate,
  daySelectionToDate,
  timeSelectionToTime,
} from "../dateTimeConvert";

describe("getLocalDateString", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(getLocalDateString(new Date(2026, 2, 5))).toBe("2026-03-05");
  });

  it("pads single-digit months and days", () => {
    expect(getLocalDateString(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("uses the local calendar date, not UTC", () => {
    // 23:30 local on Jan 1 — UTC may already be Jan 2 in negative-offset zones,
    // or still Jan 1; local must always report Jan 1.
    const lateNight = new Date(2026, 0, 1, 23, 30);
    expect(getLocalDateString(lateNight)).toBe("2026-01-01");
  });
});

describe("getUtcDateString", () => {
  it("formats using the UTC calendar date", () => {
    expect(getUtcDateString(new Date("2026-03-05T12:00:00Z"))).toBe("2026-03-05");
    expect(getUtcDateString(new Date("2026-03-05T23:59:59Z"))).toBe("2026-03-05");
  });
});

describe("getLocalToday / getLocalDateStringDaysAhead", () => {
  it("today matches formatting now", () => {
    expect(getLocalToday()).toBe(getLocalDateString(new Date()));
  });

  it("days ahead adds calendar days", () => {
    const expected = new Date();
    expected.setDate(expected.getDate() + 3);
    expect(getLocalDateStringDaysAhead(3)).toBe(getLocalDateString(expected));
  });

  it("zero days ahead is today", () => {
    expect(getLocalDateStringDaysAhead(0)).toBe(getLocalToday());
  });
});

describe("formatDueDate", () => {
  it("labels today", () => {
    expect(formatDueDate(getLocalToday())).toBe("Today");
  });

  it("labels tomorrow", () => {
    expect(formatDueDate(getLocalDateStringDaysAhead(1))).toBe("Tomorrow");
  });

  it("formats other dates as short month + day", () => {
    expect(formatDueDate("2030-03-15")).toBe("Mar 15");
    expect(formatDueDate("2030-12-01")).toBe("Dec 1");
  });
});

describe("daySelectionToDate", () => {
  it("maps today", () => {
    expect(daySelectionToDate("today")).toBe(getLocalToday());
  });

  it("maps tomorrow", () => {
    expect(daySelectionToDate("tomorrow")).toBe(getLocalDateStringDaysAhead(1));
  });

  it("maps end_of_week to a Friday (or next Friday from Saturday)", () => {
    const result = daySelectionToDate("end_of_week");
    const [y, m, d] = result.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    expect(date.getDay()).toBe(5); // Friday
    // Never in the past
    expect(result >= getLocalToday()).toBe(true);
  });

  it("passes custom date strings through unchanged", () => {
    expect(daySelectionToDate("2026-08-20")).toBe("2026-08-20");
  });
});

describe("timeSelectionToTime", () => {
  it("maps presets", () => {
    expect(timeSelectionToTime("noon")).toBe("12:00");
    expect(timeSelectionToTime("afternoon")).toBe("15:00");
    expect(timeSelectionToTime("end_of_day")).toBe("21:00");
  });

  it("passes custom times through unchanged", () => {
    expect(timeSelectionToTime("14:30")).toBe("14:30");
  });
});
