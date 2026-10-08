'use server';

import { createClient } from '@/lib/supabase/server';
import { Contact, Company, Deal, Activity } from '@/lib/types/crm';

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
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(5);

  const contactName = `${contact.first_name} ${contact.last_name}`.trim();
  const companyName = contact.company?.name || 'your company';
  const industry = contact.company?.industry || 'your market';
  const role = contact.job_title || 'Leader';

  const groundedFacts: string[] = [
    `Contact: ${contactName} (${role})`,
    `Company: ${companyName}${contact.company?.domain ? ` (${contact.company.domain})` : ''}`,
    `Lifecycle Stage: ${contact.lifecycle_stage.toUpperCase()}`,
    `Lead Status: ${contact.lead_status}`,
    activities && activities.length > 0
      ? `Last logged interaction: "${activities[0].title}" on ${new Date(activities[0].created_at).toLocaleDateString()}`
      : 'No prior interactions recorded in CRM',
  ];

  let subject = '';
  let body = '';

  if (options.objective === 'cold_outreach') {
    subject = `Quick question regarding ${companyName}'s growth strategy`;
    body = `Hi ${contact.first_name},

I came across your work as ${role} at ${companyName}. Given the developments in ${industry}, many marketing and revenue leaders are focused on streamlining prospect acquisition and eliminating pipeline friction.

At NexusMark, we help companies in ${industry} consolidate their CRM pipeline and automate prospect engagement without losing personal touch.

Do you have 10 minutes next Tuesday or Wednesday to discuss how ${companyName} is approaching this quarter's growth initiatives?

Best regards,
Growth Team`;
  } else if (options.objective === 'proposal_followup') {
    subject = `Following up on our proposal for ${companyName}`;
    body = `Hi ${contact.first_name},

I wanted to follow up on the proposal we shared regarding our digital marketing collaboration for ${companyName}.

We are confident our strategic pipeline framework can accelerate ${companyName}'s acquisition goals while maintaining healthy unit economics.

Have you had a chance to review the terms with your team? I would be glad to hop on a brief call this week to address any technical questions or adjust the timeline to align with your targets.

Looking forward to hearing from you,
Sales & Marketing`;
  } else if (options.objective === 're_engagement') {
    subject = `Checking in: New growth benchmarks for ${companyName}`;
    body = `Hi ${contact.first_name},

It's been a little while since our last conversation. I wanted to touch base and see how your initiatives at ${companyName} have progressed.

We recently released several new campaign automation capabilities designed specifically to optimize conversion rates for companies like yours.

Would you be open to a 15-minute sync to see if there's an opportunity to revisit our work together?

Warm regards,
NexusMark Team`;
  } else {
    subject = `Checking in with ${contact.first_name} at ${companyName}`;
    body = `Hi ${contact.first_name},

Hope you are having a productive week.

I'm checking in to ensure everything is running smoothly with your marketing operations and to see if there are any upcoming campaign milestones where you could use extra support.

Let me know if there's anything we can assist with!

Best regards,
Client Success Team`;
  }

  return {
    success: true,
    draft: {
      contactName,
      companyName,
      subject,
      body,
      groundedFacts,
    },
  };
}

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
      riskFactors.push(`No activity touchpoints recorded in over 21 days (${daysSinceLastActivity} days silent)`);
      riskScore = 'Critical';
    } else if (daysSinceLastActivity > 10) {
      riskFactors.push(`10+ days without client communication (${daysSinceLastActivity} days)`);
      riskScore = 'High';
    } else if (daysSinceLastActivity > 5) {
      riskFactors.push('Moderate gap since last interaction');
      if (riskScore === 'Low') riskScore = 'Medium';
    }

    if (deal.stage === 'proposal' && daysActive > 30) {
      riskFactors.push(`Deal has lingered in Proposal stage for ${daysActive} days`);
      if (riskScore !== 'Critical') riskScore = 'High';
    }

    if (deal.expected_close_date && new Date(deal.expected_close_date).getTime() < now) {
      riskFactors.push(`Expected close date (${deal.expected_close_date}) has already passed`);
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
    });
  }

  return { success: true, assessments };
}

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

  const summary = `${company.name} is a target organization in the ${company.industry || 'general commercial'} sector with ${totalContacts} tracked stakeholder(s). Total pipeline currently stands at $${openPipelineValue.toLocaleString()} across active deals, with $${wonRevenue.toLocaleString()} in realized revenue.`;

  const keyInsights: string[] = [
    `${totalContacts} active contacts logged in CRM directory.`,
    `Total active open pipeline: $${openPipelineValue.toLocaleString()}`,
    wonRevenue > 0
      ? `Existing customer relationship with $${wonRevenue.toLocaleString()} in historical won business.`
      : 'Prospect stage: no closed-won deals recorded yet.',
  ];

  const actionItems: string[] = [
    totalContacts === 1
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
