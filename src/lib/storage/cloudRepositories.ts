import { SupabaseClient } from '@supabase/supabase-js';
import {
  ICandidateRepository,
  IOpportunityRepository,
  INetworkRepository,
  IDiscoveryRepository,
  IPreferencesRepository,
  IStorageAdapter,
} from './interfaces';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity, PipelineStage, OpportunityAction, FitAnalysisReport } from '@/types/opportunity';
import { NetworkContact } from '@/types/network';
import { DiscoveredJob, DiscoveredJobStatus, DiscoveryHistoryItem } from '@/types/discovery';
import { UserPreferences } from '@/types/auth';

/**
 * Cloud Candidate Repository using Supabase PostgreSQL.
 */
export class CloudCandidateRepository implements ICandidateRepository {
  constructor(private supabase: SupabaseClient) {}

  async getProfile(userId?: string): Promise<CandidateProfile> {
    let query = this.supabase.from('candidate_profiles').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return {
        id: `cand-${userId || 'default'}`,
        name: '',
        headline: '',
        location: '',
        summary: '',
        targetRoles: [],
        targetIndustries: [],
        preferredLocations: [],
        coreCompetencies: [],
        careerHistory: [],
        education: [],
        certifications: [],
        evidenceItems: [],
        sources: [],
        updatedAt: new Date().toISOString(),
        dataMode: 'user',
      };
    }

    return {
      id: data.id,
      name: data.name,
      headline: data.headline || '',
      location: data.location || '',
      summary: data.summary || '',
      targetRoles: data.target_roles || [],
      targetIndustries: data.target_industries || [],
      preferredLocations: data.preferred_locations || [],
      coreCompetencies: data.core_competencies || [],
      careerHistory: data.career_history || [],
      education: data.education || [],
      certifications: data.certifications || [],
      evidenceItems: data.evidence_items || [],
      sources: data.sources || [],
      updatedAt: data.updated_at,
      dataMode: (data.data_mode as 'synthetic' | 'user') || 'user',
    };
  }

  async saveProfile(profile: CandidateProfile, userId?: string): Promise<CandidateProfile> {
    const payload: Record<string, unknown> = {
      id: profile.id,
      name: profile.name,
      headline: profile.headline,
      location: profile.location,
      summary: profile.summary,
      target_roles: profile.targetRoles,
      target_industries: profile.targetIndustries,
      preferred_locations: profile.preferredLocations,
      core_competencies: profile.coreCompetencies,
      career_history: profile.careerHistory,
      education: profile.education,
      certifications: profile.certifications,
      evidence_items: profile.evidenceItems,
      sources: profile.sources,
      data_mode: profile.dataMode,
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      payload.user_id = userId;
    }

    await this.supabase.from('candidate_profiles').upsert(payload);
    return profile;
  }

  async resetDemoData(userId?: string): Promise<void> {
    if (userId) {
      await this.supabase.from('candidate_profiles').delete().eq('user_id', userId);
    }
  }

  async clearData(userId?: string): Promise<void> {
    if (userId) {
      await this.supabase.from('candidate_profiles').delete().eq('user_id', userId);
    }
  }
}

/**
 * Cloud Opportunity Repository using Supabase PostgreSQL.
 */
export class CloudOpportunityRepository implements IOpportunityRepository {
  constructor(private supabase: SupabaseClient) {}

