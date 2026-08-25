'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconDashboard,
  IconAnalyze,
  IconCompass,
  IconPipeline,
  IconNetwork,
  IconProfile,
  IconAbout,
  IconShield,
} from '@/components/icons';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: IconDashboard },
  { label: 'Analyze a Role', href: '/analyze', icon: IconAnalyze },
  { label: 'Discover Roles', href: '/discover', icon: IconCompass },
  { label: 'Opportunities', href: '/opportunities', icon: IconPipeline },
  { label: 'Network', href: '/network', icon: IconNetwork },
  { label: 'Candidate Profile', href: '/profile', icon: IconProfile },
  { label: 'Cloud & Account', href: '/login', icon: IconShield },
  { label: 'About the Project', href: '/about', icon: IconAbout },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 min-h-[calc(100vh-5rem)] p-4 shrink-0 transition-colors">
      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
        Navigation
      </div>
      <nav className="space-y-1">
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-200/80 dark:border-slate-800 px-3 text-xs text-slate-500 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">Career Command Center</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Version 3.3 (Interview Intelligence)</p>
      </div>
    </aside>
  );
}
