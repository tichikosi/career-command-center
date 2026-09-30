import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Career Command Center — Voice Interview Intelligence & Executive CRM',
  description:
    'Executive-grade career operating system combining voice interview delivery metrics, grounded brief preparation, recruiter timeline tracking, and AI opportunity evaluation.',
  openGraph: {
    title: 'Career Command Center — Voice Interview Intelligence & Executive CRM',
    description:
      'Executive-grade career operating system combining voice interview delivery metrics, grounded brief preparation, recruiter timeline tracking, and AI opportunity evaluation.',
    type: 'website',
    siteName: 'Career Command Center',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
        {/*
          beforeInteractive scripts must live inside <body> (not <head>) in the
          App Router root layout per Next.js 16 docs. Using src= avoids the
          "script tag while rendering" warning caused by inline dangerouslySetInnerHTML.
        */}
        <Script
          id="theme-init"
          src="/theme-init.js"
          strategy="beforeInteractive"
        />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
