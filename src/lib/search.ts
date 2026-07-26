import { JobOpportunity } from '@/types/opportunity';
import { CandidateProfile } from '@/types/candidate';

export type SearchGroup = 'navigation' | 'opportunity' | 'analysis' | 'profile';

export interface SearchIndexItem {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string;
  searchableText: string;
  href: string;
  badge?: string;
}

const STATIC_NAV_ITEMS: SearchIndexItem[] = [
  {
    id: 'nav:/',
    group: 'navigation',
    title: 'Dashboard',
    subtitle: 'Pipeline overview, high priority alerts, and key metrics',
    searchableText: 'dashboard pipeline metrics active opportunities executive summary overview command center',
    href: '/',
    badge: 'Page',
  },
  {
    id: 'nav:/analyze',
    group: 'navigation',
    title: 'Analyze a Role',
    subtitle: 'Evaluate new job descriptions against candidate profile',
    searchableText: 'analyze role job description fit score alignment candidate positioning evaluation sample',
    href: '/analyze',
    badge: 'Page',
  },
  {
    id: 'nav:/opportunities',
    group: 'navigation',
    title: 'Opportunities Pipeline',
    subtitle: 'Full pipeline table with sorting, stage filters, and dates',
    searchableText: 'opportunities pipeline filter sort table search roles company stage priority follow-up',
    href: '/opportunities',
    badge: 'Page',
  },
  {
    id: 'nav:/profile',
    group: 'navigation',
    title: 'Candidate Profile',
    subtitle: 'Executive profile, evidence matrix, and background',
    searchableText: 'candidate profile director ai strategy gtm operations competencies career history evidence matrix',
    href: '/profile',
    badge: 'Page',
  },
  {
    id: 'nav:/about',
    group: 'navigation',
    title: 'About the Project',
    subtitle: 'Architecture, non-AI deterministic design, and privacy',
    searchableText: 'about project technical architecture technical design non-ai privacy local storage evaluation',
    href: '/about',
    badge: 'Page',
  },
];

/**
 * Build a clean, deterministic in-memory search index from current normalized opportunities
 * and structured candidate profile data. Pure and deterministic — zero storage reads.
 */
