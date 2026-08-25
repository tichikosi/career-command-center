'use client';

import React from 'react';
import Link from 'next/link';
import { SyntheticDisclaimerBanner } from '@/components/ui/Notice';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { IconMenu, IconSearch, IconShield } from '@/components/icons';
import { useCandidateProfile } from '@/lib/useCandidate';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onOpenMobileNav?: () => void;
  onOpenSearch?: () => void;
}

export function Header({ onOpenMobileNav, onOpenSearch }: HeaderProps) {
  const { profile, mounted, isSynthetic } = useCandidateProfile();
  const { user, isCloudConnected } = useAuth();

  const isProfileEmpty = profile.dataMode === 'user' && !profile.name && profile.careerHistory.length === 0;

  const candidateDisplayName = !mounted
    ? null
    : isSynthetic
    ? profile.name || 'Alex Vance'
    : profile.name
    ? profile.name
    : 'No Active Candidate';

  const isAuthenticated = Boolean(user && user.email !== 'local@executive.ai');

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      {!isAuthenticated && isSynthetic && <SyntheticDisclaimerBanner />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open mobile menu"
          >
            <IconMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold flex items-center justify-center text-xs tracking-wider">
              CCC
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-tight text-base sm:text-lg">
              Career Command Center
            </span>
          </div>
        </div>

        {/* Global Search & Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Desktop Global Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Open Global Search"
          >
            <IconSearch className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-600 dark:text-slate-300">Search opportunities & profile...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
              ⌘K
            </kbd>
          </button>

          {/* Mobile Search Icon Button */}
          <button
            onClick={onOpenSearch}
            className="sm:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open Global Search"
          >
            <IconSearch className="w-5 h-5" />
          </button>

          {/* Theme Selector */}
          <ThemeSelector />

          {/* Cloud Auth Status Link */}
          <Link
            href="/login"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
              user && user.email !== 'local@executive.ai'
                ? 'bg-indigo-950/70 dark:bg-indigo-950/70 text-indigo-300 border-indigo-700 hover:bg-indigo-900/80'
                : isCloudConnected
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
            title={user?.email || 'Cloud Session'}
          >
            <IconShield className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {user && user.email !== 'local@executive.ai'
                ? user.fullName || user.email.split('@')[0]
                : 'Cloud Sync'}
            </span>
          </Link>

          {/* Dynamic Candidate Identity Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
            {!mounted ? (
              <span className="w-24 h-3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse"></span>
            ) : (
              <>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isProfileEmpty
                      ? 'bg-slate-400'
                      : isSynthetic
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                  }`}
                ></span>
                <span>{candidateDisplayName}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
