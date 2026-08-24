import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { NetworkContact, NetworkColumnMapping, ImportPreviewResult } from '@/types/network';

/**
 * Normalizes company name for deterministic matching against job opportunities.
 * Trims punctuation, lowercases, and removes common corporate entity suffixes.
 */
export function normalizeCompanyName(company: string | null | undefined): string {
  if (!company) return '';

  let normalized = company
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ') // Replace punctuation with space
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();

  // Strip common corporate suffixes at the end of string
  const suffixes = [
    ' incorporated',
    ' corporation',
    ' technologies',
    ' solutions',
    ' holdings',
    ' limited',
    ' company',
    ' pte ltd',
    ' systems',
    ' group',
    ' gmbh',
    ' corp',
    ' tech',
    ' inc',
    ' llc',
    ' ltd',
    ' co',
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixes) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.slice(0, -suffix.length).trim();
        changed = true;
        break;
      }
    }
  }

  return normalized.trim();
}

/**
 * Known contact column header aliases by category.
 */
export const HEADER_CATEGORY_MATCHERS: Record<string, string[]> = {
  firstName: ['firstname', 'first', 'fname', 'givenname', 'forename'],
  lastName: ['lastname', 'last', 'lname', 'surname', 'familyname'],
  fullName: ['fullname', 'contactname', 'name', 'person', 'contact'],
  company: ['company', 'companyname', 'employer', 'organization', 'org', 'account', 'workplace', 'business'],
  position: ['position', 'jobtitle', 'title', 'role', 'occupation', 'designation', 'job'],
  email: ['emailaddress', 'email', 'mail', 'emailaddress'],
  linkedInUrl: ['linkedinurl', 'url', 'linkedin', 'linkedinprofile', 'profileurl', 'profile', 'link'],
  connectedOn: ['connectedon', 'connectiondate', 'connecteddate', 'dateconnected', 'date'],
};

/**
 * Scores a candidate row to determine how many unique contact header categories it contains.
 */
export function scoreHeaderCandidate(row: unknown[]): { score: number; matchedCategories: Set<string> } {
  if (!Array.isArray(row) || row.length === 0) {
    return { score: 0, matchedCategories: new Set() };
  }

  const matchedCategories = new Set<string>();

  for (const cell of row) {
    if (cell === null || cell === undefined) continue;
    const clean = String(cell).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (!clean) continue;

    for (const [category, keywords] of Object.entries(HEADER_CATEGORY_MATCHERS)) {
      if (matchedCategories.has(category)) continue;

      // 1. Exact clean match
      if (keywords.includes(clean)) {
        matchedCategories.add(category);
        break;
      }

      // 2. Substring match for compound keywords
      const isCompoundMatch = keywords.some(
        (kw) => (kw.length >= 4 && clean.includes(kw)) || (clean.length >= 4 && kw.includes(clean))
      );
      if (isCompoundMatch) {
        matchedCategories.add(category);
        break;
      }
    }
  }

  return { score: matchedCategories.size, matchedCategories };
}

/**
 * Finds the zero-indexed row index containing tabular contact headers.
 * Scans initial rows to skip preamble text (e.g. LinkedIn Connections notes).
 */
export function findHeaderRowIndex(rows: unknown[][], maxScanRows = 50): number {
  if (!rows || rows.length === 0) return -1;

  let bestIndex = -1;
  let bestScore = 0;

  const scanLimit = Math.min(rows.length, maxScanRows);

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    // Filter non-empty cells
    const nonEmptyCells = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (nonEmptyCells.length < 2) continue; // Skip single-column preamble lines like "Notes:"

    const { score } = scoreHeaderCandidate(nonEmptyCells);

    // If row matches more distinct contact categories, track it
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // If a strong contact header candidate (score >= 2) was found anywhere in scan range
  if (bestScore >= 2 && bestIndex !== -1) {
    return bestIndex;
  }

  // Fallback for generic CSV: If row 0 has at least 2 non-empty columns
  if (rows.length > 0 && Array.isArray(rows[0])) {
    const row0NonEmpty = rows[0].filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (row0NonEmpty.length >= 2) {
      return 0;
    }
  }

  return -1;
}

