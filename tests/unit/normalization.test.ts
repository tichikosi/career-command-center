/**
 * Opportunity Normalization — Unit Tests
 *
 * Tests that opportunity normalization handles missing fields,
 * backward compatibility with older shapes, and action merging.
 */

import { describe, it, expect } from 'vitest';
import { normalizeOpportunity } from '@/lib/storage';

describe('normalizeOpportunity', () => {
  it('normalizes a minimal raw opportunity', () => {
    const raw = {
      id: 'opp-minimal',
      title: 'Test Role',
      company: 'TestCo',
      rawJobDescription: 'A job description.',
      stage: 'Identified',
      analysis: {
        executiveSummary: 'Summary',
        likelyMandate: 'Mandate',
        keyRequirements: [],
        overallFitScore: 75,
        scoreExplanation: 'Explanation',
        recommendation: 'Network First',
        positioningNarrative: 'Narrative',
        qualifications: [],
        objections: [],
        recruiterQuestions: [],
        hiringManagerQuestions: [],
        recommendedStarStories: [],
        nextActions: [],
      },
    };

    const normalized = normalizeOpportunity(raw);
    expect(normalized.id).toBe('opp-minimal');
    expect(normalized.title).toBe('Test Role');
    expect(normalized.company).toBe('TestCo');
    expect(normalized.stage).toBe('Identified');
    expect(normalized.priority).toBe('Medium'); // 75 score → Medium
    expect(normalized.notes).toBe('');
    expect(normalized.followUpDate).toBeUndefined();
    expect(normalized.actions.length).toBeGreaterThan(0);
  });

  it('preserves existing actions with completion state', () => {
    const raw = {
      id: 'opp-actions',
      title: 'Action Test',
      company: 'Co',
      rawJobDescription: 'JD',
      stage: 'Identified',
      actions: [
        {
          id: 'stage:Identified:0',
          text: 'Review fit analysis and material gaps',
          source: 'stage',
          stage: 'Identified',
          completed: true,
          completedAt: '2026-07-15T10:00:00.000Z',
        },
      ],
      analysis: {
        executiveSummary: '',
        likelyMandate: '',
        keyRequirements: [],
        overallFitScore: 50,
        scoreExplanation: '',
        recommendation: 'Monitor',
        positioningNarrative: '',
        qualifications: [],
        objections: [],
        recruiterQuestions: [],
        hiringManagerQuestions: [],
        recommendedStarStories: [],
        nextActions: [],
      },
    };

    const normalized = normalizeOpportunity(raw);
    const preserved = normalized.actions.find(a => a.id === 'stage:Identified:0');
    expect(preserved).toBeDefined();
    expect(preserved!.completed).toBe(true);
    expect(preserved!.completedAt).toBe('2026-07-15T10:00:00.000Z');
  });

  it('handles missing optional fields gracefully', () => {
    const raw = {
      id: 'opp-sparse',
      analysis: {
        overallFitScore: 30,
        recommendation: 'Deprioritize',
      },
    };

    const normalized = normalizeOpportunity(raw);
    expect(normalized.id).toBe('opp-sparse');
    expect(normalized.title).toBe('Untitled Role');
    expect(normalized.company).toBe('Unknown Company');
    expect(normalized.location).toBeUndefined();
    expect(normalized.compensation).toBeUndefined();
    expect(normalized.notes).toBe('');
    expect(normalized.priority).toBe('Low'); // 30 score → Low
  });

  it('handles null/undefined analysis gracefully', () => {
    const raw = { id: 'opp-no-analysis' };
    const normalized = normalizeOpportunity(raw);
    expect(normalized.analysis).toBeDefined();
    expect(normalized.analysis.overallFitScore).toBe(0);
    expect(normalized.analysis.recommendation).toBe('Monitor');
  });

  it('clamps invalid stage to Identified', () => {
    const raw = {
      id: 'opp-bad-stage',
      stage: 'InvalidStage',
      analysis: { overallFitScore: 50, recommendation: 'Monitor' },
    };
    const normalized = normalizeOpportunity(raw);
    expect(normalized.stage).toBe('Identified');
  });

  it('derives priority from fit score when not specified', () => {
    const highScore = normalizeOpportunity({
      id: 'opp-high',
      analysis: { overallFitScore: 90, recommendation: 'Apply' },
    });
    expect(highScore.priority).toBe('High');

    const lowScore = normalizeOpportunity({
      id: 'opp-low',
      analysis: { overallFitScore: 30, recommendation: 'Deprioritize' },
    });
    expect(lowScore.priority).toBe('Low');
  });

  it('preserves completedAt field through normalization', () => {
    const raw = {
      id: 'opp-complete-test',
      stage: 'Applied',
      actions: [
        {
          id: 'stage:Applied:0',
          text: 'Confirm application submission',
          source: 'stage',
          stage: 'Applied',
          completed: true,
          completedAt: '2026-08-01T12:00:00.000Z',
        },
      ],
      analysis: {
        overallFitScore: 80,
        recommendation: 'Network First',
        nextActions: [],
      },
    };
    const normalized = normalizeOpportunity(raw);
    const action = normalized.actions.find(a => a.id === 'stage:Applied:0');
    expect(action).toBeDefined();
    expect(action!.completedAt).toBe('2026-08-01T12:00:00.000Z');
  });

  it('does not silently erase unknown valid fields', () => {
    const raw = {
      id: 'opp-extra',
      title: 'Extra Fields',
      company: 'Co',
      rawJobDescription: 'JD',
      stage: 'Identified',
      notes: 'My important notes',
      followUpDate: '2026-09-01',
      companyWebsiteUrl: 'https://example.com',
      analysis: {
        overallFitScore: 70,
        recommendation: 'Network First',
        nextActions: [],
      },
    };
    const normalized = normalizeOpportunity(raw);
    expect(normalized.notes).toBe('My important notes');
    expect(normalized.followUpDate).toBe('2026-09-01');
    expect(normalized.companyWebsiteUrl).toBe('https://example.com');
  });
});
