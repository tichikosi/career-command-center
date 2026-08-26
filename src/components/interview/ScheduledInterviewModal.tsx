'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NetworkContact } from '@/types/network';
import { InterviewType, OpportunityActivity } from '@/types/interview';
import { IconCalendar, IconClock } from '@/components/icons';

import { SearchableContactPicker } from '@/components/network/SearchableContactPicker';
import { useNetwork } from '@/lib/networkStorage';

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
  const { contacts: allNetworkContacts } = useNetwork();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [interviewType, setInterviewType] = useState<InterviewType>('hiring_manager');
  const [interviewerName, setInterviewerName] = useState('');
  const [interviewerTitle, setInterviewerTitle] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedContactName, setSelectedContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleContactSelect = (contact: NetworkContact | null) => {
    if (contact) {
      setSelectedContactId(contact.id);
      setSelectedContactName(contact.fullName);
      setInterviewerName(contact.fullName);
      setInterviewerTitle(contact.position || '');
    } else {
      setSelectedContactId('');
      setSelectedContactName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const scheduledDateTime = time ? `${date}T${time}:00.000Z` : `${date}T12:00:00.000Z`;
      const typeLabel = INTERVIEW_TYPES.find((t) => t.value === interviewType)?.label || 'Interview';
      const title = isCompleted
        ? `Interview Completed: ${typeLabel}${interviewerName ? ` w/ ${interviewerName}` : ''}`
        : `Scheduled Interview: ${typeLabel}${interviewerName ? ` w/ ${interviewerName}` : ''}`;

      const res = await onSave({
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

      if (res === null) {
        setErrorMessage('Failed to save to cloud storage. Please check connection.');
        return;
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record interview.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record or Schedule Interview">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}
        <p className="text-slate-600 dark:text-slate-400">
          Record an upcoming interview round or log a completed conversation with <strong className="text-slate-900 dark:text-slate-100">{opportunityCompany}</strong>.
        </p>

        <div className="flex items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="interviewState"
              checked={!isCompleted}
              onChange={() => setIsCompleted(false)}
              className="text-indigo-600"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Scheduled (Upcoming)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="interviewState"
              checked={isCompleted}
              onChange={() => setIsCompleted(true)}
              className="text-indigo-600"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Completed (Log Past Round)</span>
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

        <SearchableContactPicker
          contacts={allNetworkContacts.length > 0 ? allNetworkContacts : matchingContacts}
          matchingContacts={matchingContacts}
          selectedContactId={selectedContactId}
          selectedContactName={selectedContactName}
          onSelectContact={handleContactSelect}
          label="Link to Network Contact"
          placeholder={`Search contacts at ${opportunityCompany} or across your network...`}
        />

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
