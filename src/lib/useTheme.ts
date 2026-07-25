'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { ThemeMode } from '@/types/opportunity';
import {
  EffectiveTheme,
  resolveEffectiveTheme,
  applyRootThemeClass,
  isValidThemeMode,
} from '@/lib/theme';
import { getUISettings, saveUISettings, subscribeToStorage } from '@/lib/storage';

export interface UseThemeReturn {
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
  mounted: boolean;
}

const emptySubscribe = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

export function useTheme(): UseThemeReturn {
  // Native React 19 pattern: useSyncExternalStore guarantees identical SSR & initial hydration renders
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientMounted,
    getServerMounted
  );

  const [themeMode, setLocalThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const settings = getUISettings();
    return isValidThemeMode(settings.themeMode) ? settings.themeMode : 'system';
  });

  // Sync state when external storage changes (e.g. reset demo data or other tabs)
  useEffect(() => {
    const syncFromStorage = () => {
      const settings = getUISettings();
      const storedMode = isValidThemeMode(settings.themeMode)
        ? settings.themeMode
        : 'system';
      setLocalThemeMode(storedMode);
    };

    return subscribeToStorage(syncFromStorage);
  }, []);

  // Derived effective theme during render
  const effectiveTheme = resolveEffectiveTheme(themeMode);

  // Apply root element class/data/color-scheme attributes and listen to system preference
  useEffect(() => {
    applyRootThemeClass(effectiveTheme);

    // matchMedia listener ONLY applies when mode is 'system'
    if (themeMode === 'system' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = () => {
        applyRootThemeClass(resolveEffectiveTheme('system'));
      };

      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, [themeMode, effectiveTheme]);

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    if (!isValidThemeMode(newMode)) return;
    setLocalThemeMode(newMode);
    const resolved = resolveEffectiveTheme(newMode);
    applyRootThemeClass(resolved);
    saveUISettings({ themeMode: newMode });
  }, []);

  return {
    themeMode,
    effectiveTheme,
    setThemeMode,
    mounted,
  };
}
