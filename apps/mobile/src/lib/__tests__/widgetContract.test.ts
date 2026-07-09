import * as fs from "fs";
import * as path from "path";
import {
  formatWidgetData,
  getMoodEmoji,
  getMoodLabel,
  WIDGET_STORAGE_KEYS,
  type WidgetData,
} from "@adhd-planner/types";

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../../../../packages/types/src/widget-fixtures",
);

interface ExpectationsManifest {
  storageKeys: {
    widgetData: string;
    pendingMood: string;
    pendingTaskCompletions: string;
  };
  moodBoundaries: Array<{ level: number; label: string; emoji: string }>;
  fixtures: string[];
  parseOnlyFixtures: string[];
}

const manifest: ExpectationsManifest = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, "expectations.json"), "utf8"),
);

const serializationFixtures = manifest.fixtures.filter(
  (file) => !manifest.parseOnlyFixtures.includes(file),
);

function loadFixture(file: string): WidgetData {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, file), "utf8");
  return JSON.parse(raw) as WidgetData;
}

describe("widget contract", () => {
  describe("storage keys", () => {
    it("matches expectations manifest", () => {
      expect(WIDGET_STORAGE_KEYS.widgetData).toBe(manifest.storageKeys.widgetData);
      expect(WIDGET_STORAGE_KEYS.pendingMood).toBe(manifest.storageKeys.pendingMood);
      expect(WIDGET_STORAGE_KEYS.pendingTaskCompletions).toBe(
        manifest.storageKeys.pendingTaskCompletions,
      );
    });
  });

  describe("mood boundaries", () => {
    it.each(manifest.moodBoundaries)(
      "level $level → $label ($emoji)",
      ({ level, label, emoji }) => {
        expect(getMoodLabel(level)).toBe(label);
        expect(getMoodEmoji(level)).toBe(emoji);
      },
    );
  });

  describe("fixture serialization", () => {
    it.each(serializationFixtures)("round-trips %s", (fixtureFile) => {
      const data = loadFixture(fixtureFile);
      const expected = JSON.parse(
        fs.readFileSync(path.join(FIXTURES_DIR, fixtureFile), "utf8"),
      );
      expect(JSON.parse(formatWidgetData(data))).toEqual(expected);
    });
  });

  describe("fixture mood levels", () => {
    const moodFixtures = manifest.fixtures.filter((f) => f.startsWith("mood-boundary-"));

    it.each(moodFixtures)("%s mood label and emoji match manifest", (fixtureFile) => {
      const data = loadFixture(fixtureFile);
      const boundary = manifest.moodBoundaries.find((b) => b.level === data.moodLevel);
      expect(boundary).toBeDefined();
      expect(getMoodLabel(data.moodLevel)).toBe(boundary!.label);
      expect(getMoodEmoji(data.moodLevel)).toBe(boundary!.emoji);
    });
  });
});
