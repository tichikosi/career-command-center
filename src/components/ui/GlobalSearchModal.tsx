'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOpportunities } from '@/lib/useOpportunities';
import { buildSearchIndex, searchGlobalIndex, SearchGroup, SearchIndexItem } from '@/lib/search';
import { IconSearch, IconClose, IconArrowRight } from '@/components/icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GROUP_LABELS: Record<SearchGroup, string> = {
  opportunity: 'Opportunities',
  analysis: 'Analysis Reports & Evidence',
  profile: 'Candidate Profile',
  navigation: 'Application Pages',
};

export function GlobalSearchModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const opportunities = useOpportunities();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Render-time state adjustment when query changes (replaces useEffect setSelectedIndex)
  const [prevQuery, setPrevQuery] = useState(query);
  if (prevQuery !== query) {
    setPrevQuery(query);
    setSelectedIndex(0);
  }

  // Render-time state adjustment when modal closes (replaces useEffect setQuery/setSelectedIndex)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  // Build search index reactively from current opportunities
  const index = useMemo(() => buildSearchIndex(opportunities), [opportunities]);

  // Perform search query
  const results = useMemo(() => searchGlobalIndex(query, index), [query, index]);

  // Manage focus, body scroll, and focus restoration
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard navigation inside search modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % results.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (results.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && results[selectedIndex]) {
          const target = results[selectedIndex];
          router.push(target.href);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  // Ensure active highlighted item is visible in scroll container
  useEffect(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLElement>('[data-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group results for structured display
  const groupedResults = results.reduce<Record<SearchGroup, SearchIndexItem[]>>(
    (acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    },
    { opportunity: [], analysis: [], profile: [], navigation: [] }
  );

  const groupKeys: SearchGroup[] = ['opportunity', 'analysis', 'profile', 'navigation'];

  let globalItemCounter = 0;

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label="Global Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        ref={containerRef}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <IconSearch className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, title, stage, notes, or profile evidence..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              aria-label="Clear query"
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              Type to search opportunities, analysis reports, evidence citations, or navigation pages.
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                No results matching &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Try searching for a company name, job title, stage (e.g. Interviewing), or requirement.
              </p>
            </div>
          ) : (
            groupKeys.map((group) => {
              const groupItems = groupedResults[group];
              if (!groupItems || groupItems.length === 0) return null;

              return (
                <div key={group} className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                    {GROUP_LABELS[group]}
                  </p>
                  <div className="space-y-1">
                    {groupItems.map((item) => {
                      const itemIndex = globalItemCounter++;
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          data-selected={isSelected ? 'true' : 'false'}
                          onClick={() => {
                            router.push(item.href);
                            onClose();
                          }}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                  item.badge === 'Archived'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <p className="text-slate-500 dark:text-slate-400 line-clamp-1">
                                {item.subtitle}
                              </p>
                            )}
                          </div>

                          <IconArrowRight className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'
                          }`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Keyboard Legend */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-600 dark:text-slate-300">↑↓</strong> Navigate</span>
            <span><strong className="text-slate-600 dark:text-slate-300">↵</strong> Select</span>
            <span><strong className="text-slate-600 dark:text-slate-300">ESC</strong> Close</span>
          </div>
          <span>Local In-Memory Search</span>
        </div>
      </div>
    </div>
  );
}
