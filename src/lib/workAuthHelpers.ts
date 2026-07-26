import { WorkAuthorizationDetails, WorkAuthorizationStatus } from '@/types/candidate';

// TODO: Future expansion roadmap markers:
// - employer sponsorship matching
// - structured locations / Google Places IDs

export const WORK_AUTH_STATUS_LABELS: Record<WorkAuthorizationStatus, string> = {
  'us-citizen': 'U.S. Citizen',
  'us-permanent-resident': 'U.S. Permanent Resident (Green Card)',
  'employment-authorization-document': 'Employment Authorization Document (EAD)',
  h1b: 'H-1B Visa',
  l1: 'L-1 Visa',
  o1: 'O-1 Visa',
  tn: 'TN Visa',
  'f1-opt': 'F-1 OPT',
  'f1-stem-opt': 'F-1 STEM OPT',
  j1: 'J-1 Visa',
  'other-visa': 'Other Visa / Work Authorization',
  'sponsorship-required': 'Sponsorship Required',
  'prefer-not-to-say': 'Prefer Not to Say',
  unspecified: 'Unspecified / Not Set',
};

export const DEFAULT_WORK_AUTHORIZATION_DETAILS: WorkAuthorizationDetails = {
  status: 'unspecified',
  sponsorshipRequiredNow: false,
  sponsorshipRequiredFuture: false,
};

/**
 * Deterministically parses legacy free-text work authorization text.
 */
export function parseLegacyWorkAuthString(text: string | undefined): WorkAuthorizationDetails {
  if (!text || !text.trim()) {
    return { ...DEFAULT_WORK_AUTHORIZATION_DETAILS };
  }

  const raw = text.trim();

  let status: WorkAuthorizationStatus = 'unspecified';
  let visaType: string | undefined = undefined;
  let notes: string | undefined = undefined;

  if (/\b(us|u\.s\.|united states)?\s*citizen\b/i.test(raw)) {
    status = 'us-citizen';
  } else if (/\b(permanent resident|green card)\b/i.test(raw)) {
    status = 'us-permanent-resident';
  } else if (/\b(ead|employment authorization)\b/i.test(raw)) {
    status = 'employment-authorization-document';
  } else if (/\bh-?1b\b/i.test(raw)) {
    status = 'h1b';
  } else if (/\bl-?1\b/i.test(raw)) {
    status = 'l1';
  } else if (/\bo-?1\b/i.test(raw)) {
    status = 'o1';
  } else if (/\btn\b/i.test(raw)) {
    status = 'tn';
  } else if (/\bstem\s*opt\b/i.test(raw)) {
    status = 'f1-stem-opt';
  } else if (/\bopt\b/i.test(raw)) {
    status = 'f1-opt';
  } else if (/\bj-?1\b/i.test(raw)) {
    status = 'j1';
  } else if (/\b(sponsorship|sponsor)\b/i.test(raw)) {
    status = 'sponsorship-required';
  } else if (/\bvisa\b/i.test(raw) || /\bpermit\b/i.test(raw) || /\bauthorization\b/i.test(raw)) {
    status = 'other-visa';
    visaType = raw;
  } else {
    status = 'unspecified';
    notes = raw;
  }

  return {
    status,
    visaType,
    sponsorshipRequiredNow: status === 'sponsorship-required',
    sponsorshipRequiredFuture: status === 'sponsorship-required',
    notes,
  };
}

/**
 * Formats structured WorkAuthorizationDetails into a clean label for view mode.
 */
export function getWorkAuthorizationLabel(details?: WorkAuthorizationDetails): string {
  if (!details || !details.status || details.status === 'unspecified') {
    return '';
  }

  if (details.status === 'prefer-not-to-say') {
    return 'Prefer Not to Say';
  }

  let base = WORK_AUTH_STATUS_LABELS[details.status] || details.status;

  if (details.status === 'other-visa' && details.visaType) {
    base = `${base}: ${details.visaType}`;
  }

  const extras: string[] = [];
  if (details.expirationDate) {
    extras.push(`Expires: ${details.expirationDate}`);
  }
  if (details.sponsorshipRequiredNow || details.sponsorshipRequiredFuture) {
    extras.push('Sponsorship Required');
  }

  if (extras.length > 0) {
    return `${base} (${extras.join(', ')})`;
  }

  return base;
}
