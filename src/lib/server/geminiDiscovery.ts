import { DiscoveredJob, DiscoveryQuery, JobDiscoveryProvider } from '@/types/discovery';
import { getGeminiClient, getGeminiModel, getGeminiFallbackModel, isGeminiConfigured } from './geminiConfig';
import { executeWithResilience, sanitizeErrorMessage } from './geminiRetry';
import { validateSafeJobUrl, UrlValidationResult } from './urlValidator';
import { verifyJobListingContent } from './listingVerifier';
import { z } from 'zod';

const RawDiscoveredJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  compensation: z.string().optional(),
  isCompensationInferred: z.boolean().optional(),
  jobUrl: z.string().optional(),
  source: z.string().optional(),
  postingDate: z.string().optional(),
  snippet: z.string().optional(),
  description: z.string().optional(),
  relevanceScore: z.number().default(85),
  relevanceLevel: z.enum(['High Potential', 'Possible Fit', 'Low Relevance']).default('High Potential'),
  relevanceReasons: z.array(z.string()).default([]),
  matchedPreferences: z.array(z.string()).default([]),
});

const RawDiscoveryResponseSchema = z.object({
  jobs: z.array(RawDiscoveredJobSchema),
});

export interface GeminiDiscoveryExecutionMetrics {
  jobsReturnedByModel: number;
  jobsGrounded: number;
  jobsUrlValid: number;
  jobsVerifiedLive: number;
  jobsRejected: number;
  groundingQueries: string[];
}

export class GeminiSearchDiscoveryProvider implements JobDiscoveryProvider {
  name = 'Gemini Intelligent Market Discovery';
  lastExecutionMetrics: GeminiDiscoveryExecutionMetrics = {
    jobsReturnedByModel: 0,
    jobsGrounded: 0,
    jobsUrlValid: 0,
    jobsVerifiedLive: 0,
    jobsRejected: 0,
    groundingQueries: [],
  };

  async isAvailable(): Promise<boolean> {
    return isGeminiConfigured();
  }

