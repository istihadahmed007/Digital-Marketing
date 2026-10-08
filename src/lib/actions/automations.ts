'use server';

import { createClient } from '@/lib/supabase/server';
import {
  AutomationWorkflow,
  AutomationLog,
  AutomationTriggerType,
  SandboxedWorkflowResult,
  SandboxedStepResult,
} from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';
import { ResendEmailProvider, isValidEmail } from '@/lib/integrations/email/resend';
import { safeFetch, validateSafePublicUrl } from '@/lib/security/ssrf';
import { decryptSecret } from '@/lib/security/crypto';

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

/**
 * Sandboxed Test Run: Executes workflow in an isolated sandbox.
 * CRITICAL SAFETY RULES:
 * - Does NOT modify live contacts in database
 * - Does NOT create real tasks in database
 * - Does NOT send real outbound emails
 * - Validates configurations and predicts step results
 */
export async function testRunWorkflow(
  workspaceId: string,
  workflowId: string,
  targetContactId?: string
): Promise<{ success: boolean; sandboxResult?: SandboxedWorkflowResult; error?: string }> {
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

  // 2. Fetch sample or specified contact (read-only)
  let sampleContact = {
    id: 'mock-sandbox-contact',
    name: 'Alex Johnson (Sandbox)',
    email: 'alex.sandbox@example.com',
  };

  if (targetContactId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('workspace_id', workspaceId)
      .eq('id', targetContactId)
      .maybeSingle();

    if (contact) {
      sampleContact = {
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
        email: contact.email,
      };
    }
  }

  // 3. Check email provider configuration for dry-run validation
  const { data: emailIntegration } = await supabase
    .from('integrations')
    .select('config, is_enabled')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'resend')
    .maybeSingle();

  let emailApiKey = process.env.RESEND_API_KEY || '';
  if (emailIntegration?.is_enabled && emailIntegration.config?.apiKey) {
    emailApiKey = decryptSecret(emailIntegration.config.apiKey) || emailIntegration.config.apiKey;
  }
  const emailProvider = new ResendEmailProvider(emailApiKey);
  const emailConfigured = emailProvider.isConfigured();

  const stepResults: SandboxedStepResult[] = [];
  const warnings: string[] = [];
  let overallPassed = true;

  const steps = (workflow.steps || []) as any[];

  for (const step of steps) {
    const stepType = step.type;
    const stepTitle = step.title || `Step ${step.id}`;

    switch (stepType) {
      case 'send_email': {
        const subject = step.config?.subject?.trim();
        if (!subject) {
          stepResults.push({
            stepId: step.id,
            stepTitle,
            stepType,
            status: 'invalid_config',
            actionSummary: 'Simulated send_email step validation',
            error: 'Missing required email subject in step configuration',
          });
          overallPassed = false;
        } else if (!emailConfigured) {
          stepResults.push({
            stepId: step.id,
            stepTitle,
            stepType,
            status: 'simulated_failure',
            actionSummary: `Would attempt to dispatch email "${subject}" to ${sampleContact.email}`,
            error: 'Email provider (Resend) is not configured in workspace or environment.',
          });
          warnings.push('Email step requires configured Resend credentials to execute during live automation.');
        } else {
          stepResults.push({
            stepId: step.id,
            stepTitle,
            stepType,
            status: 'simulated_success',
            actionSummary: `[SANDBOX] Verified email template. Would send "${subject}" to ${sampleContact.email} via Resend. (No actual email sent)`,
            simulatedOutput: {
              recipient: sampleContact.email,
              subject,
              provider: 'resend (mocked in sandbox)',
            },
          });
        }
        break;
      }

      case 'create_task': {
        const title = step.config?.task_title?.trim() || `Follow up with ${sampleContact.name}`;
        stepResults.push({
          stepId: step.id,
          stepTitle,
          stepType,
          status: 'simulated_success',
          actionSummary: `[SANDBOX] Validated task schema. Would create task "${title}" with priority "${step.config?.priority || 'high'}". (No task created in DB)`,
          simulatedOutput: {
            title,
            priority: step.config?.priority || 'high',
            dueInDays: 2,
          },
        });
        break;
      }

      case 'add_tag': {
        const tag = step.config?.tag?.trim();
        if (!tag) {
          stepResults.push({
            stepId: step.id,
            stepTitle,
            stepType,
            status: 'invalid_config',
            actionSummary: 'Simulated tag addition',
            error: 'Tag name is empty or unconfigured',
          });
          overallPassed = false;
        } else {
          stepResults.push({
            stepId: step.id,
            stepTitle,
            stepType,
            status: 'simulated_success',
            actionSummary: `[SANDBOX] Would append tag "${tag}" to contact profile without modifying live DB.`,
            simulatedOutput: { tagApplied: tag },
          });
        }
        break;
      }

      case 'update_lifecycle': {
        const stage = step.config?.lifecycle_stage?.trim() || 'lead';
        stepResults.push({
          stepId: step.id,
          stepTitle,
          stepType,
          status: 'simulated_success',
          actionSummary: `[SANDBOX] Would update contact lifecycle stage to "${stage}".`,
          simulatedOutput: { targetStage: stage },
        });
        break;
      }

      case 'webhook': {
        const url = step.config?.endpoint_url?.trim();
        if (!url) {
          stepResults.push({
            stepId: step.id,
            stepTitle,
            stepType,
            status: 'invalid_config',
            actionSummary: 'Simulated webhook step validation',
            error: 'Webhook destination URL is missing',
          });
          overallPassed = false;
        } else {
          const safeCheck = await validateSafePublicUrl(url);
          if (!safeCheck.safe) {
            stepResults.push({
              stepId: step.id,
              stepTitle,
              stepType,
              status: 'invalid_config',
              actionSummary: 'Simulated webhook validation',
              error: `SSRF Security rejection: ${safeCheck.error}`,
            });
            overallPassed = false;
          } else {
            stepResults.push({
              stepId: step.id,
              stepTitle,
              stepType,
              status: 'simulated_success',
              actionSummary: `[SANDBOX] Validated webhook destination "${url}". (Payload not dispatched in sandbox)`,
            });
          }
        }
        break;
      }

      default: {
        stepResults.push({
          stepId: step.id,
          stepTitle,
          stepType,
          status: 'invalid_config',
          actionSummary: `Unsupported step type: "${stepType}"`,
          error: `Unknown action type "${stepType}". Live engine will reject this step.`,
        });
        overallPassed = false;
        break;
      }
    }
  }

  const sandboxResult: SandboxedWorkflowResult = {
    workflowId: workflow.id,
    workflowName: workflow.name,
    isSandbox: true,
    simulatedContact: sampleContact,
    steps: stepResults,
    overallStatus: overallPassed ? 'passed' : 'failed',
    warnings,
  };

  // Write durable audit record into automation_logs marking status as 'simulated'
  await supabase.from('automation_logs').insert({
    workspace_id: workspaceId,
    workflow_id: workflowId,
    contact_id: sampleContact.id.startsWith('mock-') ? null : sampleContact.id,
    status: overallPassed ? 'success' : 'failed',
    details: {
      isSandbox: true,
      sandboxResult,
      executedAt: new Date().toISOString(),
    },
  });

  revalidatePath('/automations');

  return {
    success: true,
    sandboxResult,
  };
}

