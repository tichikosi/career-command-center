/**
 * Search — Unit Tests
 *
 * Tests search index building, search filtering, and deep-link construction.
 */

import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchGlobalIndex } from '@/lib/search';
import { TEST_OPPORTUNITIES, TEST_CANDIDATE_PROFILE } from '../fixtures/test-data';

describe('buildSearchIndex', () => {
  it('includes static navigation items', () => {
    const index = buildSearchIndex([], undefined);
    const navItems = index.filter(i => i.group === 'navigation');
    expect(navItems.length).toBeGreaterThanOrEqual(5);
    expect(navItems.map(i => i.title)).toContain('Dashboard');
    expect(navItems.map(i => i.title)).toContain('Candidate Profile');
  });

  it('indexes opportunities', () => {
    const index = buildSearchIndex(TEST_OPPORTUNITIES, undefined);
    const oppItems = index.filter(i => i.group === 'opportunity');
    expect(oppItems.length).toBeGreaterThan(0);
  });

  it('indexes analysis reports', () => {
    const index = buildSearchIndex(TEST_OPPORTUNITIES, undefined);
    const analysisItems = index.filter(i => i.group === 'analysis');
    expect(analysisItems.length).toBeGreaterThan(0);
  });

  it('indexes candidate profile when provided', () => {
    const index = buildSearchIndex([], TEST_CANDIDATE_PROFILE);
    const profileItems = index.filter(i => i.group === 'profile');
    expect(profileItems.length).toBeGreaterThan(0);
  });

  it('indexes evidence items from candidate profile', () => {
    const index = buildSearchIndex([], TEST_CANDIDATE_PROFILE);
    const evidenceItems = index.filter(i => i.id.startsWith('profile:evidence:'));
    expect(evidenceItems.length).toBe(TEST_CANDIDATE_PROFILE.evidenceItems.length);
  });

  it('indexes unassigned evidence', () => {
    const index = buildSearchIndex([], TEST_CANDIDATE_PROFILE);
    const unassignedEvidence = index.find(
      i => i.id === `profile:evidence:${TEST_CANDIDATE_PROFILE.evidenceItems.find(e => !e.roleId)?.id}`
    );
    expect(unassignedEvidence).toBeDefined();
    expect(unassignedEvidence!.subtitle).toContain('Unassigned Evidence');
  });

  it('constructs valid deep-link hrefs for evidence', () => {
    const index = buildSearchIndex([], TEST_CANDIDATE_PROFILE);
    const evidenceItems = index.filter(i => i.id.startsWith('profile:evidence:'));
    evidenceItems.forEach(item => {
      expect(item.href).toContain('/profile?section=evidence&evidenceId=');
    });
  });

  it('constructs valid hrefs for analysis reports', () => {
    const index = buildSearchIndex(TEST_OPPORTUNITIES, undefined);
    const analysisItems = index.filter(i => i.group === 'analysis' || i.group === 'opportunity');
    analysisItems.forEach(item => {
      expect(item.href).toMatch(/^\/analysis\//);
    });
  });

  it('does not crash when profile is null/undefined', () => {
    expect(() => buildSearchIndex(TEST_OPPORTUNITIES, undefined)).not.toThrow();
    expect(() => buildSearchIndex(TEST_OPPORTUNITIES, null as unknown as undefined)).not.toThrow();
  });

  it('does not crash when opportunities have missing optional data', () => {
    const sparseOpp = {
      ...TEST_OPPORTUNITIES[0],
      location: undefined,
      compensation: undefined,
      companyWebsiteUrl: undefined,
      followUpDate: undefined,
      notes: '',
    };
    expect(() => buildSearchIndex([sparseOpp], TEST_CANDIDATE_PROFILE)).not.toThrow();
  });
});

describe('searchGlobalIndex', () => {
  const index = buildSearchIndex(TEST_OPPORTUNITIES, TEST_CANDIDATE_PROFILE);

  it('returns empty for blank query', () => {
    expect(searchGlobalIndex('', index)).toEqual([]);
    expect(searchGlobalIndex('   ', index)).toEqual([]);
  });

  it('finds opportunities by company name', () => {
    const results = searchGlobalIndex('NovaTech', index);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.title.includes('Director of AI Strategy'))).toBe(true);
  });

  it('finds navigation pages', () => {
    const results = searchGlobalIndex('Dashboard', index);
    expect(results.some(r => r.group === 'navigation')).toBe(true);
  });

  it('finds candidate evidence', () => {
    const results = searchGlobalIndex('$14M ARR', index);
    expect(results.length).toBeGreaterThan(0);
  });

  it('multi-term search works', () => {
    const results = searchGlobalIndex('AI Strategy NovaTech', index);
    expect(results.length).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    const upper = searchGlobalIndex('NOVATECH', index);
    const lower = searchGlobalIndex('novatech', index);
    expect(upper.length).toBe(lower.length);
  });

  it('caps results at 10', () => {
    const results = searchGlobalIndex('a', index);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('deduplicates results', () => {
    const results = searchGlobalIndex('AI', index);
    const keys = results.map(r => `${r.group}:${r.id}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});
