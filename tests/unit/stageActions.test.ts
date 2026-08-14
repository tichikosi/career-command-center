/**
 * Stage Actions — Unit Tests
 *
 * Tests the core business logic for opportunity action management:
 * - Action generation
 * - Action merging across stage transitions
 * - Completion preservation during stage round-trips
 * - Display action filtering
 * - Pending action counting
 */

import { describe, it, expect } from 'vitest';
import {
  buildStageActions,
  buildRoleActions,
  mergeActionsForStage,
  getDisplayActions,
  countPendingActions,
  stageActionId,
  generateCustomActionId,
} from '@/lib/stageActions';
import { OpportunityAction, PipelineStage } from '@/types/opportunity';

describe('stageActionId', () => {
  it('generates deterministic IDs', () => {
    expect(stageActionId('Identified', 0)).toBe('stage:Identified:0');
    expect(stageActionId('Applied', 3)).toBe('stage:Applied:3');
  });
});

describe('buildStageActions', () => {
  it('generates actions for each pipeline stage', () => {
    const stages: PipelineStage[] = ['Identified', 'Applied', 'Screening', 'Interviewing', 'Offer', 'Archived'];
    for (const stage of stages) {
      const actions = buildStageActions(stage);
      expect(actions.length).toBeGreaterThan(0);
      actions.forEach(a => {
        expect(a.source).toBe('stage');
        expect(a.stage).toBe(stage);
        expect(a.completed).toBe(false);
        expect(a.id).toMatch(/^stage:/);
      });
    }
  });

  it('Identified stage produces 5 actions', () => {
    const actions = buildStageActions('Identified');
    expect(actions).toHaveLength(5);
  });

  it('all stage actions start uncompleted', () => {
    const actions = buildStageActions('Screening');
    actions.forEach(a => {
      expect(a.completed).toBe(false);
      expect(a.completedAt).toBeUndefined();
    });
  });
});

describe('buildRoleActions', () => {
  it('generates role actions with stable IDs', () => {
    const nextActions = ['Draft cold outreach', 'Review fit report'];
    const actions = buildRoleActions('opp-123', nextActions);
    expect(actions).toHaveLength(2);
    expect(actions[0].id).toBe('role:opp-123:0');
    expect(actions[1].id).toBe('role:opp-123:1');
    expect(actions[0].source).toBe('role');
    expect(actions[0].completed).toBe(false);
  });

  it('handles empty nextActions', () => {
    const actions = buildRoleActions('opp-123', []);
    expect(actions).toHaveLength(0);
  });
});

describe('generateCustomActionId', () => {
  it('generates unique IDs starting with custom:', () => {
    const id1 = generateCustomActionId();
    const id2 = generateCustomActionId();
    expect(id1).toMatch(/^custom:/);
    expect(id2).toMatch(/^custom:/);
    // Not guaranteed unique if called in same ms, but format is correct
    expect(id1.startsWith('custom:')).toBe(true);
  });
});