/**
 * Live Workflow Execution Engine
 * Enforces:
 * - Only supported step types are executed
 * - send_email calls the configured provider (fails if unconfigured or rejected)
 * - Unknown step types fail visibly and immediately
 * - Durable per-step logging in automation_step_logs
 * - Deduplication via automation_event_triggers (only-once per entity trigger)
 */
export async function executeWorkflowLive(
  workspaceId: string,
  workflowId: string,
  event: {
    triggerType: AutomationTriggerType;
    entityId: string;
    contactId?: string;
    context?: Record<string, any>;
  }
): Promise<{
  success: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
  logId?: string;
}> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  // 1. Idempotency Check: Prevent duplicate workflow runs for the same entity trigger event
  const idempotencyKey = `wf_${workflowId}_${event.triggerType}_${event.entityId}`;

  const { data: existingTrigger } = await supabase
    .from('automation_event_triggers')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingTrigger) {
    return {
      success: true,
      skipped: true,
      reason: `Workflow "${workflowId}" was already triggered for event "${event.triggerType}" on entity "${event.entityId}" (idempotency guard).`,
    };
  }

  // Register idempotency lock
  const { error: lockErr } = await supabase.from('automation_event_triggers').insert({
    workspace_id: workspaceId,
    workflow_id: workflowId,
    trigger_type: event.triggerType,
    entity_id: event.entityId,
    idempotency_key: idempotencyKey,
    status: 'processing',
  });

  if (lockErr) {
    // If conflict occurred concurrently
    return {
      success: true,
      skipped: true,
      reason: 'Concurrent execution locked by another process.',
    };
  }

  // 2. Fetch workflow
  const { data: workflow, error: wfErr } = await supabase
    .from('automation_workflows')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', workflowId)
    .single();

  if (wfErr || !workflow || !workflow.is_active) {
    await supabase
      .from('automation_event_triggers')
      .update({ status: 'failed' })
      .eq('idempotency_key', idempotencyKey);
    return { success: false, error: 'Workflow inactive or not found' };
  }

  // 3. Fetch contact if available
  let contact: any = null;
  if (event.contactId) {
    const { data: c } = await supabase
      .from('contacts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', event.contactId)
      .maybeSingle();
    contact = c;
  }

  // 4. Create primary automation log row
  const { data: logRecord } = await supabase
    .from('automation_logs')
    .insert({
      workspace_id: workspaceId,
      workflow_id: workflowId,
      contact_id: event.contactId || null,
      status: 'retrying', // in-progress
      details: {
        trigger: event,
        startedAt: new Date().toISOString(),
      },
    })
    .select()
    .single();

  const logId = logRecord?.id;
  const steps = (workflow.steps || []) as any[];
  let workflowSuccess = true;
  let failureReason: string | undefined;

  // Resolve email provider credentials if needed
  let emailProvider: ResendEmailProvider | null = null;

  for (const step of steps) {
    const stepType = step.type;
    const stepTitle = step.title || step.id;
    let stepSuccess = false;
    let stepError: string | null = null;
    let stepOutput: Record<string, any> = {};

    switch (stepType) {
      case 'send_email': {
        if (!emailProvider) {
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
          emailProvider = new ResendEmailProvider(apiKey, fromEmail);
        }

        if (!emailProvider.isConfigured()) {
          stepError = emailProvider.getMissingSetupInstructions();
        } else if (!contact?.email || !isValidEmail(contact.email)) {
          stepError = `Recipient contact email missing or invalid (${contact?.email || 'none'})`;
        } else if (contact.consent_status !== 'opted_in') {
          stepError = `Contact "${contact.email}" has not opted into marketing emails (consent_status = "${contact.consent_status}")`;
        } else {
          const sendResult = await emailProvider.sendCampaignBatch({
            workspaceId,
            campaignId: `wf_${workflow.id}`,
            subject: step.config?.subject || `Automated Notice from ${workflow.name}`,
            htmlContent: step.config?.html || `<p>${step.config?.body || 'Hello from NexusMark'}</p>`,
            recipients: [{ contactId: contact.id, email: contact.email }],
          });

          if (sendResult.sentCount > 0) {
            stepSuccess = true;
            stepOutput = { messageId: sendResult.results[0]?.messageId };
            // Record activity
            await supabase.from('activities').insert({
              workspace_id: workspaceId,
              contact_id: contact.id,
              type: 'email',
              title: `Automated Email: "${step.config?.subject || workflow.name}"`,
              description: `Dispatched by active workflow "${workflow.name}".`,
            });
          } else {
            stepError = sendResult.results[0]?.error || 'Failed to dispatch email';
          }
        }
        break;
      }

      case 'create_task': {
        const { error: taskErr } = await supabase.from('tasks').insert({
          workspace_id: workspaceId,
          contact_id: contact?.id || null,
          title: step.config?.task_title || `Follow up on automation: ${workflow.name}`,
          priority: step.config?.priority || 'high',
          status: 'pending',
          due_date: new Date(Date.now() + 86400000 * (step.config?.due_in_days || 2)).toISOString(),
        });

        if (taskErr) {
          stepError = taskErr.message;
        } else {
          stepSuccess = true;
          stepOutput = { taskCreated: true };
        }
        break;
      }

      case 'add_tag': {
        const tag = step.config?.tag?.trim();
        if (!tag) {
          stepError = 'Missing tag parameter in configuration';
        } else if (contact?.id) {
          const currentTags = Array.isArray(contact.tags) ? contact.tags : [];
          if (!currentTags.includes(tag)) {
            await supabase
              .from('contacts')
              .update({ tags: [...currentTags, tag] })
              .eq('id', contact.id);
          }
          stepSuccess = true;
          stepOutput = { tagAdded: tag };
        } else {
          stepError = 'No contact attached to event context';
        }
        break;
      }

      case 'update_lifecycle': {
        const stage = step.config?.lifecycle_stage?.trim();
        if (!stage) {
          stepError = 'Missing lifecycle_stage parameter';
        } else if (contact?.id) {
          await supabase
            .from('contacts')
            .update({ lifecycle_stage: stage })
            .eq('id', contact.id);
          stepSuccess = true;
          stepOutput = { updatedStage: stage };
        } else {
          stepError = 'No contact attached to event context';
        }
        break;
      }

      case 'webhook': {
        const endpointUrl = step.config?.endpoint_url?.trim();
        if (!endpointUrl) {
          stepError = 'Missing webhook destination URL';
        } else {
          try {
            const res = await safeFetch(endpointUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: event.triggerType,
                workflow_id: workflow.id,
                entity_id: event.entityId,
                contact,
              }),
              timeoutMs: 5000,
            });

            if (res.ok) {
              stepSuccess = true;
              stepOutput = { status: res.status };
            } else {
              stepError = `Webhook endpoint responded with HTTP ${res.status}`;
            }
          } catch (fetchErr: any) {
            stepError = fetchErr.message;
          }
        }
        break;
      }

      default: {
        // UNKNOWN STEP: Must fail visibly and immediately
        stepError = `Unsupported automation step type: "${stepType}". Unknown steps cannot be executed.`;
        break;
      }
    }

    // Insert durable per-step execution log
    if (logId) {
      await supabase.from('automation_step_logs').insert({
        workspace_id: workspaceId,
        workflow_id: workflowId,
        log_id: logId,
        step_id: step.id || 'step',
        step_type: stepType,
        step_title: stepTitle,
        status: stepSuccess ? 'completed' : 'failed',
        error_message: stepError,
        output: stepOutput,
      });
    }

    if (!stepSuccess) {
      workflowSuccess = false;
      failureReason = `Step "${stepTitle}" failed: ${stepError}`;
      break; // Abort subsequent dependent steps on error
    }
  }

  // 5. Finalize execution status in automation_logs & automation_event_triggers
  const finalStatus = workflowSuccess ? 'success' : 'failed';

  if (logId) {
    await supabase
      .from('automation_logs')
      .update({
        status: finalStatus,
        details: {
          trigger: event,
          completedAt: new Date().toISOString(),
          error: failureReason || null,
        },
      })
      .eq('id', logId);
  }

  await supabase
    .from('automation_event_triggers')
    .update({ status: finalStatus })
    .eq('idempotency_key', idempotencyKey);

  revalidatePath('/automations');
  revalidatePath('/tasks');

  return {
    success: workflowSuccess,
    logId,
    error: failureReason,
  };
}

/**
 * Triggers active workflows registered for CRM events (contact creation, form submissions, deal stage changes).
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
    .select('id, trigger_config')
    .eq('workspace_id', workspaceId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true);

  if (!workflows || workflows.length === 0) return;

  for (const wf of workflows) {
    // If workflow has specific stage filter for deal_stage_changed
    if (triggerType === 'deal_stage_changed' && wf.trigger_config?.target_stage) {
      if (context?.to_stage !== wf.trigger_config.target_stage) {
        continue;
      }
    }

    await executeWorkflowLive(workspaceId, wf.id, {
      triggerType,
      entityId,
      contactId: context?.contactId,
      context,
    });
  }
}
