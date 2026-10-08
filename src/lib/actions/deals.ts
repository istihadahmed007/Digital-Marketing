'use server';

import { createClient } from '@/lib/supabase/server';
import { Deal, DealStage } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

const STAGE_PROBABILITIES: Record<DealStage, number> = {
  lead: 10,
  qualified: 30,
  proposal: 60,
  negotiation: 80,
  closed_won: 100,
  closed_lost: 0,
};

export async function getDeals(
  workspaceId: string,
  options?: {
    isArchived?: boolean;
    stage?: string;
  }
): Promise<Deal[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('deals')
    .select('*, contact:contacts(*), company:companies(*)')
    .eq('workspace_id', workspaceId);

  if (options?.isArchived !== undefined) {
    query = query.eq('is_archived', options.isArchived);
  } else {
    query = query.eq('is_archived', false);
  }

  if (options?.stage && options.stage !== 'all') {
    query = query.eq('stage', options.stage);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching deals:', error);
    return [];
  }

  return data as Deal[];
}

export async function getDealById(
  workspaceId: string,
  dealId: string
): Promise<Deal | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('deals')
    .select('*, contact:contacts(*), company:companies(*)')
    .eq('workspace_id', workspaceId)
    .eq('id', dealId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Deal;
}

export async function createDeal(
  workspaceId: string,
  dealData: {
    title: string;
    amount: number;
    currency?: string;
    stage?: DealStage;
    probability?: number;
    expected_close_date?: string;
    contact_id?: string;
    company_id?: string;
  }
): Promise<{ success: boolean; deal?: Deal; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stage = dealData.stage || 'lead';
  const probability = dealData.probability !== undefined ? dealData.probability : STAGE_PROBABILITIES[stage];

  const { data, error } = await supabase
    .from('deals')
    .insert({
      workspace_id: workspaceId,
      title: dealData.title.trim(),
      amount: dealData.amount || 0,
      currency: dealData.currency || 'USD',
      stage,
      probability,
      expected_close_date: dealData.expected_close_date || null,
      contact_id: dealData.contact_id || null,
      company_id: dealData.company_id || null,
      owner_id: user?.id || null,
    })
    .select('*, contact:contacts(*), company:companies(*)')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create deal' };
  }

  // Log activity
  await supabase.from('activities').insert({
    workspace_id: workspaceId,
    deal_id: data.id,
    contact_id: data.contact_id || null,
    company_id: data.company_id || null,
    type: 'deal_created',
    title: 'Deal created',
    description: `Deal "${data.title}" created with value ${data.currency} ${data.amount}.`,
    user_id: user?.id || null,
  });

  revalidatePath('/deals');
  revalidatePath('/dashboard');
  return { success: true, deal: data as Deal };
}

export async function updateDealStage(
  workspaceId: string,
  dealId: string,
  newStage: DealStage
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch current deal to get previous stage and amount
  const { data: currentDeal } = await supabase
    .from('deals')
    .select('stage, amount')
    .eq('id', dealId)
    .single();

  const probability = STAGE_PROBABILITIES[newStage];

  const { data: updatedDeal, error } = await supabase
    .from('deals')
    .update({
      stage: newStage,
      probability,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', dealId)
    .select('*')
    .single();

  if (error || !updatedDeal) {
    return { success: false, error: error?.message || 'Failed to update deal stage' };
  }

  // Record audit entry in deal_stage_history
  await supabase.from('deal_stage_history').insert({
    deal_id: dealId,
    workspace_id: workspaceId,
    from_stage: currentDeal?.stage || null,
    to_stage: newStage,
    amount: currentDeal?.amount || updatedDeal.amount || 0,
    changed_by: user?.id || null,
  });

  // Log stage transition in activities timeline
  await supabase.from('activities').insert({
    workspace_id: workspaceId,
    deal_id: dealId,
    contact_id: updatedDeal.contact_id || null,
    company_id: updatedDeal.company_id || null,
    type: 'stage_change',
    title: 'Deal stage updated',
    description: `Stage changed from "${(currentDeal?.stage || 'lead').replace('_', ' ')}" to "${newStage.replace('_', ' ')}" (Probability: ${probability}%).`,
    user_id: user?.id || null,
  });

  // Trigger active workflows registered for deal_stage_changed event
  try {
    const { dispatchCrmEventTriggers } = await import('@/lib/actions/automations');
    await dispatchCrmEventTriggers(workspaceId, 'deal_stage_changed', dealId, {
      dealId,
      contactId: updatedDeal.contact_id || undefined,
      from_stage: currentDeal?.stage || null,
      to_stage: newStage,
    });
  } catch (triggerErr) {
    console.error('Error triggering automations on deal stage change:', triggerErr);
  }

  revalidatePath('/deals');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getDealStageHistory(
  workspaceId: string,
  dealId: string
): Promise<any[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('deal_stage_history')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function updateDeal(
  workspaceId: string,
  dealId: string,
  updates: Partial<Deal>
): Promise<{ success: boolean; deal?: Deal; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data, error } = await supabase
    .from('deals')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', dealId)
    .select('*, contact:contacts(*), company:companies(*)')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to update deal' };
  }

  revalidatePath('/deals');
  revalidatePath(`/deals/${dealId}`);
  revalidatePath('/dashboard');
  return { success: true, deal: data as Deal };
}

export async function archiveDeal(
  workspaceId: string,
  dealId: string,
  isArchived: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('deals')
    .update({
      is_archived: isArchived,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', dealId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/deals');
  revalidatePath('/dashboard');
  return { success: true };
}
