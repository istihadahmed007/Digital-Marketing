'use server';

import { createClient } from '@/lib/supabase/server';
import { EmailCampaign, CampaignStatus } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';
import { ResendEmailProvider, isValidEmail } from '@/lib/integrations/email/resend';
import { decryptSecret } from '@/lib/security/crypto';

export async function getCampaigns(workspaceId: string): Promise<EmailCampaign[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching campaigns:', error);
    return [];
  }

  return data as EmailCampaign[];
}

export async function getCampaign(workspaceId: string, id: string): Promise<EmailCampaign | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as EmailCampaign;
}

export async function createCampaign(
  workspaceId: string,
  payload: {
    name: string;
    subject: string;
    preview_text?: string;
    content_html?: string;
    scheduled_for?: string | null;
    target_audience?: Record<string, any>;
  }
): Promise<{ success: boolean; campaign?: EmailCampaign; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  if (!payload.name?.trim() || !payload.subject?.trim()) {
    return { success: false, error: 'Campaign name and subject are required.' };
  }

  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({
      workspace_id: workspaceId,
      name: payload.name.trim(),
      subject: payload.subject.trim(),
      preview_text: payload.preview_text?.trim() || null,
      content_html: payload.content_html || '',
      status: payload.scheduled_for ? 'scheduled' : 'draft',
      scheduled_for: payload.scheduled_for || null,
      recipient_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      unsubscribed_count: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/campaigns');
  return { success: true, campaign: data as EmailCampaign };
}

export async function updateCampaign(
  workspaceId: string,
  id: string,
  payload: Partial<EmailCampaign>
): Promise<{ success: boolean; campaign?: EmailCampaign; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.subject !== undefined) updateData.subject = payload.subject.trim();
  if (payload.preview_text !== undefined) updateData.preview_text = payload.preview_text?.trim() || null;
  if (payload.content_html !== undefined) updateData.content_html = payload.content_html;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.scheduled_for !== undefined) updateData.scheduled_for = payload.scheduled_for;

  const { data, error } = await supabase
    .from('email_campaigns')
    .update(updateData)
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating campaign:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/campaigns');
  return { success: true, campaign: data as EmailCampaign };
}

export async function deleteCampaign(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  const { error } = await supabase
    .from('email_campaigns')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', id);

  if (error) {
    console.error('Error deleting campaign:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/campaigns');
  return { success: true };
}

/**
 * Retrieves actual event metrics from email_campaign_events table.
 * If webhook events are not yet available from provider, clearly indicates eventDataAvailable: false.
 */
export async function getCampaignRealStats(
  workspaceId: string,
  campaignId: string
): Promise<{
  eventDataAvailable: boolean;
  totalSent: number;
  delivered: number | null;
  opened: number | null;
  clicked: number | null;
  bounced: number | null;
  unsubscribed: number | null;
}> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      eventDataAvailable: false,
      totalSent: 0,
      delivered: null,
      opened: null,
      clicked: null,
      bounced: null,
      unsubscribed: null,
    };
  }

  const { data: events, error } = await supabase
    .from('email_campaign_events')
    .select('status')
    .eq('workspace_id', workspaceId)
    .eq('campaign_id', campaignId);

  if (error || !events || events.length === 0) {
    return {
      eventDataAvailable: false,
      totalSent: 0,
      delivered: null,
      opened: null,
      clicked: null,
      bounced: null,
      unsubscribed: null,
    };
  }

  const sent = events.filter((e) => ['sent', 'delivered', 'opened', 'clicked'].includes(e.status)).length;
  const delivered = events.filter((e) => ['delivered', 'opened', 'clicked'].includes(e.status)).length;
  const opened = events.filter((e) => ['opened', 'clicked'].includes(e.status)).length;
  const clicked = events.filter((e) => e.status === 'clicked').length;
  const bounced = events.filter((e) => e.status === 'bounced').length;
  const unsubscribed = events.filter((e) => e.status === 'unsubscribed').length;

  // Real events exist if at least one delivery/bounce/open/click/unsub event was recorded
  const hasEventData = delivered > 0 || opened > 0 || clicked > 0 || bounced > 0 || unsubscribed > 0;

  return {
    eventDataAvailable: hasEventData,
    totalSent: sent,
    delivered: hasEventData ? delivered : null,
    opened: hasEventData ? opened : null,
    clicked: hasEventData ? clicked : null,
    bounced: hasEventData ? bounced : null,
    unsubscribed: hasEventData ? unsubscribed : null,
  };
}

/**
 * Dispatches an email campaign through configured Resend integration.
 * Enforces:
 * - Credentials existence (fails clearly if missing)
 * - Consent verification (only opted_in contacts)
 * - Email syntax verification
 * - Non-archived status
 * - Idempotency per recipient
 * - Provider confirmation before setting status to 'sent'
 */
