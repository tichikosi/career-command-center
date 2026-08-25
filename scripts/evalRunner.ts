import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initialOpportunities } from '../src/data/opportunities';
import { defaultSyntheticCandidateProfile } from '../src/data/candidate';
import { GeminiFitAnalysisEngine } from '../src/lib/server/geminiEngine';
import { evaluateReport, BenchmarkEvaluationSummary, ReportEvaluationResult } from '../src/lib/evaluator';
import { getGeminiModel, getGeminiFallbackModel } from '../src/lib/server/geminiConfig';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

export interface DetailedBenchmarkSummary extends BenchmarkEvaluationSummary {
  primaryModel: string;
  failoverModel: string;
  totalRoles: number;
  completedRoles: number;
  liveRuns: number;
  primaryLiveRuns: number;
  failoverLiveRuns: number;
  deterministicFallbackRuns: number;
  liveAverageScore: number | null;
  liveAverageLatencyMs: number | null;
  fallbackAverageScore: number | null;
  fallbackAverageLatencyMs: number | null;
}

async function runEvaluation() {
  console.log('\n======================================================');
  console.log(' CAREER COMMAND CENTER — RESILIENT AI EVALUATION & HARNESS');
  console.log('======================================================\n');

  const args = process.argv.slice(2);
  let limit = 5;
  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    limit = parseInt(args[limitIdx + 1], 10);
  }

  const primaryModel = getGeminiModel();
  const failoverModel = getGeminiFallbackModel();
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

  console.log(`• Primary Target Model : ${primaryModel}`);
  console.log(`• Failover Live Model  : ${failoverModel}`);
  console.log(`• API Key Configured   : ${hasKey ? 'Yes (Server-Side Secure)' : 'No (Deterministic fallback mode)'}`);
  console.log(`• Benchmark Roles      : ${Math.min(limit, initialOpportunities.length)} Roles\n`);

  const engine = new GeminiFitAnalysisEngine();
  const results: ReportEvaluationResult[] = [];

  const rolesToRun = initialOpportunities.slice(0, limit);
  let primaryLiveCount = 0;
  let failoverLiveCount = 0;
  let fallbackCount = 0;

  const liveScores: number[] = [];
  const liveLatencies: number[] = [];
  const fallbackScores: number[] = [];
  const fallbackLatencies: number[] = [];

  for (let i = 0; i < rolesToRun.length; i++) {
    const opp = rolesToRun[i];
    console.log(`[${i + 1}/${rolesToRun.length}] Evaluating: ${opp.title} (${opp.company})...`);

    const startTime = Date.now();
    try {
      const report = await engine.analyze({
        jobTitle: opp.title,
        company: opp.company,
        jobDescription: opp.rawJobDescription,
        location: opp.location,
        compensation: opp.compensation,
        sampleRoleId: opp.id,
        candidateSnapshot: {
          id: defaultSyntheticCandidateProfile.id,
          name: defaultSyntheticCandidateProfile.name,
          headline: defaultSyntheticCandidateProfile.headline,
          location: defaultSyntheticCandidateProfile.location,
          summary: defaultSyntheticCandidateProfile.summary,
          targetRoles: defaultSyntheticCandidateProfile.targetRoles,
          targetIndustries: defaultSyntheticCandidateProfile.targetIndustries,
          preferredLocations: defaultSyntheticCandidateProfile.preferredLocations,
          coreCompetencies: defaultSyntheticCandidateProfile.coreCompetencies,
          careerHistory: defaultSyntheticCandidateProfile.careerHistory,
          evidenceItems: defaultSyntheticCandidateProfile.evidenceItems,
          dataMode: defaultSyntheticCandidateProfile.dataMode,
          updatedAt: defaultSyntheticCandidateProfile.updatedAt,
        },
      });

      const totalLatency = Date.now() - startTime;
      const isLive = report.analysisEngine === 'gemini' && !report.fallbackOccurred;
      const isFailover = report.failoverOccurred === true;

      const evalResult = evaluateReport(
        report,
        defaultSyntheticCandidateProfile,
        opp.id,
        opp.title,
        opp.company
      );

      results.push(evalResult);

      let engineDescription = '';
      if (isLive) {
        if (isFailover) {
          failoverLiveCount++;
          engineDescription = `Live Gemini (Failover: ${report.actualModel})`;
        } else {
          primaryLiveCount++;
          engineDescription = `Live Gemini (Primary: ${report.actualModel})`;
        }
        liveScores.push(evalResult.overallScore);
        liveLatencies.push(totalLatency);
      } else {
        fallbackCount++;
        engineDescription = `Deterministic Fallback (${report.sanitizedFailureReason || 'Fallback rules'})`;
        fallbackScores.push(evalResult.overallScore);
        fallbackLatencies.push(totalLatency);
      }

      console.log(`    ↳ Engine Actually Used  : ${engineDescription}`);
      console.log(`    ↳ Requested Primary     : ${report.requestedModel || primaryModel}`);
      console.log(`    ↳ Actual Model Used     : ${report.actualModel || report.modelUsed || 'deterministic'}`);
      console.log(`    ↳ Total Attempts        : ${report.attemptCount || 1}`);
      console.log(`    ↳ Model Failover Occur. : ${isFailover ? 'YES (Switched to ' + report.actualModel + ')' : 'No'}`);
      console.log(`    ↳ Fallback Occurred     : ${report.fallbackOccurred ? 'YES' : 'No'}`);
      console.log(`    ↳ Quality Score         : ${evalResult.overallScore}/100`);
      console.log(`    ↳ Schema Adherence      : ${evalResult.schemaAdherence.score}%`);
      console.log(`    ↳ Evidence Grounding    : ${evalResult.evidenceGrounding.score}%`);
      console.log(`    ↳ Latency               : ${totalLatency}ms\n`);

      // Respect API rate limits
      if (i < rolesToRun.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err: unknown) {
      console.error(`    ↳ Evaluation Failed for ${opp.id}:`, err instanceof Error ? err.message : err);
    }
  }

  const completedRoles = results.length;
  const liveRuns = primaryLiveCount + failoverLiveCount;

  const liveAvgScore = liveScores.length > 0 ? Math.round(liveScores.reduce((a, b) => a + b, 0) / liveScores.length) : null;
  const liveAvgLatency = liveLatencies.length > 0 ? Math.round(liveLatencies.reduce((a, b) => a + b, 0) / liveLatencies.length) : null;

  const fallbackAvgScore = fallbackScores.length > 0 ? Math.round(fallbackScores.reduce((a, b) => a + b, 0) / fallbackScores.length) : null;
  const fallbackAvgLatency = fallbackLatencies.length > 0 ? Math.round(fallbackLatencies.reduce((a, b) => a + b, 0) / fallbackLatencies.length) : null;

  const compositeScore = completedRoles > 0 ? Math.round(results.reduce((sum, r) => sum + r.overallScore, 0) / completedRoles) : 0;
  const compositeLatency = completedRoles > 0 ? Math.round(results.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / completedRoles) : 0;

  const summary: DetailedBenchmarkSummary = {
    timestamp: new Date().toISOString(),
    model: primaryModel,
    primaryModel,
    failoverModel,
    totalRoles: rolesToRun.length,
    completedRoles,
    successfulEvaluations: completedRoles,
    averageScore: compositeScore,
    averageLatencyMs: compositeLatency,
    liveRuns,
    primaryLiveRuns: primaryLiveCount,
    failoverLiveRuns: failoverLiveCount,
    deterministicFallbackRuns: fallbackCount,
    liveAverageScore: liveAvgScore,
    liveAverageLatencyMs: liveAvgLatency,
    fallbackAverageScore: fallbackAvgScore,
    fallbackAverageLatencyMs: fallbackAvgLatency,
    results,
  };

  // Ensure eval-results directory exists
  const resultsDir = path.resolve(process.cwd(), 'eval-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  // Save JSON
  fs.writeFileSync(path.join(resultsDir, 'latest.json'), JSON.stringify(summary, null, 2));

  // Save Markdown Report
  const markdownReport = generateMarkdownReport(summary);
  fs.writeFileSync(path.join(resultsDir, 'latest.md'), markdownReport);

  console.log('======================================================');
  console.log(' RESILIENT EVALUATION SUMMARY');
  console.log(` • Completed Roles            : ${completedRoles}/${rolesToRun.length}`);
  console.log(` • Gemini Live Total Runs     : ${liveRuns}/${rolesToRun.length}`);
  console.log(`   - Primary (${primaryModel}) : ${primaryLiveCount}`);
  console.log(`   - Failover (${failoverModel}): ${failoverLiveCount}`);
  console.log(` • Deterministic Fallbacks    : ${fallbackCount}/${rolesToRun.length}`);
  console.log(` • Live-Only Avg Quality Score: ${liveAvgScore !== null ? `${liveAvgScore}/100` : 'N/A'}`);
  console.log(` • Live-Only Avg Latency      : ${liveAvgLatency !== null ? `${liveAvgLatency}ms` : 'N/A'}`);
  if (fallbackCount > 0) {
    console.log(` • Fallback Avg Quality Score : ${fallbackAvgScore}/100`);
    console.log(` • Fallback Avg Latency       : ${fallbackAvgLatency}ms`);
  }
  console.log(` • Results Written To         : eval-results/latest.json & eval-results/latest.md`);
  console.log('======================================================\n');
}

function generateMarkdownReport(summary: DetailedBenchmarkSummary): string {
  return `# AI Model Evaluation & Governance Benchmark Report

- **Date / Timestamp**: ${summary.timestamp}
- **Primary Target Model**: \`${summary.primaryModel}\`
- **Failover Target Model**: \`${summary.failoverModel}\`
- **Total Roles Evaluated**: ${summary.completedRoles} / ${summary.totalRoles}
- **Execution Breakdown**:
  - **Live Gemini Total**: **${summary.liveRuns}** (${summary.primaryLiveRuns} Primary, ${summary.failoverLiveRuns} Failover)
  - **Deterministic Fallbacks**: **${summary.deterministicFallbackRuns}**
- **Live-Only Average Quality Score**: **${summary.liveAverageScore !== null ? `${summary.liveAverageScore} / 100` : 'N/A'}**
- **Live-Only Average Latency**: ${summary.liveAverageLatencyMs !== null ? `${summary.liveAverageLatencyMs}ms` : 'N/A'}
${summary.deterministicFallbackRuns > 0 ? `- **Fallback-Only Score**: ${summary.fallbackAverageScore} / 100 (${summary.fallbackAverageLatencyMs}ms)` : ''}

---

## Benchmark Results by Role

| Role Title | Company | Engine Actually Used | Actual Model | Overall Score | Schema Adherence | Evidence Grounding | Hallucination Safety |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
${summary.results
  .map(
    (r) =>
      `| **${r.roleTitle}** | ${r.company} | ${r.modelUsed?.includes('deterministic') ? 'Fallback' : 'Live Gemini'} | \`${r.modelUsed || 'deterministic'}\` | **${r.overallScore}%** | ${r.schemaAdherence.score}% | ${r.evidenceGrounding.score}% | ${r.hallucinationSafety.score}% |`
  )
  .join('\n')}

