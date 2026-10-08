import { Contact, Activity, LeadScoreReason } from '@/lib/types/crm';

/**
 * Rule-based lead scoring engine.
 * Computes deterministic score based on profile completeness, job seniority,
 * lifecycle stage, lead source, consent, and interaction frequency.
 * Returns both the total score and transparent list of reasons.
 */
export function calculateLeadScore(
  contact: Partial<Contact>,
  activities: Activity[] = []
): { score: number; reasons: LeadScoreReason[] } {
  const reasons: LeadScoreReason[] = [];
  let score = 0;

  // 1. Profile Completeness
  if (contact.phone && contact.phone.trim().length > 5) {
    score += 15;
    reasons.push({ reason: 'Direct phone number provided', points: 15 });
  }

  if (contact.company_id || (contact.company && contact.company.name)) {
    score += 15;
    reasons.push({ reason: 'Associated with verified company', points: 15 });
  }

  // 2. Job Seniority & Authority
  if (contact.job_title) {
    const title = contact.job_title.toLowerCase();
    const executiveTitles = ['founder', 'ceo', 'cto', 'cmo', 'cro', 'president', 'owner', 'partner'];
    const directorTitles = ['vp', 'vice president', 'director', 'head of', 'lead'];
    const managerTitles = ['manager', 'strategist', 'coordinator'];

    if (executiveTitles.some((t) => title.includes(t))) {
      score += 25;
      reasons.push({ reason: 'C-Level / Founder decision-maker title', points: 25 });
    } else if (directorTitles.some((t) => title.includes(t))) {
      score += 20;
      reasons.push({ reason: 'VP / Director department head title', points: 20 });
    } else if (managerTitles.some((t) => title.includes(t))) {
      score += 10;
      reasons.push({ reason: 'Management stakeholder title', points: 10 });
    }
  }

  // 3. Lifecycle Stage Progress
  if (contact.lifecycle_stage === 'opportunity') {
    score += 35;
    reasons.push({ reason: 'Active opportunity stage in pipeline', points: 35 });
  } else if (contact.lifecycle_stage === 'sql') {
    score += 25;
    reasons.push({ reason: 'Sales Qualified Lead (SQL) stage', points: 25 });
  } else if (contact.lifecycle_stage === 'mql') {
    score += 15;
    reasons.push({ reason: 'Marketing Qualified Lead (MQL) stage', points: 15 });
  }

  // 4. Inbound Source Quality (SEO, Form Ingestion, Referral)
  if (contact.source === 'organic_search') {
    score += 25;
    reasons.push({ reason: 'Inbound organic SEO search acquisition', points: 25 });
  } else if (contact.source === 'form_submission') {
    score += 20;
    reasons.push({ reason: 'Direct inbound lead form submission', points: 20 });
  } else if (contact.source === 'referral') {
    score += 20;
    reasons.push({ reason: 'Customer or partner referral lead', points: 20 });
  } else if (contact.source === 'website') {
    score += 15;
    reasons.push({ reason: 'Direct website prospect conversion', points: 15 });
  }

  // 5. Explicit Marketing Consent
  if (contact.consent_status === 'opted_in') {
    score += 10;
    reasons.push({ reason: 'Explicit marketing communication opt-in', points: 10 });
  }

  // 6. Interaction Velocity from Activities
  const meetingsAndCalls = activities.filter((a) => a.type === 'call' || a.type === 'meeting').length;
  if (meetingsAndCalls > 0) {
    const pts = Math.min(30, meetingsAndCalls * 10);
    score += pts;
    reasons.push({ reason: `${meetingsAndCalls} logged call/meeting interactions`, points: pts });
  }

  const emailsCount = activities.filter((a) => a.type === 'email').length;
  if (emailsCount > 0) {
    const pts = Math.min(20, emailsCount * 5);
    score += pts;
    reasons.push({ reason: `${emailsCount} email correspondence touchpoints`, points: pts });
  }

  // Ensure score is within 0-100 bounds
  const clampedScore = Math.max(0, Math.min(100, score));

  return {
    score: clampedScore,
    reasons,
  };
}
