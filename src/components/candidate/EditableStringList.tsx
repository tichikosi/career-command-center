import React, { useState } from 'react';
import { IconClose } from '@/components/icons';

interface Props {
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  maxItems?: number;
  maxItemLength?: number;
  placeholder?: string;
}

export function EditableStringList({
  label,
  description,
  items,
  onChange,
  maxItems = 20,
  maxItemLength = 80,
  placeholder = 'Add new item...',
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    setError(null);
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (trimmed.length > maxItemLength) {
      setError(`Item length cannot exceed ${maxItemLength} characters.`);
      return;
    }

    if (items.length >= maxItems) {
      setError(`Maximum limit of ${maxItems} items reached.`);
      return;
    }

    const isDuplicate = items.some(
      (existing) => existing.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      setError(`"${trimmed}" is already included in this list.`);
      return;
    }

    onChange([...items, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setInputValue('');
      setError(null);
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(items.filter((_, idx) => idx !== indexToRemove));
    setError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label} ({items.length}/{maxItems})
        </label>
      </div>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}

      {/* Chips List */}
      <div className="flex flex-wrap items-center gap-2 min-h-[32px] p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80">
        {items.length === 0 ? (
          <span className="text-xs italic text-slate-400 dark:text-slate-500 px-1">
            No items added yet.
          </span>
        ) : (
          items.map((item, idx) => (
            <span
              key={`${item}-${idx}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label={`Remove ${item}`}
                title={`Remove ${item}`}
                className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add Input */}
      {items.length < maxItems && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={maxItemLength}
            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            className="px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
