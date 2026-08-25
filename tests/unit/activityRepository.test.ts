import { describe, it, expect, beforeEach } from 'vitest';
import { MockCloudStorageAdapter } from '@/lib/storage/mockCloudRepository';
import { OpportunityActivity } from '@/types/interview';

describe('V3.3 Opportunity Activity Repository Unit Tests', () => {
  let adapter: MockCloudStorageAdapter;

  beforeEach(() => {
    adapter = new MockCloudStorageAdapter();
  });

  it('records, retrieves, and orders activities chronologically (newest first)', async () => {
    const userId = 'user-test-1';
    const oppId = 'opp-alpha';

    // 1. Record 3 activities with different dates
    const act1 = await adapter.activities.recordActivity(
      {
        opportunityId: oppId,
        activityType: 'application_submitted',
        title: 'Submitted online application',
        occurredAt: '2026-08-10T10:00:00.000Z',
        source: 'user',
      },
      userId
    );

    const act2 = await adapter.activities.recordActivity(
      {
        opportunityId: oppId,
        activityType: 'recruiter_contact',
        title: 'Screening phone call with recruiter',
        occurredAt: '2026-08-15T14:30:00.000Z',
        contactName: 'Sarah Recruiter',
        source: 'user',
      },
      userId
    );

    const act3 = await adapter.activities.recordActivity(
      {
        opportunityId: oppId,
        activityType: 'interview_scheduled',
        title: 'Round 1 Video Interview Scheduled',
        occurredAt: '2026-08-18T09:00:00.000Z',
        scheduledFor: '2026-08-25T15:00:00.000Z',
        source: 'user',
      },
      userId
    );

    expect(act1.id).toBeDefined();
    expect(act2.id).toBeDefined();
    expect(act3.id).toBeDefined();

    // 2. Retrieve activities for opportunity
    const list = await adapter.activities.getActivities(oppId, userId);
    expect(list.length).toBe(3);
    // Newest occurredAt first
    expect(list[0].id).toBe(act3.id);
    expect(list[1].id).toBe(act2.id);
    expect(list[2].id).toBe(act1.id);
  });

  it('updates an existing activity note and title', async () => {
    const userId = 'user-test-1';
    const oppId = 'opp-alpha';

    const act = await adapter.activities.recordActivity(
      {
        opportunityId: oppId,
        activityType: 'note',
        title: 'Initial Impression Note',
        notes: 'Great culture fit',
        occurredAt: '2026-08-20T12:00:00.000Z',
        source: 'user',
      },
      userId
    );

    const updated = await adapter.activities.updateActivity(
      act.id,
      {
        title: 'Updated Impression Note',
        notes: 'Great culture fit, strong compensation alignment',
      },
      userId
    );

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updated Impression Note');
    expect(updated?.notes).toBe('Great culture fit, strong compensation alignment');

    const freshList = await adapter.activities.getActivities(oppId, userId);
    expect(freshList[0].title).toBe('Updated Impression Note');
  });

  it('deletes an activity by ID', async () => {
    const userId = 'user-test-1';
    const oppId = 'opp-alpha';

    const act = await adapter.activities.recordActivity(
      {
        opportunityId: oppId,
        activityType: 'note',
        title: 'Draft note to delete',
        occurredAt: '2026-08-20T12:00:00.000Z',
        source: 'user',
      },
      userId
    );

    let list = await adapter.activities.getActivities(oppId, userId);
    expect(list.length).toBe(1);

    await adapter.activities.deleteActivity(act.id, userId);

    list = await adapter.activities.getActivities(oppId, userId);
    expect(list.length).toBe(0);
  });

  it('enforces user data isolation between accounts', async () => {
    const userA = 'user-tanaka-123';
    const userB = 'user-alex-demo-456';
    const oppId = 'opp-shared-id';

    await adapter.activities.recordActivity(
      {
        opportunityId: oppId,
        activityType: 'note',
        title: 'Tanaka Confidential Note',
        occurredAt: '2026-08-20T12:00:00.000Z',
        source: 'user',
      },
      userA
    );

    const listA = await adapter.activities.getActivities(oppId, userA);
    const listB = await adapter.activities.getActivities(oppId, userB);

    expect(listA.length).toBe(1);
    expect(listA[0].title).toBe('Tanaka Confidential Note');
    expect(listB.length).toBe(0);
  });
});