  private mapRowToOpportunity(d: Record<string, unknown>): JobOpportunity {
    const defaultAnalysis: FitAnalysisReport = {
      overallFitScore: (d.discovery_relevance_score as number) || 70,
      scoreExplanation: 'Role imported into pipeline.',
      recommendation: 'Monitor',
      executiveSummary: (d.notes as string) || `${d.title} at ${d.company}`,
      likelyMandate: 'Executive Strategy & Operations Leadership',
      keyRequirements: [],
      positioningNarrative: '',
      qualifications: [],
      objections: [],
      recruiterQuestions: [],
      hiringManagerQuestions: [],
      recommendedStarStories: [],
      nextActions: [],
    };

    return {
      id: d.id as string,
      company: d.company as string,
      title: d.title as string,
      location: (d.location as string) || '',
      compensation: d.compensation as string | undefined,
      sourceUrl: d.source_url as string | undefined,
      applicationUrl: d.application_url as string | undefined,
      rawJobDescription: (d.raw_job_description as string) || '',
      stage: ((d.stage as string) || 'Identified') as PipelineStage,
      priority: ((d.priority as string) || 'Medium') as 'High' | 'Medium' | 'Low',
      notes: (d.notes as string) || '',
      verificationStatus: d.verification_status as JobOpportunity['verificationStatus'],
      verifiedAt: d.verified_at as string | undefined,
      sourceDomain: d.source_domain as string | undefined,
      analysis: (d.analysis_report || d.analysis || defaultAnalysis) as FitAnalysisReport,
      actions: (d.actions || []) as OpportunityAction[],
      createdAt: (d.created_at as string) || new Date().toISOString(),
      updatedAt: (d.updated_at as string) || new Date().toISOString(),
    };
  }

  async getAll(userId?: string): Promise<JobOpportunity[]> {
    let query = this.supabase.from('opportunities').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((d: Record<string, unknown>) => this.mapRowToOpportunity(d));
  }

  async getById(id: string, userId?: string): Promise<JobOpportunity | undefined> {
    let query = this.supabase.from('opportunities').select('*').eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) return undefined;

