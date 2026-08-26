/**
 * Server-side Follow-Up Draft Composer Engine.
 * Generates context-aware, polished communication drafts for executives.
 * Uses Gemini with resilient failover or deterministic templates.
 */

import { getGeminiClient, getGeminiModel, getGeminiFallbackModel, isGeminiConfigured } from './geminiConfig';
import { executeWithResilience, RetryOptions, sanitizeErrorMessage } from './geminiRetry';
import { CandidateProfile } from '@/types/candidate';
import { JobOpportunity } from '@/types/opportunity';
import { FollowUpActionType, FollowUpTone, FollowUpDraft } from '@/types/interview';

export interface FollowUpComposerInput {
  opportunity: JobOpportunity;
  candidate: CandidateProfile;
  actionType: FollowUpActionType;
  tone: FollowUpTone;
  recipientRole?: string;
  recipientName?: string;
  keyPoints?: string[];
  customContext?: string;
}

export class FollowUpComposerEngine {
  async composeDraft(input: FollowUpComposerInput, retryOptions?: RetryOptions): Promise<FollowUpDraft> {
    const primaryModel = getGeminiModel();
    const failoverModel = getGeminiFallbackModel();
    const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const baseMeta = {
      id: draftId,
      recommendationTitle: this.getActionTitle(input.actionType, input.opportunity.company),
      actionType: input.actionType,
      tone: input.tone,
      recipientRole: input.recipientRole || 'Hiring Team',
      keyPoints: input.keyPoints || [],
      opportunityId: input.opportunity.id,
      generatedAt: now,
    };

    if (!isGeminiConfigured()) {
      return {
        ...baseMeta,
        draftText: this.buildDeterministicDraft(input),
        executionMode: 'deterministic',
      };
    }

    try {
      const client = getGeminiClient();
      const prompt = this.buildPrompt(input);

      const result = await executeWithResilience(
        primaryModel,
        failoverModel,
        async (targetModel: string) => {
          const response = await client.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.3,
            },
          });

          const text = response.text;
          if (!text) throw new Error('Empty response from Gemini');
          return JSON.parse(text);
        },
        retryOptions
      );

      const draftText = result.result?.draftText || this.buildDeterministicDraft(input);

      return {
        ...baseMeta,
        draftText,
        executionMode: 'gemini',
      };
    } catch (err) {
      console.error('[FollowUpComposerEngine] Gemini draft failed, using deterministic template:', sanitizeErrorMessage(err));
      return {
        ...baseMeta,
        draftText: this.buildDeterministicDraft(input),
        executionMode: 'deterministic',
      };
    }
  }

  private getActionTitle(type: FollowUpActionType, company: string): string {
    switch (type) {
      case 'thank_you':
        return `Post-Interview Thank You (${company})`;
      case 'recruiter_follow_up':
        return `Recruiter Touchpoint (${company})`;
      case 'post_interview_follow_up':
        return `Post-Interview Status Inquiry (${company})`;
      case 'application_check_in':
        return `Application Check-In (${company})`;
      case 'referral_nudge':
        return `Referral Follow-Up (${company})`;
      case 'networking_outreach':
        return `Executive Networking Outreach (${company})`;
      case 'negotiation_response':
        return `Offer Discussion (${company})`;
      default:
        return `Follow-Up Communication (${company})`;
    }
  }

  private buildPrompt(input: FollowUpComposerInput): string {
    const { opportunity, candidate, actionType, tone, recipientRole, recipientName, keyPoints, customContext } = input;

    return `You are an elite executive communications coach drafting a high-impact email for a senior candidate.

CONTEXT:
Candidate Name: ${candidate.name}
Target Role: ${opportunity.title}
Company: ${opportunity.company}
Current Pipeline Stage: ${opportunity.stage}
Communication Type: ${actionType}
Desired Tone: ${tone} (Options: professional, warm, assertive)
Recipient Name: ${recipientName || 'Hiring Manager/Recruiter'}
Recipient Role: ${recipientRole || 'Decision Maker'}
Key Discussion Points to Include:
${(keyPoints || []).map((p) => `- ${p}`).join('\n') || '- Reiterate alignment and enthusiasm'}
${customContext ? `Additional Context: ${customContext}` : ''}

INSTRUCTIONS:
1. Draft a concise, executive-level email (Subject line + email body).
2. Never invent candidate facts, achievements, or metrics.
3. Ensure the tone matches the requested style (${tone}).
4. Keep the email succinct, polished, and free of corporate clichés.

Output strictly valid JSON with this format:
{
  "subject": "Email Subject Line",
  "draftText": "Subject: ...\\n\\nHi [Name],\\n\\n[Body]\\n\\nBest regards,\\n${candidate.name}"
}`;
  }

  private buildDeterministicDraft(input: FollowUpComposerInput): string {
    const { opportunity, candidate, actionType, recipientName, keyPoints } = input;
    const name = recipientName || 'Hiring Team';
    const candidateName = candidate.name || 'Executive Candidate';
    const pointsText = keyPoints && keyPoints.length > 0
      ? `\n\nSpecifically, I wanted to reinforce:\n${keyPoints.map((p) => `• ${p}`).join('\n')}`
      : '';

    switch (actionType) {
      case 'thank_you':
        return `Subject: Thank You – ${opportunity.title} Discussion

Hi ${name},

Thank you for the opportunity to speak today regarding the ${opportunity.title} role at ${opportunity.company}. I enjoyed our conversation and gained valuable insight into the team's strategic direction.${pointsText}

Our discussion reinforced my enthusiasm for the opportunity, and I am confident my leadership and domain background will deliver immediate impact.

Looking forward to our next steps.

Best regards,
${candidateName}`;

      case 'application_check_in':
        return `Subject: Application Follow-Up – ${opportunity.title} – ${candidateName}

Hi ${name},

I recently submitted my application for the ${opportunity.title} position at ${opportunity.company}. Given my background aligned with your requirements, I wanted to reaffirm my strong interest in the role.${pointsText}

Please let me know if any additional information or work samples would be helpful as you review candidates.

Thank you for your time and consideration.

Best regards,
${candidateName}`;

      case 'recruiter_follow_up':
        return `Subject: Checking In – ${opportunity.title} Interview Process

Hi ${name},

I hope you are having a productive week. Following up on our recent conversation regarding the ${opportunity.title} position at ${opportunity.company}.${pointsText}

I remain very interested in the role and would appreciate any updates on the interview timeline or next steps.

Looking forward to hearing from you.

Best regards,
${candidateName}`;

      case 'referral_nudge':
        return `Subject: Quick Follow-Up – ${opportunity.company} – ${opportunity.title}

Hi ${name},

Hope you are doing well! Following up on our previous note regarding opportunities at ${opportunity.company}.${pointsText}

I would love to reconnect briefly if you have a few minutes this week. Thanks again for your support!

Best,
${candidateName}`;

      default:
        return `Subject: Regarding ${opportunity.title} – ${opportunity.company}

Hi ${name},

I hope this note finds you well. I am following up regarding the ${opportunity.title} position at ${opportunity.company}.${pointsText}

Please let me know if you have a few moments for a brief update on the process.

Best regards,
${candidateName}`;
    }
  }
}