  async discoverJobs(query: DiscoveryQuery): Promise<DiscoveredJob[]> {
    if (!isGeminiConfigured()) {
      throw new Error('Gemini API key is not configured for Live Grounded Job Discovery.');
    }

    const primaryModel = getGeminiModel();
    const failoverModel = getGeminiFallbackModel();
    const client = getGeminiClient();
    const now = new Date().toISOString();

    const rolesList = (query.targetRoles || ['AI Strategy & Operations Leader', 'Director GTM Operations', 'Head of Business Operations']).join(', ');
    const locationsList = (query.preferredLocations || ['San Francisco, CA', 'Remote', 'Silicon Valley']).join(', ');
    const industriesList = (query.targetIndustries || ['Enterprise AI', 'SaaS', 'Cloud Technology']).join(', ');

    const prompt = `
Search Google for real, active, currently open executive and leadership job postings matching the candidate's career preferences below.

CANDIDATE TARGET PREFERENCES:
- Target Roles: ${rolesList}
- Preferred Locations: ${locationsList}
- Target Industries: ${industriesList}
- Target Seniority: ${query.seniorityLevel || 'Director / VP / Head of / Principal'}

SEARCH AND GROUNDING INSTRUCTIONS:
1. Use the Google Search tool to search for 4-6 real, currently active job postings on employer career portals, ATS platforms (e.g. Greenhouse, Lever, Ashby, Workday), or verified executive job boards.
2. Search for postings from the last 30 days.
3. For each real job opening found, extract the exact employer company name, exact job title, location, direct job/ATS URL, posting date (if found), and a concise summary.
4. Only include compensation if explicitly disclosed by the employer in the posting (otherwise omit or mark as unknown; do not fabricate compensation).
5. Output pure JSON adhering to this schema:
{
  "jobs": [
    {
      "title": "Exact Role Title",
      "company": "Exact Company Name",
      "location": "Location or Remote",
      "compensation": "$XXX,000 - $YYY,000 + Equity (only if disclosed in posting)",
      "isCompensationInferred": false,
      "jobUrl": "https://boards.greenhouse.io/... or https://company.com/careers/...",
      "source": "Company Career Portal or ATS Name",
      "postingDate": "YYYY-MM-DD (if found)",
      "snippet": "Short summary of the role mandate and why it matches candidate preferences.",
      "description": "Overview of responsibilities and key requirements.",
      "relevanceScore": 88,
      "relevanceLevel": "High Potential",
      "relevanceReasons": ["Matches Target Role", "Enterprise AI Domain"],
      "matchedPreferences": ["AI Strategy", "San Francisco"]
    }
  ]
}

Return pure JSON only.
`;

    // Execute with bounded retry and model failover with tools: [{ googleSearch: {} }]
    const resilienceResult = await executeWithResilience(
      primaryModel,
      failoverModel,
      async (targetModel: string) => {
        const response = await client.models.generateContent({
          model: targetModel,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.2,
          },
        });

        const rawText = response.text;
        if (!rawText) {
          throw new Error(`Gemini (${targetModel}) returned an empty response.`);
        }

        const candidate = response.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;

        // Parse JSON from model text (strip markdown code fences if present)
        let jsonStr = rawText.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          // Attempt to extract JSON object if surrounded by extra text
          const match = jsonStr.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[0]);
          } else {
            throw new Error(`Failed to parse JSON from grounded Gemini discovery output.`);
          }
        }

        const validated = RawDiscoveryResponseSchema.parse(parsed);

        return {
          jobs: validated.jobs,
          groundingMetadata,
        };
      }
    );

    const { jobs: rawJobs, groundingMetadata } = resilienceResult.result;
    const groundingChunks = groundingMetadata?.groundingChunks || [];
    const webSearchQueries = groundingMetadata?.webSearchQueries || [];
    const hasGrounding = Boolean(groundingMetadata && (groundingChunks.length > 0 || webSearchQueries.length > 0));

    let jobsGroundedCount = 0;
    let jobsUrlValidCount = 0;
    let jobsVerifiedLiveCount = 0;
    let jobsRejectedCount = 0;

    // Process each discovered job with URL validation and content verification
    const verifiedJobs: DiscoveredJob[] = await Promise.all(
      rawJobs.map(async (rawJob, idx) => {
        // Find matching grounding chunks by domain or title
        const jobCompanyNorm = rawJob.company.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedChunks = groundingChunks.filter((chunk) => {
          const uri = chunk.web?.uri?.toLowerCase() || '';
          const title = chunk.web?.title?.toLowerCase() || '';
          return (
            uri.includes(jobCompanyNorm) ||
            title.includes(rawJob.company.toLowerCase()) ||
            (rawJob.jobUrl && uri.includes(rawJob.jobUrl.toLowerCase()))
          );
        });

        const isGrounded = hasGrounding && (matchedChunks.length > 0 || groundingChunks.length > 0);
        if (isGrounded) jobsGroundedCount++;

        // Determine target URL for validation (prefer direct jobUrl or first matched grounding chunk)
        const targetUrl = rawJob.jobUrl || matchedChunks[0]?.web?.uri || groundingChunks[0]?.web?.uri;

        let urlValidationResult: UrlValidationResult = {
          isValid: false,
          status: 0,
          finalUrl: targetUrl || '',
          finalDomain: '',
          redirectCount: 0,
          checkedAt: now,
          failureReason: 'No URL provided by discovery engine.',
          htmlSnippet: '',
        };

        if (targetUrl) {
          try {
            urlValidationResult = await validateSafeJobUrl(targetUrl, { timeoutMs: 4000, fetchHtmlSnippet: true });
          } catch (err: unknown) {
            urlValidationResult.failureReason = sanitizeErrorMessage(err);
          }
        }

        if (urlValidationResult.isValid) {
          jobsUrlValidCount++;
        }

        // Determine source domain
        let sourceDomain = 'google.com';
        if (targetUrl) {
          try {
            sourceDomain = new URL(targetUrl).hostname;
          } catch {
            sourceDomain = 'unknown';
          }
        }

        // Perform content verification
        const listingCheck = verifyJobListingContent({
          title: rawJob.title,
          company: rawJob.company,
          htmlContent: urlValidationResult.htmlSnippet || '',
          snippet: rawJob.snippet || '',
          url: targetUrl || '',
        });

        // Determine verification status
        let verificationStatus: DiscoveredJob['verificationStatus'] = 'grounded-unverified';
        let verificationReason = 'Discovered via Google Search grounding; awaiting deep URL content confirmation.';

        if (!hasGrounding) {
          verificationStatus = 'unsupported';
          verificationReason = 'Model output did not return verified Google Search grounding references.';
          jobsRejectedCount++;
        } else if (listingCheck.isExpired) {
          verificationStatus = 'expired';
          verificationReason = listingCheck.verificationReason;
          jobsRejectedCount++;
        } else if (urlValidationResult.isValid && listingCheck.isVerifiedListing) {
          verificationStatus = 'verified-live';
          verificationReason = listingCheck.verificationReason;
          jobsVerifiedLiveCount++;
        } else if (urlValidationResult.isValid && !listingCheck.isVerifiedListing) {
          verificationStatus = 'grounded-unverified';
          verificationReason = `URL reachable (${urlValidationResult.status}), but page content gave lower role match confidence (${listingCheck.matchConfidence}%).`;
        } else if (!urlValidationResult.isValid) {
          verificationStatus = 'unreachable';
          verificationReason = `Source URL validation failed: ${urlValidationResult.failureReason || 'Unreachable'}.`;
        }

        const matchedReferences = matchedChunks.map((c) => ({
          uri: c.web?.uri,
          title: c.web?.title,
        }));

        return {
          id: `disc-grounded-${Date.now()}-${idx + 1}`,
          title: rawJob.title,
          company: rawJob.company,
          location: rawJob.location,
          compensation: rawJob.compensation || undefined,
          isCompensationInferred: rawJob.isCompensationInferred ?? !Boolean(rawJob.compensation),
          jobUrl: targetUrl || undefined,
          source: rawJob.source || 'Google Search Grounding',
          sourceDomain,
          sourceTitle: matchedChunks[0]?.web?.title,
          sourceSnippet: rawJob.snippet,
          postingDate: rawJob.postingDate,
          snippet: rawJob.snippet,
          description: rawJob.description,
          discoveredAt: now,
          status: 'new',
          relevanceScore: rawJob.relevanceScore,
          relevanceLevel: rawJob.relevanceLevel,
          relevanceReasons: rawJob.relevanceReasons.length > 0 ? rawJob.relevanceReasons : ['Verified Market Opening', 'Target Role Match'],
          matchedPreferences: rawJob.matchedPreferences.length > 0 ? rawJob.matchedPreferences : query.targetRoles.slice(0, 2),
          provider: 'Gemini Intelligent Market Discovery',
          modelRequested: resilienceResult.requestedModel,
          modelUsed: resilienceResult.actualModel,
          groundingUsed: true,
          verificationStatus,
          verificationReason,
          verifiedAt: now,
          sourceConfidence: listingCheck.matchConfidence,
          httpStatus: urlValidationResult.status,
          redirectCount: urlValidationResult.redirectCount,
          finalCanonicalUrl: urlValidationResult.finalUrl || targetUrl,
          matchedGroundingChunks: matchedReferences.length > 0 ? matchedReferences : undefined,
          searchQueries: webSearchQueries,
        };
      })
    );

    this.lastExecutionMetrics = {
      jobsReturnedByModel: rawJobs.length,
      jobsGrounded: jobsGroundedCount,
      jobsUrlValid: jobsUrlValidCount,
      jobsVerifiedLive: jobsVerifiedLiveCount,
      jobsRejected: jobsRejectedCount,
      groundingQueries: webSearchQueries,
    };

    return verifiedJobs;
  }
}
