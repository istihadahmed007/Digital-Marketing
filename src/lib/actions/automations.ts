'use server';

import { createClient } from '@/lib/supabase/server';
import {
  AutomationWorkflow,
  AutomationLog,
  AutomationTriggerType,
  WorkflowGraph,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowNodeExecution,
} from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';
import { validateWorkflowGraph } from '@/lib/automations/graph-validator';
import { executeWorkflowGraph, ExecutionResult } from '@/lib/automations/execution-engine';
import { ResendEmailProvider } from '@/lib/integrations/email/resend';
import { decryptSecret } from '@/lib/security/crypto';
import crypto from 'crypto';

/**
 * Converts legacy linear steps into a graph if nodes are not present.
 */
function convertStepsToGraph(
  triggerType: string,
  triggerConfig: Record<string, any> = {},
  steps: any[] = []
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  const triggerId = 'node_trigger';
  nodes.push({
    id: triggerId,
    type: (triggerType as any) || 'manual',
    label: `Trigger: ${triggerType}`,
    position: { x: 100, y: 200 },
    data: triggerConfig || {},
  });

  let prevNodeId = triggerId;
  let currentX = 380;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const nodeId = `node_${step.id || i + 1}`;
    let nodeType = step.type;
    if (nodeType === 'webhook') nodeType = 'webhook_request';
    if (nodeType === 'update_lifecycle') nodeType = 'update_contact';

    nodes.push({
      id: nodeId,
      type: nodeType,
      label: step.title || `Step ${i + 1}`,
      position: { x: currentX, y: 200 },
      data: step.config || {},
    });

    edges.push({
      id: `edge_${prevNodeId}_${nodeId}`,
      source: prevNodeId,
      target: nodeId,
      sourceHandle: 'output',
      targetHandle: 'input',
    });

    prevNodeId = nodeId;
    currentX += 280;
  }

  return { nodes, edges };
}

export async function getWorkflows(workspaceId: string): Promise<AutomationWorkflow[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('automation_workflows')
    .select('*, workflow_executions(count)')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching workflows:', error);
    return [];
  }

  return data.map((item: any) => {
    let nodes = item.nodes;
    let edges = item.edges;

    // Backward compatibility conversion
    if ((!nodes || nodes.length === 0) && Array.isArray(item.steps) && item.steps.length > 0) {
      const converted = convertStepsToGraph(item.trigger_type, item.trigger_config, item.steps);
      nodes = converted.nodes;
      edges = converted.edges;
    }

    return {
      ...item,
      nodes: nodes || [],
      edges: edges || [],
      status: item.status || (item.is_active ? 'active' : 'draft'),
      execution_count: item.workflow_executions?.[0]?.count ?? 0,
    };
  }) as AutomationWorkflow[];
}

export async function getWorkflow(
  workspaceId: string,
  id: string
): Promise<AutomationWorkflow | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  let nodes = data.nodes;
  let edges = data.edges;

  if ((!nodes || nodes.length === 0) && Array.isArray(data.steps) && data.steps.length > 0) {
    const converted = convertStepsToGraph(data.trigger_type, data.trigger_config, data.steps);
    nodes = converted.nodes;
    edges = converted.edges;
  }

  return {
    ...data,
    nodes: nodes || [],
    edges: edges || [],
    status: data.status || (data.is_active ? 'active' : 'draft'),
  } as AutomationWorkflow;
}