/**
 * Auto-detects header column mappings for LinkedIn CSVs or generic contact sheets.
 */
export function autoDetectColumnMapping(headers: string[]): NetworkColumnMapping {
  const normalized = headers.map((h) => ({
    original: h,
    clean: h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''),
  }));

  const findHeader = (candidates: string[], exclude: string[] = []): string => {
    // 1. Exact clean match first
    for (const c of candidates) {
      const match = normalized.find((h) => h.clean === c && !exclude.some((ex) => h.clean.includes(ex)));
      if (match) return match.original;
    }
    // 2. Substring match
    for (const c of candidates) {
      const match = normalized.find((h) => h.clean.includes(c) && !exclude.some((ex) => h.clean.includes(ex)));
      if (match) return match.original;
    }
    return '';
  };

  return {
    firstName: findHeader(['firstname', 'first', 'fname', 'givenname', 'forename']),
    lastName: findHeader(['lastname', 'last', 'lname', 'surname', 'familyname']),
    fullName: findHeader(
      ['fullname', 'contactname', 'name', 'person', 'contact'],
      ['first', 'last', 'company', 'org', 'account']
    ),
    email: findHeader(['emailaddress', 'email', 'mail', 'e-mail']),
    company: findHeader(['company', 'companyname', 'employer', 'organization', 'org', 'account', 'workplace']),
    position: findHeader(['position', 'jobtitle', 'title', 'role', 'occupation', 'designation', 'job']),
    linkedInUrl: findHeader(['linkedinurl', 'url', 'linkedinprofile', 'profileurl', 'linkedin', 'link']),
    connectedOn: findHeader(['connectedon', 'connectiondate', 'connecteddate', 'dateconnected', 'date']),
  };
}

/**
 * Parses a raw CSV string with robust header detection and returns detected column mappings and data rows.
 */
