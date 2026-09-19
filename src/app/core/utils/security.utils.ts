export const SECURITY_LIMITS = {
  MAX_INPUT_PAYLOAD_BYTES: 32768, // 32 KB maximum raw input
  MAX_TRIP_NAME_LENGTH: 100,
  MAX_TRIP_NOTES_LENGTH: 500,
  MAX_ENTITIES_PER_TRIP: 60,
  MAX_MEMBERS_PER_TRIP: 20,
  MAX_STRING_ITEM_LENGTH: 80,
  MIN_VALID_YEAR: 1900,
  MAX_VALID_YEAR: 2100,
  MAX_OBJECT_DEPTH: 4,
} as const;

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
 * Inspects a parsed JSON object recursively to ensure it is free from
 * prototype pollution keys (__proto__, constructor, prototype) and stays
 * within a safe object tree depth.
 */
export function isPrototypePollutionSafe(obj: unknown, currentDepth = 0): boolean {
  if (currentDepth > SECURITY_LIMITS.MAX_OBJECT_DEPTH) {
    return false;
  }

  if (!obj || typeof obj !== 'object') {
    return true;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (!isPrototypePollutionSafe(item, currentDepth + 1)) {
        return false;
      }
    }
    return true;
  }

  const record = obj as Record<string, unknown>;
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key of Object.keys(record)) {
    if (forbiddenKeys.includes(key)) {
      return false;
    }
    if (!isPrototypePollutionSafe(record[key], currentDepth + 1)) {
      return false;
    }
  }

  return true;
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
