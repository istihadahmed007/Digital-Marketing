'use server';

import { createClient } from '@/lib/supabase/server';
import { AiClient } from '@/lib/integrations/ai/client';
import { decryptSecret } from '@/lib/security/crypto';

export interface OutreachDraftResult {
  contactName: string;
  companyName: string;
  subject: string;
  body: string;
  groundedFacts: string[];
}

export interface DealHealthAssessment {
  dealId: string;
  dealTitle: string;
  companyName: string;
  amount: number;
  stage: string;
  daysActive: number;
  daysSinceLastActivity: number;
  riskScore: 'Low' | 'Medium' | 'High' | 'Critical';
  riskFactors: string[];
  recommendedAction: string;
  calculationType: string;
}

export interface AccountBriefingResult {
  companyName: string;
  domain: string | null;
  totalContacts: number;
  openPipelineValue: number;
  wonRevenue: number;
  summary: string;
  keyInsights: string[];
  actionItems: string[];
}

export async function generateOutreachDraft(
  workspaceId: string,
  contactId: string,
  options: {
    objective: 'cold_outreach' | 'proposal_followup' | 're_engagement' | 'check_in';
    tone?: 'professional' | 'consultative' | 'urgent';
  }
): Promise<{ success: boolean; draft?: OutreachDraftResult; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  // 1. Fetch grounded contact & company data
  const { data: contact, error: contactErr } = await supabase
    .from('contacts')
    .select('*, company:companies(*)')
    .eq('workspace_id', workspaceId)
    .eq('id', contactId)
    .single();

  if (contactErr || !contact) {
    return { success: false, error: 'Contact not found' };
  }

  // 2. Fetch last 5 activities
  const { data: activities } = await supabase
    .from('activities')
    .select('title, created_at, type')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(5);

  // 3. Fetch active deals for this contact or company
  const { data: deals } = await supabase
    .from('deals')
    .select('title, amount, stage')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .eq('is_archived', false)
    .limit(3);

  // 4. Resolve AI provider credentials
  const { data: aiInteg } = await supabase
    .from('seo_integrations')
    .select('config, is_connected')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'openai')
    .maybeSingle();

  let apiKey = process.env.OPENAI_API_KEY || '';
  if (aiInteg?.config?.apiKey) {
    apiKey = decryptSecret(aiInteg.config.apiKey) || aiInteg.config.apiKey;
  }
  const baseUrl = aiInteg?.config?.baseUrl || process.env.OPENAI_BASE_URL || '';
  const model = aiInteg?.config?.model || process.env.OPENAI_MODEL || '';

  const aiClient = new AiClient(apiKey, baseUrl, model);
  if (!aiClient.isConfigured()) {
    return {
      success: false,
      error: aiClient.getSetupInstructions(),
    };
  }

  const contactName = `${contact.first_name} ${contact.last_name || ''}`.trim();
  const companyName = contact.company?.name || 'Independent Account';

  const res = await aiClient.generateOutreachDraft({
    contactName,
    email: contact.email,
    jobTitle: contact.job_title,
    companyName,
    industry: contact.company?.industry,
    lifecycleStage: contact.lifecycle_stage,
    leadStatus: contact.lead_status,
    activities: (activities || []).map((a) => ({
      title: a.title,
      date: new Date(a.created_at).toLocaleDateString(),
      type: a.type,
    })),
    deals: (deals || []).map((d) => ({
      title: d.title,
      amount: Number(d.amount || 0),
      stage: d.stage,
    })),
    objective: options.objective.replace('_', ' '),
    tone: options.tone,
  });

  if (!res.success || !res.draft) {
    return { success: false, error: res.error || 'Failed to generate draft' };
  }

  return {
    success: true,
    draft: {
      contactName,
      companyName,
      subject: res.draft.subject,
      body: res.draft.body,
      groundedFacts: res.draft.groundedFacts,
    },
  };
}

/**
 * Deal Health Analysis
 * Strictly labeled as a rule-based assessment engine rather than simulated AI.
 */
