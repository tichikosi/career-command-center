'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { OpportunityActivity, ActivityType } from '@/types/interview';
import { NetworkContact } from '@/types/network';
import {
  IconTimeline,
  IconPlus,
  IconEdit,
  IconTrash,
  IconUsers,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconMail,
  IconPhone,
  IconBrain,
  IconMicrophone,
  IconFileText,
  IconFlag,
  IconAlertTriangle,
} from '@/components/icons';
import { formatShortDate } from '@/lib/dateUtils';
import { ScheduledInterviewModal } from './ScheduledInterviewModal';
import { SearchableContactPicker } from '@/components/network/SearchableContactPicker';
import { useNetwork } from '@/lib/networkStorage';

interface ActivityTimelineProps {
  opportunityId: string;
  opportunityCompany: string;
  activities: OpportunityActivity[];
  matchingContacts?: NetworkContact[];
  onAddActivity: (activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OpportunityActivity | null>;
  onEditActivity: (id: string, updates: Partial<OpportunityActivity>) => Promise<OpportunityActivity | null>;
  onDeleteActivity: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const ACTIVITY_TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: React.FC<{ className?: string }>; colorClass: string }
> = {
  stage_change: { label: 'Pipeline Stage Change', icon: IconFlag, colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  application_submitted: { label: 'Application Submitted', icon: IconFileText, colorClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  interview_scheduled: { label: 'Interview Scheduled', icon: IconCalendar, colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  interview_completed: { label: 'Interview Completed', icon: IconCheckCircle, colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  recruiter_contact: { label: 'Recruiter Conversation', icon: IconPhone, colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  referral_activity: { label: 'Referral Inquiry / Nudge', icon: IconUsers, colorClass: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' },
  networking_outreach: { label: 'Networking Outreach', icon: IconUsers, colorClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  follow_up_sent: { label: 'Follow-Up Recorded', icon: IconMail, colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  thank_you_sent: { label: 'Thank-You Sent', icon: IconCheckCircle, colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  offer_received: { label: 'Offer Received', icon: IconCheckCircle, colorClass: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100' },
  rejection_received: { label: 'Decision Received', icon: IconAlertTriangle, colorClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  withdrawal: { label: 'Application Withdrawn', icon: IconAlertTriangle, colorClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  note: { label: 'Executive Note', icon: IconFileText, colorClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  analysis_run: { label: 'Fit Analysis Evaluated', icon: IconBrain, colorClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  prep_generated: { label: 'War Room Prep Generated', icon: IconBrain, colorClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  mock_session_completed: { label: 'Mock Interview Session', icon: IconMicrophone, colorClass: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  system_baseline: { label: 'Baseline State Initialized', icon: IconTimeline, colorClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  other: { label: 'Milestone Activity', icon: IconTimeline, colorClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export function ActivityTimeline({
  opportunityId,
  opportunityCompany,
  activities,
  matchingContacts = [],
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  isLoading = false,
}: ActivityTimelineProps) {
  const { contacts: allNetworkContacts } = useNetwork();
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<OpportunityActivity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states for Add/Edit Note or Activity
  const [formType, setFormType] = useState<ActivityType>('note');
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formContactId, setFormContactId] = useState('');
  const [formContactName, setFormContactName] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredActivities = activities.filter((a) => {
    if (filterType === 'all') return true;
    if (filterType === 'interview') return a.activityType.includes('interview');
    if (filterType === 'communication') return ['recruiter_contact', 'follow_up_sent', 'thank_you_sent', 'networking_outreach', 'referral_activity'].includes(a.activityType);
    if (filterType === 'notes') return a.activityType === 'note';
    return a.activityType === filterType;
  });

  const handleOpenAddModal = (type: ActivityType = 'note') => {
    setFormType(type);
    setFormTitle('');
    setFormNotes('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormContactId('');
    setFormContactName('');
    setErrorMessage(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (activity: OpportunityActivity) => {
    setEditingActivity(activity);
    setFormType(activity.activityType);
    setFormTitle(activity.title);
    setFormNotes(activity.notes || '');
    setFormDate(activity.occurredAt.split('T')[0] || new Date().toISOString().split('T')[0]);
    setFormContactId(activity.contactId || '');
    setFormContactName(activity.contactName || '');
    setErrorMessage(null);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setErrorMessage(null);
    const occurredAt = `${formDate}T12:00:00.000Z`;

    try {
      if (editingActivity) {
        const res = await onEditActivity(editingActivity.id, {
          title: formTitle.trim(),
          activityType: formType,
          notes: formNotes.trim() || undefined,
          occurredAt,
          contactId: formContactId || undefined,
          contactName: formContactName || undefined,
        });
        if (res === null) {
          setErrorMessage('Failed to update activity in cloud storage. Please check connection.');
          return;
        }
        setEditingActivity(null);
      } else {
        const res = await onAddActivity({
          opportunityId,
          activityType: formType,
          title: formTitle.trim(),
          notes: formNotes.trim() || undefined,
          occurredAt,
          contactId: formContactId || undefined,
          contactName: formContactName || undefined,
          source: 'user',
        });
        if (res === null) {
          setErrorMessage('Failed to record activity in cloud storage. Please check connection.');
          return;
        }
        setIsAddModalOpen(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save activity.';
      setErrorMessage(msg);
    }
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await onDeleteActivity(deletingId);
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <IconTimeline className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Opportunity Activity & Timeline</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Forward-only audit trail of recruiter touchpoints, scheduled interviews, stage changes, and executive notes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <IconCalendar className="w-3.5 h-3.5" />
            <span>Schedule / Log Interview</span>
          </button>
          <button
            onClick={() => handleOpenAddModal('note')}
            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>Add Note / Activity</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs">
        {[
          { key: 'all', label: `All Activities (${activities.length})` },
          { key: 'interview', label: 'Interviews' },
          { key: 'communication', label: 'Outreach & Follow-Ups' },
          { key: 'notes', label: 'Notes' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`px-3 py-1 rounded-md font-medium transition-colors ${
              filterType === f.key
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading activity timeline...</div>
      ) : filteredActivities.length === 0 ? (
        <Card padding="lg" className="text-center py-10 border-dashed">
          <IconTimeline className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Recorded Activities</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Activities log forward-only touchpoints as you progress through discussions with {opportunityCompany}.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              Log Interview
            </button>
            <button
              onClick={() => handleOpenAddModal('note')}
              className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Add Note
            </button>
          </div>
        </Card>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredActivities.map((act) => {
            const config = ACTIVITY_TYPE_CONFIG[act.activityType] || ACTIVITY_TYPE_CONFIG.other;
            const Icon = config.icon;
            const isSystem = act.source === 'system';

            return (
              <div key={act.id} className="relative group">
                {/* Node icon */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-950 ${config.colorClass}`}
                >
                  <Icon className="w-3 h-3" />
                </div>

                {/* Content Box */}
                <Card padding="md" className="transition-all hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {act.title}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.colorClass}`}>
                          {config.label}
                        </span>
                        {act.source === 'demo' && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono">
                            DEMO
                          </span>
                        )}
                      </div>

                      {act.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap mt-1">
                          {act.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <IconClock className="w-3 h-3" />
                          <span>{formatShortDate(act.occurredAt)}</span>
                        </span>

                        {act.scheduledFor && (
                          <span className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                            <IconCalendar className="w-3 h-3" />
                            <span>Target: {formatShortDate(act.scheduledFor)}</span>
                          </span>
                        )}

                        {act.contactName && (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                            <IconUsers className="w-3 h-3" />
                            <span>{act.contactName}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons (Edit / Delete) */}
                    {!isSystem && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal(act)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                          title="Edit Activity"
                        >
                          <IconEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(act.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Activity"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Scheduled Interview Modal */}
      <ScheduledInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        opportunityId={opportunityId}
        opportunityCompany={opportunityCompany}
        matchingContacts={matchingContacts}
        onSave={async (data) => {
          await onAddActivity(data);
        }}
      />

      {/* Add / Edit General Activity Modal */}
      {(isAddModalOpen || editingActivity) && (
        <Modal
          isOpen={isAddModalOpen || !!editingActivity}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingActivity(null);
          }}
          title={editingActivity ? 'Edit Timeline Activity' : 'Record Timeline Activity'}
        >
          <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Activity Category
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ActivityType)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              >
                <option value="note">Note / Log Entry</option>
                <option value="recruiter_contact">Recruiter Touchpoint / Call</option>
                <option value="networking_outreach">Networking Outreach</option>
                <option value="referral_activity">Referral Inquiry / Nudge</option>
                <option value="follow_up_sent">Follow-Up Sent</option>
                <option value="thank_you_sent">Thank-You Sent</option>
                <option value="application_submitted">Application Submitted</option>
                <option value="offer_received">Offer Received</option>
                <option value="rejection_received">Rejection / Decision Received</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="other">Other Milestone</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Activity Summary / Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Discussed compensation and scope with lead recruiter"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                />
              </div>

              <SearchableContactPicker
                contacts={allNetworkContacts.length > 0 ? allNetworkContacts : matchingContacts}
                matchingContacts={matchingContacts}
                selectedContactId={formContactId}
                selectedContactName={formContactName}
                onSelectContact={(c) => {
                  if (c) {
                    setFormContactId(c.id);
                    setFormContactName(c.fullName);
                  } else {
                    setFormContactId('');
                    setFormContactName('');
                  }
                }}
                label="Linked Contact"
                placeholder={`Search contacts at ${opportunityCompany} or network...`}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Key takeaways, action items, or feedback..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingActivity(null);
                }}
                className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-semibold hover:opacity-90 transition-opacity"
              >
                {editingActivity ? 'Save Changes' : 'Record Activity'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <Modal
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          title="Confirm Delete Activity"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to delete this activity entry from the timeline? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700"
              >
                Delete Activity
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
