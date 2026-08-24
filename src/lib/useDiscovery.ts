'use client';

import { useSyncExternalStore } from 'react';
import {
  subscribeToDiscovery,
  getDiscoveredJobs,
  getDiscoveryHistory,
  getInitialDiscoveryJobsServerSnapshot,
  getInitialDiscoveryHistoryServerSnapshot,
  saveDiscoveredJobs,
  updateDiscoveredJobStatus,
  recordDiscoveryRun,
  promoteDiscoveredJobToOpportunity,
} from './discoveryStorage';

export function useDiscovery() {
  const jobs = useSyncExternalStore(
    subscribeToDiscovery,
    getDiscoveredJobs,
    getInitialDiscoveryJobsServerSnapshot
  );

  const history = useSyncExternalStore(
    subscribeToDiscovery,
    getDiscoveryHistory,
    getInitialDiscoveryHistoryServerSnapshot
  );

  return {
    jobs,
    history,
    saveJobs: saveDiscoveredJobs,
    updateStatus: updateDiscoveredJobStatus,
    recordRun: recordDiscoveryRun,
    promoteToOpportunity: promoteDiscoveredJobToOpportunity,
  };
}
