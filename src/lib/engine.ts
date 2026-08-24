import { AnalysisInput, IFitAnalysisEngine } from '@/types/engine';
import { CandidateProfile } from '@/types/candidate';
import {
  FitAnalysisReport,
  QualificationMatch,
  RecommendationType,
  CandidateProvenance,
} from '@/types/opportunity';
import { sanitizeInput } from './sanitize';

// Import pre-authored sample builders
import { buildRole1Analysis, CandidateAnalysisContext } from '@/data/fixtures/role-1-ai-strategy';
import { buildRole2Analysis } from '@/data/fixtures/role-2-sales-ops';
import { buildRole3Analysis } from '@/data/fixtures/role-3-data-engineer';
import { buildRole4Analysis } from '@/data/fixtures/role-4-chief-of-staff';
import { buildRole5Analysis } from '@/data/fixtures/role-5-strategy-lead';

import { collectReferencedEvidence, getCandidatePossessiveName } from './candidateAdapter';
import { extractJobRequirements } from './requirementExtractor';

export class DeterministicSyntheticEngine implements IFitAnalysisEngine {
  async analyzeRole(
    input: AnalysisInput,
    _candidateProfile: CandidateProfile
  ): Promise<FitAnalysisReport> {
    const candidateProfile = _candidateProfile;
    const candidateName = (candidateProfile?.name || '').trim() || 'Candidate';
    const candidatePossessive = getCandidatePossessiveName(candidateName);
    const ctx: CandidateAnalysisContext = { candidateName, candidatePossessive };

    // Strict Persona Isolation: Tier 1 pre-authored fixture benchmarks apply ONLY
    // when the active candidate is explicitly a synthetic demo persona.
    const isSyntheticPersona = candidateProfile?.dataMode === 'synthetic';

    if (isSyntheticPersona && input.sampleRoleId) {
      let benchmarkReport: FitAnalysisReport;
      switch (input.sampleRoleId) {
        case 'opp-role-1-ai-strategy':
        case 'role-1':
          benchmarkReport = buildRole1Analysis(ctx);
          break;
        case 'opp-role-2-sales-ops':
        case 'role-2':
          benchmarkReport = buildRole2Analysis(ctx);
          break;
        case 'opp-role-3-data-engineer':
        case 'role-3':
          benchmarkReport = buildRole3Analysis(ctx);
          break;
        case 'opp-role-4-chief-of-staff':
        case 'role-4':
          benchmarkReport = buildRole4Analysis(ctx);
          break;
        case 'opp-role-5-strategy-lead':
        case 'role-5':
          benchmarkReport = buildRole5Analysis(ctx);
          break;
        default:
          return this.generateCandidateGroundedReport(input, candidateProfile, ctx);
      }

      const provenance: CandidateProvenance = {
        candidateId: candidateProfile.id || 'cand-synthetic-alex-vance',
        candidateName: 'Alex Vance',
        dataMode: 'synthetic',
        profileUpdatedAt: candidateProfile.updatedAt || '2026-01-01T00:00:00.000Z',
        analyzedAt: new Date().toISOString(),
        provenanceStatus: 'known',
      };

      const evidenceSnapshot = collectReferencedEvidence(candidateProfile, benchmarkReport);

      return {
        ...benchmarkReport,
        candidateProvenance: provenance,
        evidenceSnapshot: evidenceSnapshot.length > 0 ? evidenceSnapshot : benchmarkReport.evidenceSnapshot,
      };
    }

    // For ALL real user candidates (e.g. Tanaka Ian Chikosi) and custom roles,
    // dynamically evaluate the active candidate's actual career roles and verified evidence.
    return this.generateCandidateGroundedReport(input, candidateProfile, ctx);
  }

