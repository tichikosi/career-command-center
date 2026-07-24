'use client';

import React from 'react';
import { SyntheticDisclaimerBanner } from '@/components/ui/Notice';
import { IconMenu } from '@/components/icons';

interface HeaderProps {
  onOpenMobileNav?: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <SyntheticDisclaimerBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Open mobile menu"
          >
            <IconMenu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs tracking-wider">
              CCC
            </span>
            <span className="font-semibold text-slate-900 tracking-tight text-base sm:text-lg">
              Career Command Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Candidate: <strong>Alex Vance</strong> (Director Level)</span>
          </div>
        </div>
      </div>
    </header>
  );
}
