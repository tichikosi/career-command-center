'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/lib/useTheme';
import { ThemeMode } from '@/types/opportunity';

export function ThemeSelector() {
  const { themeMode, setThemeMode, mounted } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const options: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: '☀️' },
    { mode: 'dark', label: 'Dark', icon: '🌙' },
    { mode: 'system', label: 'System', icon: '💻' },
  ];

  // During SSR and initial hydration, render a deterministic neutral state to avoid
  // icon mismatches. The pre-hydration script already applied the correct theme class.
  // After mount, display the actual persisted mode.
  const activeMode: ThemeMode = mounted ? themeMode : 'system';
  const activeOption = options.find((o) => o.mode === activeMode) ?? options[2];

  // During hydration, suppress the icon entirely to avoid emoji mismatch; show after mount.
  // We render the same button structure but with a blank icon placeholder pre-mount.
  const displayIcon = mounted ? activeOption.icon : '💻';
  const displayLabel = mounted ? activeOption.label : 'System';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select color theme"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors bg-white hover:bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
        suppressHydrationWarning
      >
        <span suppressHydrationWarning>{displayIcon}</span>
        <span className="capitalize hidden sm:inline" suppressHydrationWarning>{displayLabel}</span>
        <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg z-50 py-1 text-xs">
          {options.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => {
                setThemeMode(opt.mode);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between font-medium transition-colors ${
                activeMode === opt.mode
                  ? 'bg-slate-100 text-slate-900 font-bold dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </span>
              {activeMode === opt.mode && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