export function parseCSVData(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const parseResult = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: false,
  });

  const rawRows = parseResult.data || [];
  if (rawRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerRowIndex = findHeaderRowIndex(rawRows);
  if (headerRowIndex === -1) {
    throw new Error('No valid contact table headers found in CSV file.');
  }

  const headerRow = rawRows[headerRowIndex] || [];
  const headers = headerRow.map((h, idx) => String(h || '').trim() || `Column_${idx + 1}`);

  const dataRows = rawRows.slice(headerRowIndex + 1);
  const rows: Record<string, string>[] = [];

  for (const rowCells of dataRows) {
    if (!rowCells || rowCells.every((c) => !c || String(c).trim() === '')) {
      continue;
    }
    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = String(rowCells[idx] ?? '').trim();
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Parses an XLSX / XLS binary buffer into rows and headers with preamble tolerance.
 */
export function parseExcelData(arrayBuffer: ArrayBuffer): { headers: string[]; rows: Record<string, string>[] } {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], rows: [] };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawSheetData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rawSheetData.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerRowIndex = findHeaderRowIndex(rawSheetData);
  if (headerRowIndex === -1) {
    throw new Error('No valid contact table headers found in Excel sheet.');
  }

  const headerRow = rawSheetData[headerRowIndex] || [];
  const headers = headerRow.map((h, idx) => String(h || '').trim() || `Column_${idx + 1}`);

  const dataRows = rawSheetData.slice(headerRowIndex + 1);
  const rows: Record<string, string>[] = [];

  for (const rowCells of dataRows) {
    if (!rowCells || (rowCells as unknown[]).every((c) => !c || String(c).trim() === '')) {
      continue;
    }
    const rowObj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const val = (rowCells as unknown[])[idx];
      rowObj[header] = val instanceof Date ? val.toISOString().split('T')[0] : String(val || '').trim();
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Maps raw rows into structured NetworkContact entities with deduplication and validation.
 */
export function processRawNetworkRows(
  rows: Record<string, string>[],
  mapping: NetworkColumnMapping,
  source: NetworkContact['source'] = 'generic_csv',
  timestamp = new Date().toISOString()
): ImportPreviewResult {
  const mappedContacts: NetworkContact[] = [];
  const seenKeys = new Map<string, NetworkContact>();
  let duplicatesMerged = 0;
  let invalidRowsSkipped = 0;

  rows.forEach((row, index) => {
    const firstName = (mapping.firstName ? row[mapping.firstName] : '').trim();
    const lastName = (mapping.lastName ? row[mapping.lastName] : '').trim();
    let fullName = (mapping.fullName ? row[mapping.fullName] : '').trim();

    if (!fullName) {
      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`.trim().replace(/\s+/g, ' ');
      } else if (firstName) {
        fullName = firstName;
      } else if (lastName) {
        fullName = lastName;
      }
    }

    const company = (mapping.company ? row[mapping.company] : '').trim();
    const position = (mapping.position ? row[mapping.position] : '').trim();
    const email = (mapping.email ? row[mapping.email] : '').trim();
    const linkedInUrl = (mapping.linkedInUrl ? row[mapping.linkedInUrl] : '').trim();
    const connectedOn = (mapping.connectedOn ? row[mapping.connectedOn] : '').trim();

    // Validity requirement: Must have at least a usable name, email, or profile URL
    const hasIdentity = Boolean(fullName || email || linkedInUrl || (firstName && lastName));
    if (!hasIdentity) {
      invalidRowsSkipped++;
      return;
    }

    const contact: NetworkContact = {
      id: `contact-imp-${index + 1}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: fullName || email || 'Professional Contact',
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      company: company || undefined,
      position: position || undefined,
      linkedInUrl: linkedInUrl || undefined,
      connectedOn: connectedOn || undefined,
      source,
      importedAt: timestamp,
    };

    // Deduplication Key Precedence: (1) LinkedIn URL, (2) Email, (3) Full Name + Company
    let dedupKey = '';
    if (contact.linkedInUrl) {
      dedupKey = `url:${contact.linkedInUrl.toLowerCase().replace(/\/$/, '')}`;
    } else if (contact.email) {
      dedupKey = `email:${contact.email.toLowerCase()}`;
    } else if (contact.fullName && contact.company) {
      dedupKey = `name_co:${contact.fullName.toLowerCase().replace(/\s+/g, ' ')}_${normalizeCompanyName(contact.company)}`;
    }

    if (dedupKey && seenKeys.has(dedupKey)) {
      duplicatesMerged++;
      const existing = seenKeys.get(dedupKey)!;
      // Merge richer non-empty values
      if (contact.position && (!existing.position || contact.position.length > existing.position.length)) {
        existing.position = contact.position;
      }
      if (contact.company && (!existing.company || contact.company.length > existing.company.length)) {
        existing.company = contact.company;
      }
      if (contact.email && !existing.email) {
        existing.email = contact.email;
      }
      if (contact.linkedInUrl && !existing.linkedInUrl) {
        existing.linkedInUrl = contact.linkedInUrl;
      }
      if (contact.connectedOn && !existing.connectedOn) {
        existing.connectedOn = contact.connectedOn;
      }
    } else {
      if (dedupKey) {
        seenKeys.set(dedupKey, contact);
      }
      mappedContacts.push(contact);
    }
  });

  const detectedCompanies = Array.from(
    new Set(mappedContacts.map((c) => c.company).filter(Boolean) as string[])
  ).sort();

  return {
    totalRows: rows.length,
    mappedContacts,
    duplicatesMerged,
    invalidRowsSkipped,
    detectedCompanies,
  };
}
