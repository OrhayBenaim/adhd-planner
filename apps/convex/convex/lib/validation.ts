/** Max lengths for string fields */
export const MAX_TITLE = 500;
export const MAX_DESCRIPTION = 5000;
export const MAX_NAME = 200;
export const MAX_PREF_ITEM = 100;
export const MAX_PREF_ARRAY = 20;

/** Date format: YYYY-MM-DD */
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** Time format: HH:mm */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function assertMaxLength(value: string, max: number, field: string): void {
  if (value.length > max) {
    throw new Error(`${field} exceeds maximum length of ${max}`);
  }
}

export function assertArrayLimits(
  arr: string[],
  maxItems: number,
  maxItemLength: number,
  field: string,
): void {
  if (arr.length > maxItems) {
    throw new Error(`${field} exceeds maximum of ${maxItems} items`);
  }
  for (const item of arr) {
    if (item.length > maxItemLength) {
      throw new Error(`${field} item exceeds maximum length of ${maxItemLength}`);
    }
  }
}

export function assertDateFormat(value: string): void {
  if (!DATE_RE.test(value)) {
    throw new Error(`Invalid date format, expected YYYY-MM-DD`);
  }
}

export function assertTimeFormat(value: string): void {
  if (!TIME_RE.test(value)) {
    throw new Error(`Invalid time format, expected HH:mm`);
  }
}

/**
 * Sanitize user-provided strings before embedding in AI prompts.
 * Strips control characters and truncates to MAX_PREF_ITEM length.
 */
export function sanitizeForPrompt(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .replace(/[\r\n]+/g, " ") // collapse newlines to spaces
    .slice(0, MAX_PREF_ITEM);
}
