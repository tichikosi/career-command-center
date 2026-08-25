/**
 * Smart Follow-Up Engine & Next Best Action Calculator.
 * Implements deterministic prioritization based on opportunity stages, activities,
 * explicit follow-up dates, and candidate fit.
 */

import { JobOpportunity } from '@/types/opportunity';
import {
  OpportunityActivity,
  SmartFollowUpRecommendation,
  NextBestAction,
  InterviewPreparation,
} from '@/types/interview';
import { classifyFollowUpDate } from '@/lib/dateUtils';

/**
 * Evaluates a single opportunity and its activity history to generate smart follow-up recommendations.
 */
export function evaluateOpportunityFollowUp(
  opportunity: JobOpportunity,
  activities: OpportunityActivity[] = [],
  prep?: InterviewPreparation | null,
): SmartFollowUpRecommendation[] {
  const recommendations: SmartFollowUpRecommendation[] = [];
  const now = Date.now();

  // Sort activities by occurredAt descending (latest first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  const latestActivity = sortedActivities[0] || null;
  const daysSinceLatest = latestActivity
    ? Math.floor((now - new Date(latestActivity.occurredAt).getTime()) / (1000 * 60 * 60 * 24))
    : Math.floor((now - new Date(opportunity.updatedAt || opportunity.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const followUpClassification = classifyFollowUpDate(opportunity.followUpDate);

  // 1. SUPPRESSION: Suppress routine follow-ups for Archived / Rejected / Withdrawn
  const hasDecisionOrWithdrawal = sortedActivities.some(
    (a) => a.activityType === 'rejection_received' || a.activityType === 'withdrawal'
  );
  if (opportunity.stage === 'Archived' || hasDecisionOrWithdrawal) {
    return [];
  }

  // 2. EXPLICIT OVERDUE FOLLOW-UP DATE
  if (followUpClassification === 'Overdue' && opportunity.followUpDate) {
    recommendations.push({
      actionType: 'general_follow_up',
      title: `Overdue Follow-Up with ${opportunity.company}`,
      rationale: `You set an explicit follow-up date for ${opportunity.followUpDate}, which is now overdue.`,
      dueDate: opportunity.followUpDate,
      priority: 'urgent',
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      company: opportunity.company,
    });
  } else if (followUpClassification === 'Due Today' && opportunity.followUpDate) {
    recommendations.push({
      actionType: 'general_follow_up',
      title: `Follow-Up Due Today: ${opportunity.company}`,
      rationale: `Scheduled follow-up target date is today (${opportunity.followUpDate}).`,
      dueDate: opportunity.followUpDate,
      priority: 'high',
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      company: opportunity.company,
    });
  }

  // Check recent interview completion vs thank-you status
  const recentCompletedInterview = sortedActivities.find(
    (a) => a.activityType === 'interview_completed'
  );
  const recentThankYou = sortedActivities.find(
    (a) => a.activityType === 'thank_you_sent'
  );

  const hasPendingThankYou =
    recentCompletedInterview &&
    (!recentThankYou ||
      new Date(recentCompletedInterview.occurredAt).getTime() >
        new Date(recentThankYou.occurredAt).getTime());

  if (hasPendingThankYou) {
    const daysSinceInterview = Math.floor(
      (now - new Date(recentCompletedInterview.occurredAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    recommendations.push({
      actionType: 'thank_you',
      title: `Send Thank-You Note to ${opportunity.company}`,
      rationale: `You completed an interview on ${recentCompletedInterview.occurredAt.split('T')[0]}. Sending a tailored thank-you within 24-48 hours reinforces key value themes.`,
      priority: daysSinceInterview <= 2 ? 'urgent' : 'high',
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      company: opportunity.company,
      contactId: recentCompletedInterview.contactId,
      contactName: recentCompletedInterview.contactName,
    });
  }

  // Check scheduled upcoming interview
  const upcomingScheduledInterview = sortedActivities.find((a) => {
    if (a.activityType !== 'interview_scheduled') return false;
    const targetTime = a.scheduledFor
      ? new Date(a.scheduledFor).getTime()
      : new Date(a.occurredAt).getTime();
    return targetTime >= now - 1000 * 60 * 60 * 4; // upcoming or within last 4h
  });

  if (upcomingScheduledInterview) {
    const prepComplete = prep && !prep.isPotentiallyStale;
    if (!prepComplete) {
      recommendations.push({
        actionType: 'post_interview_follow_up',
        title: `Prepare for Upcoming Interview: ${opportunity.company}`,
        rationale: `An interview is scheduled for ${upcomingScheduledInterview.scheduledFor || upcomingScheduledInterview.occurredAt.split('T')[0]}, but preparation is incomplete or unreviewed.`,
        priority: 'urgent',
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        company: opportunity.company,
        contactId: upcomingScheduledInterview.contactId,
        contactName: upcomingScheduledInterview.contactName,
      });
    }
  }

  // Stage-based Follow-Up Logic
  switch (opportunity.stage) {
    case 'Applied': {
      // If applied more than 7 days ago and no recruiter contact recorded
      const hasRecruiterContact = sortedActivities.some(
        (a) => a.activityType === 'recruiter_contact' || a.activityType === 'interview_scheduled'
      );
      if (!hasRecruiterContact && daysSinceLatest >= 7) {
        recommendations.push({
          actionType: 'application_check_in',
          title: `Application Status Check-In (${daysSinceLatest}d silent)`,
          rationale: `Application submitted ${daysSinceLatest} days ago with no updates. A brief, polite check-in or networking outreach can revive momentum.`,
          priority: daysSinceLatest >= 14 ? 'high' : 'medium',
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          company: opportunity.company,
        });
      }
      break;
    }

    case 'Screening': {
      const latestRecruiterContact = sortedActivities.find(
        (a) => a.activityType === 'recruiter_contact'
      );
      if (latestRecruiterContact && daysSinceLatest >= 5) {
        recommendations.push({
          actionType: 'recruiter_follow_up',
          title: `Follow Up with Recruiter (${opportunity.company})`,
          rationale: `Last recruiter communication was ${daysSinceLatest} days ago. Inquire about next steps and scheduling for round 1.`,
          priority: daysSinceLatest >= 8 ? 'high' : 'medium',
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          company: opportunity.company,
          contactId: latestRecruiterContact.contactId,
          contactName: latestRecruiterContact.contactName,
        });
      }
      break;
    }

    case 'Interviewing': {
      if (!hasPendingThankYou && daysSinceLatest >= 5) {
        recommendations.push({
          actionType: 'post_interview_follow_up',
          title: `Status Inquiry after Round (${daysSinceLatest}d since activity)`,
          rationale: `5+ days have passed since your last recorded interview milestone. Reach out for a status check.`,
          priority: 'medium',
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          company: opportunity.company,
        });
      }
      break;
    }

    case 'Offer': {
      // Offer stage follow-up
      if (daysSinceLatest >= 3) {
        recommendations.push({
          actionType: 'negotiation_response',
          title: `Offer Decision / Negotiation Follow-Up`,
          rationale: `Offer active. Ensure all compensation items, start date, and terms are reviewed.`,
          priority: 'high',
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          company: opportunity.company,
        });
      }
      break;
    }

    default:
      break;
  }

  // Check referral requests that went stale
  const referralOutreach = sortedActivities.find((a) => a.activityType === 'referral_activity');
  if (referralOutreach && daysSinceLatest >= 6 && opportunity.stage === 'Identified') {
    recommendations.push({
      actionType: 'referral_nudge',
      title: `Nudge Referral Contact at ${opportunity.company}`,
      rationale: `Referral inquiry made ${daysSinceLatest} days ago with no further activity recorded. A gentle follow-up is recommended.`,
      priority: 'low',
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      company: opportunity.company,
      contactId: referralOutreach.contactId,
      contactName: referralOutreach.contactName,
    });
  }

  return recommendations;
}

/**
 * Deterministically evaluates all active opportunities and generates global
 * Next Best Career Actions ordered by strategic urgency.
 */
export function calculateNextBestActions(
  opportunities: JobOpportunity[],
  activitiesMap: Map<string, OpportunityActivity[]> = new Map(),
  prepsMap: Map<string, InterviewPreparation> = new Map(),
): NextBestAction[] {
  const actions: NextBestAction[] = [];

  const activeOpportunities = opportunities.filter((o) => o.stage !== 'Archived');

  for (const opp of activeOpportunities) {
    const activities = activitiesMap.get(opp.id) || [];
    const prep = prepsMap.get(opp.id) || null;
    const recommendations = evaluateOpportunityFollowUp(opp, activities, prep);

    for (const rec of recommendations) {
      let category: NextBestAction['category'] = 'routine_action';
      let urgency = 40;
      let actionLabel = 'Take Action';

      if (rec.priority === 'urgent' && rec.actionType === 'general_follow_up') {
        category = 'overdue_follow_up';
        urgency = 95;
        actionLabel = 'Follow Up Now';
      } else if (rec.title.includes('Prepare for Upcoming Interview')) {
        category = 'interview_prep_needed';
        urgency = 90;
        actionLabel = 'Enter War Room';
      } else if (rec.actionType === 'thank_you') {
        category = 'post_interview_thank_you';
        urgency = 85;
        actionLabel = 'Draft Thank-You';
      } else if (rec.actionType === 'recruiter_follow_up' || rec.actionType === 'post_interview_follow_up') {
        category = 'active_interview_follow_up';
        urgency = 75;
        actionLabel = 'Draft Follow-Up';
      } else if (rec.actionType === 'application_check_in') {
        category = 'stale_application';
        urgency = 60;
        actionLabel = 'Check Status';
      } else if (rec.actionType === 'referral_nudge') {
        category = 'networking_first';
        urgency = 55;
        actionLabel = 'Nudge Contact';
      }

      actions.push({
        category,
        title: rec.title,
        description: rec.rationale,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        company: opp.company,
        urgency,
        actionLabel,
      });
    }

    // Check for high-fit unapplied roles in Identified stage
    if (opp.stage === 'Identified' && opp.analysis?.overallFitScore >= 80) {
      const isNetworkFirst = opp.analysis.recommendation === 'Network First';
      actions.push({
        category: isNetworkFirst ? 'networking_first' : 'high_fit_unapplied',
        title: isNetworkFirst
          ? `Network into ${opp.company} (${opp.analysis.overallFitScore}% Fit)`
          : `Apply to ${opp.title} at ${opp.company} (${opp.analysis.overallFitScore}% Fit)`,
        description: `Strong fit score of ${opp.analysis.overallFitScore}%. ${
          isNetworkFirst
            ? 'Candidate recommendation suggests networking before direct application.'
            : 'Role fits core competencies well with high placement probability.'
        }`,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        company: opp.company,
        urgency: isNetworkFirst ? 65 : 70,
        actionLabel: isNetworkFirst ? 'View Network' : 'Prepare Application',
      });
    }
  }

  // Sort by urgency descending
  return actions.sort((a, b) => b.urgency - a.urgency);
}
