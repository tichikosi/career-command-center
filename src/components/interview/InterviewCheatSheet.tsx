'use client';

import React, { useState } from 'react';
import { JobOpportunity, FitAnalysisReport } from '@/types/opportunity';
import { CandidateProfile } from '@/types/candidate';
import { InterviewPreparation, OpportunityActivity } from '@/types/interview';
import {
  IconSparkles,
  IconCheckCircle,
  IconPrinter,
  IconCopy,
  IconTarget,
  IconShield,
} from '@/components/icons';
import { formatShortDate } from '@/lib/dateUtils';

interface InterviewCheatSheetProps {
  opportunity: JobOpportunity;
  candidate?: CandidateProfile;
  activePrep: InterviewPreparation;
  analysisReport?: FitAnalysisReport;
  activities?: OpportunityActivity[];
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export function InterviewCheatSheet({
  opportunity,
  activePrep,
  activities = [],
  onRefresh,
  isRefreshing = false,
}: InterviewCheatSheetProps) {
  const [copied, setCopied] = useState(false);

  // Derive Interviewer Context from latest scheduled interview activity if present
  const latestInterviewActivity = activities
    .filter((a) => a.activityType === 'interview_scheduled' || a.activityType === 'interview_completed')
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];

  const interviewerName = latestInterviewActivity?.contactName || opportunity.notes?.match(/Interviewer:\s*([^\n]+)/i)?.[1] || undefined;
  const scheduledTime = latestInterviewActivity?.scheduledFor || latestInterviewActivity?.occurredAt;

  // Build high-signal synthesis sections
  const roleTitle = opportunity.title;
  const company = opportunity.company;
  const stage = opportunity.stage;

  // 1. Goal
  const interviewGoal =
    `Establish strategic leadership credibility as a transformation executive capable of executing the ${roleTitle} mandate at ${company}, grounding all discussion in verifiable evidence and quantified business impact.`;

  // 2. Snapshot
  const snapshotBullets = [
    `Mandate: ${activePrep.executiveRoleBrief || opportunity.analysis?.likelyMandate || 'Lead core strategic execution and operational scaling.'}`,
    `Strategic Priority: Drive alignment across functional stakeholders to accelerate growth and operational efficiency.`,
    `Evaluation Focus: Assessing executive judgment, domain fluency, and ability to translate strategic vision into measurable outcomes.`,
    ...(opportunity.location ? [`Location / Working Model: ${opportunity.location}`] : []),
    ...(opportunity.compensation ? [`Target Compensation: ${opportunity.compensation}`] : []),
  ];

  // 3. 30-Second Pitch
  const pitch30Sec = activePrep.candidatePositioning ||
    `I am an enterprise transformation leader with a proven record of driving operational rigor, aligning cross-functional teams, and delivering quantified commercial outcomes. In this role at ${company}, I bridge strategy and execution to scale sustainable business impact.`;

  // 4. Top Messages to Land
  const topMessages = activePrep.strongestFitThemes.slice(0, 5).map((theme) => `Land ${theme} as a core pillar of your leadership model.`);
  if (topMessages.length === 0) {
    topMessages.push(
      `Proven track record executing high-stakes strategic initiatives`,
      `Ability to navigate complex matrixed stakeholder landscapes`,
      `Commercial and operational rigor grounded in measurable metrics`,
      `Direct domain alignment with ${company}'s current market trajectory`
    );
  }

  // 5. What They Are Likely Testing
  const likelyTestingThemes = [
    { theme: 'Strategic Altitude & Vision', desc: 'Can you frame problems at the executive level before diving into operational detail?' },
    { theme: 'Operational Execution & Rigor', desc: 'Can you build sustainable operating cadences and hold cross-functional teams accountable?' },
    { theme: 'Cross-Functional Stakeholder Influence', desc: 'How do you navigate conflict between Product, Engineering, and GTM leaders?' },
    { theme: 'Trade-Off & Prioritization Judgment', desc: 'Do you demonstrate clear framework-driven trade-offs when resources or timelines are constrained?' },
    { theme: 'Evidence Specificity & Grounding', desc: 'Are your examples backed by real metrics, or do they stay theoretical?' },
    { theme: 'Executive Presence & Concision', desc: 'Do you lead with the conclusion (bottom-line first) and maintain concise delivery?' },
  ];

