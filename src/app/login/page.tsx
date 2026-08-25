'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { IconShield, IconSparkles } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const { user, isCloudConnected, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMessage(error);
        } else {
          router.push('/discover');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setErrorMessage(error);
        } else {
          setSuccessMessage('Account created! Please check your email or sign in.');
          setMode('signin');
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800">
            <IconSparkles className="w-3.5 h-3.5" />
            <span>Career Command Center v3.2 Cloud</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {user && user.email !== 'local@executive.ai' ? 'Executive Cloud Session' : 'Sign In to Your Workspace'}
          </h1>
          <p className="text-xs text-slate-400">
            {isCloudConnected
              ? 'Multi-device synchronization, secure cloud persistence, and scheduled discovery.'
              : 'Running in Local-First Browser Mode (Supabase offline). All data is saved in your local browser storage.'}
          </p>
        </div>

        {/* Authenticated State Display */}
        {user && user.email !== 'local@executive.ai' ? (
          <Card className="p-6 space-y-4 border-slate-800 bg-slate-900/90 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                {user.fullName ? user.fullName[0] : user.email[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{user.fullName || 'Executive User'}</div>
                <div className="text-xs text-slate-400">{user.email}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={() => router.push('/discover')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-colors"
              >
                Go to Discovery Workspace
              </button>
              <button
                onClick={() => signOut()}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </Card>
        ) : (
          /* Auth Form */
          <Card className="p-6 space-y-5 border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`py-1.5 text-xs font-bold rounded-md transition-colors ${
                  mode === 'signin'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`py-1.5 text-xs font-bold rounded-md transition-colors ${
                  mode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
                <span>✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanaka Ian Chikosi"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="executive@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <span>{mode === 'signin' ? 'Sign In to Cloud' : 'Create Cloud Account'}</span>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-800/80 text-center">
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <IconShield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted credentials & isolated PostgreSQL RLS</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
