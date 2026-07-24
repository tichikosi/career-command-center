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
} from '@/components/icons';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: IconDashboard },
  { label: 'Analyze a Role', href: '/analyze', icon: IconAnalyze },
  { label: 'Opportunities', href: '/opportunities', icon: IconPipeline },
  { label: 'Candidate Profile', href: '/profile', icon: IconProfile },
  { label: 'About the Project', href: '/about', icon: IconAbout },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 bg-slate-50/50 min-h-[calc(100vh-5rem)] p-4 shrink-0">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
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
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-200/80 px-3 text-xs text-slate-500">
        <p className="font-medium text-slate-700">Career Command Center</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Version 1.0 (Public Demo)</p>
      </div>
    </aside>
  );
}
