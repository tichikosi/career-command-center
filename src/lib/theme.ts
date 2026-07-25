import { ThemeMode } from '@/types/opportunity';

export type EffectiveTheme = 'light' | 'dark';

/**
 * Type guard for ThemeMode values.
 */
export function isValidThemeMode(mode: unknown): mode is ThemeMode {
  return mode === 'light' || mode === 'dark' || mode === 'system';
}

/**
 * Returns the current system/OS color scheme preference.
 * Safe for SSR (returns 'light' if window is undefined).
 */
export function getSystemThemePreference(): EffectiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolves a ThemeMode setting ('light' | 'dark' | 'system') into an concrete EffectiveTheme ('light' | 'dark').
 */
export function resolveEffectiveTheme(mode: ThemeMode): EffectiveTheme {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return getSystemThemePreference();
}

/**
 * Applies or removes the `.dark` CSS class on document.documentElement.
 * Safe for SSR (no-op if window/document is undefined).
 */
export function applyRootThemeClass(effective: EffectiveTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
