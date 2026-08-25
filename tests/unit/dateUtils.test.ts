/**
 * Date Utilities — Unit Tests
 *
 * Tests follow-up date classification, URL validation,
 * date formatting, and timezone edge cases.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  todayISO,
  classifyFollowUpDate,
  isValidDateString,
  formatShortDate,
  validateUrl,
  formatMonthYear,
  formatRoleDateRange,
} from '@/lib/dateUtils';

describe('isValidDateString', () => {
  it('accepts valid YYYY-MM-DD strings', () => {
    expect(isValidDateString('2026-01-15')).toBe(true);
    expect(isValidDateString('2026-12-31')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidDateString('2026-1-5')).toBe(false);
    expect(isValidDateString('01-15-2026')).toBe(false);
    expect(isValidDateString('2026/01/15')).toBe(false);
    expect(isValidDateString('2026-01-15T00:00:00Z')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });
});

describe('todayISO', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const today = todayISO();
    expect(isValidDateString(today)).toBe(true);
  });
});

describe('classifyFollowUpDate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "No Date" for undefined/empty', () => {
    expect(classifyFollowUpDate(undefined)).toBe('No Date');
    expect(classifyFollowUpDate('')).toBe('No Date');
  });

  it('returns "No Date" for invalid date strings', () => {
    expect(classifyFollowUpDate('invalid')).toBe('No Date');
    expect(classifyFollowUpDate('2026/01/15')).toBe('No Date');
  });

  it('returns "Overdue" for past dates', () => {
    // Use a date far in the past to avoid flakiness
    expect(classifyFollowUpDate('2020-01-01')).toBe('Overdue');
  });

  it('returns "Upcoming" for future dates', () => {
    // Use a date far in the future
    expect(classifyFollowUpDate('2099-12-31')).toBe('Upcoming');
  });

  it('returns "Due Today" when date matches today', () => {
    const today = todayISO();
    expect(classifyFollowUpDate(today)).toBe('Due Today');
  });
});

describe('formatShortDate', () => {
  it('formats a valid date as "Mon DD, YYYY"', () => {
    const result = formatShortDate('2026-07-15');
    expect(result).toBe('Jul 15, 2026');
  });

  it('handles Jan 1 correctly', () => {
    const result = formatShortDate('2026-01-01');
    expect(result).toBe('Jan 1, 2026');
  });

  it('handles Dec 31 correctly', () => {
    const result = formatShortDate('2026-12-31');
    expect(result).toBe('Dec 31, 2026');
  });

  it('returns empty string for invalid input', () => {
    expect(formatShortDate(undefined)).toBe('');
    expect(formatShortDate('')).toBe('');
    expect(formatShortDate('invalid')).toBe('');
  });

  it('uses UTC to avoid timezone drift', () => {
    // No matter the local timezone, the result should always be the same
    const result = formatShortDate('2026-08-13');
    expect(result).toBe('Aug 13, 2026');
  });
});

describe('validateUrl', () => {
  it('accepts valid http URLs', () => {
    expect(validateUrl('http://example.com')).toBe('http://example.com');
  });

  it('accepts valid https URLs', () => {
    expect(validateUrl('https://example.com/path')).toBe('https://example.com/path');
  });

  it('rejects javascript: URLs', () => {
    expect(validateUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: URLs', () => {
    expect(validateUrl('data:text/html,<h1>Test</h1>')).toBeNull();
  });

  it('rejects empty strings', () => {
    expect(validateUrl('')).toBeNull();
  });

  it('rejects invalid URLs', () => {
    expect(validateUrl('not a url')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(validateUrl('  https://example.com  ')).toBe('https://example.com');
  });
});

describe('formatMonthYear', () => {
  it('formats YYYY-MM into human-readable Month Year', () => {
    expect(formatMonthYear('2019-06')).toBe('Jun 2019');
    expect(formatMonthYear('2022-12')).toBe('Dec 2022');
    expect(formatMonthYear('2024-01')).toBe('Jan 2024');
  });

  it('formats YYYY-MM-DD into human-readable Month Year', () => {
    expect(formatMonthYear('2020-03-15')).toBe('Mar 2020');
  });

  it('preserves plain year or text representation', () => {
    expect(formatMonthYear('2020')).toBe('2020');
    expect(formatMonthYear('Present')).toBe('Present');
    expect(formatMonthYear('')).toBe('');
    expect(formatMonthYear(undefined)).toBe('');
  });
});

describe('formatRoleDateRange', () => {
  it('formats short internship dates (YYYY-MM to YYYY-MM)', () => {
    expect(formatRoleDateRange('2019-06', '2019-08')).toBe('Jun 2019 — Aug 2019');
  });

  it('formats multi-year roles cleanly', () => {
    expect(formatRoleDateRange('2020', '2025')).toBe('2020 — 2025');
  });

  it('formats current active roles with Present', () => {
    expect(formatRoleDateRange('2022-01', 'Present', true)).toBe('Jan 2022 — Present');
    expect(formatRoleDateRange('2022', undefined, true)).toBe('2022 — Present');
  });

  it('handles missing or partial dates safely', () => {
    expect(formatRoleDateRange('2023')).toBe('2023 — Present');
    expect(formatRoleDateRange(undefined, undefined)).toBe('');
  });
});