export async function sendCampaign(
  workspaceId: string,
  id: string,
  audienceFilter?: {
    lifecycle_stage?: string;
    lead_status?: string;
    tag?: string;
  }
): Promise<{
  success: boolean;
  stats?: {
    recipients: number;
    sent: number;
    failed: number;
    eventDataAvailable: boolean;
  };
  error?: string;
}> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  // 1. Fetch campaign
  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single();

  if (campErr || !campaign) {
    return { success: false, error: 'Campaign not found' };
  }

  // 2. Resolve Resend Provider Configuration
  let apiKey = process.env.RESEND_API_KEY?.trim() || '';
  let fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || '';

  // Check workspace integration record
  const { data: integrationRecord } = await supabase
    .from('integrations')
    .select('config, is_enabled')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'resend')
    .maybeSingle();

  if (integrationRecord?.is_enabled && integrationRecord.config) {
    if (integrationRecord.config.apiKey) {
      apiKey = decryptSecret(integrationRecord.config.apiKey) || integrationRecord.config.apiKey;
    }
    if (integrationRecord.config.fromEmail) {
      fromEmail = integrationRecord.config.fromEmail;
    }
  }

  const provider = new ResendEmailProvider(apiKey, fromEmail);
  if (!provider.isConfigured()) {
    return {
      success: false,
      error: provider.getMissingSetupInstructions(),
    };
  }

  // 3. Fetch eligible contacts (Enforce non-archived + valid marketing consent)
  let contactQuery = supabase
    .from('contacts')
    .select('id, email, first_name, last_name, consent_status')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .eq('consent_status', 'opted_in');

  if (audienceFilter?.lifecycle_stage && audienceFilter.lifecycle_stage !== 'all') {
    contactQuery = contactQuery.eq('lifecycle_stage', audienceFilter.lifecycle_stage);
  }
  if (audienceFilter?.lead_status && audienceFilter.lead_status !== 'all') {
    contactQuery = contactQuery.eq('lead_status', audienceFilter.lead_status);
  }
  if (audienceFilter?.tag) {
    contactQuery = contactQuery.contains('tags', [audienceFilter.tag]);
  }

  const { data: candidateContacts, error: queryErr } = await contactQuery;
  if (queryErr) {
    return { success: false, error: queryErr.message };
  }

  // Filter valid email syntax
  const validContacts = (candidateContacts || []).filter((c) => isValidEmail(c.email));

  if (validContacts.length === 0) {
    return {
      success: false,
      error:
        'No eligible opted-in contacts found matching this audience filter. In accordance with privacy & deliverability standards, campaigns may only be dispatched to active contacts with verified consent status (consent_status = "opted_in") and valid email addresses.',
    };
  }

  // 4. Idempotency Check: Fetch contacts who were already sent this campaign
  const { data: priorEvents } = await supabase
    .from('email_campaign_events')
    .select('recipient_email, status')
    .eq('campaign_id', id)
    .in('status', ['sent', 'delivered', 'opened', 'clicked']);

  const alreadySentEmails = new Set((priorEvents || []).map((e) => e.recipient_email.toLowerCase()));
  const contactsToSend = validContacts.filter((c) => !alreadySentEmails.has(c.email.toLowerCase()));

  if (contactsToSend.length === 0) {
    return {
      success: false,
      error: `All ${validContacts.length} matching contacts have already received this campaign (duplicate send prevented by idempotency guard).`,
    };
  }

  // 5. Dispatch via real provider
  const batchResult = await provider.sendCampaignBatch({
    workspaceId,
    campaignId: id,
    subject: campaign.subject,
    htmlContent: campaign.content_html || '',
    previewText: campaign.preview_text || undefined,
    fromEmail: fromEmail || undefined,
    recipients: contactsToSend.map((c) => ({
      contactId: c.id,
      email: c.email,
      name: `${c.first_name} ${c.last_name || ''}`.trim(),
    })),
  });

  if (!batchResult.success && batchResult.sentCount === 0) {
    return {
      success: false,
      error: `Email provider rejected campaign delivery: ${batchResult.error || 'All sends failed'}`,
    };
  }

  // 6. Record provider message IDs and events in database
  const eventRows = batchResult.results.map((r) => ({
    workspace_id: workspaceId,
    campaign_id: id,
    contact_id: r.contactId,
    recipient_email: r.email,
    provider: 'resend',
    provider_message_id: r.messageId || null,
    status: r.status === 'sent' ? 'sent' : 'failed',
    error_message: r.error || null,
    idempotency_key: `cmp_${id}_${r.contactId}`,
    event_payload: {
      provider: 'resend',
      dispatched_at: new Date().toISOString(),
    },
  }));

  if (eventRows.length > 0) {
    await supabase.from('email_campaign_events').upsert(eventRows, {
      onConflict: 'campaign_id,recipient_email',
    });
  }

  // 7. Update campaign record: only mark 'sent' when provider confirmed acceptance
  const newRecipientTotal = (campaign.recipient_count || 0) + batchResult.sentCount;
  await supabase
    .from('email_campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: newRecipientTotal,
      delivered_count: 0, // Awaiting real webhook delivery confirmations
      opened_count: 0,
      clicked_count: 0,
      unsubscribed_count: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // 8. Log activities for contacts
  const successfulSends = batchResult.results.filter((r) => r.success);
  if (successfulSends.length > 0) {
    const activitiesToInsert = successfulSends.slice(0, 25).map((r) => ({
      workspace_id: workspaceId,
      contact_id: r.contactId,
      type: 'email' as const,
      title: `Sent campaign: "${campaign.subject}"`,
      description: `Dispatched campaign via Resend provider (Message ID: ${r.messageId || 'confirmed'}).`,
    }));
    await supabase.from('activities').insert(activitiesToInsert);
  }

  revalidatePath('/campaigns');
  revalidatePath('/dashboard');

  return {
    success: true,
    stats: {
      recipients: contactsToSend.length,
      sent: batchResult.sentCount,
      failed: batchResult.failedCount,
      eventDataAvailable: false, // Truthful: live event webhook data is not yet recorded
    },
  };
}
