'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { JobOpportunity } from '@/types/opportunity';
import { CandidateProfile } from '@/types/candidate';
import { OpportunityActivity, FollowUpTone, FollowUpActionType } from '@/types/interview';
import { evaluateOpportunityFollowUp } from '@/lib/followUpEngine';
import {
  IconMessageSquare,
  IconSparkles,
  IconCopy,
  IconCheck,
  IconUsers,
} from '@/components/icons';

interface FollowUpEngineViewProps {
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  activities: OpportunityActivity[];
  onRecordActivity: (activity: Omit<OpportunityActivity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<OpportunityActivity | null>;
}

export function FollowUpEngineView({
  opportunity,
  candidate,
  activities,
  onRecordActivity,
}: FollowUpEngineViewProps) {
  const recommendations = evaluateOpportunityFollowUp(opportunity, activities);

  const [selectedActionType, setSelectedActionType] = useState<FollowUpActionType>(
    recommendations[0]?.actionType || 'thank_you'
  );
  const [tone, setTone] = useState<FollowUpTone>('professional');
  const [recipientName, setRecipientName] = useState(recommendations[0]?.contactName || '');
  const [recipientRole, setRecipientRole] = useState('Hiring Manager');
  const [customContext, setCustomContext] = useState('');
  const [draftText, setDraftText] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recordedSent, setRecordedSent] = useState(false);

  const handleGenerateDraft = async (typeOverride?: FollowUpActionType) => {
    setIsComposing(true);
    setCopied(false);
    setRecordedSent(false);

    const action = typeOverride || selectedActionType;
    try {
      const res = await fetch('/api/interview/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: {
            id: opportunity.id,
            title: opportunity.title,
            company: opportunity.company,
            stage: opportunity.stage,
          },
          candidateSnapshot: candidate,
          actionType: action,
          tone,
          recipientRole,
          recipientName: recipientName.trim() || undefined,
          customContext: customContext.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.draft?.draftText) {
        setDraftText(data.draft.draftText);
      }
    } catch (err) {
      console.error('[FollowUpEngineView] Compose error:', err);
    } finally {
      setIsComposing(false);
    }
  };

  const handleCopy = () => {
    if (!draftText) return;
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRecordAsSent = async () => {
    if (!draftText || recordedSent) return;

    await onRecordActivity({
      opportunityId: opportunity.id,
      activityType: selectedActionType === 'thank_you' ? 'thank_you_sent' : 'follow_up_sent',
      title: `${selectedActionType === 'thank_you' ? 'Thank-You Note' : 'Follow-Up'} Sent to ${opportunity.company}`,
      notes: draftText,
      occurredAt: new Date().toISOString(),
      contactName: recipientName || undefined,
      source: 'user',
    });

    setRecordedSent(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <IconMessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Smart Follow-Up Engine & AI Draft Composer</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Deterministic recommendations derived from your timeline activity, with tailored executive email drafting.
        </p>
      </div>

      {/* Recommended Next Touchpoints */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Recommended Next Touchpoints ({recommendations.length})
        </h4>

        {recommendations.length === 0 ? (
          <Card padding="md" className="text-xs text-slate-500 text-center py-6">
            No urgent follow-up required at this stage. You are up to date!
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <Card
                key={i}
                padding="md"
                className={`space-y-2 cursor-pointer transition-all ${
                  selectedActionType === rec.actionType
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'hover:border-slate-300'
                }`}
                onClick={() => {
                  setSelectedActionType(rec.actionType);
                  if (rec.contactName) setRecipientName(rec.contactName);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{rec.title}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      rec.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : rec.priority === 'high'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {rec.priority}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{rec.rationale}</p>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  {rec.contactName ? (
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                      <IconUsers className="w-3 h-3" />
                      <span>{rec.contactName}</span>
                    </span>
                  ) : <span />}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedActionType(rec.actionType);
                      if (rec.contactName) setRecipientName(rec.contactName);
                      handleGenerateDraft(rec.actionType);
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <IconSparkles className="w-3 h-3" />
                    <span>Draft This</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Composer Section */}
      <Card padding="lg" className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Executive Draft Composer
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Message Type</label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value as FollowUpActionType)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="thank_you">Post-Interview Thank You</option>
              <option value="recruiter_follow_up">Recruiter Check-In</option>
              <option value="post_interview_follow_up">Status Inquiry after Round</option>
              <option value="application_check_in">Application Follow-Up</option>
              <option value="referral_nudge">Referral Nudge</option>
              <option value="networking_outreach">Executive Networking Outreach</option>
              <option value="negotiation_response">Offer / Negotiation Discussion</option>
              <option value="general_follow_up">General Follow-Up</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Recipient Name</label>
            <input
              type="text"
              placeholder="e.g. Marcus Vance"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Recipient Role / Context</label>
            <input
              type="text"
              placeholder="e.g. VP of Product / Lead Recruiter"
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as FollowUpTone)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none"
            >
              <option value="professional">Professional & Direct</option>
              <option value="warm">Warm & Conversational</option>
              <option value="assertive">Strategic & Assertive</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Specific Discussion Point or Context (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Referenced Q3 roadmap discussion regarding enterprise LLM governance"
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none text-xs"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleGenerateDraft()}
            disabled={isComposing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <IconSparkles className="w-3.5 h-3.5" />
            <span>{isComposing ? 'Generating Tailored Draft...' : 'Generate Communication Draft'}</span>
          </button>
        </div>

        {/* Draft Output Box */}
        {draftText && (
          <div className="space-y-3 pt-2 animate-in fade-in duration-150">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Draft Preview (Ready to Copy):
            </label>
            <textarea
              rows={8}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <span className="text-[11px] text-slate-400">
                No automatic emails are sent. Copy this text into your email client.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRecordAsSent}
                  disabled={recordedSent}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <IconCheck className="w-3.5 h-3.5" />
                  <span>{recordedSent ? 'Recorded in Timeline' : 'Record as Sent'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
