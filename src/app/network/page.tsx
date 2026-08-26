'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNetwork } from '@/lib/networkStorage';
import { getOpportunityById } from '@/lib/storage';
import { findMatchingContacts, rankMatchedContacts } from '@/lib/networkMatcher';
import { NetworkImportModal } from '@/components/network/NetworkImportModal';
import { ContactModal } from '@/components/network/ContactModal';
import { Card } from '@/components/ui/Card';
import {
  IconNetwork,
  IconSearch,
  IconUpload,
  IconExternalLink,
  IconEdit,
  IconArrowRight,
} from '@/components/icons';
import { JobOpportunity } from '@/types/opportunity';

type SortOption = 'relevance' | 'date-desc' | 'date-asc' | 'company-asc' | 'name-asc';

function NetworkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetContactId = searchParams.get('contactId') ?? undefined;
  const opportunityId = searchParams.get('opportunityId') ?? undefined;
  const companyParam = searchParams.get('company') ?? undefined;

  const {
    contacts,
    mounted,
    addContacts,
    updateContact,
    deleteContact,
    resetDemoData,
    clearContacts,
  } = useNetwork();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('All');
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Resolve selected contact strictly by stable ID
  const selectedContact = useMemo(
    () => (selectedContactId ? contacts.find((c) => c.id === selectedContactId) || null : null),
    [contacts, selectedContactId]
  );

  // Memoized company list
  const companies = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.company) set.add(c.company);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contacts]);

  // Resolve contextual opportunity if query param exists
  const targetOpportunity: JobOpportunity | null = useMemo(() => {
    if (!opportunityId) return null;
    return getOpportunityById(opportunityId) || null;
  }, [opportunityId]);

  const effectiveTargetCompany = targetOpportunity?.company || companyParam || (selectedCompany !== 'All' ? selectedCompany : undefined);
  const effectiveTargetTitle = targetOpportunity?.title;

  // Determine base contacts (filtered by opportunity / company if deep link present)
  const baseContacts = useMemo(() => {
    if (effectiveTargetCompany) {
      return findMatchingContacts(effectiveTargetCompany, contacts);
    }
    if (selectedCompany !== 'All') {
      return contacts.filter((c) => c.company === selectedCompany);
    }
    return contacts;
  }, [effectiveTargetCompany, selectedCompany, contacts]);

  // Filter by search query
  const searchFiltered = useMemo(() => {
    if (!searchTerm.trim()) return baseContacts;
    const term = searchTerm.toLowerCase();
    return baseContacts.filter((c) => {
      const text = `${c.fullName} ${c.company || ''} ${c.position || ''} ${c.email || ''} ${c.notes || ''}`.toLowerCase();
      return text.includes(term);
    });
  }, [baseContacts, searchTerm]);

  // Rank / Sort contacts
  const displayedRankedMatches = useMemo(() => {
    if (sortOption === 'relevance' && (effectiveTargetCompany || effectiveTargetTitle)) {
      return rankMatchedContacts(searchFiltered, effectiveTargetTitle, effectiveTargetCompany);
    }

    // Standard sorting
    const ranked = rankMatchedContacts(searchFiltered, effectiveTargetTitle, effectiveTargetCompany);
    return ranked.sort((a, b) => {
      if (sortOption === 'date-desc') {
        return (b.contact.connectedOn || '').localeCompare(a.contact.connectedOn || '');
      }
      if (sortOption === 'date-asc') {
        return (a.contact.connectedOn || '').localeCompare(b.contact.connectedOn || '');
      }
      if (sortOption === 'company-asc') {
        return (a.contact.company || '').localeCompare(b.contact.company || '');
      }
      if (sortOption === 'name-asc') {
        return a.contact.fullName.localeCompare(b.contact.fullName);
      }
      return b.relevanceScore - a.relevanceScore;
    });
  }, [searchFiltered, sortOption, effectiveTargetCompany, effectiveTargetTitle]);

  const clearOpportunityContext = () => {
    router.replace('/network');
  };

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse py-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <div className="h-4 bg-slate-800 rounded w-48"></div>
          <div className="h-8 bg-slate-800 rounded w-72"></div>
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="bg-slate-900 dark:bg-slate-900 border border-slate-800 text-white p-6 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase tracking-wider">
                Network Intelligence (V2.0)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <IconNetwork className="w-7 h-7 text-indigo-400" />
              Professional Network Directory
            </h1>
            <p className="text-xs text-slate-300">
              Imported connections, colleagues, and executive contacts for automated company matching.
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <IconUpload className="w-4 h-4" />
              <span>Import Connections (CSV/XLSX)</span>
            </button>
            <button
              onClick={() => {
                setSelectedContactId(null);
                setIsContactModalOpen(true);
              }}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors"
            >
              + Add Contact
            </button>
            <button
              onClick={resetDemoData}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl border border-slate-700 transition-colors"
            >
              Reset Demo
            </button>
            <button
              onClick={clearContacts}
              className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 text-xs font-semibold text-rose-300 rounded-xl border border-rose-800/60 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Contacts</span>
            <span className="text-base font-bold text-white">{contacts.length}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Unique Companies</span>
            <span className="text-base font-bold text-white">{companies.length}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Domain</span>
            <span className="text-base font-mono text-indigo-300">ccc_network_v1</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Privacy Architecture</span>
            <span className="text-base font-medium text-emerald-400">100% Local Browser</span>
          </div>
        </div>
      </div>

      {/* Contextual Opportunity Banner */}
      {(opportunityId || companyParam) && (
        <div className="bg-indigo-900/30 border border-indigo-500/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wide">
                Opportunity Filter
              </span>
              {targetOpportunity && (
                <Link
                  href={`/analysis/${targetOpportunity.id}`}
                  className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 hover:underline inline-flex items-center gap-1"
                >
                  <span>Return to Opportunity</span>
                  <IconArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            <h2 className="text-base font-bold text-white">
              {displayedRankedMatches.length} connection{displayedRankedMatches.length !== 1 ? 's' : ''} matched to {effectiveTargetCompany}
            </h2>
            {effectiveTargetTitle && (
              <p className="text-xs text-indigo-200/80">
                Showing connections ranked by executive seniority and domain relevance to <strong className="text-white">{effectiveTargetTitle}</strong>.
              </p>
            )}
          </div>

          <button
            onClick={() => {
              window.location.href = '/network';
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shrink-0 transition-colors shadow-xs"
          >
            View All Network Contacts
          </button>
        </div>
      )}

      {/* Filter & Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, company, position, or notes..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {/* Company Dropdown */}
          {!opportunityId && (
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Company:</span>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full sm:w-48 p-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                <option value="All">All Companies ({companies.length})</option>
                {companies.map((co) => (
                  <option key={co} value={co}>
                    {co}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Sort:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full sm:w-44 p-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="relevance">Relevance & Match</option>
              <option value="date-desc">Newest Connection</option>
              <option value="date-asc">Oldest Connection</option>
              <option value="company-asc">Company (A-Z)</option>
              <option value="name-asc">Contact Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Table / Grid */}
      {displayedRankedMatches.length === 0 ? (
        <Card padding="lg" className="text-center py-12 space-y-4">
          <IconNetwork className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Network Contacts Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {contacts.length === 0
                ? 'Upload your LinkedIn Connections export or add contacts to enable automated opportunity matching.'
                : 'No contacts match your current search and company filter criteria.'}
            </p>
          </div>
          {contacts.length === 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl shadow-xs"
              >
                Import Connections CSV
              </button>
              <button
                onClick={resetDemoData}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 rounded-xl"
              >
                Load Demo Network
              </button>
            </div>
          )}
          {(opportunityId || companyParam) && (
            <div className="pt-2">
              <button
                onClick={clearOpportunityContext}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 rounded-xl"
              >
                Clear Filter & View All Network Contacts
              </button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedRankedMatches.map(({ contact, matchReasons }) => {
            const isHighlighted = targetContactId === contact.id;

            return (
              <div
                key={contact.id}
                className={`bg-white dark:bg-slate-900 border rounded-xl p-5 space-y-3 transition-all ${
                  isHighlighted
                    ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {contact.fullName}
                      </h3>
                      {matchReasons[0] && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {matchReasons[0]}
                        </span>
                      )}
                    </div>
                    {contact.position && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                        {contact.position}
                      </p>
                    )}
                    {contact.company && (
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {contact.company}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      setIsContactModalOpen(true);
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 shrink-0"
                    title="Edit Contact"
                  >
                    <IconEdit className="w-4 h-4" />
                  </button>
                </div>

                {contact.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                    &ldquo;{contact.notes}&rdquo;
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  {contact.linkedInUrl ? (
                    <a
                      href={contact.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium text-[11px]"
                    >
                      <span>LinkedIn Profile</span>
                      <IconExternalLink className="w-3 h-3" />
                    </a>
                  ) : contact.email ? (
                    <span className="text-slate-500 font-mono text-[11px] truncate max-w-[180px]">
                      {contact.email}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Direct Connection</span>
                  )}

                  {contact.connectedOn && (
                    <span className="text-slate-400 text-[10px]">
                      Connected {contact.connectedOn}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <NetworkImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={(imported) => {
          addContacts(imported);
        }}
      />

      <ContactModal
        key={selectedContactId ?? 'create-new-contact'}
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setSelectedContactId(null);
        }}
        contact={selectedContact}
        onSave={(saved) => {
          if (selectedContactId) {
            updateContact(selectedContactId, saved);
          } else {
            addContacts([saved]);
          }
          setSelectedContactId(null);
        }}
        onDelete={(id) => {
          deleteContact(id);
          setSelectedContactId(null);
        }}
      />
    </div>
  );
}

export default function NetworkPage() {
  return (
    <Suspense fallback={null}>
      <NetworkContent />
    </Suspense>
  );
}
