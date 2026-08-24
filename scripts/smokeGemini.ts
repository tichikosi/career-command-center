import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initialOpportunities } from '../src/data/opportunities';
import { defaultSyntheticCandidateProfile } from '../src/data/candidate';
import { GeminiFitAnalysisEngine } from '../src/lib/server/geminiEngine';
import { getGeminiModel, isGeminiConfigured } from '../src/lib/server/geminiConfig';
import { FitAnalysisReportSchema } from '../src/lib/server/schemas';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

async function main() {
  console.log('=== REAL GEMINI SMOKE VALIDATION ===');
  console.log(`Configured Model : ${getGeminiModel()}`);
  console.log(`Key Configured   : ${isGeminiConfigured() ? 'Yes' : 'No'}`);

  const opp = initialOpportunities[0];
  const engine = new GeminiFitAnalysisEngine();

  const startTime = Date.now();
  try {
    const report = await engine.analyze({
      company: opp.company,
      jobTitle: opp.title,
      jobDescription: opp.rawJobDescription,
      sampleRoleId: opp.id,
      candidateSnapshot: {
        id: defaultSyntheticCandidateProfile.id,
        name: defaultSyntheticCandidateProfile.name,
        headline: defaultSyntheticCandidateProfile.headline,
        location: defaultSyntheticCandidateProfile.location,
        summary: defaultSyntheticCandidateProfile.summary,
        coreCompetencies: defaultSyntheticCandidateProfile.coreCompetencies,
        careerHistory: defaultSyntheticCandidateProfile.careerHistory,
        evidenceItems: defaultSyntheticCandidateProfile.evidenceItems,
        targetRoles: defaultSyntheticCandidateProfile.targetRoles,
        targetIndustries: defaultSyntheticCandidateProfile.targetIndustries,
        preferredLocations: defaultSyntheticCandidateProfile.preferredLocations,
      },
    });
    const duration = Date.now() - startTime;

    console.log(`\nExecution completed in ${duration}ms`);
    console.log(`Overall Fit Score : ${report.overallFitScore}%`);
    console.log(`Recommendation    : ${report.recommendation}`);
    console.log(`Engine Used       : ${report.analysisEngine || 'unknown'}`);
    console.log(`Model ID          : ${report.modelUsed || 'none'}`);
    console.log(`Fallback Used     : ${report.isFallbackAnalysis ? 'Yes' : 'No'}`);
    console.log(`Qualifications cnt: ${report.qualifications?.length || 0}`);
    console.log(`Evidence IDs cited: ${report.qualifications?.reduce((acc, q) => acc + (q.supportingEvidenceCitationIds?.length || 0), 0) || 0}`);
    console.log(`Star Stories cnt  : ${report.recommendedStarStories?.length || 0}`);

    const parseResult = FitAnalysisReportSchema.safeParse(report);
    console.log(`Zod Validation    : ${parseResult.success ? 'PASSED (100% Schema Compliant)' : 'FAILED: ' + JSON.stringify(parseResult.error)}`);
  } catch (err: unknown) {
    console.error('Smoke call threw error:', err instanceof Error ? err.message : String(err));
  }
}

main();
