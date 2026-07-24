import { PipelineStage, OpportunityAction } from '@/types/opportunity';

// ---------------------------------------------------------------------------
// Centralized stage-action templates
// ---------------------------------------------------------------------------

const STAGE_ACTION_TEMPLATES: Record<PipelineStage, string[]> = {
  Identified: [
    'Review fit analysis and material gaps',
    'Decide whether the opportunity merits an application',
    'Identify relevant contacts or referral paths',
    'Review the company website and role application page',
    'Prepare a tailored résumé version',
  ],
  Applied: [
    'Confirm application submission',
    'Identify internal contacts for follow-up',
    'Prepare recruiter-screen positioning',
    'Set a follow-up date',
    'Continue company research',
  ],
  Screening: [
    'Prepare the 30-second career narrative',
    'Review role-specific recruiter questions',
    'Confirm compensation and location expectations',
    'Practice likely screening objections',
    'Record screen outcome and next steps',
  ],
  Interviewing: [
    'Review interviewer roles and likely priorities',
    'Select and rehearse relevant STAR stories',
    'Prepare hiring-manager questions',
    'Record interview notes and feedback',
    'Draft a thank-you or follow-up message',
  ],
  Offer: [
    'Review compensation and equity',
    'Compare the opportunity with active alternatives',
    'Prepare negotiation priorities',
    'Review start-date and offer conditions',
    'Document final decision criteria',
  ],
  Archived: [
    'Remove active reminders',
    'Preserve notes and relationship history',
    'Record archive or rejection reason',
    'Set an optional future follow-up date',
  ],
};

/**
 * Build stable deterministic IDs for stage-suggested action items.
 * Format: stage:<stage>:<index> – stable across reloads but changes when stage changes.
 */
export function stageActionId(stage: PipelineStage, index: number): string {
  return `stage:${stage}:${index}`;
}

/**
 * Build a fresh list of stage-suggested OpportunityAction items for a given stage.
 * Completion state is NOT included — callers merge with stored completion flags.
 */
export function buildStageActions(stage: PipelineStage): OpportunityAction[] {
  return STAGE_ACTION_TEMPLATES[stage].map((text, idx) => ({
    id: stageActionId(stage, idx),
    text,
    source: 'stage' as const,
    stage,
    completed: false,
  }));
}

/**
 * Build role-specific OpportunityAction items from the analysis fixture nextActions list.
 * Stable IDs: role:<opportunityId>:<index>
 */
export function buildRoleActions(
  opportunityId: string,
  nextActions: string[]
): OpportunityAction[] {
  return nextActions.map((text, idx) => ({
    id: `role:${opportunityId}:${idx}`,
    text,
    source: 'role' as const,
    completed: false,
  }));
}

/**
 * Generate a stable ID for a user-authored custom action.
 * Format: custom:<timestamp>:<random>
 */
export function generateCustomActionId(): string {
  return `custom:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Merge a set of canonical actions (stage + role) with persisted actions from storage.
 *
 * Rules:
 * - Stage actions: Replace the full stage-suggested set with the current stage template,
 *   restoring completion state where IDs match.
 * - Role actions: Preserve as-is, restoring completion from stored state.
 * - Custom actions: Preserved entirely from stored state; never overwritten.
 * - Previous stage's action IDs that no longer exist are silently dropped.
 *
 * @param opportunityId - stable opportunity ID used for role action IDs
 * @param currentStage  - the opportunity's current pipeline stage
 * @param nextActions   - role-specific action text array from analysis fixture
 * @param storedActions - the currently persisted action list for this opportunity
 */
export function mergeActionsForStage(
  opportunityId: string,
  currentStage: PipelineStage,
  nextActions: string[],
  storedActions: OpportunityAction[]
): OpportunityAction[] {
  // Build a lookup of completion state from persisted storage by action ID
  const completionById = new Map<string, boolean>(
    storedActions.map((a) => [a.id, a.completed])
  );

  // 1. Stage actions — always from current stage template, completion restored
  const stageActions = buildStageActions(currentStage).map((a) => ({
    ...a,
    completed: completionById.get(a.id) ?? false,
  }));

  // 2. Role actions — stable across stage changes, completion restored
  const roleActions = buildRoleActions(opportunityId, nextActions).map((a) => ({
    ...a,
    completed: completionById.get(a.id) ?? false,
  }));

  // 3. Custom actions — taken entirely from stored state, never dropped
  const customActions = storedActions.filter((a) => a.source === 'custom');

  return [...stageActions, ...roleActions, ...customActions];
}

/**
 * Return only the display actions relevant to the current stage view.
 * Archived opportunities show all actions but mark them as informational only.
 */
export function getDisplayActions(actions: OpportunityAction[]): OpportunityAction[] {
  return actions;
}

/**
 * Count incomplete, non-archived actions.
 * Archived opportunities contribute 0 to the pending count.
 */
export function countPendingActions(
  actions: OpportunityAction[],
  stage: PipelineStage
): number {
  if (stage === 'Archived') return 0;
  return actions.filter((a) => !a.completed).length;
}
