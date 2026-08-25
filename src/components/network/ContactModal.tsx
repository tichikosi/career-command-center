'use client';

import React, { useState } from 'react';
import { NetworkContact } from '@/types/network';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contact?: NetworkContact | null;
  onSave: (contact: NetworkContact) => void;
  onDelete?: (id: string) => void;
}

interface FormProps {
  contact?: NetworkContact | null;
  onClose: () => void;
  onSave: (contact: NetworkContact) => void;
  onDelete?: (id: string) => void;
}

function ContactForm({ contact, onClose, onSave, onDelete }: FormProps) {
  const isEditing = Boolean(contact);
  const [fullName, setFullName] = useState(contact?.fullName || '');
  const [company, setCompany] = useState(contact?.company || '');
  const [position, setPosition] = useState(contact?.position || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [linkedInUrl, setLinkedInUrl] = useState(contact?.linkedInUrl || '');
  const [notes, setNotes] = useState(contact?.notes || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Contact name is required.');
      return;
    }

    const updatedContact: NetworkContact = {
      id: contact?.id || `contact-manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      fullName: fullName.trim(),
      firstName: contact?.firstName,
      lastName: contact?.lastName,
      company: company.trim() || undefined,
      position: position.trim() || undefined,
      email: email.trim() || undefined,
      linkedInUrl: linkedInUrl.trim() || undefined,
      connectedOn: contact?.connectedOn,
      notes: notes.trim() || undefined,
      source: contact?.source || 'manual',
      importedAt: contact?.importedAt || new Date().toISOString(),
    };

    onSave(updatedContact);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          {isEditing ? 'Edit Contact' : 'Add Professional Contact'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="p-6 space-y-4 text-xs">
        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Sarah Chen"
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. ServiceNow"
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Position / Title
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Director of AI"
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Context & Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Team relationship context, referral notes, or discussion points..."
            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
        <div>
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(contact!.id);
                onClose();
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors"
            >
              Delete Contact
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-3 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            {isEditing ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ContactModal({ isOpen, onClose, contact, onSave, onDelete }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <ContactForm
          key={contact?.id ?? 'create-new-contact'}
          contact={contact}
          onClose={onClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
