import { DiscoveredJob, DiscoveryQuery, JobDiscoveryProvider } from '@/types/discovery';
import { getGeminiClient, getGeminiModel, isGeminiConfigured } from './geminiConfig';
import { CuratedDiscoveryProvider } from './curatedDiscovery';
import { z } from 'zod';

const DiscoveredJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  compensation: z.string().optional(),
  jobUrl: z.string().optional(),
  source: z.string().default('Gemini Market Search'),
  postingDate: z.string().optional(),
  snippet: z.string().optional(),
  description: z.string().optional(),
  relevanceScore: z.number().default(85),
  relevanceLevel: z.enum(['High Potential', 'Possible Fit', 'Low Relevance']).default('High Potential'),
  relevanceReasons: z.array(z.string()).default([]),
  matchedPreferences: z.array(z.string()).default([]),
});

const DiscoveryResponseSchema = z.object({
  jobs: z.array(DiscoveredJobSchema),
});

export class GeminiSearchDiscoveryProvider implements JobDiscoveryProvider {
  name = 'Gemini Intelligent Market Discovery';
  private fallbackProvider = new CuratedDiscoveryProvider();

  async isAvailable(): Promise<boolean> {
    return isGeminiConfigured();
  }

  async discoverJobs(query: DiscoveryQuery): Promise<DiscoveredJob[]> {
    if (!isGeminiConfigured()) {
      return this.fallbackProvider.discoverJobs(query);
    }

    try {
      const client = getGeminiClient();
      const model = getGeminiModel();
      const now = new Date().toISOString();

      const rolesList = (query.targetRoles || ['AI Strategy & Operations Leader', 'Director GTM Operations', 'Head of Business Operations']).join(', ');
      const locationsList = (query.preferredLocations || ['San Francisco, CA', 'Remote', 'Silicon Valley']).join(', ');
      const industriesList = (query.targetIndustries || ['Enterprise AI', 'SaaS', 'Cloud Technology']).join(', ');

      const prompt = `
You are the Career Command Center Job Discovery Engine.
Your task is to identify and surface 5-8 real, high-priority executive and leadership job opportunities currently in the market that match the candidate's strategic career preferences.

CANDIDATE TARGET PREFERENCES:
- Target Roles: ${rolesList}
- Preferred Locations: ${locationsList}
- Target Industries: ${industriesList}
- Compensation Target: ${query.compensationTarget || '$200,000 - $350,000+'}
- Seniority Level: ${query.seniorityLevel || 'Director / VP / Head of / Principal'}

OUTPUT INSTRUCTIONS:
Return a JSON object conforming to the schema:
{
  "jobs": [
    {
      "title": "Role Title",
      "company": "Company Name (e.g. Anthropic, OpenAI, Stripe, Scale AI, Google, Databricks, Snowflake)",
      "location": "City, State or Remote",
      "compensation": "$XXX,000 - $YYY,000 + Equity",
      "jobUrl": "https://company.com/careers/...",
      "source": "Company Career Portal / Board",
      "postingDate": "2026-03-XX",
      "snippet": "Short summary of role mandate and why it fits candidate preferences.",
      "description": "2-3 paragraphs describing role responsibilities, key requirements, and strategic impact.",
      "relevanceScore": 88,
      "relevanceLevel": "High Potential",
      "relevanceReasons": ["Direct Title Alignment", "Enterprise AI Domain", "Executive Seniority"],
      "matchedPreferences": ["AI Strategy", "San Francisco"]
    }
  ]
}

Focus on top-tier innovative tech, AI platforms, scale-ups, and leading enterprises.
Return pure JSON with no markdown formatting.
`;

      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        throw new Error('Gemini returned an empty discovery response.');
      }

      const parsed = JSON.parse(rawText);
      const validated = DiscoveryResponseSchema.parse(parsed);

      return validated.jobs.map((job, idx) => ({
        ...job,
        id: `disc-gemini-${Date.now()}-${idx + 1}`,
        discoveredAt: now,
        status: 'new',
        relevanceReasons: job.relevanceReasons.length > 0 ? job.relevanceReasons : ['Executive Seniority Match', 'Target Industry Alignment'],
        matchedPreferences: job.matchedPreferences.length > 0 ? job.matchedPreferences : query.targetRoles.slice(0, 2),
      }));
    } catch (err: unknown) {
      console.warn(`[GeminiSearchDiscoveryProvider] Live discovery call failed. Using curated feed: ${err instanceof Error ? err.message : String(err)}`);
      return this.fallbackProvider.discoverJobs(query);
    }
  }
}