  // 7. High-Probability Questions
  const priorityQuestions = activePrep.questions.slice(0, 8);

  // 8. Best Story / Talk Track Map
  const storyMap = activePrep.storyBank.slice(0, 4).map((s) => {
    const isRedundant =
      s.situation.trim().toLowerCase() === s.action.trim().toLowerCase() ||
      s.situation.includes(s.action) ||
      s.action.includes(s.situation);
    return {
      theme: s.title,
      situation: s.situation,
      action: s.action,
      result: s.result,
      isRedundant,
      citation: s.evidenceIds?.[0] || 'Candidate Profile',
    };
  });

  // 9. Material Gaps & Defense
  const gapDefense = activePrep.materialGaps.slice(0, 3);

  // 10. Smart Questions to Ask
  const questionsToAsk = [
    `What does exceptional success look like for this ${roleTitle} in the first 6 to 12 months?`,
    `Where do you see the greatest operational bottleneck or strategic tension in scaling this function today?`,
    `How does the leadership team balance short-term execution velocity against long-term architectural/strategic investments?`,
    `What is the most critical cross-functional relationship this role must establish and nurture immediately upon joining?`,
  ];

  // 11. Tone & Executive Presence
  const toneReminders = [
    'Answer-First Delivery: State your conclusion or framework in sentence 1; elaborate with evidence in sentence 2-3.',
    'Executive Altitude: Keep the focus on business outcomes, organizational leverage, and strategic trade-offs.',
    'Quantified Evidence: Cite concrete metrics (%, $, headcount, cycle times) from your verified background.',
    'Active Listening: Pause before answering complex questions; acknowledge nuance before providing your structured point of view.',
  ];

  // 12. Final 5-Minute Reminders
  const finalReminders = [
    'Take a breath — you have deep, verified evidence behind every claim.',
    'Speak slowly and deliberately. Fast talking conveys anxiety; paced delivery conveys authority.',
    'If a question is vague, clarify the core constraint before answering.',
    'Remember your 3 top value pillars — weave them naturally into your stories.',
  ];