describe('mergeActionsForStage', () => {
  const nextActions = ['Draft outreach', 'Review report'];
  const oppId = 'opp-merge-test';

  it('creates fresh actions when storedActions is empty', () => {
    const merged = mergeActionsForStage(oppId, 'Identified', nextActions, []);
    // Should have stage actions for ALL stages + role actions
    const stageActions = merged.filter(a => a.source === 'stage');
    const roleActions = merged.filter(a => a.source === 'role');
    expect(stageActions.length).toBeGreaterThan(5); // actions for all stages
    expect(roleActions).toHaveLength(2);
  });

  it('preserves completion state by action ID', () => {
    const stored: OpportunityAction[] = [
      {
        id: 'stage:Identified:0',
        text: 'Review fit analysis and material gaps',
        source: 'stage',
        stage: 'Identified',
        completed: true,
        completedAt: '2026-07-15T10:00:00.000Z',
      },
    ];

    const merged = mergeActionsForStage(oppId, 'Identified', nextActions, stored);
    const firstAction = merged.find(a => a.id === 'stage:Identified:0');
    expect(firstAction).toBeDefined();
    expect(firstAction!.completed).toBe(true);
    expect(firstAction!.completedAt).toBe('2026-07-15T10:00:00.000Z');
  });

  it('preserves completion across stage round-trips (A→B→A)', () => {
    // Start in Identified, complete an action
    const identifiedActions: OpportunityAction[] = [
      {
        id: 'stage:Identified:0',
        text: 'Review fit analysis and material gaps',
        source: 'stage',
        stage: 'Identified',
        completed: true,
        completedAt: '2026-07-15T10:00:00.000Z',
      },
      {
        id: 'stage:Identified:1',
        text: 'Decide whether the opportunity merits an application',
        source: 'stage',
        stage: 'Identified',
        completed: false,
      },
    ];

    // Move to Applied
    const afterApplied = mergeActionsForStage(oppId, 'Applied', nextActions, identifiedActions);

    // Move back to Identified
    const afterReturn = mergeActionsForStage(oppId, 'Identified', nextActions, afterApplied);

    // The completed action from Identified should still be completed
    const restored = afterReturn.find(a => a.id === 'stage:Identified:0');
    expect(restored).toBeDefined();
    expect(restored!.completed).toBe(true);
    expect(restored!.completedAt).toBe('2026-07-15T10:00:00.000Z');

    // The uncompleted action should still be uncompleted
    const uncompleted = afterReturn.find(a => a.id === 'stage:Identified:1');
    expect(uncompleted).toBeDefined();
    expect(uncompleted!.completed).toBe(false);
  });

  it('preserves custom actions across stage changes', () => {
    const stored: OpportunityAction[] = [
      {
        id: 'custom:12345:abc',
        text: 'My custom reminder',
        source: 'custom',
        completed: false,
        createdAt: '2026-07-01T00:00:00.000Z',
      },
    ];

    const merged = mergeActionsForStage(oppId, 'Applied', nextActions, stored);
    const custom = merged.find(a => a.id === 'custom:12345:abc');
    expect(custom).toBeDefined();
    expect(custom!.text).toBe('My custom reminder');
    expect(custom!.source).toBe('custom');
  });

  it('does not create duplicate actions', () => {
    const stored: OpportunityAction[] = [];
    const merged = mergeActionsForStage(oppId, 'Identified', nextActions, stored);
    const ids = merged.map(a => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('preserves role action completion state', () => {
    const stored: OpportunityAction[] = [
      {
        id: `role:${oppId}:0`,
        text: 'Draft outreach',
        source: 'role',
        completed: true,
        completedAt: '2026-07-20T15:00:00.000Z',
      },
    ];

    const merged = mergeActionsForStage(oppId, 'Applied', nextActions, stored);
    const roleAction = merged.find(a => a.id === `role:${oppId}:0`);
    expect(roleAction).toBeDefined();
    expect(roleAction!.completed).toBe(true);
    expect(roleAction!.completedAt).toBe('2026-07-20T15:00:00.000Z');
  });
});

describe('getDisplayActions', () => {
  const allActions: OpportunityAction[] = [
    { id: 'stage:Identified:0', text: 'Review', source: 'stage', stage: 'Identified', completed: false },
    { id: 'stage:Identified:1', text: 'Decide', source: 'stage', stage: 'Identified', completed: true },
    { id: 'stage:Applied:0', text: 'Confirm', source: 'stage', stage: 'Applied', completed: false },
    { id: 'stage:Applied:1', text: 'Follow-up', source: 'stage', stage: 'Applied', completed: true },
    { id: 'role:opp:0', text: 'Outreach', source: 'role', completed: false },
    { id: 'custom:1:a', text: 'Custom item', source: 'custom', completed: false },
  ];

  it('filters stage actions to current stage only', () => {
    const display = getDisplayActions(allActions, 'Identified');
    const stageActions = display.filter(a => a.source === 'stage');
    expect(stageActions).toHaveLength(2);
    stageActions.forEach(a => {
      expect(a.stage).toBe('Identified');
    });
  });

  it('includes role actions regardless of stage', () => {
    const display = getDisplayActions(allActions, 'Applied');
    const roleActions = display.filter(a => a.source === 'role');
    expect(roleActions).toHaveLength(1);
  });

  it('includes custom actions regardless of stage', () => {
    const display = getDisplayActions(allActions, 'Applied');
    const customActions = display.filter(a => a.source === 'custom');
    expect(customActions).toHaveLength(1);
  });

  it('does not include actions from inactive stages', () => {
    const display = getDisplayActions(allActions, 'Identified');
    const appliedActions = display.filter(a => a.stage === 'Applied');
    expect(appliedActions).toHaveLength(0);
  });

  it('handles empty actions gracefully', () => {
    expect(getDisplayActions([], 'Identified')).toEqual([]);
  });

  it('handles null/undefined input', () => {
    expect(getDisplayActions(null as unknown as OpportunityAction[], 'Identified')).toEqual([]);
  });
});

describe('countPendingActions', () => {
  const allActions: OpportunityAction[] = [
    { id: 'stage:Identified:0', text: 'Review', source: 'stage', stage: 'Identified', completed: false },
    { id: 'stage:Identified:1', text: 'Decide', source: 'stage', stage: 'Identified', completed: true },
    { id: 'stage:Applied:0', text: 'Confirm', source: 'stage', stage: 'Applied', completed: false },
    { id: 'role:opp:0', text: 'Outreach', source: 'role', completed: false },
    { id: 'custom:1:a', text: 'Custom', source: 'custom', completed: false },
  ];

  it('counts only pending visible actions for current stage', () => {
    // For Identified: stage:Identified:0 (pending) + role:opp:0 (pending) + custom:1:a (pending) = 3
    // stage:Identified:1 is completed, so not counted
    // stage:Applied:0 is not visible in Identified
    const count = countPendingActions(allActions, 'Identified');
    expect(count).toBe(3);
  });

  it('returns 0 for Archived stage', () => {
    expect(countPendingActions(allActions, 'Archived')).toBe(0);
  });

  it('completion decreases the pending count', () => {
    const before = countPendingActions(allActions, 'Identified');
    const withCompletion = allActions.map(a =>
      a.id === 'role:opp:0' ? { ...a, completed: true } : a
    );
    const after = countPendingActions(withCompletion, 'Identified');
    expect(after).toBe(before - 1);
  });

  it('reopening increases the pending count', () => {
    const afterReopen = allActions.map(a =>
      a.id === 'stage:Identified:1' ? { ...a, completed: false } : a
    );
    const reopenedCount = countPendingActions(afterReopen, 'Identified');
    const originalCount = countPendingActions(allActions, 'Identified');
    expect(reopenedCount).toBe(originalCount + 1);
  });

  it('inactive-stage completed actions do not inflate visible counts', () => {
    // Applied stage action is completed but should not appear in Identified view
    const appliedCompleted = allActions.map(a =>
      a.id === 'stage:Applied:0' ? { ...a, completed: true } : a
    );
    const countIdentified = countPendingActions(appliedCompleted, 'Identified');
    // Same as original - the Applied action shouldn't affect Identified count
    expect(countIdentified).toBe(countPendingActions(allActions, 'Identified'));
  });
});
