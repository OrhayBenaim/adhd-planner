interface LocaleSplitConfig {
  conjunctions: string[];
  commonVerbs: string[];
  numberPattern: RegExp;
}

const LOCALE_CONFIGS: Record<string, LocaleSplitConfig> = {
  en: {
    conjunctions: ["and also", "and then", "also", "then", "and"],
    commonVerbs: [
      "buy", "call", "finish", "send", "write", "read", "clean", "fix",
      "make", "do", "go", "get", "take", "pick", "drop", "set", "check",
      "review", "update", "create", "delete", "move", "start", "stop",
      "schedule", "book", "pay", "cancel", "order", "return", "submit",
      "prepare", "organize", "plan", "remind", "email", "text", "message",
      "complete", "wash", "cook", "run", "walk", "drive", "meet",
    ],
    numberPattern: /^\d+[.)]\s*/,
  },
};

const MIN_WORDS = 2;

/**
 * Split transcription text into individual task strings.
 * Uses English heuristics for conjunction/comma splitting.
 */
export function splitTranscription(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const config = LOCALE_CONFIGS.en;

  // Try split strategies in priority order
  const numbered = splitByNumbers(trimmed);
  if (numbered.length > 1) return filterShort(numbered);

  const byLines = splitByLines(trimmed);
  if (byLines.length > 1) return filterShort(byLines);

  const byConjunctions = splitByConjunctions(trimmed, config);
  if (byConjunctions.length > 1) return filterShort(byConjunctions);

  const byCommas = splitByCommasWithVerbs(trimmed, config);
  if (byCommas.length > 1) return filterShort(byCommas);

  return [trimmed];
}

function splitByNumbers(text: string): string[] {
  // Match patterns like "1. task" or "1) task" embedded in text
  const parts = text.split(/\d+[.)]\s*/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function splitByLines(text: string): string[] {
  return text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
}

function splitByConjunctions(text: string, config: LocaleSplitConfig): string[] {
  const { conjunctions, commonVerbs } = config;

  // Sort conjunctions by length (longest first) to match "and also" before "and"
  const sorted = [...conjunctions].sort((a, b) => b.length - a.length);

  let parts = [text];

  for (const conj of sorted) {
    const newParts: string[] = [];
    for (const part of parts) {
      // Split on conjunction, but only if what follows starts with a verb
      const regex = new RegExp(`\\b${conj}\\b\\s+`, "gi");
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let didSplit = false;

      while ((match = regex.exec(part)) !== null) {
        const after = part.slice(match.index + match[0].length).trim();
        const firstWord = after.split(/\s+/)[0]?.toLowerCase();

        if (firstWord && commonVerbs.includes(firstWord)) {
          newParts.push(part.slice(lastIndex, match.index).trim());
          lastIndex = match.index + match[0].length;
          didSplit = true;
        }
      }

      if (didSplit) {
        newParts.push(part.slice(lastIndex).trim());
      } else {
        newParts.push(part);
      }
    }
    parts = newParts.filter(Boolean);
  }

  return parts;
}

function splitByCommasWithVerbs(text: string, config: LocaleSplitConfig): string[] {
  const parts = text.split(/,\s*/);
  if (parts.length <= 1) return [text];

  const { commonVerbs } = config;
  // Check if most parts start with a verb — if so, treat as separate tasks
  const verbStartCount = parts.filter((p) => {
    const firstWord = p.trim().split(/\s+/)[0]?.toLowerCase();
    return firstWord && commonVerbs.includes(firstWord);
  }).length;

  // Only split if majority of parts start with verbs
  if (verbStartCount >= parts.length * 0.5 && verbStartCount >= 2) {
    return parts.map((p) => p.trim()).filter(Boolean);
  }

  return [text];
}

function filterShort(tasks: string[]): string[] {
  return tasks.filter((t) => t.split(/\s+/).length >= MIN_WORDS);
}
