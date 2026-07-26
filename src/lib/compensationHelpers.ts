import { CompensationCurrency, CompensationPreference, CompensationPreferences } from '@/types/candidate';

// TODO: Future expansion roadmap markers:
// - current compensation
// - total compensation
// - richer compensation compatibility scoring

export const CURRENCY_OPTIONS: Array<{ code: CompensationCurrency; label: string }> = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'CAD', label: 'CAD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'ZAR', label: 'ZAR (R)' },
  { code: 'KES', label: 'KES (KSh)' },
  { code: 'AUD', label: 'AUD ($)' },
  { code: 'CHF', label: 'CHF (Fr)' },
  { code: 'SGD', label: 'SGD ($)' },
  { code: 'AED', label: 'AED (د.إ)' },
  { code: 'NGN', label: 'NGN (₦)' },
  { code: 'GHS', label: 'GHS (₵)' },
  { code: 'ZWL', label: 'ZWL ($)' },
  { code: 'OTHER', label: 'Other Currency' },
];

export const PREFERENCE_LABELS: Record<CompensationPreference, string> = {
  required: 'Must Have',
  preferred: 'Preferred',
  'not-important': 'Not Important',
};

export const DEFAULT_COMPENSATION_PREFERENCES: CompensationPreferences = {
  currency: 'USD',
  bonusPreference: 'not-important',
  equityPreference: 'not-important',
};

/**
 * Natural typing helper for salary inputs.
 * Accepts "220000", "220,000", "$220000", "$220,000" and normalizes to 220000.
 */
export function parseSalaryInput(raw: string | number | undefined | null): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return isNaN(raw) || raw < 0 ? undefined : Math.round(raw);

  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  if (!cleaned) return undefined;
  const val = parseFloat(cleaned);
  if (isNaN(val) || val < 0) return undefined;
  return Math.round(val);
}

/**
 * Formats a numeric salary for input display (e.g. 220000 -> "220,000").
 */
export function formatSalaryDisplay(val: number | undefined): string {
  if (val === undefined || isNaN(val)) return '';
  return val.toLocaleString('en-US');
}

/**
 * Deterministically parses a legacy free-text compensation string.
 * Keeps USD as default currency when no explicit currency is supplied.
 */
export function parseLegacyCompensationString(text: string | undefined): CompensationPreferences {
  if (!text || !text.trim()) {
    return { ...DEFAULT_COMPENSATION_PREFERENCES };
  }

  const raw = text.trim();
  let currency: CompensationCurrency = 'USD';

  // Detect explicit currency codes
  for (const curr of CURRENCY_OPTIONS) {
    if (curr.code !== 'OTHER' && new RegExp(`\\b${curr.code}\\b`, 'i').test(raw)) {
      currency = curr.code;
      break;
    }
  }

  // Range extraction regex for min and max salary
  let baseSalaryMin: number | undefined = undefined;
  let baseSalaryMax: number | undefined = undefined;

  // Patterns like "$220,000 - $260,000" or "$200K to $250K" or "200000-250000"
  const rangeMatch = raw.match(/(\$?\d[\d,]*\s*[kK]?)\s*(?:-|to)\s*(\$?\d[\d,]*\s*[kK]?)/);
  if (rangeMatch) {
    const parsePart = (part: string): number | undefined => {
      const isK = /k/i.test(part);
      const cleaned = part.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (isNaN(num)) return undefined;
      return Math.round(isK ? num * 1000 : num);
    };

    const minCandidate = parsePart(rangeMatch[1]);
    const maxCandidate = parsePart(rangeMatch[2]);

    if (minCandidate !== undefined && maxCandidate !== undefined) {
      if (minCandidate <= maxCandidate) {
        baseSalaryMin = minCandidate;
        baseSalaryMax = maxCandidate;
      } else {
        baseSalaryMin = maxCandidate;
        baseSalaryMax = minCandidate;
      }
    } else if (minCandidate !== undefined) {
      baseSalaryMin = minCandidate;
    }
  } else {
    // Single number match e.g. "$250,000" or "250k"
    const singleMatch = raw.match(/(\$?\d[\d,]*\s*[kK]?)/);
    if (singleMatch) {
      const part = singleMatch[1];
      const isK = /k/i.test(part);
      const cleaned = part.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        baseSalaryMin = Math.round(isK ? num * 1000 : num);
      }
    }
  }

  // Detect equity preference
  const hasEquity = /\b(equity|stock|options|rsus?)\b/i.test(raw);
  const equityPreference: CompensationPreference = hasEquity ? 'preferred' : 'not-important';

  // Detect bonus preference
  const hasBonus = /\b(bonus)\b/i.test(raw);
  const bonusPreference: CompensationPreference = hasBonus ? 'preferred' : 'not-important';

  return {
    currency,
    baseSalaryMin,
    baseSalaryMax,
    bonusPreference,
    equityPreference,
    notes: text.trim(),
  };
}

/**
 * Returns formatted display fields for profile view mode.
 */
export function formatCompensationPreferences(prefs?: CompensationPreferences): {
  salaryFormatted?: string;
  bonusFormatted?: string;
  bonusPercentFormatted?: string;
  equityFormatted?: string;
  notes?: string;
} {
  if (!prefs) return {};

  const { currency, baseSalaryMin, baseSalaryMax, bonusPreference, targetBonusPercent, equityPreference, notes } = prefs;

  let salaryFormatted: string | undefined = undefined;
  if (baseSalaryMin !== undefined && baseSalaryMax !== undefined) {
    salaryFormatted = `$${baseSalaryMin.toLocaleString('en-US')}–$${baseSalaryMax.toLocaleString('en-US')} ${currency}`;
  } else if (baseSalaryMin !== undefined) {
    salaryFormatted = `$${baseSalaryMin.toLocaleString('en-US')}+ ${currency}`;
  } else if (baseSalaryMax !== undefined) {
    salaryFormatted = `< $${baseSalaryMax.toLocaleString('en-US')} ${currency}`;
  }

  const bonusFormatted = bonusPreference !== 'not-important' ? PREFERENCE_LABELS[bonusPreference] : undefined;
  const bonusPercentFormatted = bonusPreference !== 'not-important' && targetBonusPercent !== undefined && targetBonusPercent > 0 ? `${targetBonusPercent}%` : undefined;
  const equityFormatted = equityPreference !== 'not-important' ? PREFERENCE_LABELS[equityPreference] : undefined;

  return {
    salaryFormatted,
    bonusFormatted,
    bonusPercentFormatted,
    equityFormatted,
    notes,
  };
}

export interface JobCompensationRange {
  currency: CompensationCurrency;
  baseSalaryMin?: number;
  baseSalaryMax?: number;
}

// TODO: Future enhancement for richer compensation compatibility scoring and employer sponsorship matching
export function isCompensationRangeCompatible(
  candidatePreferences?: CompensationPreferences,
  jobCompensation?: JobCompensationRange
): boolean | 'unknown' {
  if (!candidatePreferences || !jobCompensation) return 'unknown';
  if (candidatePreferences.currency !== jobCompensation.currency) return 'unknown';

  const candMin = candidatePreferences.baseSalaryMin;
  const candMax = candidatePreferences.baseSalaryMax;
  const jobMin = jobCompensation.baseSalaryMin;
  const jobMax = jobCompensation.baseSalaryMax;

  if (candMin !== undefined && jobMax !== undefined && candMin > jobMax) {
    return false;
  }
  if (candMax !== undefined && jobMin !== undefined && candMax < jobMin) {
    return false;
  }
  return true;
}