    return this.mapRowToOpportunity(data);
  }

  async save(opp: JobOpportunity, userId?: string): Promise<JobOpportunity> {
    const payloadData: Record<string, unknown> = {
      id: opp.id,
      company: opp.company,
      title: opp.title,
      location: opp.location,
      compensation: opp.compensation,
      source_url: opp.sourceUrl,
      application_url: opp.applicationUrl,
      raw_job_description: opp.rawJobDescription,
      stage: opp.stage,
      priority: opp.priority,
      notes: opp.notes,
      verification_status: opp.verificationStatus,
      verified_at: opp.verifiedAt,
      source_domain: opp.sourceDomain,
      analysis_report: opp.analysis,
      actions: opp.actions,
      updated_at: new Date().toISOString(),
    };
    if (userId) {
      payloadData.user_id = userId;
    }
    await this.supabase.from('opportunities').upsert(payloadData);
    return opp;
  }

  async create(payload: Partial<JobOpportunity>, userId?: string): Promise<JobOpportunity> {
    const defaultAnalysis: FitAnalysisReport = {
      overallFitScore: 70,
      scoreExplanation: 'Initial role alignment analysis',
      recommendation: 'Monitor',
      executiveSummary: payload.notes || `${payload.title || 'Role'} at ${payload.company || 'Company'}`,
      likelyMandate: 'Executive Strategy & Operations',
      keyRequirements: [],
      positioningNarrative: '',
      qualifications: [],
      objections: [],
      recruiterQuestions: [],
      hiringManagerQuestions: [],
      recommendedStarStories: [],
      nextActions: [],
    };

    const newOpp: JobOpportunity = {
      id: payload.id || `opp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      company: payload.company || 'Unknown Company',
      title: payload.title || 'Untitled Opportunity',
      location: payload.location || '',
      compensation: payload.compensation,
      sourceUrl: payload.sourceUrl,
      applicationUrl: payload.applicationUrl,
      rawJobDescription: payload.rawJobDescription || '',
      stage: payload.stage || 'Identified',
      priority: payload.priority || 'Medium',
      notes: payload.notes || '',
      verificationStatus: payload.verificationStatus,
      verifiedAt: payload.verifiedAt,
      sourceDomain: payload.sourceDomain,
      analysis: payload.analysis || defaultAnalysis,
      actions: payload.actions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.save(newOpp, userId);
  }

  async updateStage(id: string, stage: PipelineStage, userId?: string): Promise<JobOpportunity> {
    const existing = await this.getById(id, userId);
    if (!existing) throw new Error(`Opportunity ${id} not found.`);
    existing.stage = stage;
    existing.updatedAt = new Date().toISOString();
    return this.save(existing, userId);
  }

  async delete(id: string, userId?: string): Promise<void> {
    let query = this.supabase.from('opportunities').delete().eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }
    await query;
  }

  async saveAction(opportunityId: string, action: OpportunityAction, userId?: string): Promise<void> {
    const payload: Record<string, unknown> = {
      id: action.id,
      opportunity_id: opportunityId,
      text: action.text,
      source: action.source,
      stage: action.stage,
      completed: action.completed,
      completed_at: action.completedAt,
      created_at: action.createdAt || new Date().toISOString(),
    };
    if (userId) payload.user_id = userId;
    await this.supabase.from('opportunity_actions').upsert(payload);
  }
}

/**
 * Cloud Network Repository using Supabase PostgreSQL (3,400+ Contact scale).
 */
export class CloudNetworkRepository implements INetworkRepository {
  constructor(private supabase: SupabaseClient) {}

  async getContacts(userId?: string): Promise<NetworkContact[]> {
    let query = this.supabase.from('network_contacts').select('*').order('created_at', { ascending: false });
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((c) => ({
      id: c.id,
      fullName: c.full_name || c.name || 'Unknown Contact',
      firstName: c.first_name,
      lastName: c.last_name,
      company: c.company || '',
      position: c.position || '',
      email: c.email || '',
      linkedInUrl: c.linkedin_url || '',
      connectedOn: (c.connected_on as string) || (c.connection_date as string) || '',
      source: ((c.source as string) as NetworkContact['source']) || 'manual',
      importedAt: (c.imported_at as string) || (c.created_at as string) || new Date().toISOString(),
      notes: c.notes || '',
    }));
  }

  async addContacts(contacts: NetworkContact[], userId?: string): Promise<NetworkContact[]> {
    if (contacts.length === 0) return [];

    // Batch in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < contacts.length; i += chunkSize) {
      const chunk = contacts.slice(i, i + chunkSize).map((c) => {
        const row: Record<string, unknown> = {
          id: c.id,
          full_name: c.fullName,
          first_name: c.firstName,
          last_name: c.lastName,
          company: c.company,
          position: c.position,
          email: c.email,
          linkedin_url: c.linkedInUrl,
          connected_on: c.connectedOn,
          source: c.source,
          imported_at: c.importedAt,
          notes: c.notes,
          updated_at: new Date().toISOString(),
        };
        if (userId) row.user_id = userId;
        return row;
      });

      await this.supabase.from('network_contacts').upsert(chunk);
    }

    return contacts;
  }

  async updateContact(id: string, updates: Partial<NetworkContact>, userId?: string): Promise<NetworkContact | null> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.firstName !== undefined) payload.first_name = updates.firstName;
    if (updates.lastName !== undefined) payload.last_name = updates.lastName;
    if (updates.company !== undefined) payload.company = updates.company;
    if (updates.position !== undefined) payload.position = updates.position;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.linkedInUrl !== undefined) payload.linkedin_url = updates.linkedInUrl;
    if (updates.connectedOn !== undefined) payload.connected_on = updates.connectedOn;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    let query = this.supabase.from('network_contacts').update(payload).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data } = await query.select('*').maybeSingle();
    if (!data) return null;

    return {
      id: data.id,
      fullName: data.full_name || data.name || '',
      firstName: data.first_name,
      lastName: data.last_name,
      company: data.company || '',
      position: data.position || '',
      email: data.email || '',
      linkedInUrl: data.linkedin_url || '',
      connectedOn: data.connected_on || '',
      source: ((data.source as string) as NetworkContact['source']) || 'manual',
      importedAt: data.imported_at || data.created_at || new Date().toISOString(),
      notes: data.notes || '',
    };
  }

  async deleteContact(id: string, userId?: string): Promise<void> {
    let query = this.supabase.from('network_contacts').delete().eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    await query;
  }

  async clearAll(userId?: string): Promise<void> {
    let query = this.supabase.from('network_contacts').delete();
    if (userId) query = query.eq('user_id', userId);
    await query;
  }
}

/**
 * Cloud Discovery Repository using Supabase PostgreSQL.
 */
export class CloudDiscoveryRepository implements IDiscoveryRepository {
  constructor(private supabase: SupabaseClient) {}

  async getJobs(userId?: string): Promise<DiscoveredJob[]> {
    let query = this.supabase.from('discovery_jobs').select('*').order('discovered_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      title: d.title,
      company: d.company,
      location: d.location || '',
      compensation: d.compensation,
      jobUrl: d.job_url,
      finalCanonicalUrl: d.final_canonical_url,
      source: d.source,
      discoveredAt: d.discovered_at,
      status: d.status as DiscoveredJobStatus,
      relevanceScore: d.relevance_score,
      relevanceLevel: d.relevance_level,
      relevanceReasons: d.relevance_reasons || [],
      matchedPreferences: d.matched_preferences || [],
      provider: d.provider,
      groundingUsed: d.grounding_used,
      verificationStatus: d.verification_status,
      verifiedAt: d.verified_at,
      sourceConfidence: d.source_confidence,
      sourceDomain: d.source_domain,
      failureReason: d.failure_reason,
      snippet: d.snippet,
      description: d.description,
      matchedGroundingChunks: d.raw_grounding_metadata || undefined,
    }));
  }

  async saveJobs(jobs: DiscoveredJob[], userId?: string): Promise<void> {
    if (jobs.length === 0) return;
    const rows = jobs.map((j) => {
      const row: Record<string, unknown> = {
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        compensation: j.compensation,
        job_url: j.jobUrl,
        final_canonical_url: j.finalCanonicalUrl,
        source: j.source,
        discovered_at: j.discoveredAt,
        status: j.status,
        relevance_score: j.relevanceScore,
        relevance_level: j.relevanceLevel,
        relevance_reasons: j.relevanceReasons,
        matched_preferences: j.matchedPreferences,
        provider: j.provider,
        grounding_used: j.groundingUsed,
        verification_status: j.verificationStatus,
        verified_at: j.verifiedAt,
        source_confidence: j.sourceConfidence,
        source_domain: j.sourceDomain,
        failure_reason: j.failureReason,
        snippet: j.snippet,
        description: j.description,
        raw_grounding_metadata: j.matchedGroundingChunks || null,
        updated_at: new Date().toISOString(),
      };
      if (userId) row.user_id = userId;
      return row;
    });

    await this.supabase.from('discovery_jobs').upsert(rows);
  }

  async updateStatus(id: string, status: DiscoveredJobStatus, userId?: string): Promise<void> {
    let query = this.supabase.from('discovery_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    await query;
  }

  async updateJob(id: string, updates: Partial<DiscoveredJob>, userId?: string): Promise<DiscoveredJob | null> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.verificationStatus !== undefined) payload.verification_status = updates.verificationStatus;
    if (updates.verifiedAt !== undefined) payload.verified_at = updates.verifiedAt;
    if (updates.sourceConfidence !== undefined) payload.source_confidence = updates.sourceConfidence;
    if (updates.failureReason !== undefined) payload.failure_reason = updates.failureReason;
    if (updates.finalCanonicalUrl !== undefined) payload.final_canonical_url = updates.finalCanonicalUrl;
    if (updates.sourceDomain !== undefined) payload.source_domain = updates.sourceDomain;

    let query = this.supabase.from('discovery_jobs').update(payload).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data } = await query.select('*').maybeSingle();
    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      company: data.company,
      location: data.location || '',
      compensation: data.compensation,
      jobUrl: data.job_url,
      finalCanonicalUrl: data.final_canonical_url,
      source: data.source,
      discoveredAt: data.discovered_at,
      status: data.status as DiscoveredJobStatus,
      relevanceScore: data.relevance_score,
      relevanceLevel: data.relevance_level,
      relevanceReasons: data.relevance_reasons || [],
      matchedPreferences: data.matched_preferences || [],
      provider: data.provider,
      groundingUsed: data.grounding_used,
      verificationStatus: data.verification_status,
      verifiedAt: data.verified_at,
      sourceConfidence: data.source_confidence,
      sourceDomain: data.source_domain,
      failureReason: data.failure_reason,
      snippet: data.snippet,
      description: data.description,
      matchedGroundingChunks: data.raw_grounding_metadata || undefined,
    };
  }

  async getHistory(userId?: string): Promise<DiscoveryHistoryItem[]> {
    let query = this.supabase.from('discovery_history').select('*').order('run_at', { ascending: false }).limit(50);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((d) => ({
      id: d.id,
      runAt: d.run_at,
      source: d.source,
      provider: d.provider || 'Discovery Engine',
      groundingEnabled: d.grounding_enabled ?? true,
      rolesDiscovered: d.roles_discovered,
      newRolesCount: d.new_roles_count,
      deduplicatedCount: d.deduplicated_count,
      durationMs: d.duration_ms,
      status: d.status as 'success' | 'partial' | 'failed',
      errorDetails: d.error_details,
    }));
  }

  async recordRun(run: Omit<DiscoveryHistoryItem, 'id'>, userId?: string): Promise<DiscoveryHistoryItem> {
    const item: DiscoveryHistoryItem = {
      id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...run,
    };

    const row: Record<string, unknown> = {
      id: item.id,
      run_at: item.runAt,
      source: item.source,
      provider: item.provider,
      grounding_enabled: item.groundingEnabled,
      roles_discovered: item.rolesDiscovered,
      new_roles_count: item.newRolesCount,
      deduplicated_count: item.deduplicatedCount,
      duration_ms: item.durationMs,
      status: item.status,
      error_details: item.errorDetails,
    };
    if (userId) row.user_id = userId;

    await this.supabase.from('discovery_history').insert(row);
    return item;
  }
}

/**
 * Cloud User Preferences Repository using Supabase PostgreSQL.
 */
export class CloudPreferencesRepository implements IPreferencesRepository {
  constructor(private supabase: SupabaseClient) {}

  async getPreferences(userId?: string): Promise<UserPreferences> {
    const targetUserId = userId || 'default-user';
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (error || !data) {
      return {
        userId: targetUserId,
        discoveryEnabled: true,
        discoveryCadence: 'daily_weekday',
        emailNotificationsEnabled: false,
        migrationCompleted: false,
      };
    }

    return {
      userId: data.user_id,
      discoveryEnabled: data.discovery_enabled ?? true,
      discoveryCadence: data.discovery_cadence || 'daily_weekday',
      emailNotificationsEnabled: data.email_notifications_enabled ?? false,
      migrationCompleted: data.migration_completed ?? false,
      migrationCompletedAt: data.migration_completed_at,
      updatedAt: data.updated_at,
    };
  }

  async savePreferences(prefs: Partial<UserPreferences>, userId?: string): Promise<UserPreferences> {
    const targetUserId = userId || prefs.userId || 'default-user';
    const current = await this.getPreferences(targetUserId);

    const payload: Record<string, unknown> = {
      user_id: targetUserId,
      discovery_enabled: prefs.discoveryEnabled !== undefined ? prefs.discoveryEnabled : current.discoveryEnabled,
      discovery_cadence: prefs.discoveryCadence || current.discoveryCadence,
      email_notifications_enabled: prefs.emailNotificationsEnabled !== undefined ? prefs.emailNotificationsEnabled : current.emailNotificationsEnabled,
      migration_completed: prefs.migrationCompleted !== undefined ? prefs.migrationCompleted : current.migrationCompleted,
      migration_completed_at: prefs.migrationCompletedAt || current.migrationCompletedAt,
      updated_at: new Date().toISOString(),
    };

    await this.supabase.from('user_preferences').upsert(payload);

    return {
      ...current,
      ...prefs,
      userId: targetUserId,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Factory creating complete Cloud Storage Adapter given Supabase client.
 */
export function createCloudStorageAdapter(supabase: SupabaseClient): IStorageAdapter {
  const candidateRepo = new CloudCandidateRepository(supabase);
  const oppsRepo = new CloudOpportunityRepository(supabase);
  const networkRepo = new CloudNetworkRepository(supabase);
  const discRepo = new CloudDiscoveryRepository(supabase);
  const prefsRepo = new CloudPreferencesRepository(supabase);

  return {
    candidates: candidateRepo,
    opportunities: oppsRepo,
    network: networkRepo,
    discovery: discRepo,
    preferences: prefsRepo,
  };
}
