'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconAnalyze,
  IconPipeline,
  IconProfile,
  IconAbout,
  IconClose,
} from '@/components/icons';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: IconDashboard },
  { label: 'Analyze a Role', href: '/analyze', icon: IconAnalyze },
  { label: 'Opportunities', href: '/opportunities', icon: IconPipeline },
  { label: 'Candidate Profile', href: '/profile', icon: IconProfile },
  { label: 'About the Project', href: '/about', icon: IconAbout },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-slate-900/50 backdrop-blur-xs flex">
      <div className="bg-white w-72 max-w-[80vw] h-full p-6 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
              CCC
            </span>
            <span className="font-semibold text-slate-900 text-base">
              Career Command
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <IconClose className="w-6 h-6" />
          </button>
        </div>

        <nav className="space-y-1 mt-6">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100 text-xs text-slate-500">
          <p className="font-medium text-slate-800">Alex Vance Profile Active</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Version 1 — Synthetic Demo
          </p>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
