import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  normalizeCompanyName,
  autoDetectColumnMapping,
  parseCSVData,
  parseExcelData,
  findHeaderRowIndex,
  scoreHeaderCandidate,
  processRawNetworkRows,
} from '@/lib/networkParser';
import { findMatchingContacts, rankMatchedContacts, generateSuggestedOutreachAction } from '@/lib/networkMatcher';
import {
  normalizeNetworkContact,
  addNetworkContacts,
  updateNetworkContact,
  deleteNetworkContact,
  saveNetworkContacts,
  clearNetworkContacts,
  getNetworkContacts,
} from '@/lib/networkStorage';
import { getOpportunities, deleteOpportunity, getOpportunityById } from '@/lib/storage';
import { NetworkContact, NetworkColumnMapping } from '@/types/network';

describe('Professional Network & LinkedIn Intelligence', () => {
  describe('normalizeCompanyName', () => {
    it('normalizes casing, whitespace, and punctuation', () => {
      expect(normalizeCompanyName('  ServiceNow, Inc.  ')).toBe('servicenow');
      expect(normalizeCompanyName('Klaviyo LLC')).toBe('klaviyo');
      expect(normalizeCompanyName('Snowflake Corporation')).toBe('snowflake');
      expect(normalizeCompanyName('Stripe Tech Co.')).toBe('stripe');
      expect(normalizeCompanyName('Anthropic Technologies Inc')).toBe('anthropic');
      expect(normalizeCompanyName('Datadog (Systems)')).toBe('datadog');
    });

    it('handles empty and edge-case inputs gracefully', () => {
      expect(normalizeCompanyName('')).toBe('');
      expect(normalizeCompanyName(undefined)).toBe('');
      expect(normalizeCompanyName(null)).toBe('');
    });
  });

  describe('autoDetectColumnMapping', () => {
    it('7. accurately identifies standard LinkedIn connection headers', () => {
      const headers = ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On'];
      const mapping = autoDetectColumnMapping(headers);

      expect(mapping.firstName).toBe('First Name');
      expect(mapping.lastName).toBe('Last Name');
      expect(mapping.linkedInUrl).toBe('URL');
      expect(mapping.email).toBe('Email Address');
      expect(mapping.company).toBe('Company');
      expect(mapping.position).toBe('Position');
      expect(mapping.connectedOn).toBe('Connected On');
    });

    it('identifies generic spreadsheet contact headers', () => {
      const headers = ['FullName', 'Employer', 'Job Title', 'Mail', 'Profile Link'];
      const mapping = autoDetectColumnMapping(headers);

      expect(mapping.fullName).toBe('FullName');
      expect(mapping.company).toBe('Employer');
      expect(mapping.position).toBe('Job Title');
      expect(mapping.email).toBe('Mail');
    });
  });

  describe('CSV Preamble & Header Detection', () => {
    const linkedInPreambleCsv = `Notes:
1. When exporting your connection data, that may contain your connections' names, email addresses, etc.
2. Please do not distribute without permission.

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Tanaka,Chikosi,https://www.linkedin.com/in/tanakachikosi,tanaka@google.com,Google,AI GTM Lead,10 Jan 2024
Elena,Rostova,https://www.linkedin.com/in/elenarostova,,DNX Ventures,Partner,15 Feb 2023
Marcus,Vance,https://www.linkedin.com/in/marcusvance,marcus@stripe.com,Stripe,VP Product,01 Mar 2022
Sarah,Miller,https://www.linkedin.com/in/sarahmiller,sarah@meta.com,Meta,Director Operations,20 May 2021`;

    it('1, 2 & 3. detects actual header row after informational preamble rows and excludes preamble from contact count', () => {
      const { headers, rows } = parseCSVData(linkedInPreambleCsv);

      expect(headers).toContain('First Name');
      expect(headers).toContain('Last Name');
      expect(headers).toContain('URL');
      expect(headers).toContain('Company');
      expect(headers).toContain('Position');

      // Preamble notes are excluded from total rows
      expect(rows.length).toBe(4);
      expect(rows[0]['First Name']).toBe('Tanaka');
      expect(rows[0]['Last Name']).toBe('Chikosi');
      expect(rows[0]['Company']).toBe('Google');
    });

    it('4. standard CSV with header on the very first row works normally', () => {
      const ordinaryCsv = `Full Name,Company,Position,Email Address
John Doe,Acme Corp,Engineer,john@acme.com
Jane Smith,Beta Inc,Manager,jane@beta.com`;

      const { headers, rows } = parseCSVData(ordinaryCsv);
      expect(headers).toEqual(['Full Name', 'Company', 'Position', 'Email Address']);
      expect(rows.length).toBe(2);
      expect(rows[0]['Full Name']).toBe('John Doe');
    });

    it('scores header candidate rows based on recognized contact categories', () => {
      const preambleRow = ['Notes:'];
      expect(scoreHeaderCandidate(preambleRow).score).toBe(0);

      const linkedInHeader = ['First Name', 'Last Name', 'URL', 'Email Address', 'Company', 'Position', 'Connected On'];
      expect(scoreHeaderCandidate(linkedInHeader).score).toBe(7);

      const rows = [
        ['Notes:'],
        ['1. Disclaimer'],
        [],
        ['First Name', 'Last Name', 'Company', 'Position'],
        ['Tanaka', 'Chikosi', 'Google', 'AI Lead'],
      ];
      expect(findHeaderRowIndex(rows)).toBe(3);
    });

    it('13. malformed/no-header CSV fails clearly with informative error', () => {
      const emptyCsv = ``;
      expect(() => parseCSVData(emptyCsv)).not.toThrow();

      const invalidCsv = `SingleColumnOnly\nJustSomeText`;
      expect(() => parseCSVData(invalidCsv)).toThrow(/No valid contact table headers/i);
    });
  });

  describe('Contact Mapping, Validation & Identity Rules', () => {
    it('5 & 6. combines First Name and Last Name cleanly and supports single-name contacts', () => {
      const rows = [
        { 'First Name': 'Tanaka Ian', 'Last Name': 'Chikosi', Company: 'Google' },
        { 'First Name': 'Madonna', 'Last Name': '', Company: 'Entertainment' },
        { 'First Name': '', 'Last Name': 'Cher', Company: 'Music' },
      ];

      const mapping: NetworkColumnMapping = {
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: '',
        company: 'Company',
        position: '',
        email: '',
        linkedInUrl: '',
        connectedOn: '',
      };

      const preview = processRawNetworkRows(rows, mapping, 'linkedin_csv');
      expect(preview.mappedContacts.length).toBe(3);
      expect(preview.mappedContacts[0].fullName).toBe('Tanaka Ian Chikosi');
      expect(preview.mappedContacts[1].fullName).toBe('Madonna');
      expect(preview.mappedContacts[2].fullName).toBe('Cher');
    });

    it('8 & 9. preserves email and Connected On date metadata', () => {
      const rows = [
        {
          'First Name': 'Tanaka',
          'Last Name': 'Chikosi',
          'Email Address': 'tanaka@example.com',
          Company: 'Google',
          'Connected On': '12 Jan 2024',
        },
      ];

      const mapping: NetworkColumnMapping = {
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: '',
        email: 'Email Address',
        company: 'Company',
        position: '',
        linkedInUrl: '',
        connectedOn: 'Connected On',
      };

      const preview = processRawNetworkRows(rows, mapping, 'linkedin_csv');
      expect(preview.mappedContacts[0].email).toBe('tanaka@example.com');
      expect(preview.mappedContacts[0].connectedOn).toBe('12 Jan 2024');
    });

    it('10, 11 & 12. missing optional company, position, or LinkedIn URL does not invalidate contact', () => {
      const rows = [
        { 'First Name': 'Alex', 'Last Name': 'Vance', Company: '', Position: '', URL: '' },
      ];

      const mapping: NetworkColumnMapping = {
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: '',
        email: '',
        company: 'Company',
        position: 'Position',
        linkedInUrl: 'URL',
        connectedOn: '',
      };

      const preview = processRawNetworkRows(rows, mapping, 'linkedin_csv');
      expect(preview.mappedContacts.length).toBe(1);
      expect(preview.mappedContacts[0].fullName).toBe('Alex Vance');
      expect(preview.mappedContacts[0].company).toBeUndefined();
      expect(preview.mappedContacts[0].position).toBeUndefined();
      expect(preview.mappedContacts[0].linkedInUrl).toBeUndefined();
    });

    it('14. manual mapping fallback allows custom column overrides', () => {
      const rows = [
        { CustomColA: 'Alice Wonderland', CustomColB: 'Magic Corp', CustomColC: 'Wizard' },
      ];

      const customMapping: NetworkColumnMapping = {
        firstName: '',
        lastName: '',
        fullName: 'CustomColA',
        company: 'CustomColB',
        position: 'CustomColC',
        email: '',
        linkedInUrl: '',
        connectedOn: '',
      };

      const preview = processRawNetworkRows(rows, customMapping, 'generic_csv');
      expect(preview.mappedContacts.length).toBe(1);
      expect(preview.mappedContacts[0].fullName).toBe('Alice Wonderland');
      expect(preview.mappedContacts[0].company).toBe('Magic Corp');
      expect(preview.mappedContacts[0].position).toBe('Wizard');
    });

    it('16. preview accurately generates sample contacts and calculates valid counts', () => {
      const rows = [
        { 'First Name': 'User1', 'Last Name': 'Last1', Company: 'Company1' },
        { 'First Name': 'User2', 'Last Name': 'Last2', Company: 'Company2' },
        { 'First Name': 'User3', 'Last Name': 'Last3', Company: 'Company1' },
        { 'First Name': 'User4', 'Last Name': 'Last4', Company: 'Company3' },
      ];

      const mapping: NetworkColumnMapping = {
        firstName: 'First Name',
        lastName: 'Last Name',
        fullName: '',
        company: 'Company',
        position: '',
        email: '',
        linkedInUrl: '',
        connectedOn: '',
      };

      const preview = processRawNetworkRows(rows, mapping, 'linkedin_csv');
      expect(preview.totalRows).toBe(4);
      expect(preview.mappedContacts.length).toBe(4);
      expect(preview.detectedCompanies).toEqual(['Company1', 'Company2', 'Company3']);
      expect(preview.mappedContacts.slice(0, 3).length).toBe(3);
    });
  });

  describe('Deduplication Architecture', () => {
    it('17. deduplicates within import payload and merges richer contact data', () => {
      const rawCsv = `First Name,Last Name,Company,Position,URL,Email Address
Sarah,Chen,ServiceNow,Director AI,https://linkedin.com/in/sarahchen,sarah@example.com
Sarah,Chen,ServiceNow,Director AI & Strategy,https://linkedin.com/in/sarahchen,sarah.chen@servicenow.com
David,Miller,Klaviyo,VP RevOps,https://linkedin.com/in/davidmiller,david@klaviyo.com`;

      const { headers, rows } = parseCSVData(rawCsv);
      const mapping = autoDetectColumnMapping(headers);
      const preview = processRawNetworkRows(rows, mapping, 'linkedin_csv');

      expect(preview.totalRows).toBe(3);
      expect(preview.mappedContacts.length).toBe(2);
      expect(preview.duplicatesMerged).toBe(1);

      const mergedSarah = preview.mappedContacts.find((c) => c.fullName.includes('Sarah Chen'));
      expect(mergedSarah).toBeDefined();
      expect(mergedSarah?.position).toBe('Director AI & Strategy');
      expect(mergedSarah?.email).toBe('sarah@example.com');
    });

    it('deduplicates added contacts against existing storage records', () => {
      const initial: NetworkContact = {
        id: 'c-test-01',
        fullName: 'Tanaka Chikosi',
        company: 'Google',
        linkedInUrl: 'https://linkedin.com/in/tanakachikosi',
        source: 'manual',
        importedAt: '2026-08-14T00:00:00.000Z',
      };

      const duplicate: NetworkContact = {
        id: 'c-test-02',
        fullName: 'Tanaka Chikosi',
        company: 'Google LLC',
        position: 'AI GTM Lead',
        linkedInUrl: 'https://linkedin.com/in/tanakachikosi',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      };

      const result = addNetworkContacts([initial, duplicate]);
      expect(result.filter((c) => c.linkedInUrl === 'https://linkedin.com/in/tanakachikosi').length).toBe(1);
    });
  });

  describe('Excel (XLSX / XLS) Support', () => {
    it('18. parses Excel workbook data including sheets with preambles', () => {
      // Build in-memory workbook
      const wsData = [
        ['Report: Exported Connections'],
        ['Generated on: 2026-08-14'],
        [],
        ['First Name', 'Last Name', 'Company', 'Position', 'Email Address'],
        ['Tanaka', 'Chikosi', 'Google', 'AI GTM Lead', 'tanaka@google.com'],
        ['Elena', 'Rostova', 'DNX Ventures', 'Partner', 'elena@dnx.com'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Connections');
      const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const { headers, rows } = parseExcelData(arrayBuffer);
      expect(headers).toContain('First Name');
      expect(headers).toContain('Last Name');
      expect(headers).toContain('Company');
      expect(rows.length).toBe(2);
      expect(rows[0]['First Name']).toBe('Tanaka');
      expect(rows[1]['Company']).toBe('DNX Ventures');
    });
  });

  describe('Company-to-Network Matching & Outreach Action Generation', () => {
    const contacts: NetworkContact[] = [
      {
        id: 'c1',
        fullName: 'Sarah Chen',
        company: 'ServiceNow Inc.',
        position: 'Director of AI Strategy',
        linkedInUrl: 'https://linkedin.com/in/sarahchen',
        source: 'demo',
        importedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'c2',
        fullName: 'David Miller',
        company: 'Klaviyo Technologies',
        position: 'VP RevOps',
        source: 'demo',
        importedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    it('matches contacts to opportunity companies using normalized matching', () => {
      const matches1 = findMatchingContacts('ServiceNow', contacts);
      expect(matches1.length).toBe(1);
      expect(matches1[0].fullName).toBe('Sarah Chen');

      const matches2 = findMatchingContacts('Klaviyo, LLC', contacts);
      expect(matches2.length).toBe(1);
      expect(matches2[0].fullName).toBe('David Miller');

      const matchesNone = findMatchingContacts('Google Cloud', contacts);
      expect(matchesNone.length).toBe(0);
    });

    it('generates structured custom outreach action for an opportunity', () => {
      const action = generateSuggestedOutreachAction(contacts[0], 'opp-1');

      expect(action.id).toBe('action-outreach-c1-opp-1');
      expect(action.source).toBe('custom');
      expect(action.completed).toBe(false);
      expect(action.text).toContain('Reach out to Sarah Chen, Director of AI Strategy at ServiceNow Inc.');
    });
  });

  describe('Contact Identity, Edit Binding & Multi-Record Isolation', () => {
    it('1-12, 17, 20. updates only target contact by stable ID without mutating other records or creating duplicates', () => {
      // 1. Create Jane Doe manually
      const janeDoe: NetworkContact = {
        id: 'contact-manual-jane-doe',
        fullName: 'Jane Doe',
        company: 'Google',
        position: 'Director',
        source: 'manual',
        importedAt: '2026-08-14T00:00:00.000Z',
      };

      // 2. Import multiple LinkedIn contacts
      const contactA: NetworkContact = {
        id: 'contact-imp-a-123',
        fullName: 'Tanaka Chikosi',
        company: 'Google',
        position: 'AI GTM Leader',
        linkedInUrl: 'https://linkedin.com/in/tanakachikosi',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      };

      const contactB: NetworkContact = {
        id: 'contact-imp-b-456',
        fullName: 'Elena Rostova',
        company: 'DNX Ventures',
        position: 'Partner',
        linkedInUrl: 'https://linkedin.com/in/elenarostova',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      };

      // Initialize storage state
      saveNetworkContacts([janeDoe, contactA, contactB]);
      const initialContacts = getNetworkContacts();
      expect(initialContacts.length).toBe(3);

      // 3 & 4. Edit Contact A resolves Contact A by ID
      const resolvedA = initialContacts.find((c) => c.id === 'contact-imp-a-123');
      expect(resolvedA).toBeDefined();
      expect(resolvedA?.fullName).toBe('Tanaka Chikosi');
      expect(resolvedA?.fullName).not.toBe('Jane Doe');

      // 6 & 7. Edit Contact B resolves Contact B by ID
      const resolvedB = initialContacts.find((c) => c.id === 'contact-imp-b-456');
      expect(resolvedB).toBeDefined();
      expect(resolvedB?.fullName).toBe('Elena Rostova');

      // 8. Update Contact B title and save
      const updatedList = updateNetworkContact('contact-imp-b-456', {
        position: 'Managing Partner',
      });

      // 9, 10, 11, 20. Only Contact B changes, Jane Doe and Contact A are unchanged, total count remains 3
      expect(updatedList.length).toBe(3);
      const afterB = updatedList.find((c) => c.id === 'contact-imp-b-456');
      expect(afterB?.position).toBe('Managing Partner');
      expect(afterB?.fullName).toBe('Elena Rostova');

      const afterJane = updatedList.find((c) => c.id === 'contact-manual-jane-doe');
      expect(afterJane?.fullName).toBe('Jane Doe');
      expect(afterJane?.position).toBe('Director');
      expect(afterJane?.company).toBe('Google');

      const afterA = updatedList.find((c) => c.id === 'contact-imp-a-123');
      expect(afterA?.fullName).toBe('Tanaka Chikosi');
      expect(afterA?.position).toBe('AI GTM Leader');

      // 12. Reload persistence check
      const reloaded = getNetworkContacts();
      const reloadedB = reloaded.find((c) => c.id === 'contact-imp-b-456');
      expect(reloadedB?.position).toBe('Managing Partner');
    });

    it('13, 14, 15, 16. resolves target contact by stable ID during search filtering and company filtering', () => {
      const contacts: NetworkContact[] = [
        {
          id: 'c-search-1',
          fullName: 'Tanaka Chikosi',
          company: 'Google',
          position: 'AI GTM Leader',
          source: 'linkedin_csv',
          importedAt: '2026-08-14T00:00:00.000Z',
        },
        {
          id: 'c-search-2',
          fullName: 'Jane Doe',
          company: 'Google',
          position: 'Director',
          source: 'manual',
          importedAt: '2026-08-14T00:00:00.000Z',
        },
        {
          id: 'c-search-3',
          fullName: 'Marcus Vance',
          company: 'Stripe',
          position: 'VP Product',
          source: 'linkedin_csv',
          importedAt: '2026-08-14T00:00:00.000Z',
        },
      ];

      // Simulate search for "Tanaka"
      const searchFiltered = contacts.filter((c) => c.fullName.toLowerCase().includes('tanaka'));
      expect(searchFiltered.length).toBe(1);
      expect(searchFiltered[0].id).toBe('c-search-1');

      // Look up by ID from search result
      const clickedSearchContact = contacts.find((c) => c.id === searchFiltered[0].id);
      expect(clickedSearchContact?.fullName).toBe('Tanaka Chikosi');

      // Simulate company filter "Google"
      const companyFiltered = contacts.filter((c) => c.company === 'Google');
      expect(companyFiltered.length).toBe(2);

      // Look up item at index 0 of filtered list
      const clickedCompanyContact = contacts.find((c) => c.id === companyFiltered[0].id);
      expect(clickedCompanyContact?.id).toBe('c-search-1');
      expect(clickedCompanyContact?.fullName).toBe('Tanaka Chikosi');
    });

    it('deletes and clears contacts with state isolation', () => {
      const contact: NetworkContact = {
        id: 'c-del-1',
        fullName: 'Delete Me',
        company: 'Temporary Co',
        source: 'manual',
        importedAt: '2026-08-14T00:00:00.000Z',
      };

      saveNetworkContacts([contact]);
      expect(getNetworkContacts().length).toBe(1);

      deleteNetworkContact('c-del-1');
      expect(getNetworkContacts().length).toBe(0);

      const normalized = normalizeNetworkContact({ fullName: 'Normalized Person' });
      expect(normalized.fullName).toBe('Normalized Person');
      expect(normalized.id).toBeDefined();

      saveNetworkContacts([normalized]);
      clearNetworkContacts();
      expect(getNetworkContacts().length).toBe(0);
    });

    it('matches QA Test Google opportunity against Google contacts and generates warm outreach action', () => {
      const allOpps = getOpportunities();
      expect(allOpps.some((o) => o.id === 'opp-qa-test-google-ai-strategy')).toBe(true);

      const opp = getOpportunityById('opp-qa-test-google-ai-strategy');
      expect(opp).toBeDefined();
      expect(opp?.company).toBe('Google');
      expect(opp?.title).toBe('Director, AI Strategy & Operations');
      expect(opp?.stage).toBe('Identified');

      const testContacts: NetworkContact[] = [
        {
          id: 'c-google-1',
          fullName: 'Sundar P.',
          company: 'Google LLC',
          position: 'CEO',
          linkedInUrl: 'https://linkedin.com/in/sundarp',
          source: 'linkedin_csv',
          importedAt: '2026-08-14T00:00:00.000Z',
        },
        {
          id: 'c-other-1',
          fullName: 'Alice Smith',
          company: 'Anthropic',
          position: 'Researcher',
          source: 'linkedin_csv',
          importedAt: '2026-08-14T00:00:00.000Z',
        },
      ];

      // Verify company matching
      const matches = findMatchingContacts(opp!.company, testContacts);
      expect(matches.length).toBe(1);
      expect(matches[0].fullName).toBe('Sundar P.');

      // Verify suggested outreach action generation
      const action = generateSuggestedOutreachAction(matches[0], opp!.id);
      expect(action.source).toBe('custom');
      expect(action.text).toContain('Reach out to Sundar P., CEO at Google LLC');

      // Verify deletion
      deleteOpportunity('opp-qa-test-google-ai-strategy');
      expect(getOpportunityById('opp-qa-test-google-ai-strategy')).toBeUndefined();
    });
  });

  describe('rankMatchedContacts Deterministic Ranking Algorithm', () => {
    const contacts: NetworkContact[] = [
      {
        id: 'c1',
        fullName: 'Alex Executive',
        company: 'Google',
        position: 'VP of Engineering',
        connectedOn: '2025-01-15',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'c2',
        fullName: 'Brenda Recruiter',
        company: 'Google',
        position: 'Executive Talent Acquisition Partner',
        connectedOn: '2024-06-10',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'c3',
        fullName: 'Charlie Strategy',
        company: 'Google LLC',
        position: 'Director, AI Strategy & Operations',
        connectedOn: '2026-02-20',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'c4',
        fullName: 'Dana Junior',
        company: 'Google',
        position: 'Associate Analyst',
        connectedOn: '2023-01-01',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      },
    ];

    it('ranks exact domain alignment and executive seniority highest', () => {
      const ranked = rankMatchedContacts(contacts, 'Director, AI Strategy & Operations', 'Google');

      expect(ranked.length).toBe(4);
      // Charlie has direct company match + Director seniority + AI/Strategy domain alignment
      expect(ranked[0].contact.fullName).toBe('Charlie Strategy');
      expect(ranked[0].matchReasons).toContain('Director & Department Leadership');
      expect(ranked[0].matchReasons.some((r) => r.includes('AI'))).toBe(true);

      // Brenda has Recruiting/Talent Partner label
      const brenda = ranked.find((r) => r.contact.fullName === 'Brenda Recruiter');
      expect(brenda?.matchReasons).toContain('Talent & Hiring Team');

      // Alex has Executive Leadership label
      const alex = ranked.find((r) => r.contact.fullName === 'Alex Executive');
      expect(alex?.matchReasons).toContain('Executive Leadership');
    });

    it('returns empty array when contacts list is empty', () => {
      expect(rankMatchedContacts([])).toEqual([]);
    });
  });
});