export async function analyzeDealHealth(
  workspaceId: string,
  dealId?: string
): Promise<{ success: boolean; assessments?: DealHealthAssessment[]; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  let query = supabase
    .from('deals')
    .select('*, company:companies(name), contact:contacts(first_name, last_name, email)')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .not('stage', 'in', '("closed_won","closed_lost")');

  if (dealId) {
    query = query.eq('id', dealId);
  }

  const { data: deals, error: dealsErr } = await query;
  if (dealsErr || !deals) {
    return { success: false, error: 'Error fetching deals for health check' };
  }

  const now = Date.now();
  const assessments: DealHealthAssessment[] = [];

  for (const deal of deals) {
    const createdAtMs = new Date(deal.created_at).getTime();
    const daysActive = Math.max(1, Math.floor((now - createdAtMs) / (1000 * 60 * 60 * 24)));

    // Fetch last activity
    const { data: activities } = await supabase
      .from('activities')
      .select('created_at')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false })
      .limit(1);

    let daysSinceLastActivity = daysActive;
    if (activities && activities.length > 0) {
      daysSinceLastActivity = Math.max(
        0,
        Math.floor((now - new Date(activities[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    const riskFactors: string[] = [];
    let riskScore: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';

    if (daysSinceLastActivity > 21) {
      riskFactors.push(`No touchpoints recorded in over 21 days (${daysSinceLastActivity} days silent)`);
      riskScore = 'Critical';
    } else if (daysSinceLastActivity > 10) {
      riskFactors.push(`10+ days without client communication (${daysSinceLastActivity} days)`);
      riskScore = 'High';
    } else if (daysSinceLastActivity > 5) {
      riskFactors.push('Moderate gap since last interaction (5+ days)');
      if (riskScore === 'Low') riskScore = 'Medium';
    }

    if (deal.stage === 'proposal' && daysActive > 30) {
      riskFactors.push(`Deal has lingered in Proposal stage for ${daysActive} days`);
      if (riskScore !== 'Critical') riskScore = 'High';
    }

    if (deal.expected_close_date && new Date(deal.expected_close_date).getTime() < now) {
      riskFactors.push(`Expected close date (${deal.expected_close_date}) has passed`);
      if (riskScore !== 'Critical') riskScore = 'High';
    }

    if (riskFactors.length === 0) {
      riskFactors.push('Regular activity logged; deal moving through pipeline within normal velocity parameters');
    }

    let recommendedAction = 'Schedule a follow-up call to review requirements.';
    if (riskScore === 'Critical') {
      recommendedAction = 'Send executive re-engagement email or check if primary champion changed roles.';
    } else if (riskScore === 'High') {
      recommendedAction = 'Follow up with a customized value proposition or revised proposal deadline.';
    } else if (riskScore === 'Medium') {
      recommendedAction = 'Log next scheduled task and send touchpoint note.';
    }

    assessments.push({
      dealId: deal.id,
      dealTitle: deal.title,
      companyName: deal.company?.name || 'Independent Account',
      amount: Number(deal.amount || 0),
      stage: deal.stage,
      daysActive,
      daysSinceLastActivity,
      riskScore,
      riskFactors,
      recommendedAction,
      calculationType: 'Rule-based heuristic assessment based on velocity, inactivity duration, and target close dates.',
    });
  }

  return { success: true, assessments };
}

/**
 * Account Briefing Generator
 * Strictly calculates totals from verified CRM records without hallucinating facts.
 */
export async function generateAccountBriefing(
  workspaceId: string,
  companyId: string
): Promise<{ success: boolean; briefing?: AccountBriefingResult; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  // Fetch company
  const { data: company, error: compErr } = await supabase
    .from('companies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', companyId)
    .single();

  if (compErr || !company) {
    return { success: false, error: 'Company not found' };
  }

  // Fetch contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, job_title')
    .eq('workspace_id', workspaceId)
    .eq('company_id', companyId)
    .eq('is_archived', false);

  // Fetch deals
  const { data: deals } = await supabase
    .from('deals')
    .select('id, title, amount, stage')
    .eq('workspace_id', workspaceId)
    .eq('company_id', companyId)
    .eq('is_archived', false);

  const totalContacts = contacts?.length || 0;
  let openPipelineValue = 0;
  let wonRevenue = 0;

  (deals || []).forEach((d) => {
    const val = Number(d.amount || 0);
    if (d.stage === 'closed_won') {
      wonRevenue += val;
    } else if (d.stage !== 'closed_lost') {
      openPipelineValue += val;
    }
  });

  const summary = `${company.name} is a tracked organization in the ${company.industry || 'commercial'} sector with ${totalContacts} recorded stakeholder(s). Active open pipeline stands at $${openPipelineValue.toLocaleString()}, with $${wonRevenue.toLocaleString()} in realized revenue.`;

  const keyInsights: string[] = [
    `${totalContacts} active contact(s) logged in CRM directory.`,
    `Total active open pipeline: $${openPipelineValue.toLocaleString()}`,
    wonRevenue > 0
      ? `Existing customer relationship with $${wonRevenue.toLocaleString()} in historical won business.`
      : 'Prospect stage: no closed-won deals recorded yet.',
  ];

  const actionItems: string[] = [
    totalContacts <= 1
      ? 'Expand stakeholder mapping: identify secondary decision makers at the company.'
      : 'Maintain multi-threading with key department heads.',
    openPipelineValue > 0
      ? 'Drive active proposals toward negotiation closing milestones.'
      : 'Initiate new pipeline discovery with primary contact.',
  ];

  return {
    success: true,
    briefing: {
      companyName: company.name,
      domain: company.domain,
      totalContacts,
      openPipelineValue,
      wonRevenue,
      summary,
      keyInsights,
      actionItems,
    },
  };
}
