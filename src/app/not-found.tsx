import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { IconArrowRight, IconHelpCircle } from '@/components/icons';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
          <IconHelpCircle className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">404 — Page Not Found</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          The requested route or opportunity analysis report does not exist or has been removed from local storage.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-lg shadow-xs transition-colors"
          >
            <span>Return to Executive Dashboard</span>
            <IconArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
