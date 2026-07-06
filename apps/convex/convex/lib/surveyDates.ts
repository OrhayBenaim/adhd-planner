/** UTC date string YYYY-MM-DD for survey reminder tasks. */
export function getLocalToday(): string {
  return new Date().toISOString().slice(0, 10);
}
