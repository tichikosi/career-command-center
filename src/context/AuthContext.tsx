'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { UserProfile, AuthSession, MigrationSummary } from '@/types/auth';
import { getSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { inspectLocalData, migrateLocalDataToCloud } from '@/lib/storage/migrationService';
import { getActiveStorageAdapter } from '@/lib/storage/repositoryManager';

interface AuthContextType {
  user: UserProfile | null;
  session: AuthSession | null;
  isLoading: boolean;
  isCloudConnected: boolean;
  migrationPending: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  runMigration: () => Promise<MigrationSummary>;
  dismissMigration: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isCloudConnected] = useState(() => isSupabaseConfigured());
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (!isSupabaseConfigured()) {
      return {
        id: 'local-executive-user',
        email: 'local@executive.ai',
        fullName: 'Local Executive',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  });
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(isSupabaseConfigured() && getSupabaseClient()));
  const [migrationPending, setMigrationPending] = useState(false);

  const checkMigrationEligibility = useCallback((authenticatedUser: UserProfile) => {
    const local = inspectLocalData();
    if (local.hasLocalData) {
      // Check if user already completed migration via localStorage flag
      const completed = typeof window !== 'undefined' ? window.localStorage.getItem(`ccc_migrated_${authenticatedUser.id}`) : null;
      if (!completed) {
        setMigrationPending(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isCloudConnected) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        const profile: UserProfile = {
          id: currentSession.user.id,
          email: currentSession.user.email || '',
          fullName: currentSession.user.user_metadata?.full_name,
          avatarUrl: currentSession.user.user_metadata?.avatar_url,
          createdAt: currentSession.user.created_at,
          updatedAt: currentSession.user.updated_at || currentSession.user.created_at,
        };
        setUser(profile);
        setSession({
          user: profile,
          accessToken: currentSession.access_token,
          expiresAt: currentSession.expires_at,
        });
        checkMigrationEligibility(profile);
      } else {
        setUser(null);
        setSession(null);
      }
      setIsLoading(false);
    });

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.user) {
        const profile: UserProfile = {
          id: newSession.user.id,
          email: newSession.user.email || '',
          fullName: newSession.user.user_metadata?.full_name,
          avatarUrl: newSession.user.user_metadata?.avatar_url,
          createdAt: newSession.user.created_at,
          updatedAt: newSession.user.updated_at || newSession.user.created_at,
        };
        setUser(profile);
        setSession({
          user: profile,
          accessToken: newSession.access_token,
          expiresAt: newSession.expires_at,
        });
        checkMigrationEligibility(profile);
      } else {
        setUser(null);
        setSession(null);
        setMigrationPending(false);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isCloudConnected, checkMigrationEligibility]);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: 'Cloud authentication is currently running in local offline mode.' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: 'Cloud authentication is currently running in local offline mode.' };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return {};
  };

  const signOut = async (): Promise<void> => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setMigrationPending(false);
  };

  const runMigration = async (): Promise<MigrationSummary> => {
    if (!user) {
      throw new Error('User must be signed in to perform cloud data migration.');
    }

    const adapter = getActiveStorageAdapter();
    const summary = await migrateLocalDataToCloud(adapter, user.id);

    if (summary.status === 'success' || summary.status === 'partial') {
      window.localStorage.setItem(`ccc_migrated_${user.id}`, 'true');
      setMigrationPending(false);
    }

    return summary;
  };

  const dismissMigration = () => {
    if (user) {
      window.localStorage.setItem(`ccc_migrated_${user.id}`, 'dismissed');
    }
    setMigrationPending(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isCloudConnected,
        migrationPending,
        signIn,
        signUp,
        signOut,
        runMigration,
        dismissMigration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
