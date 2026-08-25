import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GeminiSearchDiscoveryProvider } from '../src/lib/server/geminiDiscovery';
import { getGeminiModel, isGeminiConfigured } from '../src/lib/server/geminiConfig';
import { DiscoveryQuery } from '../src/types/discovery';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

async function main() {
  console.log('===========================================================');
  console.log('  CAREER COMMAND CENTER — LIVE GROUNDED DISCOVERY RUNNER   ');
  console.log('===========================================================');
  console.log(`Timestamp           : ${new Date().toISOString()}`);
  console.log(`Configured Model    : ${getGeminiModel()}`);
  console.log(`API Key Configured  : ${isGeminiConfigured() ? 'YES (Key Present)' : 'NO (Missing)'}`);

  if (!isGeminiConfigured()) {
    console.error('\n[ERROR] GEMINI_API_KEY is not configured in environment or .env.local.');
    process.exit(1);
  }

  const query: DiscoveryQuery = {
    targetRoles: [
      'Director AI Strategy',
      'AI GTM Strategy & Operations Leader',
      'VP Business Operations & AI Strategy',
    ],
    targetIndustries: ['Enterprise AI', 'Cloud Software', 'Venture Capital'],
    preferredLocations: ['San Francisco, CA', 'Remote', 'Washington DC'],
    compensationTarget: '$240,000 - $350,000',
    seniorityLevel: 'Director / VP / Head of',
  };

  console.log('\n[Query Parameters]:');
  console.log(`  Target Roles      : ${query.targetRoles.join(', ')}`);
  console.log(`  Target Locations  : ${query.preferredLocations.join(', ')}`);
  console.log(`  Target Industries : ${query.targetIndustries.join(', ')}`);
  console.log(`  Seniority Level   : ${query.seniorityLevel}`);

  const provider = new GeminiSearchDiscoveryProvider();
  const startTime = Date.now();

  console.log('\nExecuting live Google Search grounded query via Gemini API...');

  try {
    const jobs = await provider.discoverJobs(query);
    const durationMs = Date.now() - startTime;
    const metrics = provider.lastExecutionMetrics;

    console.log(`\n================== EXECUTION SUMMARY (${durationMs}ms) ==================`);
    console.log(`Provider            : ${provider.name}`);
    console.log(`Grounding Enabled   : YES (Google Search Tool)`);
    console.log(`Search Queries Run  : ${metrics.groundingQueries?.length || 0}`);
    if (metrics.groundingQueries && metrics.groundingQueries.length > 0) {
      metrics.groundingQueries.forEach((q, idx) => console.log(`   ${idx + 1}. "${q}"`));
    }
    console.log(`Total Model Roles   : ${metrics.jobsReturnedByModel}`);
    console.log(`Grounded Roles      : ${metrics.jobsGrounded}`);
    console.log(`URL Valid Roles     : ${metrics.jobsUrlValid}`);
    console.log(`Verified Live Roles : ${metrics.jobsVerifiedLive}`);
    console.log(`Rejected / Expired  : ${metrics.jobsRejected}`);

    console.log('\n================ DISCOVERED ROLES BREAKDOWN ================');
    jobs.forEach((job, idx) => {
      console.log(`\n[Role #${idx + 1}]: ${job.title} at ${job.company}`);
      console.log(`  Location           : ${job.location}`);
      console.log(`  Compensation       : ${job.compensation || 'Not disclosed'}`);
      console.log(`  Verification Status: ${job.verificationStatus.toUpperCase()}`);
      console.log(`  Verification Reason: ${job.verificationReason}`);
      console.log(`  Source Confidence  : ${job.sourceConfidence}%`);
      console.log(`  Source Domain      : ${job.sourceDomain || 'unknown'}`);
      console.log(`  Source / Job URL   : ${job.jobUrl || 'none'}`);
      console.log(`  Posting Date       : ${job.postingDate || 'none'}`);
      console.log(`  Discovery Score    : ${job.relevanceScore}% (${job.relevanceLevel})`);
      if (job.matchedGroundingChunks && job.matchedGroundingChunks.length > 0) {
        console.log(`  Grounding Citations:`);
        job.matchedGroundingChunks.forEach((chunk) => {
          console.log(`    - ${chunk.title || 'Source'} (${chunk.uri || 'no uri'})`);
        });
      }
    });

    console.log('\n===========================================================');
    console.log('LIVE GROUNDED DISCOVERY VERIFICATION COMPLETE');
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    console.error(`\n[FAILURE] Live Discovery failed after ${durationMs}ms:`);
    console.error(`Reason: ${err instanceof Error ? err.message : String(err)}`);
    console.log('\n===========================================================');
    console.log('LIVE GROUNDED DISCOVERY VERIFICATION ENDED WITH ERROR');
  }
}

main();
