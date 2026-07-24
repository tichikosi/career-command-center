import { FollowUpStatus } from '@/types/opportunity';

// ---------------------------------------------------------------------------
// Deterministic YYYY-MM-DD date helpers
// Uses string comparison only — no locale-sensitive Date parsing
// ---------------------------------------------------------------------------

/**
 * Return today's date as a YYYY-MM-DD string in local time.
 * Deterministic at runtime; not SSR-safe (call only after mount / in client code).
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Classify a follow-up date string into a FollowUpStatus category.
 * Accepts YYYY-MM-DD strings. Empty / undefined / invalid → 'No Date'.
 */
export function classifyFollowUpDate(
  followUpDate: string | undefined
): FollowUpStatus {
  if (!followUpDate || !isValidDateString(followUpDate)) return 'No Date';

  const today = todayISO();

  if (followUpDate < today) return 'Overdue';
  if (followUpDate === today) return 'Due Today';
  return 'Upcoming';
}

/**
 * Validate that a string is a well-formed YYYY-MM-DD date.
 * Does not accept partial dates or ISO timestamps.
 */
export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Format a YYYY-MM-DD date as a short human-readable string (e.g. "Jul 28, 2026").
 * Avoids locale-sensitive toLocaleDateString by using explicit UTC option.
 * Returns an empty string for invalid input.
 */
export function formatShortDate(value: string | undefined): string {
  if (!value || !isValidDateString(value)) return '';
  // Append T00:00:00Z so Date interprets as UTC midnight — consistent across locales
  const d = new Date(`${value}T00:00:00Z`);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Validate a user-supplied URL string.
 * Accepts only http:// and https:// protocols to prevent javascript: injection.
 * Returns the trimmed URL if valid, otherwise null.
 */
export function validateUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}
