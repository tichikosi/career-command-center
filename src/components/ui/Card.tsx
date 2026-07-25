import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors ${paddingStyles} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
