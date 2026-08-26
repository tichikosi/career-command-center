'use client';

import React, { useEffect } from 'react';
import { IconClose } from '@/components/icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  maxWidth?: string;
  children?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  maxWidth = 'max-w-md',
  children,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4">
      <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-xl ${maxWidth} w-full p-6 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg p-1 transition-colors"
            aria-label="Close modal"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{description}</p>
        )}
        
        {children && (
          <div className={description ? 'mt-4' : 'mt-3'}>
            {children}
          </div>
        )}

        {onConfirm && (
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-xs transition-colors ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'
              }`}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
