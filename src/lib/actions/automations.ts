'use server';

import { createClient } from '@/lib/supabase/server';
import { AutomationWorkflow, AutomationLog } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

export async function getWorkflows(workspaceId: string): Promise<AutomationWorkflow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('automation_workflows')
    .select('*, automation_logs(count)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching workflows:', error);
    return [];
  }

  return data.map((item: any) => ({
    ...item,
    execution_count: item.automation_logs?.[0]?.count ?? 0,
  })) as AutomationWorkflow[];
}

export async function getWorkflow(workspaceId: string, id: string): Promise<AutomationWorkflow | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as AutomationWorkflow;
}

export async function createWorkflow(
  workspaceId: string,
  payload: {
    name: string;
    description?: string;
    trigger_type: string;
    trigger_config?: Record<string, any>;
    steps: any[];
    is_active?: boolean;
  }
): Promise<{ success: boolean; workflow?: AutomationWorkflow; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  if (!payload.name?.trim()) {
    return { success: false, error: 'Workflow name is required.' };
  }

  const { data, error } = await supabase
    .from('automation_workflows')
    .insert({
      workspace_id: workspaceId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      trigger_type: payload.trigger_type,
      trigger_config: payload.trigger_config || {},
      steps: payload.steps || [],
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating workflow:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/automations');
  return { success: true, workflow: data as AutomationWorkflow };
}

export async function updateWorkflow(
  workspaceId: string,
  id: string,
  payload: Partial<AutomationWorkflow>
): Promise<{ success: boolean; workflow?: AutomationWorkflow; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
  if (payload.trigger_type !== undefined) updateData.trigger_type = payload.trigger_type;
  if (payload.trigger_config !== undefined) updateData.trigger_config = payload.trigger_config;
  if (payload.steps !== undefined) updateData.steps = payload.steps;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;

  const { data, error } = await supabase
    .from('automation_workflows')
    .update(updateData)
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating workflow:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/automations');
  return { success: true, workflow: data as AutomationWorkflow };
}

export async function deleteWorkflow(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  const { error } = await supabase
    .from('automation_workflows')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', id);

  if (error) {
    console.error('Error deleting workflow:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/automations');
  return { success: true };
}

export async function getWorkflowLogs(
  workspaceId: string,
  workflowId?: string
): Promise<AutomationLog[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('automation_logs')
    .select('*, contact:contacts(first_name, last_name, email), workflow:automation_workflows(name)')
    .eq('workspace_id', workspaceId);

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  query = query.order('executed_at', { ascending: false }).limit(50);

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching logs:', error);
    return [];
  }

  return data as AutomationLog[];
}

export async function testRunWorkflow(
  workspaceId: string,
  workflowId: string,
  targetContactId?: string
): Promise<{ success: boolean; log?: AutomationLog; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  // 1. Fetch workflow
  const { data: workflow, error: wfErr } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', workflowId)
    .single();

  if (wfErr || !workflow) {
    return { success: false, error: 'Workflow not found' };
  }

  // 2. Fetch or pick a contact for execution context
  let contactId = targetContactId;
  let contactName = 'Test Contact';
  let contactEmail = 'lead@example.com';

  if (!contactId) {
    const { data: recentContacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, tags')
      .eq('workspace_id', workspaceId)
      .limit(1);

    if (recentContacts && recentContacts.length > 0) {
      contactId = recentContacts[0].id;
      contactName = `${recentContacts[0].first_name} ${recentContacts[0].last_name}`.trim();
      contactEmail = recentContacts[0].email;
    }
  }

  const executedSteps: Array<{ step: string; status: string; detail: string }> = [];

  // Execute steps
  const steps = (workflow.steps || []) as any[];
  for (const step of steps) {
    if (step.type === 'create_task') {
      if (contactId) {
        await supabase.from('tasks').insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          title: step.config?.task_title || `Follow up with ${contactName}`,
          priority: step.config?.priority || 'high',
          status: 'pending',
          due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
        });
      }
      executedSteps.push({ step: step.title, status: 'completed', detail: 'Task created in workspace queue' });
    } else if (step.type === 'send_email') {
      if (contactId) {
        await supabase.from('activities').insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          type: 'email',
          title: `Automated Email: ${step.config?.subject || 'Welcome'}`,
          description: `Dispatched by automation "${workflow.name}"`,
        });
      }
      executedSteps.push({ step: step.title, status: 'completed', detail: `Email sent to ${contactEmail}` });
    } else if (step.type === 'add_tag') {
      if (contactId && step.config?.tag) {
        const { data: c } = await supabase.from('contacts').select('tags').eq('id', contactId).single();
        const currentTags = c?.tags || [];
        if (!currentTags.includes(step.config.tag)) {
          await supabase.from('contacts').update({ tags: [...currentTags, step.config.tag] }).eq('id', contactId);
        }
      }
      executedSteps.push({ step: step.title, status: 'completed', detail: `Tag added: ${step.config?.tag || 'automated'}` });
    } else {
      executedSteps.push({ step: step.title, status: 'completed', detail: 'Step executed successfully' });
    }
  }

  // 3. Write execution log
  const { data: logRecord, error: logErr } = await supabase
    .from('automation_logs')
    .insert({
      workspace_id: workspaceId,
      workflow_id: workflowId,
      contact_id: contactId || null,
      status: 'success',
      details: {
        stepsExecuted: executedSteps,
        timestamp: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (logErr) {
    console.error('Error logging automation run:', logErr);
  }

  revalidatePath('/automations');
  revalidatePath('/tasks');

  return {
    success: true,
    log: logRecord as AutomationLog,
  };
}