---

## Detailed Metric Breakdown

${summary.results
  .map(
    (r) => `### ${r.roleTitle} (${r.company})
- **Engine / Model**: \`${r.modelUsed || 'deterministic-synthetic-rules'}\`
- **Overall Score**: ${r.overallScore}/100
- **Schema Adherence**: ${r.schemaAdherence.passed ? '✅ Passed' : '❌ Failed'} (${r.schemaAdherence.score}%)
- **Evidence Grounding**: ${r.evidenceGrounding.passed ? '✅ Passed' : '⚠️ Gaps'} (${r.evidenceGrounding.score}%)
- **Hallucination Safety**: ${r.hallucinationSafety.passed ? '✅ Safe' : '⚠️ Alert'} (${r.hallucinationSafety.score}%)
- **Gap Identification**: ${r.gapIdentification.passed ? '✅ Strong' : '⚠️ Flagged'} (${r.gapIdentification.score}%)
${
  r.schemaAdherence.notes.length > 0
    ? `\n*Schema Notes*:\n${r.schemaAdherence.notes.map((n) => `  - ${n}`).join('\n')}`
    : ''
}
${
  r.evidenceGrounding.notes.length > 0
    ? `\n*Grounding Notes*:\n${r.evidenceGrounding.notes.map((n) => `  - ${n}`).join('\n')}`
    : ''
}
`
  )
  .join('\n\n')}
`;
}

runEvaluation().catch((err: unknown) => {
  console.error('Fatal Evaluation Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
