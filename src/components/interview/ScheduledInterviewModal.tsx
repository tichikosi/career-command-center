'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NetworkContact } from '@/types/network';
import { InterviewType, OpportunityActivity } from '@/types/interview';
import { IconCalendar, IconClock, IconUsers } from '@/components/icons';

interface ScheduledInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  opportunityCompany: string;
  matchingContacts: NetworkContact[];
  onSave: (activityData: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const INTERVIEW_TYPES: { value: InterviewType; label: string }[] = [
  { value: 'phone_screen', label: 'Phone Screen / Recruiter Chat' },
  { value: 'video', label: 'Video Call (1-on-1)' },
  { value: 'hiring_manager', label: 'Hiring Manager Interview' },
  { value: 'technical', label: 'Technical / Architecture Deep Dive' },
  { value: 'behavioral', label: 'Behavioral & Leadership' },
  { value: 'panel', label: 'Panel / Cross-Functional' },
  { value: 'executive', label: 'Executive / Leadership Interview' },
  { value: 'onsite', label: 'Onsite Loop' },
  { value: 'other', label: 'Other Round' },
];

export function ScheduledInterviewModal({
  isOpen,
  onClose,
  opportunityId,
  opportunityCompany,
  matchingContacts,
  onSave,
}: ScheduledInterviewModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [interviewType, setInterviewType] = useState<InterviewType>('hiring_manager');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerTitle, setInterviewerTitle] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    if (contactId) {
      const contact = matchingContacts.find((c) => c.id === contactId);
      if (contact) {
        setInterviewerName(contact.name);
        setInterviewerTitle(contact.position || '');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      const scheduledDateTime = time ? `${date}T${time}:00.000Z` : `${date}T12:00:00.000Z`;
      const typeLabel = INTERVIEW_TYPES.find((t) => t.value === interviewType)?.label || 'Interview';
      const title = isCompleted
        ? `Interview Completed: ${typeLabel}${interviewerName ? ` w/ ${interviewerName}` : ''}`
        : `Scheduled Interview: ${typeLabel}${interviewerName ? ` w/ ${interviewerName}` : ''}`;

      await onSave({
        opportunityId,
        activityType: isCompleted ? 'interview_completed' : 'interview_scheduled',
        title,
        notes: notes.trim() || undefined,
        occurredAt: isCompleted ? scheduledDateTime : new Date().toISOString(),
        scheduledFor: !isCompleted ? scheduledDateTime : undefined,
        contactId: selectedContactId || undefined,
        contactName: interviewerName.trim() || undefined,
        source: 'user',
        metadata: {
          interviewType,
          interviewerTitle: interviewerTitle.trim() || undefined,
          isCompleted,
        },
      });

      onClose();
    } catch (err) {
      console.error('[ScheduledInterviewModal] Submit failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record or Schedule Interview">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <p className="text-slate-600 dark:text-slate-400">
          Record an upcoming interview round or log a completed conversation with <strong className="text-slate-900 dark:text-slate-100">{opportunityCompany}</strong>.
        </p>

        <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
          <label className="flex items-center gap-2 font-medium cursor-pointer text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            />
            <span>This interview has already occurred (Log as Completed)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <IconCalendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Interview Date</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <IconClock className="w-3.5 h-3.5 text-slate-500" />
              <span>Time (Optional)</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Interview Round / Format
          </label>
          <select
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value as InterviewType)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {matchingContacts.length > 0 && (
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <IconUsers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Link to Network Contact</span>
            </label>
            <select
              value={selectedContactId}
              onChange={(e) => handleContactSelect(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Contact at {opportunityCompany} --</option>
              {matchingContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.position ? `(${c.position})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Interviewer Name
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={interviewerName}
              onChange={(e) => setInterviewerName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Interviewer Title
            </label>
            <input
              type="text"
              placeholder="e.g. VP of Engineering"
              value={interviewerTitle}
              onChange={(e) => setInterviewerTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Focus Areas / Notes
          </label>
          <textarea
            rows={3}
            placeholder="Key topics, specific questions prepared, or discussion takeaways..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : isCompleted ? 'Log Completed Round' : 'Schedule Interview'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