export function buildSearchIndex(
  opportunities: JobOpportunity[],
  profile?: CandidateProfile
): SearchIndexItem[] {
  const items: SearchIndexItem[] = [];

  // 1. Core Navigation Pages
  items.push(...STATIC_NAV_ITEMS);

  // 2. Candidate Profile & Evidence Items
  if (profile && (profile.name || profile.headline || profile.summary)) {
    const candidateBadge = profile.dataMode === 'synthetic' ? 'Synthetic' : 'Candidate';

    items.push({
      id: 'profile:headline',
      group: 'profile',
      title: profile.name || 'Candidate Profile',
      subtitle: profile.headline || 'Executive Candidate',
      searchableText: `${profile.name} ${profile.headline} ${profile.summary} ${profile.targetRoles.join(' ')} ${profile.coreCompetencies.join(' ')} ${profile.targetIndustries?.join(' ') ?? ''}`,
      href: '/profile',
      badge: candidateBadge,
    });

    // Index evidence items
    if (Array.isArray(profile.evidenceItems)) {
      profile.evidenceItems.forEach((ev) => {
        const citationTag = ev.tags && ev.tags.find((t) => t.startsWith('EVID-'));
        const displayLabel = citationTag ? `${citationTag}: ${ev.title}` : ev.title;

        items.push({
          id: `profile:evidence:${ev.id}`,
          group: 'profile',
          title: displayLabel,
          subtitle: `${ev.organization ?? 'General Experience'} • ${ev.metric ?? ev.type}`,
          searchableText: `${ev.title} ${ev.description} ${ev.metric ?? ''} ${ev.organization ?? ''} ${ev.skills.join(' ')} ${ev.tags.join(' ')}`,
          href: '/profile',
          badge: ev.verificationStatus === 'synthetic' ? 'Synthetic Evidence' : 'Evidence',
        });
      });
    }

    // Index career roles
    if (Array.isArray(profile.careerHistory)) {
      profile.careerHistory.forEach((role) => {
        items.push({
          id: `profile:role:${role.id}`,
          group: 'profile',
          title: `${role.title} at ${role.company}`,
          subtitle: `${role.startDate} – ${role.endDate} | ${role.location}`,
          searchableText: `${role.title} ${role.company} ${role.summary} ${role.skills.join(' ')}`,
          href: '/profile',
          badge: 'Career Role',
        });
      });
    }
  }

  // 3. Opportunities & Analysis Reports
  if (Array.isArray(opportunities)) {
    opportunities.forEach((opp) => {
      const isArchived = opp.stage === 'Archived';
      const archiveBadge = isArchived ? 'Archived' : opp.stage;

      // Opportunity Main Record
      const actionTexts = opp.actions.map((a) => a.text).join(' ');
      const oppSearchable = `${opp.title} ${opp.company} ${opp.location ?? ''} ${opp.compensation ?? ''} ${opp.stage} ${opp.priority} ${opp.notes} ${opp.archivedReason ?? ''} ${actionTexts}`;

      items.push({
        id: `opp:${opp.id}`,
        group: 'opportunity',
        title: opp.title,
        subtitle: `${opp.company} • ${opp.analysis.overallFitScore}% Fit • ${opp.analysis.recommendation}`,
        searchableText: oppSearchable,
        href: `/analysis/${opp.id}`,
        badge: archiveBadge,
      });

      // Analysis Report Insights & Evidence
      items.push({
        id: `analysis:${opp.id}:summary`,
        group: 'analysis',
        title: `Analysis: ${opp.title}`,
        subtitle: `${opp.company} Mandate: ${opp.analysis.likelyMandate.slice(0, 70)}...`,
        searchableText: `${opp.title} ${opp.company} ${opp.analysis.executiveSummary} ${opp.analysis.likelyMandate} ${opp.analysis.positioningNarrative} ${opp.analysis.keyRequirements.join(' ')}`,
        href: `/analysis/${opp.id}`,
        badge: `${opp.analysis.overallFitScore}% Fit`,
      });

      // Key Match Qualifications & Gaps
      opp.analysis.qualifications.forEach((q) => {
        if (q.matchType === 'Strong Match' || q.matchType === 'Material Gap') {
          items.push({
            id: `analysis:${opp.id}:qual:${q.id}`,
            group: 'analysis',
            title: `${q.matchType}: ${q.qualification}`,
            subtitle: `${opp.company} — ${q.explanation.slice(0, 80)}...`,
            searchableText: `${opp.title} ${opp.company} ${q.qualification} ${q.matchType} ${q.explanation} ${q.supportingEvidenceCitationIds.join(' ')}`,
            href: `/analysis/${opp.id}`,
            badge: q.matchType,
          });
        }
      });
    });
  }

  return items;
}

/**
 * Filter the search index for a query.
 * Case-insensitive, whitespace-normalized, partial matching.
 * Deduplicates exact index entries by group + item.id key.
 * Caps output per group and returns max 10 total results.
 */
export function searchGlobalIndex(
  query: string,
  index: SearchIndexItem[]
): SearchIndexItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(/\s+/).filter((t) => t.length > 0);

  const matched = index.filter((item) => {
    const text = `${item.title} ${item.subtitle ?? ''} ${item.searchableText} ${item.badge ?? ''}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });

  // Deduplicate exact search index entries by stable item key (group + ':' + id)
  const seenKeys = new Set<string>();
  const deduplicatedMatched: SearchIndexItem[] = [];

  for (const item of matched) {
    const key = `${item.group}:${item.id}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicatedMatched.push(item);
    }
  }

  // Sort matched items: Exact title matches first, then group priority
  const groupPriority: Record<SearchGroup, number> = {
    opportunity: 0,
    analysis: 1,
    profile: 2,
    navigation: 3,
  };

  deduplicatedMatched.sort((a, b) => {
    const aTitleMatch = a.title.toLowerCase().includes(normalizedQuery) ? 0 : 1;
    const bTitleMatch = b.title.toLowerCase().includes(normalizedQuery) ? 0 : 1;
    if (aTitleMatch !== bTitleMatch) return aTitleMatch - bTitleMatch;

    return (groupPriority[a.group] ?? 99) - (groupPriority[b.group] ?? 99);
  });

  // Group capping: max 3 per group, max 10 total
  const result: SearchIndexItem[] = [];
  const groupCounts: Record<string, number> = {};

  for (const item of deduplicatedMatched) {
    if (result.length >= 10) break;
    const count = groupCounts[item.group] ?? 0;
    if (count < 3) {
      result.push(item);
      groupCounts[item.group] = count + 1;
    }
  }

  return result;
}
