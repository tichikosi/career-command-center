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

import { normalizeCandidateProfile } from '@/lib/storage';

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

    if (error) {
      console.warn(`[CloudCandidateRepository] getProfile notice for user ${userId}:`, error.message);
    }

    if (!data) {
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

    const mapped = {
      id: data.id,
      name: data.name || '',
      headline: data.headline || '',
      location: data.location || '',
      summary: data.summary || '',
      targetRoles: Array.isArray(data.target_roles) ? data.target_roles : [],
      targetIndustries: Array.isArray(data.target_industries) ? data.target_industries : [],
      preferredLocations: Array.isArray(data.preferred_locations) ? data.preferred_locations : [],
      coreCompetencies: Array.isArray(data.core_competencies) ? data.core_competencies : [],
      careerHistory: Array.isArray(data.career_history) ? data.career_history : [],
      education: Array.isArray(data.education) ? data.education : [],
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      evidenceItems: Array.isArray(data.evidence_items) ? data.evidence_items : [],
      sources: Array.isArray(data.sources) ? data.sources : [],
      updatedAt: data.updated_at || new Date().toISOString(),
      dataMode: (data.data_mode as 'synthetic' | 'user') || 'user',
    };

    return normalizeCandidateProfile(mapped);
  }

  async saveProfile(profile: CandidateProfile, userId?: string): Promise<CandidateProfile> {
    const candidateId =
      !profile.id || profile.id === 'cand-alex-vance-v1' || profile.id === 'alex-vance-synthetic'
        ? `cand-${userId || Date.now()}`
        : profile.id;

    const payload: Record<string, unknown> = {
      id: candidateId,
      name: (profile.name && profile.name.trim()) || 'Executive Candidate',
      headline: profile.headline || null,
      location: profile.location || null,
      summary: profile.summary || null,
      target_roles: Array.isArray(profile.targetRoles) ? profile.targetRoles : [],
      target_industries: Array.isArray(profile.targetIndustries) ? profile.targetIndustries : [],
      preferred_locations: Array.isArray(profile.preferredLocations) ? profile.preferredLocations : [],
      core_competencies: Array.isArray(profile.coreCompetencies) ? profile.coreCompetencies : [],
      career_history: Array.isArray(profile.careerHistory) ? profile.careerHistory : [],
      education: Array.isArray(profile.education) ? profile.education : [],
      certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
      evidence_items: Array.isArray(profile.evidenceItems) ? profile.evidenceItems : [],
      sources: Array.isArray(profile.sources) ? profile.sources : [],
      data_mode: profile.dataMode || 'user',
      updated_at: new Date().toISOString(),
    };

    if (userId) {
      payload.user_id = userId;
    }

    const { error } = await this.supabase
      .from('candidate_profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[CloudCandidateRepository] saveProfile error:', {
        table: 'candidate_profiles',
        operation: 'upsert',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to save candidate profile: ${error.message} (Code: ${error.code})`);
    }

    return { ...profile, id: candidateId };
  }

  async resetDemoData(userId?: string): Promise<void> {
    if (userId) {
      const { error } = await this.supabase.from('candidate_profiles').delete().eq('user_id', userId);
      if (error) {
        throw new Error(`Failed to reset candidate data: ${error.message}`);
      }
    }
  }

  async clearData(userId?: string): Promise<void> {
    if (userId) {
      const { error } = await this.supabase.from('candidate_profiles').delete().eq('user_id', userId);
      if (error) {
        throw new Error(`Failed to clear candidate data: ${error.message}`);
      }
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
    if (error) {
      console.warn(`[CloudOpportunityRepository] getAll notice for user ${userId}:`, error.message);
      return [];
    }
    if (!data) return [];

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
      company: opp.company || 'Unknown Company',
      title: opp.title || 'Untitled Opportunity',
      location: opp.location || null,
      compensation: opp.compensation || null,
      source_url: opp.sourceUrl || null,
      application_url: opp.applicationUrl || null,
      raw_job_description: opp.rawJobDescription || null,
      stage: opp.stage || 'Identified',
      priority: opp.priority || 'Medium',
      notes: opp.notes || null,
      verification_status: opp.verificationStatus || null,
      verified_at: (opp.verifiedAt && opp.verifiedAt.trim()) || null,
      source_domain: opp.sourceDomain || null,
      match_confidence: null,
      discovery_relevance_score: opp.analysis?.overallFitScore || null,
      analysis_report: opp.analysis || null,
      updated_at: new Date().toISOString(),
    };
    if (userId) {
      payloadData.user_id = userId;
    }

    const { error } = await this.supabase
      .from('opportunities')
      .upsert(payloadData, { onConflict: 'id' });

    if (error) {
      console.error(`[CloudOpportunityRepository] save error on opp ${opp.id}:`, {
        table: 'opportunities',
        operation: 'upsert',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to save opportunity ${opp.id} (${opp.company}): ${error.message} (Code: ${error.code})`);
    }

    if (opp.actions && opp.actions.length > 0) {
      for (const act of opp.actions) {
        await this.saveAction(opp.id, act, userId);
      }
    }

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
    const { error } = await query;
    if (error) {
      throw new Error(`Failed to delete opportunity ${id}: ${error.message}`);
    }
  }

  async saveAction(opportunityId: string, action: OpportunityAction, userId?: string): Promise<void> {
    const payload: Record<string, unknown> = {
      id: action.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      opportunity_id: opportunityId,
      title: action.text || 'Action Item',
      description: action.text || '',
      stage: action.stage || null,
      completed: Boolean(action.completed),
      due_date: (action.completedAt && action.completedAt.trim()) || null,
      created_at: action.createdAt || new Date().toISOString(),
    };
    if (userId) payload.user_id = userId;

    const { error } = await this.supabase
      .from('opportunity_actions')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn(`[CloudOpportunityRepository] saveAction notice on ${action.id}:`, error.message);
    }
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
    if (error) {
      console.warn(`[CloudNetworkRepository] getContacts notice for user ${userId}:`, error.message);
      return [];
    }
    if (!data) return [];

    return data.map((c) => ({
      id: c.id,
      fullName: c.name || c.full_name || 'Professional Contact',
      firstName: c.first_name,
      lastName: c.last_name,
      company: c.company || '',
      position: c.position || '',
      email: c.email || '',
      linkedInUrl: c.linkedin_url || '',
      connectedOn: (c.connection_date as string) || (c.connected_on as string) || '',
      source: ((c.source as string) as NetworkContact['source']) || 'generic_csv',
      importedAt: (c.created_at as string) || new Date().toISOString(),
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
          id: (c.id && c.id.trim()) || `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: (c.fullName && c.fullName.trim()) || [c.firstName, c.lastName].filter(Boolean).join(' ') || 'Professional Contact',
          company: (c.company && c.company.trim()) || 'Unknown Company',
          position: c.position || null,
          email: c.email || null,
          linkedin_url: c.linkedInUrl || null,
          connection_date: c.connectedOn || null,
          notes: c.notes || null,
          tags: [],
          updated_at: new Date().toISOString(),
        };
        if (userId) row.user_id = userId;
        return row;
      });

      const { error } = await this.supabase
        .from('network_contacts')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error(`[CloudNetworkRepository] addContacts batch error (${i}-${i + chunk.length}):`, {
          table: 'network_contacts',
          operation: 'upsert',
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Failed to batch insert network contacts (${i + 1}-${i + chunk.length}): ${error.message} (Code: ${error.code})`);
      }
    }

    return contacts;
  }

  async updateContact(id: string, updates: Partial<NetworkContact>, userId?: string): Promise<NetworkContact | null> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.fullName !== undefined) payload.name = updates.fullName;
    if (updates.company !== undefined) payload.company = updates.company;
    if (updates.position !== undefined) payload.position = updates.position;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.linkedInUrl !== undefined) payload.linkedin_url = updates.linkedInUrl;
    if (updates.connectedOn !== undefined) payload.connection_date = updates.connectedOn;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    let query = this.supabase.from('network_contacts').update(payload).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.select('*').maybeSingle();
    if (error) {
      throw new Error(`Failed to update network contact ${id}: ${error.message}`);
    }
    if (!data) return null;

    return {
      id: data.id,
      fullName: data.name || data.full_name || '',
      firstName: data.first_name,
      lastName: data.last_name,
      company: data.company || '',
      position: data.position || '',
      email: data.email || '',
      linkedInUrl: data.linkedin_url || '',
      connectedOn: data.connection_date || data.connected_on || '',
      source: ((data.source as string) as NetworkContact['source']) || 'generic_csv',
      importedAt: data.created_at || new Date().toISOString(),
      notes: data.notes || '',
    };
  }

  async deleteContact(id: string, userId?: string): Promise<void> {
    let query = this.supabase.from('network_contacts').delete().eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) {
      throw new Error(`Failed to delete network contact ${id}: ${error.message}`);
    }
  }

  async clearAll(userId?: string): Promise<void> {
    let query = this.supabase.from('network_contacts').delete();
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) {
      throw new Error(`Failed to clear network contacts: ${error.message}`);
    }
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
    if (error) {
      console.warn(`[CloudDiscoveryRepository] getJobs notice for user ${userId}:`, error.message);
      return [];
    }
    if (!data) return [];

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
    const chunkSize = 100;
    for (let i = 0; i < jobs.length; i += chunkSize) {
      const chunk = jobs.slice(i, i + chunkSize).map((j) => {
        const row: Record<string, unknown> = {
          id: j.id || `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: j.title || 'Untitled Role',
          company: j.company || 'Unknown Company',
          location: j.location || null,
          compensation: j.compensation || null,
          job_url: j.jobUrl || null,
          final_canonical_url: j.finalCanonicalUrl || null,
          source: j.source || 'Google Search Grounding',
          discovered_at: (j.discoveredAt && j.discoveredAt.trim()) || new Date().toISOString(),
          status: j.status || 'new',
          relevance_score: typeof j.relevanceScore === 'number' ? j.relevanceScore : 70,
          relevance_level: j.relevanceLevel || 'High Potential',
          relevance_reasons: Array.isArray(j.relevanceReasons) ? j.relevanceReasons : [],
          matched_preferences: Array.isArray(j.matchedPreferences) ? j.matchedPreferences : [],
          provider: j.provider || 'gemini-3.7-flash',
          grounding_used: Boolean(j.groundingUsed),
          verification_status: j.verificationStatus || 'grounded-unverified',
          verified_at: (j.verifiedAt && j.verifiedAt.trim()) || null,
          source_confidence: typeof j.sourceConfidence === 'number' ? j.sourceConfidence : null,
          source_domain: j.sourceDomain || null,
          failure_reason: j.failureReason || null,
          snippet: j.snippet || null,
          description: j.description || null,
          raw_grounding_metadata: j.matchedGroundingChunks || null,
          updated_at: new Date().toISOString(),
        };
        if (userId) row.user_id = userId;
        return row;
      });

      const { error } = await this.supabase
        .from('discovery_jobs')
        .upsert(chunk, { onConflict: 'id' });

      if (error) {
        console.error(`[CloudDiscoveryRepository] saveJobs batch error (${i}-${i + chunk.length}):`, {
          table: 'discovery_jobs',
          operation: 'upsert',
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw new Error(`Failed to save discovery jobs (${i + 1}-${i + chunk.length}): ${error.message} (Code: ${error.code})`);
      }
    }
  }

  async updateStatus(id: string, status: DiscoveredJobStatus, userId?: string): Promise<void> {
    let query = this.supabase.from('discovery_jobs').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) {
      throw new Error(`Failed to update discovery job status ${id}: ${error.message}`);
    }
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
    const { data, error } = await query.select('*').maybeSingle();
    if (error) {
      throw new Error(`Failed to update discovery job ${id}: ${error.message}`);
    }
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
      provider: 'Google Search Grounding',
      groundingEnabled: true,
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
      run_at: (item.runAt && item.runAt.trim()) || new Date().toISOString(),
      source: item.source || 'Google Search Grounding',
      roles_discovered: typeof item.rolesDiscovered === 'number' ? item.rolesDiscovered : 0,
      new_roles_count: typeof item.newRolesCount === 'number' ? item.newRolesCount : 0,
      deduplicated_count: typeof item.deduplicatedCount === 'number' ? item.deduplicatedCount : 0,
      duration_ms: typeof item.durationMs === 'number' ? item.durationMs : 0,
      status: item.status || 'success',
      error_details: item.errorDetails || null,
    };
    if (userId) row.user_id = userId;

    const { error } = await this.supabase
      .from('discovery_history')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[CloudDiscoveryRepository] recordRun error:', {
        table: 'discovery_history',
        operation: 'upsert',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to record discovery run: ${error.message} (Code: ${error.code})`);
    }
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
      migration_completed_at: (prefs.migrationCompletedAt && prefs.migrationCompletedAt.trim()) || (current.migrationCompletedAt && current.migrationCompletedAt.trim()) || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('[CloudPreferencesRepository] savePreferences error:', {
        table: 'user_preferences',
        operation: 'upsert',
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(`Failed to save preferences: ${error.message} (Code: ${error.code})`);
    }

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
