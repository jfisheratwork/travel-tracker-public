import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizePlainText,
  isPrototypePollutionSafe,
  isValidCalendarDate,
  SECURITY_LIMITS,
} from './security.utils';

describe('security.utils', () => {
  describe('SECURITY_LIMITS', () => {
    it('defines security limits correctly', () => {
      expect(SECURITY_LIMITS.MAX_INPUT_PAYLOAD_BYTES).toBe(131072);
      expect(SECURITY_LIMITS.MAX_TRIPS_PER_BATCH).toBe(25);
      expect(SECURITY_LIMITS.MAX_TRIP_NOTES_LENGTH).toBe(500);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      const malicious = `<script>alert("XSS & 'pwned'")</script>`;
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; &#39;pwned&#39;&quot;)&lt;/script&gt;',
      );
    });

    it('handles empty or non-string input', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizePlainText', () => {
    it('strips HTML tags and trims whitespace', () => {
      const input = '  <b>Great</b> <a href="evil.com">trip</a> to Yellowstone!  ';
      expect(sanitizePlainText(input)).toBe('Great trip to Yellowstone!');
    });

    it('strips invisible zero-width characters and control chars', () => {
      const input = 'Trip\u200B to\x00 Yellowstone\u202E';
      expect(sanitizePlainText(input)).toBe('Trip to Yellowstone');
    });

    it('enforces maximum length truncation', () => {
      const longText = 'a'.repeat(600);
      const sanitized = sanitizePlainText(longText, 50);
      expect(sanitized.length).toBe(50);
    });
  });

  describe('isPrototypePollutionSafe', () => {
    it('returns true for safe payloads', () => {
      const safe = {
        trip: {
          name: 'Yellowstone',
          parks: ['Yellowstone'],
          states: ['Wyoming'],
        },
      };
      expect(isPrototypePollutionSafe(safe)).toBe(true);
    });

    it('detects and rejects prototype pollution attempts', () => {
      const malicious = JSON.parse('{"__proto__": {"admin": true}}');
      expect(isPrototypePollutionSafe(malicious)).toBe(false);

      const maliciousNested = {
        trip: {
          constructor: { malicious: true },
        },
      };
      expect(isPrototypePollutionSafe(maliciousNested)).toBe(false);
    });

    it('rejects objects exceeding maximum tree depth', () => {
      const deeplyNested = { a: { b: { c: { d: { e: { f: 1 } } } } } };
      expect(isPrototypePollutionSafe(deeplyNested)).toBe(false);
    });
  });

  describe('isValidCalendarDate', () => {
    it('validates correct ISO dates', () => {
      expect(isValidCalendarDate('2026-09-12')).toBe(true);
      expect(isValidCalendarDate('2024-02-29')).toBe(true); // Leap year
    });

    it('rejects impossible calendar dates', () => {
      expect(isValidCalendarDate('2023-02-29')).toBe(false); // Non-leap year Feb 29
      expect(isValidCalendarDate('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidCalendarDate('2026-13-01')).toBe(false); // Invalid month
      expect(isValidCalendarDate('2026-00-10')).toBe(false); // Invalid month
      expect(isValidCalendarDate('1850-01-01')).toBe(false); // Below min year
      expect(isValidCalendarDate('9999-01-01')).toBe(false); // Above max year
      expect(isValidCalendarDate('not-a-date')).toBe(false);
    });
  });
});
