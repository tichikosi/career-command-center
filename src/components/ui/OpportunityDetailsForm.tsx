'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { JobOpportunity, PipelineStage, OpportunityPriority, OpportunityAction } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { Card, CardHeader } from '@/components/ui/Card';
import { PriorityBadge } from '@/components/ui/Badge';
import { useNetwork } from '@/lib/networkStorage';
import { findMatchingContacts, rankMatchedContacts, generateSuggestedOutreachAction } from '@/lib/networkMatcher';
import {
  IconEdit,
  IconSave,
  IconPlus,
  IconExternalLink,
  IconCalendar,
  IconClock,
  IconNetwork,
  IconArrowRight,
} from '@/components/icons';
import {
  saveOpportunity,
  updateOpportunityStage,
  toggleActionCompleted,
  addCustomAction,
} from '@/lib/storage';
import { generateCustomActionId, countPendingActions, getDisplayActions } from '@/lib/stageActions';
import { validateUrl, formatShortDate, classifyFollowUpDate } from '@/lib/dateUtils';

interface Props {
  opportunity: JobOpportunity;
  onSave: (updated: JobOpportunity) => void;
}

const PRIORITY_OPTIONS: OpportunityPriority[] = ['High', 'Medium', 'Low'];
const STAGE_OPTIONS: PipelineStage[] = [
  'Identified', 'Applied', 'Screening', 'Interviewing', 'Offer', 'Archived',
];

function SafeExternalLink({
  href,
  label,
}: {
  href: string | undefined;
  label: string;
}) {
  const validUrl = href ? validateUrl(href) : null;

  if (!validUrl) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
        {href ? 'Invalid URL' : 'Not provided'}
      </span>
    );
  }

  return (
    <a
      href={validUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:underline"
    >
      <span>{label}</span>
      <IconExternalLink className="w-3 h-3 shrink-0" />
    </a>
  );
}

