import { describe, it, expect } from 'vitest';
import { createOpportunity, saveOpportunity, getOpportunityById, deleteOpportunity } from '@/lib/storage';
import { findMatchingContacts } from '@/lib/networkMatcher';
import { NetworkContact } from '@/types/network';

describe('V2.1 Opportunity Creation & CRUD Architecture', () => {
  it('creates opportunity with minimal required fields (company & title)', () => {
    const opp = createOpportunity({
      company: 'Scale AI',
      title: 'Director, GTM & Revenue Operations',
    });

    expect(opp.id).toBeDefined();
    expect(opp.id.startsWith('opp-')).toBe(true);
    expect(opp.company).toBe('Scale AI');
    expect(opp.title).toBe('Director, GTM & Revenue Operations');
    expect(opp.stage).toBe('Identified');
    expect(opp.priority).toBe('Medium');
    expect(opp.createdAt).toBeDefined();
    expect(opp.updatedAt).toBeDefined();
    expect(Array.isArray(opp.actions)).toBe(true);
    expect(opp.actions.length).toBeGreaterThan(0);

    // Verify stored
    const retrieved = getOpportunityById(opp.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.company).toBe('Scale AI');
  });

  it('creates opportunity with full metadata (compensation, location, URL, follow-up, notes)', () => {
    const opp = createOpportunity({
      company: 'Anthropic',
      title: 'Head of Business Strategy',
      location: 'San Francisco, CA (Hybrid)',
      compensation: '$250k - $320k + Equity',
      applicationUrl: 'https://boards.greenhouse.io/anthropic/jobs/12345',
      priority: 'High',
      stage: 'Identified',
      followUpDate: '2026-04-01',
      notes: 'Direct referral from executive contact.',
      rawJobDescription: 'Lead corporate strategy and operational scaling for Claude enterprise platform.',
    });

    expect(opp.company).toBe('Anthropic');
    expect(opp.location).toBe('San Francisco, CA (Hybrid)');
    expect(opp.compensation).toBe('$250k - $320k + Equity');
    expect(opp.applicationUrl).toBe('https://boards.greenhouse.io/anthropic/jobs/12345');
    expect(opp.priority).toBe('High');
    expect(opp.followUpDate).toBe('2026-04-01');
    expect(opp.notes).toBe('Direct referral from executive contact.');
    expect(opp.rawJobDescription).toContain('Claude enterprise platform');
  });

  it('immediately enables network matching upon opportunity creation', () => {
    const opp = createOpportunity({
      company: 'Databricks',
      title: 'VP of Scaled Operations',
    });

    const mockNetwork: NetworkContact[] = [
      {
        id: 'c-db-1',
        fullName: 'Matei Zaharia',
        company: 'Databricks Inc',
        position: 'CTO & Co-Founder',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'c-db-2',
        fullName: 'Sarah Chen',
        company: 'Databricks',
        position: 'Director of Talent Acquisition',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      },
      {
        id: 'c-unrelated',
        fullName: 'John Doe',
        company: 'Snowflake',
        position: 'VP Sales',
        source: 'linkedin_csv',
        importedAt: '2026-08-14T00:00:00.000Z',
      },
    ];

    const matches = findMatchingContacts(opp.company, mockNetwork);
    expect(matches.length).toBe(2);
    expect(matches.map((m) => m.fullName)).toContain('Matei Zaharia');
    expect(matches.map((m) => m.fullName)).toContain('Sarah Chen');
    expect(matches.map((m) => m.fullName)).not.toContain('John Doe');
  });

  it('supports editing opportunity fields safely', () => {
    const opp = createOpportunity({
      company: 'Stripe',
      title: 'Strategy Lead',
    });

    const updated = saveOpportunity({
      ...opp,
      priority: 'High',
      notes: 'Initial interview scheduled.',
    });

    expect(updated.priority).toBe('High');
    expect(updated.notes).toBe('Initial interview scheduled.');

    const fromStorage = getOpportunityById(opp.id);
    expect(fromStorage?.priority).toBe('High');
  });

  it('supports deleting custom opportunity cleanly', () => {
    const opp = createOpportunity({
      company: 'TempCo',
      title: 'Temp Title',
    });

    expect(getOpportunityById(opp.id)).toBeDefined();
    deleteOpportunity(opp.id);
    expect(getOpportunityById(opp.id)).toBeUndefined();
  });
});
