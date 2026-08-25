'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { StorageWarningNotice } from '@/components/ui/Notice';
import { GlobalSearchModal } from '@/components/ui/GlobalSearchModal';
import { LocalCloudMigrationModal } from '@/components/LocalCloudMigrationModal';
import { AuthProvider } from '@/context/AuthContext';
import { isLocalStorageAvailable } from '@/lib/storage';

const emptySubscribe = () => () => {};
const getStorageSnapshot = () => !isLocalStorageAvailable();
const getStorageServerSnapshot = () => false;

function AppShellContent({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Native React 19 pattern: useSyncExternalStore guarantees identical SSR & initial hydration trees
  const hasStorageWarning = useSyncExternalStore(
    emptySubscribe,
    getStorageSnapshot,
    getStorageServerSnapshot
  );

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl) {
          const tagName = activeEl.tagName.toUpperCase();
          const isEditable =
            activeEl.isContentEditable ||
            tagName === 'INPUT' ||
            tagName === 'TEXTAREA' ||
            tagName === 'SELECT';

          // If user is typing in a normal form input, ignore shortcut unless search modal is already open
          if (isEditable && !isSearchOpen) {
            return;
          }
        }

        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-slate-800 dark:selection:text-slate-100 transition-colors">
      <LocalCloudMigrationModal />
      <Header
        onOpenMobileNav={() => setMobileNavOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
      />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

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

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  );
}
