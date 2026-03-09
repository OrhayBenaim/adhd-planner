/**
 * Normalized Levenshtein distance between two strings.
 * Returns a ratio 0..1 where 0 = identical, 1 = completely different.
 */
export function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;

  const la = a.length;
  const lb = b.length;
  const dp: number[] = Array.from({ length: lb + 1 }, (_, i) => i);

  for (let i = 1; i <= la; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }

  return dp[lb] / maxLen;
}
