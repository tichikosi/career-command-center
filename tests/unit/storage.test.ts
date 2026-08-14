/**
 * Storage Layer — Unit Tests
 *
 * Tests:
 * - CRUD operations on opportunities
 * - Stage updates and action synchronization
 * - Completed actions toggling and completedAt timestamping
 * - Opportunity notes and follow-up date updates
 * - Safe role deletion and evidence unlinking
 * - Reset demo data restoring synthetic fixtures
 * - UI settings persistence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOpportunities,
  saveOpportunity,
  deleteOpportunity,
  updateOpportunityStage,
  toggleActionCompleted,
  updateOpportunityNotes,
  updateOpportunityFollowUpDate,
  addCustomAction,
  resetDemoData,
  getCandidateProfile,
  saveCandidateProfile,
  resetCandidateDemoData,
  getUISettings,
  saveUISettings,
} from '@/lib/storage';
import { deleteCareerRoleFromProfile } from '@/lib/candidateAdapter';
import { TEST_OPPORTUNITIES, TEST_CANDIDATE_PROFILE } from '../fixtures/test-data';
import { JobOpportunity } from '@/types/opportunity';

// Mock localStorage in memory for node environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Set up window environment for Vitest Node runner
if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: localStorageMock,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
} else {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

describe('Storage Operations', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Opportunities CRUD', () => {
    it('initializes with default demo opportunities if storage is empty', () => {
      const opps = getOpportunities();
      expect(opps.length).toBeGreaterThan(0);
      expect(opps[0].title).toBeTruthy();
    });

    it('saves and retrieves a new opportunity', () => {
      const newOpp: JobOpportunity = {
        ...TEST_OPPORTUNITIES[0],
        id: 'opp-storage-test-1',
        title: 'New Storage Test Role',
      };
      saveOpportunity(newOpp);

      const all = getOpportunities();
      const found = all.find((o) => o.id === 'opp-storage-test-1');
      expect(found).toBeDefined();
      expect(found?.title).toBe('New Storage Test Role');
    });

    it('deletes an opportunity by id', () => {
      const testOpp: JobOpportunity = {
        ...TEST_OPPORTUNITIES[0],
        id: 'opp-to-delete',
      };
      saveOpportunity(testOpp);
      expect(getOpportunities().some((o) => o.id === 'opp-to-delete')).toBe(true);

      deleteOpportunity('opp-to-delete');
      expect(getOpportunities().some((o) => o.id === 'opp-to-delete')).toBe(false);
    });

    it('updates opportunity stage and maintains action integrity', () => {
      const testOpp: JobOpportunity = {
        ...TEST_OPPORTUNITIES[0],
        id: 'opp-stage-change',
        stage: 'Identified',
      };
      saveOpportunity(testOpp);

      const updated = updateOpportunityStage('opp-stage-change', 'Interviewing');
      expect(updated.stage).toBe('Interviewing');

      const retrieved = getOpportunities().find((o) => o.id === 'opp-stage-change');
      expect(retrieved?.stage).toBe('Interviewing');
    });

    it('toggles action completed status and updates completedAt', () => {
      const testOpp: JobOpportunity = {
        ...TEST_OPPORTUNITIES[0],
        id: 'opp-toggle-action',
      };
      saveOpportunity(testOpp);

      const actionId = testOpp.actions[0].id;
      const updated = toggleActionCompleted('opp-toggle-action', actionId);
      const action = updated?.actions.find((a) => a.id === actionId);

      expect(action?.completed).toBe(true);
      expect(action?.completedAt).toBeTruthy();

      // Toggle again to reopen
      const reopened = toggleActionCompleted('opp-toggle-action', actionId);
      const reopenedAction = reopened?.actions.find((a) => a.id === actionId);
      expect(reopenedAction?.completed).toBe(false);
      expect(reopenedAction?.completedAt).toBeUndefined();
    });

    it('updates notes and followUpDate independently', () => {
      const testOpp: JobOpportunity = {
        ...TEST_OPPORTUNITIES[0],
        id: 'opp-notes-date',
      };
      saveOpportunity(testOpp);

      updateOpportunityNotes('opp-notes-date', 'Updated strategic notes.');
      let retrieved = getOpportunities().find((o) => o.id === 'opp-notes-date');
      expect(retrieved?.notes).toBe('Updated strategic notes.');

      updateOpportunityFollowUpDate('opp-notes-date', '2026-09-15');
      retrieved = getOpportunities().find((o) => o.id === 'opp-notes-date');
      expect(retrieved?.followUpDate).toBe('2026-09-15');
    });

    it('adds custom actions to opportunity', () => {
      const testOpp: JobOpportunity = {
        ...TEST_OPPORTUNITIES[0],
        id: 'opp-custom-act',
      };
      saveOpportunity(testOpp);

      const updated = addCustomAction('opp-custom-act', 'Call Jane Doe regarding mandate', 'custom:123');
      const custom = updated?.actions.find((a) => a.id === 'custom:123');
      expect(custom).toBeDefined();
      expect(custom?.text).toBe('Call Jane Doe regarding mandate');
      expect(custom?.source).toBe('custom');
    });
  });

  describe('Candidate Profile Storage & Safe Role Deletion', () => {
    it('retrieves default synthetic candidate profile if storage empty', () => {
      const profile = getCandidateProfile();
      expect(profile).toBeDefined();
      expect(profile.name).toBeTruthy();
      expect(profile.dataMode).toBe('synthetic');
    });

    it('safely deletes career role and unassigns linked evidence without deleting evidence', () => {
      saveCandidateProfile(TEST_CANDIDATE_PROFILE);

      const roleIdToDelete = 'role-test-001';
      const initialEvidenceCount = TEST_CANDIDATE_PROFILE.evidenceItems.length;

      const updated = deleteCareerRoleFromProfile(
        TEST_CANDIDATE_PROFILE,
        roleIdToDelete,
        '2026-08-01T00:00:00.000Z'
      );
      saveCandidateProfile(updated);

      const saved = getCandidateProfile();
      expect(saved.careerHistory.find((r) => r.id === roleIdToDelete)).toBeUndefined();

      // Evidence count must remain unchanged
      expect(saved.evidenceItems.length).toBe(initialEvidenceCount);

      // Previously linked items must have roleId set to undefined
      const unassignedItems = saved.evidenceItems.filter((e) =>
        TEST_CANDIDATE_PROFILE.evidenceItems.some(
          (orig) => orig.id === e.id && orig.roleId === roleIdToDelete
        )
      );
      unassignedItems.forEach((ev) => {
        expect(ev.roleId).toBeUndefined();
      });
    });

    it('resetCandidateDemoData restores default synthetic data', () => {
      const modified = {
        ...TEST_CANDIDATE_PROFILE,
        name: 'Modified Name',
        careerHistory: [],
      };
      saveCandidateProfile(modified);
      expect(getCandidateProfile().name).toBe('Modified Name');

      resetCandidateDemoData();
      const restored = getCandidateProfile();
      expect(restored.dataMode).toBe('synthetic');
      expect(restored.name).not.toBe('Modified Name');
      expect(restored.careerHistory.length).toBeGreaterThan(0);
    });
  });

  describe('UI Settings Storage', () => {
    it('stores and retrieves UI settings', () => {
      saveUISettings({
        sortField: 'fitScore',
        sortDirection: 'asc',
        stageFilter: 'Interviewing',
      });

      const settings = getUISettings();
      expect(settings.sortField).toBe('fitScore');
      expect(settings.sortDirection).toBe('asc');
      expect(settings.stageFilter).toBe('Interviewing');
    });
  });

  describe('Reset Demo Data', () => {
    it('restores default opportunities without corrupting state', () => {
      saveOpportunity({
        ...TEST_OPPORTUNITIES[0],
        id: 'opp-to-be-reset',
      });

      resetDemoData();
      const opps = getOpportunities();
      expect(opps.length).toBeGreaterThan(0);
      expect(opps.some((o) => o.id === 'opp-to-be-reset')).toBe(false);
    });
  });
});
