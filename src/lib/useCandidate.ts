import { useSyncExternalStore, useCallback } from 'react';
import { CandidateProfile } from '@/types/candidate';
import {
  getCandidateProfile,
  getInitialCandidateServerSnapshot,
  saveCandidateProfile,
  resetCandidateDemoData,
  clearCandidateData,
  exportCandidateData,
  subscribeToCandidateStorage,
} from '@/lib/storage';

export interface UseCandidateProfileReturn {
  profile: CandidateProfile;
  mounted: boolean;
  isSynthetic: boolean;
  isUserProvided: boolean;
  updateProfile: (profile: CandidateProfile) => void;
  resetCandidateDemoData: () => void;
  clearCandidateData: () => void;
  exportCandidateData: () => void;
}

const emptySubscribe = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

export function useCandidateProfile(): UseCandidateProfileReturn {
  const profile = useSyncExternalStore(
    subscribeToCandidateStorage,
    getCandidateProfile,
    getInitialCandidateServerSnapshot
  );

  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientMounted,
    getServerMounted
  );

  const handleUpdateProfile = useCallback((updated: CandidateProfile) => {
    saveCandidateProfile(updated);
  }, []);

  const handleResetCandidate = useCallback(() => {
    resetCandidateDemoData();
  }, []);

  const handleClearCandidate = useCallback(() => {
    clearCandidateData();
  }, []);

  const handleExportCandidate = useCallback(() => {
    exportCandidateData(profile);
  }, [profile]);

  return {
    profile,
    mounted,
    isSynthetic: profile.dataMode === 'synthetic',
    isUserProvided: profile.dataMode === 'user',
    updateProfile: handleUpdateProfile,
    resetCandidateDemoData: handleResetCandidate,
    clearCandidateData: handleClearCandidate,
    exportCandidateData: handleExportCandidate,
  };
}
