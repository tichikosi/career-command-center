'use client';

import React, { useSyncExternalStore } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { StorageWarningNotice } from '@/components/ui/Notice';
import { isLocalStorageAvailable } from '@/lib/storage';

const emptySubscribe = () => () => {};
const getStorageSnapshot = () => !isLocalStorageAvailable();
const getStorageServerSnapshot = () => false; // Neutral false state during SSR & initial hydration

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Native React 19 pattern: useSyncExternalStore guarantees identical SSR & initial hydration trees
  const hasStorageWarning = useSyncExternalStore(
    emptySubscribe,
    getStorageSnapshot,
    getStorageServerSnapshot
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 max-w-full">
          {hasStorageWarning && <StorageWarningNotice />}
          {children}
        </main>
      </div>
    </div>
  );
}