  // Copy Full Cheat Sheet Markdown
  const handleCopyMarkdown = async () => {
    const md = `# INTERVIEW CHEAT SHEET: ${roleTitle} @ ${company}
Generated: ${formatShortDate(activePrep.generatedAt)} | Stage: ${stage}

## 1. INTERVIEW GOAL
${interviewGoal}

## 2. 30-SECOND ELEVATOR PITCH
${pitch30Sec}

## 3. COMPANY & ROLE SNAPSHOT
${snapshotBullets.map((b) => `- ${b}`).join('\n')}

## 4. TOP MESSAGES TO LAND
${topMessages.map((m) => `- ${m}`).join('\n')}

## 5. WHAT THEY ARE TESTING
${likelyTestingThemes.map((t) => `- **${t.theme}**: ${t.desc}`).join('\n')}

## 6. HIGH-PROBABILITY QUESTIONS
${priorityQuestions.map((q, i) => `${i + 1}. [${q.category.toUpperCase()}] ${q.question}\n   *Suggested Approach*: ${q.suggestedApproach}`).join('\n\n')}

## 7. STAR STORY BANK
${storyMap.map((s, i) => `### Story ${i + 1}: ${s.theme} (${s.citation})\n- **Situation/Task**: ${s.situation}\n- **Action Taken**: ${s.action}\n- **Quantified Result**: ${s.result}`).join('\n\n')}

## 8. MATERIAL GAPS & DEFENSE
${gapDefense.map((g) => `### Gap: ${g.gap}\n- **Bridge Strategy**: ${g.bridgeStrategy}\n- **Supporting Evidence**: ${g.supportingEvidenceIds?.join(', ') || 'N/A'}`).join('\n\n')}

## 9. SMART QUESTIONS TO ASK INTERVIEWER
${questionsToAsk.map((q, i) => `${i + 1}. ${q}`).join('\n')}

## 10. EXECUTIVE PRESENCE & FINAL REMINDERS
${toneReminders.map((r) => `- ${r}`).join('\n')}
${finalReminders.map((r) => `- ${r}`).join('\n')}
`;

    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="cheat-sheet-print-container">
      {/* Control Bar (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl print:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg">
            <IconTarget className="w-5 h-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold">Executive Interview Cheat Sheet</h4>
            <p className="text-[11px] text-slate-300">
              High-signal briefing for the final 5–15 minutes before your conversation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <IconCopy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <IconPrinter className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              <IconSparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable Executive Cheat Sheet Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-7 shadow-xs print:border-none print:p-0 print:space-y-4 print:shadow-none text-slate-900 dark:text-slate-100">
        {/* Section A: Role Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 space-y-1.5 print:pb-2 print-card">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 print:text-black">
              Executive Pre-Interview Briefing
            </span>
            <span className="print:text-slate-600">Generated: {formatShortDate(activePrep.generatedAt)}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight print:text-xl print:text-black">{roleTitle}</h2>
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 mt-0.5 print:text-slate-800 print:text-xs">
                <span>{company}</span>
                <span>•</span>
                <span className="text-indigo-600 dark:text-indigo-400 print:text-black">Stage: {stage}</span>
                {opportunity.location && (
                  <>
                    <span>•</span>
                    <span>{opportunity.location}</span>
                  </>
                )}
              </div>
            </div>

            {interviewerName && (
              <div className="text-xs bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 print:bg-white print:border-slate-300 print:p-1.5">
                <span className="font-semibold block text-slate-900 dark:text-slate-100 print:text-black">Interviewer: {interviewerName}</span>
                {scheduledTime && <span className="text-slate-500 dark:text-slate-400 text-[11px] print:text-slate-600">{formatShortDate(scheduledTime)}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Section B & D: Goal & 30-Second Pitch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-3 print-card">
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl space-y-1.5 print:bg-slate-50 print:border-slate-300 print:p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 print:text-black">
              <IconTarget className="w-3.5 h-3.5 print:hidden" />
              <span>Conversation Goal</span>
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed print:text-[9.5pt] print:text-slate-900">
              {interviewGoal}
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 print:bg-slate-50 print:border-slate-300 print:p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-black">
              30-Second Executive Positioning Pitch
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic print:text-[9.5pt] print:text-slate-800">
              &ldquo;{pitch30Sec}&rdquo;
            </p>
          </div>
        </div>

        {/* Section C & E: Snapshot & Top Messages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:gap-4 print-card">
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
              Role Mandate & Company Context
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 print:text-[9.5pt] print:text-slate-800">
              {snapshotBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5 print:bg-black" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
              Core Messages to Land
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 print:text-[9.5pt] print:text-slate-800">
              {topMessages.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 print:text-black" />
                  <span className="font-medium">{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section G: What They Are Likely Testing */}
        <div className="space-y-2.5 print-card">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
            What They Are Testing (Evaluation Dimensions)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 print:grid-cols-3">
            {likelyTestingThemes.map((t, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs space-y-1 print:bg-white print:border print:border-slate-200">
                <span className="font-bold text-slate-900 dark:text-slate-100 block print:text-black">{t.theme}</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-snug print:text-slate-700 print:text-[9pt]">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section H: High-Probability Questions & Strategies */}
        <div className="space-y-2.5 print-card">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
            Anticipated High-Probability Questions ({priorityQuestions.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 print:grid-cols-2">
            {priorityQuestions.map((q, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-1 text-xs print:bg-white print:border-slate-300 print:p-2.5 print-card">
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase print:text-black">
                  <span>Q{idx + 1} • {q.category}</span>
                </div>
                <p className="font-bold text-slate-900 dark:text-slate-100 leading-snug print:text-black print:text-[9.5pt]">{q.question}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-700 print:text-[9pt]">
                  <strong className="text-slate-700 dark:text-slate-300 print:text-black">Approach:</strong> {q.suggestedApproach}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Section I: Best Story & Evidence Map */}
        <div className="space-y-2.5 print-card">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
            Grounded STAR Story Map
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs print:grid-cols-2">
            {storyMap.map((s, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-1 print:bg-white print:border-slate-300 print:p-2.5 print-card">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-slate-100 print:text-black">{s.theme}</span>
                  <span className="text-[10px] font-semibold text-slate-400 print:text-slate-600">{s.citation}</span>
                </div>
                <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300 print:text-slate-800 print:text-[9pt]">
                  {s.isRedundant ? (
                    <p><strong className="text-slate-700 dark:text-slate-200 print:text-black">Context & Action:</strong> {s.action || s.situation}</p>
                  ) : (
                    <>
                      <p><strong className="text-slate-700 dark:text-slate-200 print:text-black">Situation:</strong> {s.situation}</p>
                      <p><strong className="text-slate-700 dark:text-slate-200 print:text-black">Action:</strong> {s.action}</p>
                    </>
                  )}
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 print:text-emerald-900">
                    <strong className="print:text-black">Result:</strong> {s.result}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section J: Material Gap Mitigation */}
        {gapDefense.length > 0 && (
          <div className="space-y-2.5 print-card">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
              Material Gap Defense & Bridge Language
            </h4>
            <div className="space-y-2 text-xs">
              {gapDefense.map((g, idx) => (
                <div key={idx} className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-1 print:bg-white print:border-slate-300 print:p-2.5 print-card">
                  <div className="flex items-center justify-between font-bold text-amber-900 dark:text-amber-200 print:text-black">
                    <span>{g.gap}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 print:text-slate-800 print:text-[9pt]">
                    <strong className="print:text-black">Bridge Strategy:</strong> {g.bridgeStrategy}
                  </p>
                  {g.supportingEvidenceIds && g.supportingEvidenceIds.length > 0 && (
                    <p className="text-[10px] text-indigo-900 dark:text-indigo-300 italic bg-white dark:bg-slate-900 p-1.5 rounded border border-amber-100 dark:border-slate-800 print:bg-slate-50 print:border-slate-200">
                      Supporting Evidence: {g.supportingEvidenceIds.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section K & N: Questions to Ask & Tone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:gap-3 print-card">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
              Smart Questions to Ask the Interviewer
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 print:text-[9pt] print:text-slate-800">
              {questionsToAsk.map((q, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 print:text-black">{i + 1}.</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 print:border-slate-200 print:text-black">
              Tone & Executive Presence Anchors
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 print:text-[9pt] print:text-slate-800">
              {toneReminders.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <IconShield className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5 print:hidden" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section O: Final 5-Minute Reminders */}
        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/60 rounded-xl space-y-1.5 text-xs print:bg-white print:border-slate-300 print:p-2.5 print-card">
          <span className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center gap-1.5 print:text-black">
            <IconCheckCircle className="w-3.5 h-3.5 print:hidden" />
            <span>Final Pre-Interview Checklist</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-700 dark:text-slate-300 print:text-[9pt] print:text-slate-800">
            {finalReminders.map((rem, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5 print:bg-black" />
                <span>{rem}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 print:text-slate-500 print-card">
          <span>Career Command Center V3.4 — Grounded Executive Intelligence</span>
          <span>Confidential Candidate Briefing</span>
        </div>
      </div>
    </div>
  );
}
