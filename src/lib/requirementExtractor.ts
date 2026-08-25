export interface ExtractedJobRequirements {
  mandate: string;
  keyRequirements: string[];
  requiredQualifications: Array<{ text: string; keywords: string[] }>;
  preferredQualifications: Array<{ text: string; keywords: string[] }>;
  responsibilities: string[];
  domainExperience: string[];
  technicalSkills: string[];
}

/**
 * Extracts and freezes structured requirements from raw Job Description text
 * WITHOUT ANY CANDIDATE PROFILE INPUT.
 *
 * This guarantees requirement independence and prevents circular qualification grading.
 */
export function extractJobRequirements(
  jobDescription: string,
  jobTitle?: string
): ExtractedJobRequirements {
  // Normalize HTML and whitespace while strictly PRESERVING linebreaks
  const rawCleaned = (jobDescription || '')
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\r/g, '')
    .trim();

  const lines = rawCleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const lower = rawCleaned.toLowerCase();
  const effectiveTitle = (jobTitle || '').trim() || 'Leadership Role';

  const requiredQualifications: Array<{ text: string; keywords: string[] }> = [];
  const preferredQualifications: Array<{ text: string; keywords: string[] }> = [];
  const responsibilities: string[] = [];
  const domainExperience: string[] = [];
  const technicalSkills: string[] = [];

  // Identify sections in JD
  let currentSection: 'overview' | 'responsibilities' | 'required' | 'preferred' | 'general' = 'general';

  for (const line of lines) {
    const l = line.toLowerCase();

    // Section header detection
    if (
      l.includes('minimum qualification') ||
      l.includes('basic qualification') ||
      l.includes('what you need') ||
      l.includes('what you bring') ||
      l.includes('requirements') ||
      l.includes('required skill') ||
      l.includes('must have')
    ) {
      currentSection = 'required';
      continue;
    } else if (
      l.includes('preferred qualification') ||
      l.includes('bonus qualification') ||
      l.includes('nice to have') ||
      l.includes('preferred skill') ||
      l.includes('what will make you stand out')
    ) {
      currentSection = 'preferred';
      continue;
    } else if (
      l.includes('responsibilities') ||
      l.includes('what you will do') ||
      l.includes('what you\'ll do') ||
      l.includes('the role') ||
      l.includes('core duties')
    ) {
      currentSection = 'responsibilities';
      continue;
    }

    // Is bullet point or numbered item or item under a section header
    const isBullet = /^[-*•–—\d.)]/.test(line) && line.length > 8;
    const isUnderSection =
      (currentSection === 'required' || currentSection === 'preferred' || currentSection === 'responsibilities') &&
      line.length > 15 &&
      !line.endsWith(':');

    if (isBullet || isUnderSection) {
      // Strip leading bullet markers without stripping numeric years (e.g. "10+ years")
      const cleanText = line.replace(/^[-*•–—\s]+|^\d+[\.\)]\s*/, '').trim();

      if (cleanText.length > 10) {
        const keywords = extractKeywords(cleanText);

        if (currentSection === 'required') {
          requiredQualifications.push({ text: cleanText, keywords });
        } else if (currentSection === 'preferred') {
          preferredQualifications.push({ text: cleanText, keywords });
        } else if (currentSection === 'responsibilities') {
          responsibilities.push(cleanText);
        }
      }
    }
  }

  // If section parsing was sparse (e.g. unformatted JD), extract semantic requirement domains
  if (requiredQualifications.length < 2) {
    // 1. Leadership & Strategy
    if (
      lower.includes('strategy') ||
      lower.includes('operations') ||
      lower.includes('director') ||
      lower.includes('lead') ||
      lower.includes('vp') ||
      lower.includes('management') ||
      lower.includes('executive')
    ) {
      requiredQualifications.push({
        text: `Strategic leadership, executive stakeholder alignment, and operational execution for ${effectiveTitle}`,
        keywords: ['strategy', 'operations', 'leadership', 'executive', 'director', 'vp', 'governance'],
      });
    }

    // 2. GTM / RevOps / Business Growth
    if (
      lower.includes('gtm') ||
      lower.includes('revops') ||
      lower.includes('sales') ||
      lower.includes('revenue') ||
      lower.includes('growth') ||
      lower.includes('funnel') ||
      lower.includes('pipeline')
    ) {
      requiredQualifications.push({
        text: 'Go-to-Market (GTM) execution, revenue operations, and cross-functional pipeline acceleration',
        keywords: ['gtm', 'revops', 'sales', 'revenue', 'pipeline', 'funnel', 'conversion'],
      });
    }

    // 3. AI / Modern Technology & Automation
    if (
      lower.includes('ai') ||
      lower.includes('machine learning') ||
      lower.includes('automation') ||
      lower.includes('digital transformation')
    ) {
      requiredQualifications.push({
        text: 'Enterprise AI tooling, machine learning operationalization, or digital transformation workflows',
        keywords: ['ai', 'generative', 'automation', 'transformation'],
      });
    }

    // 4. Cross-functional Matrix Governance
    if (
      lower.includes('cross-functional') ||
      lower.includes('stakeholder') ||
      lower.includes('matrix') ||
      lower.includes('board') ||
      lower.includes('cross functional')
    ) {
      requiredQualifications.push({
        text: 'Cross-functional program management across matrixed product, engineering, and business organizations',
        keywords: ['cross-functional', 'stakeholder', 'matrix', 'collaboration', 'governance'],
      });
    }

    // 5. Engineering & Technical Systems
    if (
      lower.includes('python') ||
      lower.includes('sql') ||
      lower.includes('pyspark') ||
      lower.includes('scala') ||
      lower.includes('c++') ||
      lower.includes('cuda') ||
      lower.includes('software engineer') ||
      lower.includes('deep learning')
    ) {
      requiredQualifications.push({
        text: 'Hands-on technical systems architecture, low-level data pipeline engineering, or software development',
        keywords: ['pyspark', 'scala', 'cuda', 'c++', 'software', 'programming', 'kernel', 'slurm', 'gpu'],
      });
    }

    // Fallback baseline required qualification if still empty
    if (requiredQualifications.length === 0) {
      requiredQualifications.push({
        text: `Demonstrated track record of measurable business impact and operational leadership in ${effectiveTitle}`,
        keywords: ['lead', 'manage', 'execute', 'impact', 'results', 'scale', 'operations'],
      });
    }
  }

  // Preferred qualifications fallback
  if (preferredQualifications.length === 0) {
    if (
      lower.includes('mba') ||
      lower.includes('master') ||
      lower.includes('advanced degree') ||
      lower.includes('phd')
    ) {
      preferredQualifications.push({
        text: 'Advanced academic degree (MBA, MS, or PhD in quantitative/business field)',
        keywords: ['mba', 'master', 'degree', 'phd', 'graduate'],
      });
    }

    if (
      lower.includes('regulatory') ||
      lower.includes('compliance') ||
      lower.includes('fintech') ||
      lower.includes('healthcare') ||
      lower.includes('security')
    ) {
      preferredQualifications.push({
        text: 'Experience navigating domain-specific regulatory compliance and enterprise risk governance',
        keywords: ['regulatory', 'compliance', 'security', 'audit', 'fintech', 'healthcare', 'governance'],
      });
    } else {
      preferredQualifications.push({
        text: 'Experience operating in hypergrowth venture-backed or scale-up enterprise technology environments',
        keywords: ['startup', 'scale-up', 'venture', 'hypergrowth'],
      });
    }
  }

  // Synthesize Key Mandate and High-level Summary
  const mandate = `Solve high-impact operational and growth challenges as ${effectiveTitle}, driving strategic alignment and cross-functional scale.`;
  const keyRequirements = requiredQualifications.slice(0, 5).map((q) => q.text);

  return {
    mandate,
    keyRequirements,
    requiredQualifications,
    preferredQualifications,
    responsibilities: responsibilities.slice(0, 8),
    domainExperience,
    technicalSkills,
  };
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
    'will', 'with', 'you', 'your', 'our', 'their', 'this', 'must', 'have', 'years',
    'experience', 'ability', 'proven', 'track', 'record', 'strong', 'demonstrated',
    'across', 'such', 'well', 'plus', 'including', 'key', 'skills', 'role', 'with',
    'working', 'responsibilities', 'qualifications', 'requirements',
  ]);

  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopwords.has(w))
    )
  );
}