export async function createWorkflow(
  workspaceId: string,
  payload: {
    name: string;
    description?: string;
    trigger_type?: string;
    steps?: any[];
    is_active?: boolean;
    graph?: WorkflowGraph;
  }
): Promise<{ success: boolean; workflow?: AutomationWorkflow; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const name = payload.name?.trim() || 'Untitled Workflow';
  const triggerType = payload.trigger_type || 'manual';

  let defaultGraph: WorkflowGraph = payload.graph || {
    nodes: [
      {
        id: 'node_trigger_1',
        type: triggerType as any,
        label: `Trigger: ${triggerType}`,
        position: { x: 100, y: 200 },
        data: {},
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };

  if (!payload.graph && Array.isArray(payload.steps) && payload.steps.length > 0) {
    const converted = convertStepsToGraph(triggerType, {}, payload.steps);
    defaultGraph = {
      nodes: converted.nodes,
      edges: converted.edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    };
  }

  const webhookSlug = `flow-${crypto.randomBytes(6).toString('hex')}`;
  const webhookToken = crypto.randomBytes(16).toString('hex');

  const { data, error } = await supabase
    .from('automation_workflows')
    .insert({
      workspace_id: workspaceId,
      name,
      description: payload.description || null,
      trigger_type: triggerType,
      trigger_config: {},
      steps: payload.steps || [],
      nodes: defaultGraph.nodes,
      edges: defaultGraph.edges,
      viewport: defaultGraph.viewport || { x: 0, y: 0, zoom: 1 },
      status: payload.is_active ? 'active' : 'draft',
      is_active: payload.is_active ?? false,
      version: 1,
      webhook_slug: webhookSlug,
      webhook_token: webhookToken,
      published_by: user.id,
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create workflow' };
  }

  // Audit entry
  await supabase.from('workflow_audit_logs').insert({
    workspace_id: workspaceId,
    workflow_id: data.id,
    user_id: user.id,
    action: 'created',
    version: 1,
    details: { name },
  });

  revalidatePath('/automations');
  return { success: true, workflow: data as AutomationWorkflow };
}

export async function saveWorkflowGraph(
  workspaceId: string,
  id: string,
  payload: {
    name?: string;
    description?: string;
    graph: WorkflowGraph;
  }
): Promise<{ success: boolean; workflow?: AutomationWorkflow; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const { data: currentWf, error: fetchErr } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single();

  if (fetchErr || !currentWf) {
    return { success: false, error: 'Workflow not found' };
  }

  // Find primary trigger type from graph
  const triggerNode = (payload.graph.nodes || []).find(
    (n) => n.type && n.type in {
      manual: 1, contact_created: 1, contact_updated: 1, form_submission: 1,
      deal_stage_changed: 1, tag_added: 1, schedule: 1, webhook_incoming: 1,
    }
  );

  const newVersion = (currentWf.version || 1) + 1;
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    nodes: payload.graph.nodes,
    edges: payload.graph.edges,
    viewport: payload.graph.viewport || currentWf.viewport,
    version: newVersion,
  };

  if (payload.name) updateData.name = payload.name.trim();
  if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
  if (triggerNode) {
    updateData.trigger_type = triggerNode.type;
    updateData.trigger_config = triggerNode.data || {};
  }

  const { data: updatedWf, error: updateErr } = await supabase
    .from('automation_workflows')
    .update(updateData)
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Audit entry
  await supabase.from('workflow_audit_logs').insert({
    workspace_id: workspaceId,
    workflow_id: id,
    user_id: user.id,
    action: 'updated',
    version: newVersion,
    details: {
      nodeCount: payload.graph.nodes.length,
      edgeCount: payload.graph.edges.length,
    },
  });

  revalidatePath('/automations');
  revalidatePath(`/automations/${id}`);
  return { success: true, workflow: updatedWf as AutomationWorkflow };
}

export async function publishWorkflow(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; workflow?: AutomationWorkflow; errors?: string[]; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const wf = await getWorkflow(workspaceId, id);
  if (!wf) return { success: false, error: 'Workflow not found' };

  // Strict graph validation before publishing
  const graph: WorkflowGraph = {
    nodes: wf.nodes || [],
    edges: wf.edges || [],
  };

  const validation = validateWorkflowGraph(graph);
  if (!validation.isValid) {
    const errorMessages = validation.errors.map((e) => e.message);
    return {
      success: false,
      errors: errorMessages,
      error: `Validation failed: ${errorMessages.join('; ')}`,
    };
  }

  const { data: updatedWf, error: updErr } = await supabase
    .from('automation_workflows')
    .update({
      status: 'active',
      is_active: true,
      published_at: new Date().toISOString(),
      published_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single();

  if (updErr) {
    return { success: false, error: updErr.message };
  }

  // Audit
  await supabase.from('workflow_audit_logs').insert({
    workspace_id: workspaceId,
    workflow_id: id,
    user_id: user.id,
    action: 'published',
    version: wf.version,
    details: { publishedAt: new Date().toISOString() },
  });

  revalidatePath('/automations');
  revalidatePath(`/automations/${id}`);
  return { success: true, workflow: updatedWf as AutomationWorkflow };
}

export async function pauseWorkflow(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; workflow?: AutomationWorkflow; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: { user } } = await supabase.auth.getUser();

  const { data: updatedWf, error } = await supabase
    .from('automation_workflows')
    .update({
      status: 'paused',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  if (user) {
    await supabase.from('workflow_audit_logs').insert({
      workspace_id: workspaceId,
      workflow_id: id,
      user_id: user.id,
      action: 'paused',
      details: { pausedAt: new Date().toISOString() },
    });
  }

  revalidatePath('/automations');
  revalidatePath(`/automations/${id}`);
  return { success: true, workflow: updatedWf as AutomationWorkflow };
}

export async function deleteWorkflow(
  workspaceId: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('automation_workflows')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  if (user) {
    await supabase.from('workflow_audit_logs').insert({
      workspace_id: workspaceId,
      workflow_id: id,
      user_id: user.id,
      action: 'deleted',
      details: { deletedAt: new Date().toISOString() },
    });
  }

  revalidatePath('/automations');
  return { success: true };
}

/**
 * Executes a safe Dry-Run Test of the workflow graph.
 * Does NOT modify contacts, create real tasks, send emails, or invoke external webhooks.
 */
export async function testRunWorkflowGraph(
  workspaceId: string,
  workflowId: string,
  customTriggerData?: Record<string, any>
): Promise<{ success: boolean; result?: ExecutionResult; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const wf = await getWorkflow(workspaceId, workflowId);
  if (!wf) return { success: false, error: 'Workflow not found' };

  // Fetch sample contact for context if available
  let sampleContact = {
    id: 'mock-test-contact-123',
    first_name: 'Alex',
    last_name: 'Johnson (Sample)',
    email: 'alex.sample@nexusmark.test',
    lead_score: 85,
    lifecycle_stage: 'lead',
    lead_status: 'new',
    consent_status: 'opted_in',
    company_name: 'Acme Growth Labs',
  };

  const { data: realContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_archived', false)
    .limit(1)
    .maybeSingle();

  if (realContact) {
    sampleContact = {
      id: realContact.id,
      first_name: realContact.first_name,
      last_name: realContact.last_name || '',
      email: realContact.email,
      lead_score: realContact.lead_score || 70,
      lifecycle_stage: realContact.lifecycle_stage || 'lead',
      lead_status: realContact.lead_status || 'new',
      consent_status: realContact.consent_status || 'opted_in',
      company_name: 'Sample Corp',
    };
  }

  const triggerData = customTriggerData || {
    type: wf.trigger_type || 'manual',
    contact: sampleContact,
    contact_id: sampleContact.id,
    email: sampleContact.email,
    timestamp: new Date().toISOString(),
  };

  const graph: WorkflowGraph = {
    nodes: wf.nodes || [],
    edges: wf.edges || [],
  };

  const result = await executeWorkflowGraph({
    workspaceId,
    workflowId: wf.id,
    workflowName: wf.name,
    workflowVersion: wf.version || 1,
    graph,
    triggerType: wf.trigger_type || 'manual',
    triggerData,
    isDryRun: true,
    supabase,
  });

  return { success: result.success, result };
}

/**
 * Explicit Test Email: Sends a real test email ONLY to the current user's email after confirmation.
 */
export async function sendTestEmailToCurrentUser(
  workspaceId: string,
  workflowId: string,
  nodeId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { success: false, error: 'User is not authenticated' };
  }

  const wf = await getWorkflow(workspaceId, workflowId);
  if (!wf) return { success: false, error: 'Workflow not found' };

  const targetNode = (wf.nodes || []).find((n) => n.id === nodeId && n.type === 'send_email');
  if (!targetNode) {
    return { success: false, error: 'Target email node not found in workflow graph' };
  }

  // Check email credentials
  let apiKey = process.env.RESEND_API_KEY || '';
  let fromEmail = process.env.RESEND_FROM_EMAIL || '';

  const { data: integ } = await supabase
    .from('integrations')
    .select('config, is_enabled')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'resend')
    .maybeSingle();

  if (integ?.is_enabled && integ.config?.apiKey) {
    apiKey = decryptSecret(integ.config.apiKey) || integ.config.apiKey;
    fromEmail = integ.config.fromEmail || fromEmail;
  }

  const emailProvider = new ResendEmailProvider(apiKey, fromEmail);
  if (!emailProvider.isConfigured()) {
    return { success: false, error: emailProvider.getMissingSetupInstructions() };
  }

  const subject = `[TEST] ${targetNode.data?.subject || 'Workflow Email Preview'}`;
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 20px; border-left: 4px solid #6366f1; background: #f8fafc;">
      <p style="color: #6366f1; font-weight: bold; font-size: 12px; text-transform: uppercase;">NexusMark Workflow Test Preview</p>
      <p style="color: #64748b; font-size: 13px;">This test was explicitly sent to your account (${user.email}) from workflow "<strong>${wf.name}</strong>".</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      ${targetNode.data?.body_html || '<p>Hello from NexusMark Flow!</p>'}
    </div>
  `;

  const sendRes = await emailProvider.sendCampaignBatch({
    workspaceId,
    campaignId: `test_node_${nodeId}`,
    subject,
    htmlContent,
    recipients: [{ contactId: user.id, email: user.email || '' }],
  });

  if (sendRes.sentCount > 0) {
    return {
      success: true,
      message: `Test email successfully dispatched to ${user.email} (Provider ID: ${sendRes.results[0]?.messageId}).`,
    };
  }

  return {
    success: false,
    error: sendRes.results[0]?.error || 'Failed to dispatch test email',
  };
}

export async function getWorkflowExecutions(
  workspaceId: string,
  options?: {
    workflowId?: string;
    status?: string;
    limit?: number;
  }
): Promise<WorkflowExecution[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('workflow_executions')
    .select('*, workflow:automation_workflows(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (options?.workflowId) {
    query = query.eq('workflow_id', options.workflowId);
  }
  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  query = query.limit(options?.limit || 50);

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error fetching executions:', error);
    return [];
  }

  return data as WorkflowExecution[];
}

export async function getExecutionDetail(
  workspaceId: string,
  executionId: string
): Promise<{ execution: WorkflowExecution; nodeExecutions: WorkflowNodeExecution[] } | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const [execRes, nodesRes] = await Promise.all([
    supabase
      .from('workflow_executions')
      .select('*, workflow:automation_workflows(name)')
      .eq('workspace_id', workspaceId)
      .eq('id', executionId)
      .single(),
    supabase
      .from('workflow_node_executions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('execution_id', executionId)
      .order('started_at', { ascending: true }),
  ]);

  if (execRes.error || !execRes.data) return null;

  return {
    execution: execRes.data as WorkflowExecution,
    nodeExecutions: (nodesRes.data || []) as WorkflowNodeExecution[],
  };
}

export async function retryExecution(
  workspaceId: string,
  executionId: string
): Promise<{ success: boolean; newExecutionId?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const { data: { user } } = await supabase.auth.getUser();

  const { data: prevExec, error: prevErr } = await supabase
    .from('workflow_executions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', executionId)
    .single();

  if (prevErr || !prevExec) return { success: false, error: 'Execution record not found' };

  const wf = await getWorkflow(workspaceId, prevExec.workflow_id);
  if (!wf) return { success: false, error: 'Associated workflow not found' };

  const retryIdempotencyKey = `retry_${executionId}_${Date.now()}`;
  const graph: WorkflowGraph = {
    nodes: wf.nodes || [],
    edges: wf.edges || [],
  };

  const execResult = await executeWorkflowGraph({
    workspaceId,
    workflowId: wf.id,
    workflowName: wf.name,
    workflowVersion: prevExec.workflow_version || wf.version || 1,
    graph,
    triggerType: prevExec.trigger_type,
    triggerData: prevExec.trigger_data,
    isDryRun: false,
    idempotencyKey: retryIdempotencyKey,
    supabase,
  });

  if (user) {
    await supabase.from('workflow_audit_logs').insert({
      workspace_id: workspaceId,
      workflow_id: wf.id,
      user_id: user.id,
      action: 'retried',
      version: prevExec.workflow_version,
      details: {
        originalExecutionId: executionId,
        newExecutionId: execResult.executionId,
      },
    });
  }

  revalidatePath('/automations');
  return {
    success: execResult.success,
    newExecutionId: execResult.executionId,
    error: execResult.error,
  };
}

/**
 * Global CRM Event Dispatcher
 * Invoked by contacts, forms, and deals actions when business events occur.
 */
export async function dispatchCrmEventTriggers(
  workspaceId: string,
  triggerType: AutomationTriggerType,
  entityId: string,
  context?: { contactId?: string; [key: string]: any }
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const { data: workflows } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (!workflows || workflows.length === 0) return;

  for (const wf of workflows) {
    // Stage check for deal_stage_changed
    if (triggerType === 'deal_stage_changed' && wf.trigger_config?.target_stage) {
      if (
        wf.trigger_config.target_stage !== 'any' &&
        context?.to_stage !== wf.trigger_config.target_stage
      ) {
        continue;
      }
    }

    // Tag check for tag_added
    if (triggerType === 'tag_added' && wf.trigger_config?.tag) {
      if (context?.tag !== wf.trigger_config.tag) {
        continue;
      }
    }

    const graph: WorkflowGraph = {
      nodes: wf.nodes || [],
      edges: wf.edges || [],
    };

    if (graph.nodes.length === 0 && Array.isArray(wf.steps) && wf.steps.length > 0) {
      const converted = convertStepsToGraph(wf.trigger_type, wf.trigger_config, wf.steps);
      graph.nodes = converted.nodes;
      graph.edges = converted.edges;
    }

    const idempotencyKey = `wf_${wf.id}_${triggerType}_${entityId}_${context?.updateTimestamp || Date.now()}`;

    await executeWorkflowGraph({
      workspaceId,
      workflowId: wf.id,
      workflowName: wf.name,
      workflowVersion: wf.version || 1,
      graph,
      triggerType,
      triggerData: {
        entityId,
        ...context,
      },
      isDryRun: false,
      idempotencyKey,
      supabase,
    });
  }
}

// Backward-compatibility alias for legacy code and tests
export async function updateWorkflow(
  workspaceId: string,
  id: string,
  payload: Partial<AutomationWorkflow>
): Promise<{ success: boolean; workflow?: AutomationWorkflow; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updateData.name = payload.name.trim();
  if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
  if (payload.is_active !== undefined) {
    updateData.is_active = payload.is_active;
    updateData.status = payload.is_active ? 'active' : 'paused';
  }
  if (payload.status !== undefined) {
    updateData.status = payload.status;
    updateData.is_active = payload.status === 'active';
  }
  if (payload.nodes !== undefined) updateData.nodes = payload.nodes;
  if (payload.edges !== undefined) updateData.edges = payload.edges;

  const { data, error } = await supabase
    .from('automation_workflows')
    .update(updateData)
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath('/automations');
  return { success: true, workflow: data as AutomationWorkflow };
}

export async function testRunWorkflow(
  workspaceId: string,
  workflowId: string,
  targetContactId?: string
) {
  return testRunWorkflowGraph(workspaceId, workflowId, targetContactId ? { contact_id: targetContactId } : undefined);
}

export async function getWorkflowLogs(workspaceId: string, workflowId?: string): Promise<AutomationLog[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  let query = supabase
    .from('workflow_executions')
    .select('*, workflow:automation_workflows(name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (workflowId) {
    query = query.eq('workflow_id', workflowId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((d: any) => ({
    id: d.id,
    workspace_id: d.workspace_id,
    workflow_id: d.workflow_id,
    contact_id: d.trigger_data?.contact_id || null,
    status: d.status === 'succeeded' ? 'success' : d.status === 'failed' ? 'failed' : 'retrying',
    details: {
      isDryRun: d.is_dry_run,
      triggerType: d.trigger_type,
      durationMs: d.duration_ms,
      errorMessage: d.error_message,
    },
    executed_at: d.started_at,
    workflow: d.workflow,
  })) as AutomationLog[];
}