  /**
   * Generates a fully candidate-grounded qualification evaluation against the active candidate's
   * actual career history, core competencies, and evidence library.
   */
  private generateCandidateGroundedReport(
    input: AnalysisInput,
    profile: CandidateProfile,
    ctx: CandidateAnalysisContext
  ): FitAnalysisReport {
    const { candidateName, candidatePossessive } = ctx;
    const sanitized = sanitizeInput(input.jobDescription);

    const roles = profile.careerHistory || [];
    const evidenceItems = profile.evidenceItems || [];
    const competencies = profile.coreCompetencies || [];

    const companies = Array.from(
      new Set(
        roles
          .map((r) => r.company)
          .concat(evidenceItems.map((e) => e.organization).filter(Boolean) as string[])
          .filter((c) => c && c.trim().length > 0)
      )
    );

    const companySummary = companies.length > 0 ? companies.slice(0, 3).join(', ') : 'leading enterprises';

    // 1. Independent Requirement Extraction: Extract and freeze requirements from Job Description alone
    const extractedReqs = extractJobRequirements(sanitized.sanitizedText, input.jobTitle || 'Role');
    const rawRequirements = [
      ...extractedReqs.requiredQualifications.map((q) => ({ text: q.text, category: 'Required' as const, keywords: q.keywords })),
      ...extractedReqs.preferredQualifications.map((q) => ({ text: q.text, category: 'Preferred' as const, keywords: q.keywords })),
    ];

    // 2. Evaluate candidate evidence and career history against each requirement
    const qualifications: QualificationMatch[] = rawRequirements.map((req, idx) => {
      // Find matching evidence items strictly by keyword / skill alignment (never by company name in JD)
      const matchingEvidence = evidenceItems.filter((ev) => {
        const evText = `${ev.title} ${ev.description} ${(ev.skills || []).join(' ')}`.toLowerCase();
        const matchedKeywords = req.keywords.filter((kw) => evText.includes(kw));
        const hasSkillTag = (ev.skills || []).some((s) => req.keywords.includes(s.toLowerCase()));
        return hasSkillTag || matchedKeywords.length >= 2 || (matchedKeywords.length === 1 && ev.title.toLowerCase().includes(matchedKeywords[0]));
      });

      // Find matching career roles
      const matchingRoles = roles.filter((role) => {
        const roleText = `${role.title} ${role.summary} ${(role.skills || []).join(' ')}`.toLowerCase();
        const matched = req.keywords.filter((kw) => roleText.includes(kw));
        return matched.length >= 2 || (role.skills || []).some((s) => req.keywords.includes(s.toLowerCase()));
      });

      // Find matching competencies
      const matchingCompetencies = competencies.filter((comp) =>
        req.keywords.some((kw) => comp.toLowerCase() === kw || comp.toLowerCase().includes(kw))
      );

      // Require multi-keyword overlap with metric or skill match for Strong Match
      const bestEvidenceWithMetric = matchingEvidence.find((e) => {
        const evText = `${e.title} ${e.description} ${(e.skills || []).join(' ')}`.toLowerCase();
        const overlap = req.keywords.filter((kw) => evText.includes(kw)).length;
        const hasSkill = (e.skills || []).some((s) => req.keywords.includes(s.toLowerCase()));
        return (overlap >= 2 || hasSkill) && Boolean(e.metric && e.metric.trim().length > 0);
      });

      const bestEvidence = bestEvidenceWithMetric || matchingEvidence[0];
      const bestRole = matchingRoles[0];

      if (bestEvidenceWithMetric || matchingEvidence.length >= 2) {
        // Strong Match with verified citations
        const citationIds = matchingEvidence.slice(0, 2).map((e) => e.id);
        const org = bestEvidence?.organization || bestRole?.company || 'career history';
        const metricSnippet = bestEvidence?.metric ? ` (${bestEvidence.metric})` : '';

        return {
          id: `qual-grounded-${idx + 1}`,
          category: req.category,
          qualification: req.text,
          matchType: 'Strong Match',
          explanation: `${candidateName} possesses direct, verified operational execution from ${org}${metricSnippet} aligning with this requirement.`,
          supportingEvidenceCitationIds: citationIds,
        };
      } else if (matchingEvidence.length === 1 || matchingRoles.length > 0 || matchingCompetencies.length > 0) {
        // Partial Match with optional citation
        const citationIds = bestEvidence ? [bestEvidence.id] : [];
        const roleContext = bestRole ? `${bestRole.title} at ${bestRole.company}` : (matchingCompetencies[0] || 'relevant background');

        return {
          id: `qual-grounded-${idx + 1}`,
          category: req.category,
          qualification: req.text,
          matchType: 'Partial Match',
          explanation: `${candidateName} offers transferable capabilities demonstrated through ${roleContext}, though active profile evidence does not feature a dedicated quantified metric.`,
          supportingEvidenceCitationIds: citationIds,
        };
      } else if (req.category === 'Required') {
        return {
          id: `qual-grounded-${idx + 1}`,
          category: 'Required',
          qualification: req.text,
          matchType: 'Material Gap',
          explanation: `${candidatePossessive} active candidate profile contains no verified evidence records or career history satisfying this specific requirement.`,
          supportingEvidenceCitationIds: [],
        };
      } else {
        return {
          id: `qual-grounded-${idx + 1}`,
          category: 'Preferred',
          qualification: req.text,
          matchType: 'Unverified',
          explanation: `Evidence for this preferred qualification cannot be conclusively verified from ${candidatePossessive} current profile records.`,
          supportingEvidenceCitationIds: [],
        };
      }
    });

    // 3. Compute candidate-specific fit score
    const { fitScore, recommendation, explanation } = this.calculateFitScore(qualifications);

    // 4. Construct grounded STAR stories from candidate's actual top evidence
    const topEvidence = evidenceItems.slice(0, 2);
    const starStories = topEvidence.map((ev, sIdx) => ({
      id: `star-grounded-${sIdx + 1}`,
      title: `${ev.organization || 'Strategic Role'} — ${ev.title || 'Key Achievement'}`,
      situation: `At ${ev.organization || 'previous organization'}, addressed complex operational challenges in a high-stakes environment.`,
      task: `Lead strategic execution and deliver measurable outcomes for ${ev.title || 'core initiatives'}.`,
      action: ev.description || `Executed cross-functional alignment and established structured operational governance.`,
      result: ev.metric ? `Achieved verified result: ${ev.metric}.` : 'Successfully met all project milestones and performance targets.',
      citationIds: [ev.id],
    }));

    // 5. Construct candidate-specific objections
    const gaps = qualifications.filter((q) => q.matchType === 'Material Gap' || q.matchType === 'Unverified');
    const objections = gaps.length > 0
      ? gaps.slice(0, 2).map((g, gIdx) => ({
          id: `obj-grounded-${gIdx + 1}`,
          objection: `Profile lacks dedicated evidence for: "${g.qualification}".`,
          counterPositioning: `Position adjacent track record from ${companySummary} and proactively emphasize rapid onboarding in initial conversations.`,
          supportingCitationId: topEvidence[0]?.id,
        }))
      : [
          {
            id: 'obj-grounded-1',
            objection: 'High qualification alignment may raise questions regarding role scope and career progression trajectory.',
            counterPositioning: `Emphasize enthusiasm for ${input.company || 'the organization'}'s specific stage and strategic mission.`,
            supportingCitationId: topEvidence[0]?.id,
          },
        ];

    // 6. Build Next Actions
    const nextActions = [
      `Review unverified qualifications and prepare talking points for ${input.company || 'target enterprise'} recruiter screen`,
      `Highlight quantified achievements from ${companySummary} in the preliminary interview`,
      'Confirm reporting structure and key 90-day deliverables with hiring team',
    ];

    const provenance: CandidateProvenance = {
      candidateId: profile.id || 'cand-user-active',
      candidateName: (profile.name || '').trim() || 'Candidate',
      dataMode: profile.dataMode || 'user',
      profileUpdatedAt: profile.updatedAt || new Date().toISOString(),
      analyzedAt: new Date().toISOString(),
      provenanceStatus: 'known',
    };

    return {
      executiveSummary: `Candidate-specific qualification evaluation for ${input.jobTitle || 'Target Role'} at ${input.company || 'Target Company'}. ${candidatePossessive} active profile includes ${roles.length} career roles (spanning ${companySummary}) and ${evidenceItems.length} verified evidence records. This report reflects candidate-grounded qualification matching.`,
      likelyMandate: `Drive operational leadership and strategic execution for ${input.company || 'the organization'}, aligning matrixed stakeholders and scaling performance outcomes.`,
      keyRequirements: rawRequirements.map((r) => r.text),
      overallFitScore: fitScore,
      scoreExplanation: explanation,
      recommendation,
      positioningNarrative: `With proven leadership across ${companySummary}, I offer a track record of translating complex strategy into measurable operational execution. My verified experience directly aligns with ${input.company || 'the target team'}'s strategic mandate.`,
      qualifications,
      objections,
      recruiterQuestions: [
        `What are the critical 90-day milestones for the ${input.jobTitle || 'role'}?`,
        `How does this role interface with executive leadership and cross-functional teams?`,
        `What is the primary operational challenge facing ${input.company || 'the team'} this quarter?`,
      ],
      hiringManagerQuestions: [
        `What specific strategic initiatives will this position own in the first six months?`,
        `How are team performance metrics and operational OKRs evaluated at ${input.company || 'the company'}?`,
      ],
      recommendedStarStories: starStories,
      nextActions,
      candidateProvenance: provenance,
      evidenceSnapshot: evidenceItems,
      isFallbackAnalysis: true,
      analysisNotice: 'Candidate-grounded deterministic analysis evaluated against active profile evidence.',
    };
  }

