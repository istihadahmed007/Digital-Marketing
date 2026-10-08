'use server';

import { createClient } from '@/lib/supabase/server';
import { Activity, ActivityType } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

export async function getActivities(
  workspaceId: string,
  filter?: {
    contact_id?: string;
    company_id?: string;
    deal_id?: string;
    limit?: number;
  }
): Promise<Activity[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('activities')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (filter?.contact_id) {
    query = query.eq('contact_id', filter.contact_id);
  }
  if (filter?.company_id) {
    query = query.eq('company_id', filter.company_id);
  }
  if (filter?.deal_id) {
    query = query.eq('deal_id', filter.deal_id);
  }

  query = query.order('created_at', { ascending: false }).limit(filter?.limit || 50);

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching activities:', error);
    return [];
  }

  return data as Activity[];
}

export async function createActivity(
  workspaceId: string,
  activityData: {
    type: ActivityType;
    title: string;
    description?: string;
    contact_id?: string;
    company_id?: string;
    deal_id?: string;
  }
): Promise<{ success: boolean; activity?: Activity; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('activities')
    .insert({
      workspace_id: workspaceId,
      type: activityData.type,
      title: activityData.title.trim(),
      description: activityData.description?.trim() || null,
      contact_id: activityData.contact_id || null,
      company_id: activityData.company_id || null,
      deal_id: activityData.deal_id || null,
      user_id: user?.id || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to log activity' };
  }

  revalidatePath('/dashboard');
  if (activityData.contact_id) revalidatePath(`/contacts/${activityData.contact_id}`);
  if (activityData.company_id) revalidatePath(`/companies/${activityData.company_id}`);
  if (activityData.deal_id) revalidatePath(`/deals/${activityData.deal_id}`);

  return { success: true, activity: data as Activity };
}
