export const SECURITY_LIMITS = {
  MAX_INPUT_PAYLOAD_BYTES: 131072, // 128 KB maximum raw input (for multi-trip batches)
  MAX_TRIPS_PER_BATCH: 25, // Maximum trips allowed in a single batch
  MAX_TRIP_NAME_LENGTH: 100,
  MAX_TRIP_NOTES_LENGTH: 500,
  MAX_ENTITIES_PER_TRIP: 60,
  MAX_MEMBERS_PER_TRIP: 20,
  MAX_STRING_ITEM_LENGTH: 80,
  MIN_VALID_YEAR: 1900,
  MAX_VALID_YEAR: 2100,
  MAX_OBJECT_DEPTH: 8,
} as const;

/**
 * Result returned by payload safety verification.
 */
export interface PayloadSafetyResult {
  safe: boolean;
  reason?: 'prototype_pollution' | 'excessive_depth';
  errorMessage?: string;
}

/**
 * Escapes characters with special meaning in HTML to prevent XSS.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes arbitrary user/AI text:
 * - Enforces strict maximum length.
 * - Strips ASCII control characters (except space/newlines).
 * - Strips zero-width and bidirectional Unicode override characters.
 * - Strips HTML tags.
 * - Trims excessive whitespace.
 */
export function sanitizePlainText(
  str: string,
  maxLength: number = SECURITY_LIMITS.MAX_TRIP_NOTES_LENGTH,
): string {
  if (!str || typeof str !== 'string') return '';

  let cleaned = str
    // Strip <script>...</script> blocks and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip <style>...</style> blocks and contents
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Strip all remaining HTML/XML tags
    .replace(/<[^>]*>/g, '')
    // Strip ASCII control characters (0x00-0x1F except \t \n \r, and 0x7F)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip zero-width, invisible, and bidirectional override Unicode characters
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
    // Normalize excessive horizontal whitespace
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength).trim();
  }

  return cleaned;
}

/**
 * Inspects a parsed JSON structure recursively to ensure:
 * 1. It is free from prototype pollution keys (__proto__, constructor, prototype).
 * 2. It does not exceed the safe maximum object nesting depth (8 levels).
 * Returns specific, user-friendly diagnostic guidance when unsafe patterns are found.
 */
export function checkPayloadSafety(obj: unknown, currentDepth = 0): PayloadSafetyResult {
  if (currentDepth > SECURITY_LIMITS.MAX_OBJECT_DEPTH) {
    return {
      safe: false,
      reason: 'excessive_depth',
      errorMessage: `JSON nesting depth exceeds the allowed limit (${SECURITY_LIMITS.MAX_OBJECT_DEPTH} levels). Please simplify or flatten the structure.`,
    };
  }

  if (!obj || typeof obj !== 'object') {
    return { safe: true };
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const res = checkPayloadSafety(item, currentDepth + 1);
      if (!res.safe) {
        return res;
      }
    }
    return { safe: true };
  }

  const record = obj as Record<string, unknown>;
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key of Object.keys(record)) {
    if (forbiddenKeys.includes(key)) {
      return {
        safe: false,
        reason: 'prototype_pollution',
        errorMessage: `JSON contains forbidden property key "${key}". Please remove it from the input.`,
      };
    }
    const res = checkPayloadSafety(record[key], currentDepth + 1);
    if (!res.safe) {
      return res;
    }
  }

  return { safe: true };
}

/**
 * Convenience boolean check for backward compatibility.
 */
export function isPrototypePollutionSafe(obj: unknown, currentDepth = 0): boolean {
  return checkPayloadSafety(obj, currentDepth).safe;
}

/**
 * Validates that a string is a strict, real Gregorian calendar date within
 * reasonable travel history bounds (1900-2100).
 */
export function isValidCalendarDate(
  dateStr: string,
  minYear = SECURITY_LIMITS.MIN_VALID_YEAR,
  maxYear = SECURITY_LIMITS.MAX_VALID_YEAR,
): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < minYear || year > maxYear) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Verify days in month (including leap year for February)
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}
