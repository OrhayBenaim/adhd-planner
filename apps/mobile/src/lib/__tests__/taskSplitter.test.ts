import { splitTranscription } from "../taskSplitter";

describe("splitTranscription", () => {
  describe("single task detection", () => {
    it("returns a single task for simple input", () => {
      expect(splitTranscription("buy groceries", "en")).toEqual(["buy groceries"]);
    });

    it("returns a single task for short input (1-2 words)", () => {
      expect(splitTranscription("call mom", "en")).toEqual(["call mom"]);
    });

    it("does not split 'and' inside a single phrase", () => {
      expect(splitTranscription("buy salt and pepper", "en")).toEqual(["buy salt and pepper"]);
    });

    it("returns empty array for empty input", () => {
      expect(splitTranscription("", "en")).toEqual([]);
    });

    it("returns empty array for whitespace-only input", () => {
      expect(splitTranscription("   ", "en")).toEqual([]);
    });
  });

  describe("numbered items", () => {
    it("splits numbered items with dots", () => {
      expect(splitTranscription("1. buy groceries 2. call dentist 3. finish report", "en"))
        .toEqual(["buy groceries", "call dentist", "finish report"]);
    });

    it("splits numbered items with parentheses", () => {
      expect(splitTranscription("1) buy groceries 2) call dentist", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });

  describe("line breaks", () => {
    it("splits on newlines", () => {
      expect(splitTranscription("buy groceries\ncall dentist\nfinish report", "en"))
        .toEqual(["buy groceries", "call dentist", "finish report"]);
    });

    it("ignores empty lines", () => {
      expect(splitTranscription("buy groceries\n\ncall dentist", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });

  describe("conjunction splitting", () => {
    it("splits on 'and' when followed by a verb", () => {
      expect(splitTranscription("buy groceries and call the dentist", "en"))
        .toEqual(["buy groceries", "call the dentist"]);
    });

    it("splits on 'and also'", () => {
      expect(splitTranscription("buy groceries and also call the dentist", "en"))
        .toEqual(["buy groceries", "call the dentist"]);
    });

    it("splits three tasks with conjunctions", () => {
      expect(splitTranscription("buy groceries and call the dentist and finish the report", "en"))
        .toEqual(["buy groceries", "call the dentist", "finish the report"]);
    });
  });

  describe("comma splitting with verbs", () => {
    it("splits comma-separated clauses starting with verbs", () => {
      expect(splitTranscription("buy groceries, call the dentist, finish the report", "en"))
        .toEqual(["buy groceries", "call the dentist", "finish the report"]);
    });

    it("does not split comma-separated non-verb items", () => {
      expect(splitTranscription("buy milk, eggs, and bread", "en"))
        .toEqual(["buy milk, eggs, and bread"]);
    });
  });

  describe("minimum length filtering", () => {
    it("filters out fragments shorter than 3 words", () => {
      expect(splitTranscription("1. buy groceries 2. no 3. call dentist", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });

  describe("unsupported locale fallback", () => {
    it("uses universal rules for unknown locale", () => {
      expect(splitTranscription("1. task one 2. task two", "ja"))
        .toEqual(["task one", "task two"]);
    });

    it("splits on newlines for unknown locale", () => {
      expect(splitTranscription("task one\ntask two", "ja"))
        .toEqual(["task one", "task two"]);
    });

    it("returns single task when no universal signals found", () => {
      expect(splitTranscription("some task in japanese locale", "ja"))
        .toEqual(["some task in japanese locale"]);
    });
  });

  describe("trimming and cleanup", () => {
    it("trims whitespace from split tasks", () => {
      expect(splitTranscription("  buy groceries  and  call dentist  ", "en"))
        .toEqual(["buy groceries", "call dentist"]);
    });
  });
});
