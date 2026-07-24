'use client';

import React, { useState } from 'react';
import { JobOpportunity, PipelineStage, OpportunityPriority, OpportunityAction } from '@/types/opportunity';
import { Card, CardHeader } from '@/components/ui/Card';
import { PriorityBadge } from '@/components/ui/Badge';
import {
  IconEdit,
  IconSave,
  IconPlus,
  IconExternalLink,
  IconCalendar,
  IconClock,
} from '@/components/icons';
import {
  saveOpportunity,
  updateOpportunityStage,
  toggleActionCompleted,
  addCustomAction,
} from '@/lib/storage';
import { generateCustomActionId } from '@/lib/stageActions';
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
      <span className="text-xs text-slate-400 italic">
        {href ? 'Invalid URL' : 'Not provided'}
      </span>
    );
  }

  return (
    <a
      href={validUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
    >
      <span>{label}</span>
      <IconExternalLink className="w-3 h-3 shrink-0" />
    </a>
  );
}

export function OpportunityDetailsForm({ opportunity, onSave }: Props) {
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

  // Group actions for display directly from authoritative opportunity prop
  const stageActions = opportunity.actions.filter((a) => a.source === 'stage');
  const roleActions = opportunity.actions.filter((a) => a.source === 'role');
  const customActions = opportunity.actions.filter((a) => a.source === 'custom');

  const pendingCount = opportunity.stage !== 'Archived'
    ? opportunity.actions.filter((a) => !a.completed).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Opportunity Details Card */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between">
          <CardHeader title="Opportunity Details" className="p-0 mb-0" />
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <IconEdit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
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
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-priority">
                Priority
              </label>
              <select
                id="edit-priority"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as OpportunityPriority)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-stage">
                Pipeline Stage
              </label>
              <select
                id="edit-stage"
                value={editStage}
                onChange={(e) => setEditStage(e.target.value as PipelineStage)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Follow-up Date */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-followup">
                Follow-up Date
              </label>
              <input
                id="edit-followup"
                type="date"
                value={editFollowUpDate}
                onChange={(e) => setEditFollowUpDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Company Website URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-company-url">
                Company Website URL
              </label>
              <input
                id="edit-company-url"
                type="url"
                placeholder="https://company.example.com"
                value={editCompanyUrl}
                onChange={(e) => setEditCompanyUrl(e.target.value)}
                className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                  companyUrlError ? 'border-rose-400' : 'border-slate-200'
                }`}
              />
              {companyUrlError && (
                <p className="text-xs text-rose-600">{companyUrlError}</p>
              )}
            </div>

            {/* Application URL */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-app-url">
                Job Application URL
              </label>
              <input
                id="edit-app-url"
                type="url"
                placeholder="https://company.example.com/apply"
                value={editApplicationUrl}
                onChange={(e) => setEditApplicationUrl(e.target.value)}
                className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                  applicationUrlError ? 'border-rose-400' : 'border-slate-200'
                }`}
              />
              {applicationUrlError && (
                <p className="text-xs text-rose-600">{applicationUrlError}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700" htmlFor="edit-notes">
                Notes
              </label>
              <textarea
                id="edit-notes"
                rows={4}
                placeholder="Interview notes, contacts, reminders..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-y"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Priority */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</p>
              <PriorityBadge priority={opportunity.priority} />
            </div>

            {/* Follow-up Date */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-up Date</p>
              {opportunity.followUpDate ? (
                <div className="flex items-center gap-2">
                  <IconCalendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-sm text-slate-800">
                    {formatShortDate(opportunity.followUpDate)}
                  </span>
                  {followUpStatus !== 'No Date' && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      followUpStatus === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                      followUpStatus === 'Due Today' ? 'bg-amber-100 text-amber-700' :
                      'bg-sky-100 text-sky-700'
                    }`}>
                      {followUpStatus}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Not set</span>
              )}
            </div>

            {/* Company Website */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Website</p>
              <SafeExternalLink href={opportunity.companyWebsiteUrl} label="Visit Company Website" />
            </div>

            {/* Application URL */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Application</p>
              <SafeExternalLink href={opportunity.applicationUrl} label="Open Job Application" />
            </div>

            {/* Notes */}
            {opportunity.notes && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {opportunity.notes}
                </p>
              </div>
            )}

            {/* Archived Reason */}
            {opportunity.stage === 'Archived' && opportunity.archivedReason && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Archive Reason</p>
                <p className="text-sm text-slate-600 italic">{opportunity.archivedReason}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Next Actions Panel */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Next Action Items</h3>
            {opportunity.stage !== 'Archived' && pendingCount > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">
                <IconClock className="w-3 h-3 inline mr-1" />
                {pendingCount} item{pendingCount !== 1 ? 's' : ''} remaining
              </p>
            )}
            {opportunity.stage === 'Archived' && (
              <p className="text-xs text-slate-400 italic mt-0.5">
                Archived — actions are preserved for reference
              </p>
            )}
          </div>
        </div>

        {/* Stage-suggested actions */}
        {stageActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Stage: {opportunity.stage}
            </p>
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

        {/* Role-specific actions */}
        {roleActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Role-Specific
            </p>
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

        {/* Custom actions */}
        {customActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Custom Actions
            </p>
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
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="Add a custom action..."
              value={newActionText}
              onChange={(e) => setNewActionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomAction();
              }}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              onClick={handleAddCustomAction}
              disabled={!newActionText.trim()}
              className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Add custom action"
            >
              <IconPlus className="w-4 h-4" />
            </button>
          </div>
        )}
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
    action.source === 'custom' ? 'Custom' :
    action.source === 'role' ? 'Role-specific' :
    null;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
        action.completed
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <button
        onClick={onToggle}
        disabled={disabled}
        aria-label={action.completed ? 'Mark incomplete' : 'Mark complete'}
        className={`w-4.5 h-4.5 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
          action.completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 hover:border-slate-500'
        } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        {action.completed && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-xs text-slate-800 leading-relaxed ${
          action.completed ? 'line-through text-slate-400' : ''
        }`}>
          {action.text}
        </p>
        {sourceLabel && (
          <span className={`text-[10px] font-medium mt-0.5 inline-block ${
            action.source === 'custom'
              ? 'text-indigo-600'
              : 'text-slate-400'
          }`}>
            {sourceLabel}
          </span>
        )}
      </div>

      {action.source === 'custom' && !disabled && (
        <span className="text-[10px] text-indigo-500 font-semibold shrink-0 mt-0.5">
          ✎
        </span>
      )}
    </div>
  );
}