  /**
   * Helper to extract 4-6 discrete requirement items and relevant keyword sets from job description.
   */
  private extractRequirementsFromJd(
    jobTitle: string,
    jdText: string
  ): Array<{ text: string; category: 'Required' | 'Preferred'; keywords: string[] }> {
    const lower = jdText.toLowerCase();
    const requirements: Array<{ text: string; category: 'Required' | 'Preferred'; keywords: string[] }> = [];

    // Domain 1: Strategy & Operations / Leadership
    if (lower.includes('strategy') || lower.includes('operations') || lower.includes('lead') || lower.includes('director') || lower.includes('vp')) {
      requirements.push({
        text: 'Executive strategy execution, business operations, and organizational leadership',
        category: 'Required',
        keywords: ['strategy', 'operations', 'bizops', 'executive', 'leadership', 'director', 'vp', 'scale', 'management'],
      });
    }

    // Domain 2: GTM / RevOps / Revenue Pipeline
    if (lower.includes('gtm') || lower.includes('revops') || lower.includes('sales') || lower.includes('revenue') || lower.includes('funnel') || lower.includes('pipeline')) {
      requirements.push({
        text: 'GTM strategy, RevOps pipeline optimization, and revenue enablement',
        category: 'Required',
        keywords: ['gtm', 'revops', 'sales', 'revenue', 'pipeline', 'funnel', 'conversion', 'enablement', 'quota'],
      });
    }

    // Domain 3: AI / Technology / Digital Transformation
    if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('automation') || lower.includes('technology') || lower.includes('transformation')) {
      requirements.push({
        text: 'Enterprise AI enablement, workflow automation, and technology adoption',
        category: 'Required',
        keywords: ['ai', 'generative', 'automation', 'toolset', 'enablement', 'transformation', 'workflow', 'technology'],
      });
    }