export function OpportunityDetailsForm({ opportunity, onSave }: Props) {
  const { contacts: networkContacts } = useNetwork();
  const matchedContacts = useMemo(
    () => findMatchingContacts(opportunity.company, networkContacts),
    [opportunity.company, networkContacts]
  );
  const rankedMatches = useMemo(
    () => rankMatchedContacts(matchedContacts, opportunity.title, opportunity.company),
    [matchedContacts, opportunity.title, opportunity.company]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [newActionText, setNewActionText] = useState('');

  // Local edit state
  const [editPriority, setEditPriority] = useState<OpportunityPriority>(opportunity.priority);
  const [editStage, setEditStage] = useState<PipelineStage>(opportunity.stage);
  const [editFollowUpDate, setEditFollowUpDate] = useState(opportunity.followUpDate ?? '');
  const [editCompanyUrl, setEditCompanyUrl] = useState(opportunity.companyWebsiteUrl ?? '');
  const [editApplicationUrl, setEditApplicationUrl] = useState(opportunity.applicationUrl ?? '');
  const [editNotes, setEditNotes] = useState(opportunity.notes ?? '');

  // URL validation states
  const [companyUrlError, setCompanyUrlError] = useState('');
  const [applicationUrlError, setApplicationUrlError] = useState('');

  const handleAddOutreachAction = (contact: NetworkContact) => {
    const outreachAction = generateSuggestedOutreachAction(contact, opportunity.id);
    const existingTexts = new Set(opportunity.actions.map((a) => a.text));
    if (!existingTexts.has(outreachAction.text)) {
      const updated = addCustomAction(opportunity.id, outreachAction.text, outreachAction.id);
      if (updated) onSave(updated);
    }
  };

  // Synchronize form fields when external opportunity updates, UNLESS user is actively editing
  const [prevOpp, setPrevOpp] = useState(opportunity);
  if (!isEditing && prevOpp !== opportunity) {
    setPrevOpp(opportunity);
    setEditPriority(opportunity.priority);
    setEditStage(opportunity.stage);
    setEditFollowUpDate(opportunity.followUpDate ?? '');
    setEditCompanyUrl(opportunity.companyWebsiteUrl ?? '');
    setEditApplicationUrl(opportunity.applicationUrl ?? '');
    setEditNotes(opportunity.notes ?? '');
  }

  const followUpStatus = classifyFollowUpDate(opportunity.followUpDate);

  const handleSave = () => {
    let hasError = false;

    if (editCompanyUrl && !validateUrl(editCompanyUrl)) {
      setCompanyUrlError('Must be a valid http:// or https:// URL');
      hasError = true;
    } else {
      setCompanyUrlError('');
    }

    if (editApplicationUrl && !validateUrl(editApplicationUrl)) {
      setApplicationUrlError('Must be a valid http:// or https:// URL');
      hasError = true;
    } else {
      setApplicationUrlError('');
    }

    if (hasError) return;

    // 1. If stage changed, use the single authoritative updater updateOpportunityStage
    let target = opportunity;
    if (editStage !== opportunity.stage) {
      target = updateOpportunityStage(opportunity.id, editStage);
    }

    // 2. Save remaining field edits (priority, notes, dates, URLs)
    const updated: JobOpportunity = {
      ...target,
      priority: editPriority,
      stage: editStage,
      followUpDate: editFollowUpDate || undefined,
      companyWebsiteUrl: editCompanyUrl || undefined,
      applicationUrl: editApplicationUrl || undefined,
      notes: editNotes,
    };

    const saved = saveOpportunity(updated);
    onSave(saved);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditPriority(opportunity.priority);
    setEditStage(opportunity.stage);
    setEditFollowUpDate(opportunity.followUpDate ?? '');
    setEditCompanyUrl(opportunity.companyWebsiteUrl ?? '');
    setEditApplicationUrl(opportunity.applicationUrl ?? '');
    setEditNotes(opportunity.notes ?? '');
    setCompanyUrlError('');
    setApplicationUrlError('');
    setIsEditing(false);
  };

  const handleToggleAction = (actionId: string) => {
    const updated = toggleActionCompleted(opportunity.id, actionId);
    if (updated) onSave(updated);
  };

  const handleAddCustomAction = () => {
    const text = newActionText.trim();
    if (!text) return;
    const id = generateCustomActionId();
    const updated = addCustomAction(opportunity.id, text, id);
    if (updated) onSave(updated);
    setNewActionText('');
  };

  // Shared single-source derivation of visible action set
  const visibleActions = getDisplayActions(opportunity.actions, opportunity.stage);
  const stageActions = visibleActions.filter((a) => a.source === 'stage');
  const roleActions = visibleActions.filter((a) => a.source === 'role');
  const customActions = visibleActions.filter((a) => a.source === 'custom');

  const pendingCount = countPendingActions(opportunity.actions, opportunity.stage);

  return (
    <div className="space-y-6">
      {/* Opportunity Details Card */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between">
          <CardHeader title="Opportunity Details" className="p-0 mb-0" />
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <IconEdit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <IconSave className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Priority */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="edit-priority">
                Priority
              </label>
              <select
                id="edit-priority"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as OpportunityPriority)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="edit-stage">
                Pipeline Stage
              </label>
              <select
                id="edit-stage"
                value={editStage}
                onChange={(e) => setEditStage(e.target.value as PipelineStage)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Follow-up Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="edit-followup">
                Follow-up Date
              </label>
              <input
                id="edit-followup"
                type="date"
                value={editFollowUpDate}
                onChange={(e) => setEditFollowUpDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
            </div>

            {/* Company Website URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="edit-company-url">
                Company Website URL
              </label>
              <input
                id="edit-company-url"
                type="url"
                placeholder="https://company.example.com"
                value={editCompanyUrl}
                onChange={(e) => setEditCompanyUrl(e.target.value)}
                className={`w-full bg-slate-50 dark:bg-slate-800/80 border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${
                  companyUrlError ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {companyUrlError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{companyUrlError}</p>
              )}
            </div>

            {/* Application URL */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="edit-app-url">
                Job Application URL
              </label>
              <input
                id="edit-app-url"
                type="url"
                placeholder="https://company.example.com/apply"
                value={editApplicationUrl}
                onChange={(e) => setEditApplicationUrl(e.target.value)}
                className={`w-full bg-slate-50 dark:bg-slate-800/80 border rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${
                  applicationUrlError ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {applicationUrlError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{applicationUrlError}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="edit-notes">
                Notes
              </label>
              <textarea
                id="edit-notes"
                rows={4}
                placeholder="Interview notes, contacts, reminders..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Priority */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority</p>
              <PriorityBadge priority={opportunity.priority} />
            </div>

            {/* Follow-up Date */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Follow-up Date</p>
              {opportunity.followUpDate ? (
                <div className="flex items-center gap-2">
                  <IconCalendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm text-slate-800 dark:text-slate-200">
                    {formatShortDate(opportunity.followUpDate)}
                  </span>
                  {followUpStatus !== 'No Date' && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      followUpStatus === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' :
                      followUpStatus === 'Due Today' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' :
                      'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                    }`}>
                      {followUpStatus}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500 italic">Not set</span>
              )}
            </div>

            {/* Company Website */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Company Website</p>
              <SafeExternalLink href={opportunity.companyWebsiteUrl} label="Visit Company Website" />
            </div>

            {/* Application URL */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Job Application</p>
              <SafeExternalLink href={opportunity.applicationUrl} label="Open Job Application" />
            </div>

            {/* Notes */}
            {opportunity.notes && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {opportunity.notes}
                </p>
              </div>
            )}

            {/* Archived Reason */}
            {opportunity.stage === 'Archived' && opportunity.archivedReason && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Archive Reason</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 italic">{opportunity.archivedReason}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Network Intelligence Panel */}
      <Card padding="lg" className="space-y-4 border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-3">
          <div className="flex items-center gap-2">
            <IconNetwork className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Network Intelligence {matchedContacts.length > 0 ? `(${matchedContacts.length} Matched Contact${matchedContacts.length !== 1 ? 's' : ''})` : ''}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {matchedContacts.length > 0
                  ? `Ranked connections at ${opportunity.company} matched from your local directory.`
                  : `Automated matching against your professional network directory.`}
              </p>
            </div>
          </div>

          {matchedContacts.length > 0 && (
            <Link
              href={`/network?opportunityId=${opportunity.id}`}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-1 shrink-0"
            >
              <span>View all {matchedContacts.length} matches</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {matchedContacts.length === 0 ? (
          <div className="p-4 bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-300">No current connections found at {opportunity.company}.</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Import additional LinkedIn connections or add 2nd-degree referrals in the Network directory.
              </p>
            </div>
            <Link
              href="/network"
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold rounded-lg shrink-0 transition-colors"
            >
              Open Network
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rankedMatches.slice(0, 6).map(({ contact, matchReasons }) => {
              const alreadyAdded = opportunity.actions.some(
                (a) => a.text.includes(contact.fullName) || a.id === `action-outreach-${contact.id}-${opportunity.id}`
              );

              return (
                <div
                  key={contact.id}
                  className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{contact.fullName}</h4>
                      {matchReasons[0] && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {matchReasons[0]}
                        </span>
                      )}
                    </div>
                    {contact.position && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">{contact.position}</p>
                    )}
                    {contact.company && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{contact.company}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {contact.linkedInUrl && (
                      <a
                        href={contact.linkedInUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>LinkedIn</span>
                        <IconExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAddOutreachAction(contact)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                        alreadyAdded
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default border border-slate-200 dark:border-slate-700'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                      }`}
                    >
                      {alreadyAdded ? 'Added to Plan' : '+ Add Outreach Action'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Action Plan Items Panel */}
      <Card padding="lg" className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Action Plan Execution Checklist</h3>
            {opportunity.stage !== 'Archived' && pendingCount > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <IconClock className="w-3 h-3 inline mr-1" />
                {pendingCount} item{pendingCount !== 1 ? 's' : ''} remaining
              </p>
            )}
            {opportunity.stage === 'Archived' && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">
                Archived — actions are preserved for reference
              </p>
            )}
          </div>
        </div>

        {/* Section B: Current Stage Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Current Stage Checklist: {opportunity.stage}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Stage-specific checklist items update automatically when the pipeline stage changes.
              </p>
            </div>
          </div>
          {stageActions.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No checklist items for current stage.</p>
          ) : (
            <div className="space-y-2">
              {stageActions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  disabled={opportunity.stage === 'Archived'}
                  onToggle={() => handleToggleAction(action.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section C: Role-Specific Actions */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Role-Specific Actions
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Recommendations derived specifically from the role evaluation report.
            </p>
          </div>
          {roleActions.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No role-specific recommendations generated.</p>
          ) : (
            <div className="space-y-2">
              {roleActions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  disabled={opportunity.stage === 'Archived'}
                  onToggle={() => handleToggleAction(action.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Section D: Your Custom Actions */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Your Custom Actions
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Personalized tasks and follow-up items created specifically for this opportunity.
            </p>
          </div>
          {customActions.length > 0 && (
            <div className="space-y-2">
              {customActions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  disabled={opportunity.stage === 'Archived'}
                  onToggle={() => handleToggleAction(action.id)}
                />
              ))}
            </div>
          )}

          {/* Add custom action input */}
          {opportunity.stage !== 'Archived' && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add a custom action..."
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomAction();
                }}
                className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
              <button
                onClick={handleAddCustomAction}
                disabled={!newActionText.trim()}
                className="p-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Add custom action"
              >
                <IconPlus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ActionItem sub-component
// ---------------------------------------------------------------------------

function ActionItem({
  action,
  disabled,
  onToggle,
}: {
  action: OpportunityAction;
  disabled: boolean;
  onToggle: () => void;
}) {
  const sourceLabel =
    action.source === 'custom'
      ? 'Custom'
      : action.source === 'role'
      ? 'Role-specific'
      : null;

  const formattedCompletedDate = action.completedAt
    ? formatShortDate(action.completedAt.slice(0, 10))
    : null;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        action.completed
          ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={
          action.completed
            ? `Reopen action: ${action.text}`
            : `Mark action complete: ${action.text}`
        }
        className={`w-5 h-5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100 ${
          action.completed
            ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500 text-white'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400 bg-white dark:bg-slate-800'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        {action.completed && (
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-xs leading-relaxed font-medium ${
            action.completed
              ? 'line-through text-slate-500 dark:text-slate-400'
              : 'text-slate-900 dark:text-slate-100'
          }`}
        >
          {action.text}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {sourceLabel && (
            <span
              className={`text-[10px] font-semibold ${
                action.source === 'custom'
                  ? 'text-indigo-700 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {sourceLabel}
            </span>
          )}
          {action.completed && formattedCompletedDate && (
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Completed {formattedCompletedDate}
            </span>
          )}
        </div>
      </div>

      {action.source === 'custom' && !disabled && (
        <span
          aria-hidden="true"
          className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold shrink-0 mt-0.5"
        >
          ✎
        </span>
      )}
    </div>
  );
}
