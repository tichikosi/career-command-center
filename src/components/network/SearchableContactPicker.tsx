'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NetworkContact } from '@/types/network';
import { IconUsers, IconSearch, IconX, IconCheckCircle } from '@/components/icons';

interface SearchableContactPickerProps {
  contacts: NetworkContact[];
  matchingContacts?: NetworkContact[];
  selectedContactId?: string;
  selectedContactName?: string;
  onSelectContact: (contact: NetworkContact | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchableContactPicker({
  contacts = [],
  matchingContacts = [],
  selectedContactId,
  selectedContactName,
  onSelectContact,
  placeholder = 'Search contact by name, company, or title...',
  label = 'Linked Network Contact',
  className = '',
}: SearchableContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Selected contact lookup
  const selectedContact = useMemo(() => {
    if (!selectedContactId) return null;
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  // Filtered contacts calculation
  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // When query is empty, prioritize matching company contacts, then first 25 network contacts
      const companyMap = new Map<string, NetworkContact>();
      for (const c of matchingContacts) {
        companyMap.set(c.id, c);
      }
      const others = contacts.filter((c) => !companyMap.has(c.id)).slice(0, 25);
      return [...matchingContacts, ...others];
    }

    const matches: NetworkContact[] = [];
    for (const c of contacts) {
      const nameMatch = (c.fullName || `${c.firstName} ${c.lastName}`).toLowerCase().includes(q);
      const companyMatch = (c.company || '').toLowerCase().includes(q);
      const positionMatch = (c.position || '').toLowerCase().includes(q);

      if (nameMatch || companyMatch || positionMatch) {
        matches.push(c);
        if (matches.length >= 30) break; // Limit to 30 for ultra-fast rendering
      }
    }
    return matches;
  }, [contacts, matchingContacts, query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (contact: NetworkContact | null) => {
    onSelectContact(contact);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredContacts.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredContacts.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0) {
        handleSelect(null);
      } else {
        const contact = filteredContacts[highlightedIndex - 1];
        if (contact) handleSelect(contact);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const displayName = selectedContact
    ? selectedContact.fullName
    : selectedContactName || null;

  return (
    <div className={`space-y-1 relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <IconUsers className="w-3.5 h-3.5 text-indigo-500" />
            <span>{label}</span>
          </span>
          {displayName && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="text-[11px] font-normal text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-0.5"
            >
              <IconX className="w-3 h-3" />
              <span>Clear Contact</span>
            </button>
          )}
        </label>
      )}

      {/* Trigger / Display Box */}
      <div
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 cursor-pointer flex items-center justify-between gap-2 focus-within:ring-2 focus-within:ring-indigo-500"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <IconSearch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent border-none outline-none text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
            />
          ) : displayName ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{displayName}</span>
              {selectedContact?.company && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  • {selectedContact.company}
                </span>
              )}
              {selectedContact?.position && (
                <span className="text-[11px] text-slate-400 truncate">
                  ({selectedContact.position})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">Select or search contact...</span>
          )}
        </div>

        {displayName && !isOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            aria-label="Clear selection"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Typeahead Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in-50 duration-100">
          {/* None / Clear Option */}
          <div
            className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
              highlightedIndex === 0
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-semibold'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
            onClick={() => handleSelect(null)}
          >
            <span>-- No Contact Linked (None) --</span>
            {!selectedContactId && <IconCheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
          </div>

          {/* Contact Results */}
          {filteredContacts.length === 0 ? (
            <div className="px-3 py-4 text-xs text-center text-slate-400">
              No network contacts found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredContacts.map((contact, idx) => {
              const isSelected = contact.id === selectedContactId;
              const isHighlighted = highlightedIndex === idx + 1;
              const isCompanyMatch = matchingContacts.some((m) => m.id === contact.id);

              return (
                <div
                  key={contact.id}
                  className={`px-3 py-2.5 text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/70 text-indigo-950 dark:text-indigo-100 font-bold'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                  onClick={() => handleSelect(contact)}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{contact.fullName}</span>
                      {isCompanyMatch && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                          Company Match
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                      {contact.position && <span>{contact.position}</span>}
                      {contact.position && contact.company && <span>•</span>}
                      {contact.company && <span className="font-medium text-slate-600 dark:text-slate-300">{contact.company}</span>}
                    </div>
                  </div>

                  {isSelected && (
                    <IconCheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