    // Domain 4: Cross-functional Stakeholder Governance
    if (lower.includes('cross-functional') || lower.includes('stakeholder') || lower.includes('matrix') || lower.includes('board') || lower.includes('executive')) {
      requirements.push({
        text: 'Cross-functional leadership across matrixed executive stakeholders and review rhythms',
        category: 'Required',
        keywords: ['cross-functional', 'stakeholder', 'matrix', 'governance', 'board', 'rhythms', 'c-suite', 'executive'],
      });
    }

    // Domain 5: Hands-on Technical Systems / Engineering
    if (lower.includes('engineer') || lower.includes('pyspark') || lower.includes('scala') || lower.includes('python') || lower.includes('sql') || lower.includes('coding') || lower.includes('developer')) {
      requirements.push({
        text: 'Hands-on software development, data pipeline engineering, or technical infrastructure',
        category: 'Required',
        keywords: ['engineer', 'pyspark', 'scala', 'python', 'sql', 'coding', 'developer', 'architecture', 'infrastructure'],
      });
    }

    // Domain 6: Preferred Regulatory / Industry Domain Tooling
    if (lower.includes('compliance') || lower.includes('regulatory') || lower.includes('healthcare') || lower.includes('fintech') || lower.includes('security')) {
      requirements.push({
        text: 'Domain-specific regulatory frameworks, compliance governance, or industry standards',
        category: 'Preferred',
        keywords: ['compliance', 'regulatory', 'governance', 'security', 'framework', 'audit'],
      });
    }

    // Default fallback if JD was very sparse
    if (requirements.length < 3) {
      requirements.push({
        text: `Proven track record of operational impact relevant to ${jobTitle}`,
        category: 'Required',
        keywords: ['lead', 'manage', 'execute', 'deliver', 'growth', 'impact'],
      });
      requirements.push({
        text: 'Cross-functional project delivery and stakeholder communication',
        category: 'Preferred',
        keywords: ['communication', 'project', 'delivery', 'team', 'collaboration'],
      });
    }

