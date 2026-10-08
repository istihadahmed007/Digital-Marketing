'use server';

import { createClient } from '@/lib/supabase/server';
import { Task, TaskPriority, TaskStatus } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

export async function getTasks(
  workspaceId: string,
  filter?: {
    contact_id?: string;
    company_id?: string;
    deal_id?: string;
    status?: string;
  }
): Promise<Task[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('tasks')
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
  if (filter?.status && filter.status !== 'all') {
    query = query.eq('status', filter.status);
  }

  query = query.order('due_date', { ascending: true, nullsFirst: false });

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data as Task[];
}

export async function createTask(
  workspaceId: string,
  taskData: {
    title: string;
    description?: string;
    due_date?: string;
    priority?: TaskPriority;
    contact_id?: string;
    company_id?: string;
    deal_id?: string;
  }
): Promise<{ success: boolean; task?: Task; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      title: taskData.title.trim(),
      description: taskData.description?.trim() || null,
      due_date: taskData.due_date || null,
      priority: taskData.priority || 'medium',
      status: 'pending',
      contact_id: taskData.contact_id || null,
      company_id: taskData.company_id || null,
      deal_id: taskData.deal_id || null,
      created_by: user?.id || null,
      assigned_to: user?.id || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create task' };
  }

  // Log activity
  await supabase.from('activities').insert({
    workspace_id: workspaceId,
    contact_id: data.contact_id || null,
    company_id: data.company_id || null,
    deal_id: data.deal_id || null,
    type: 'note',
    title: 'Task created',
    description: `Task "${data.title}" assigned. Priority: ${data.priority}.`,
    user_id: user?.id || null,
  });

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  if (taskData.contact_id) revalidatePath(`/contacts/${taskData.contact_id}`);
  if (taskData.company_id) revalidatePath(`/companies/${taskData.company_id}`);
  if (taskData.deal_id) revalidatePath(`/deals/${taskData.deal_id}`);

  return { success: true, task: data as Task };
}

export async function updateTaskStatus(
  workspaceId: string,
  taskId: string,
  status: TaskStatus
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', taskId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
  return { success: true };
}