    return requirements;
  }

  private calculateFitScore(qualifications: QualificationMatch[]): {
    fitScore: number;
    recommendation: RecommendationType;
    explanation: string;
  } {
    if (qualifications.length === 0) {
      return {
        fitScore: 0,
        recommendation: 'Monitor',
        explanation:
          'Zero extractable qualifications detected in custom job description. To avoid division by zero, the engine returns a score of 0% with a Monitor recommendation as an explicit exception to standard score mapping.',
      };
    }

    let weightedSum = 0;
    let maxPossibleWeight = 0;

    for (const q of qualifications) {
      const baseWeight = q.category === 'Required' ? 2 : 1;
      maxPossibleWeight += baseWeight;

      switch (q.matchType) {
        case 'Strong Match':
          weightedSum += baseWeight * 1.0;
          break;
        case 'Partial Match':
          weightedSum += baseWeight * 0.5;
          break;
        case 'Material Gap':
          weightedSum += 0;
          break;
        case 'Unverified':
          weightedSum += 0;
          break;
      }
    }

    if (maxPossibleWeight === 0) {
      return {
        fitScore: 0,
        recommendation: 'Monitor',
        explanation:
          'No weighted qualifications available. Returned 0% score with Monitor recommendation.',
      };
    }

    let score = Math.round((weightedSum / maxPossibleWeight) * 100);
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    let recommendation: RecommendationType = 'Deprioritize';
    if (score >= 85) {
      recommendation = 'Apply';
    } else if (score >= 70) {
      recommendation = 'Network First';
    } else if (score >= 50) {
      recommendation = 'Monitor';
    } else {
      recommendation = 'Deprioritize';
    }

    const reqMatches = qualifications.filter((q) => q.category === 'Required');
    const prefMatches = qualifications.filter((q) => q.category === 'Preferred');

    const reqStrong = reqMatches.filter((q) => q.matchType === 'Strong Match').length;
    const reqPartial = reqMatches.filter((q) => q.matchType === 'Partial Match').length;
    const reqGap = reqMatches.filter((q) => q.matchType === 'Material Gap').length;

    const prefStrong = prefMatches.filter((q) => q.matchType === 'Strong Match').length;
    const prefPartial = prefMatches.filter((q) => q.matchType === 'Partial Match').length;
    const prefUnverified = prefMatches.filter((q) => q.matchType === 'Unverified').length;

    const explanation = `Overall Fit Score of ${score}% (${recommendation}). Required: ${reqStrong} Strong, ${reqPartial} Partial, ${reqGap} Gap | Preferred: ${prefStrong} Strong, ${prefPartial} Partial, ${prefUnverified} Unverified. Weighted sum: ${weightedSum} / Max possible: ${maxPossibleWeight}.`;

    return { fitScore: score, recommendation, explanation };
  }
}

/**
 * Client-side Remote Gemini Engine that invokes the secure server route POST /api/analyze.
 * Automatically falls back to DeterministicSyntheticEngine if the API is offline or unconfigured.
 */
export class RemoteGeminiEngine implements IFitAnalysisEngine {
  private fallbackEngine = new DeterministicSyntheticEngine();

  async analyzeRole(
    input: AnalysisInput,
    candidateProfile: CandidateProfile
  ): Promise<FitAnalysisReport> {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller ? controller.signal : undefined,
        body: JSON.stringify({
          jobTitle: input.jobTitle,
          company: input.company,
          jobDescription: input.jobDescription,
          location: input.location,
          compensation: input.compensation,
          sourceUrl: input.sourceUrl,
          sampleRoleId: input.sampleRoleId,
          candidateSnapshot: {
            id: candidateProfile.id,
            name: candidateProfile.name,
            headline: candidateProfile.headline,
            location: candidateProfile.location,
            summary: candidateProfile.summary,
            targetRoles: candidateProfile.targetRoles || [],
            targetIndustries: candidateProfile.targetIndustries || [],
            preferredLocations: candidateProfile.preferredLocations || [],
            coreCompetencies: candidateProfile.coreCompetencies || [],
            careerHistory: candidateProfile.careerHistory || [],
            evidenceItems: candidateProfile.evidenceItems || [],
            dataMode: candidateProfile.dataMode || 'user',
            updatedAt: candidateProfile.updatedAt,
          },
        }),
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[RemoteGeminiEngine] Server API error, falling back:', errorData);
        return this.fallbackEngine.analyzeRole(input, candidateProfile);
      }

      const data = await response.json();
      if (data.success && data.report) {
        return data.report as FitAnalysisReport;
      }

      return this.fallbackEngine.analyzeRole(input, candidateProfile);
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      console.warn('[RemoteGeminiEngine] Remote call failed/aborted, using deterministic fallback:', err);
      return this.fallbackEngine.analyzeRole(input, candidateProfile);
    }
  }
}

export function getAnalysisEngine(preferredEngine: 'gemini' | 'deterministic' = 'gemini'): IFitAnalysisEngine {
  if (preferredEngine === 'gemini') {
    return new RemoteGeminiEngine();
  }
  return new DeterministicSyntheticEngine();
}
