import {
  WorkflowGraph,
  WorkflowNode,
  ExecutionStatus,
  NodeExecutionStatus,
} from '@/lib/types/automation-flow';
import { NODE_DEFINITIONS } from './node-registry';
import { resolveFieldValue } from './expression-resolver';
import { evaluateConditionRule, evaluateConditions } from './condition-evaluator';
import { validateWorkflowGraph } from './graph-validator';
import { ResendEmailProvider, isValidEmail } from '@/lib/integrations/email/resend';
import { safeFetch, validateSafePublicUrl, isUnsafeIp } from '@/lib/security/ssrf';
import { decryptSecret } from '@/lib/security/crypto';
import { SupabaseClient } from '@supabase/supabase-js';

const MAX_EXECUTION_STEPS = 50;

/**
 * Checks whether an IP address or hostname is local or private.
 */
export function isPrivateIpAddress(ipOrHost: string): boolean {
  if (!ipOrHost) return true;
  const lower = ipOrHost.toLowerCase().trim();
  if (lower === 'localhost' || !lower.includes('.')) return true;
  // If it's an IPv4 or IPv6 literal
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(lower) || lower.includes(':')) {
    return isUnsafeIp(lower);
  }
  // Public domain name (e.g. api.github.com, hooks.slack.com)
  return false;
}

// In-memory idempotency deduplication cache
const idempotencyKeyCache = new Set<string>();

export interface ExecuteGraphOptions {
  workspaceId: string;
  workflowId: string;
  workflowName: string;
  workflowVersion?: number;
  graph: WorkflowGraph;
  triggerType: string;
  triggerData: Record<string, any>;
  isDryRun?: boolean;
  idempotencyKey?: string;
  supabase?: SupabaseClient | null;
}

export interface ExecutionResult {
  success: boolean;
  executionId?: string;
  status: ExecutionStatus;
  isDryRun: boolean;
  nodeExecutions: Array<{
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    status: NodeExecutionStatus;
    inputData: Record<string, any>;
    outputData: Record<string, any>;
    errorMessage?: string;
    durationMs?: number;
  }>;
  error?: string;
  durationMs: number;
}

/**
 * Sanitizes and redacts sensitive credentials from execution logs.
 */
function sanitizeLogPayload(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const clone = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(clone)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('key')
    ) {
      if (typeof clone[key] === 'string' && clone[key].length > 4) {
        clone[key] = `${clone[key].slice(0, 3)}***REDACTED***`;
      }
    } else if (typeof clone[key] === 'object') {
      clone[key] = sanitizeLogPayload(clone[key]);
    }
  }

  return clone;
}

export async function executeWorkflowGraph(options: ExecuteGraphOptions): Promise<ExecutionResult> {
  const startTime = Date.now();
  const {
    workspaceId,
    workflowId,
    workflowName,
    workflowVersion = 1,
    graph,
    triggerType,
    triggerData,
    isDryRun = false,
    idempotencyKey = `exec_${workflowId}_${triggerType}_${Date.now()}`,
    supabase,
  } = options;

  // 1. Validate graph structure before execution
  const validation = validateWorkflowGraph(graph);
  if (!validation.isValid) {
    const errText = validation.errors.map((e) => e.message).join('; ');
    return {
      success: false,
      status: 'failed',
      isDryRun,
      nodeExecutions: [],
      error: `Workflow validation failed: ${errText}`,
      durationMs: Date.now() - startTime,
    };
  }

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const nodeMap = new Map<string, WorkflowNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // 2. Locate starting trigger node
  const triggerNode = nodes.find(
    (n) => NODE_DEFINITIONS[n.type]?.category === 'trigger'
  );

  if (!triggerNode) {
    return {
      success: false,
      status: 'failed',
      isDryRun,
      nodeExecutions: [],
      error: 'No trigger node found in workflow graph.',
      durationMs: Date.now() - startTime,
    };
  }

  // 3. Idempotency Check
  if (idempotencyKey) {
    if (idempotencyKeyCache.has(idempotencyKey)) {
      return {
        success: false,
        status: 'failed',
        isDryRun,
        nodeExecutions: [],
        error: `Duplicate execution prevented for idempotency key "${idempotencyKey}"`,
        durationMs: Date.now() - startTime,
      };
    }
    idempotencyKeyCache.add(idempotencyKey);
  }

  if (!isDryRun && supabase) {
    const { data: existingRun } = await supabase
      .from('workflow_executions')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingRun) {
      return {
        success: true,
        executionId: existingRun.id,
        status: existingRun.status as ExecutionStatus,
        isDryRun,
        nodeExecutions: [],
        error: `Skipped: Idempotency key "${idempotencyKey}" already processed.`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // 4. Create workflow execution run record
  let executionId = `mock_exec_${Date.now()}`;
  if (!isDryRun && supabase) {
    const { data: runRecord, error: runErr } = await supabase
      .from('workflow_executions')
      .insert({
        workspace_id: workspaceId,
        workflow_id: workflowId,
        workflow_version: workflowVersion,
        trigger_type: triggerType,
        trigger_data: sanitizeLogPayload(triggerData),
        status: 'running',
        is_dry_run: false,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    if (runErr || !runRecord) {
      return {
        success: false,
        status: 'failed',
        isDryRun,
        nodeExecutions: [],
        error: `Failed to initialize execution record: ${runErr?.message}`,
        durationMs: Date.now() - startTime,
      };
    }
    executionId = runRecord.id;
  }

  // 5. Execution context
  const context: Record<string, any> = {
    trigger: triggerData,
    workflow: {
      id: workflowId,
      name: workflowName,
      version: workflowVersion,
    },
    workspace_id: workspaceId,
    nodes: {},
  };

  const executedNodes: Array<{
    nodeId: string;
    nodeType: string;
    nodeLabel: string;
    status: NodeExecutionStatus;
    inputData: Record<string, any>;
    outputData: Record<string, any>;
    errorMessage?: string;
    durationMs?: number;
  }> = [];

  let overallSuccess = true;
  let overallStatus: ExecutionStatus = 'succeeded';
  let failureReason: string | undefined;

  // Queue of nodes to process: [ { nodeId, incomingHandle } ]
  const queue: Array<{ nodeId: string; incomingHandle?: string }> = [
    { nodeId: triggerNode.id },
  ];
  let stepCount = 0;

  // Track email provider instance
  let emailProvider: ResendEmailProvider | null = null;

  while (queue.length > 0) {
    if (stepCount >= MAX_EXECUTION_STEPS) {
      overallSuccess = false;
      overallStatus = 'failed';
      failureReason = `Execution exceeded safety limit of ${MAX_EXECUTION_STEPS} steps.`;
      break;
    }

    const { nodeId } = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (!node || node.disabled) continue;

    stepCount++;
    const nodeStartTime = Date.now();
    const nodeDef = NODE_DEFINITIONS[node.type];
    const nodeLabel = node.label || nodeDef?.label || node.id;

    let nodeStatus: NodeExecutionStatus = 'succeeded';
    let nodeError: string | undefined;
    const nodeInput: Record<string, any> = { ...node.data };
    let nodeOutput: Record<string, any> = {};

    let chosenNextHandle = 'output';

    try {
      // Execute node logic based on type
      switch (node.type) {
        // --- TRIGGERS ---
        case 'manual':
        case 'contact_created':
        case 'contact_updated':
        case 'form_submission':
        case 'deal_stage_changed':
        case 'tag_added':
        case 'schedule':
        case 'webhook_incoming': {
          nodeOutput = { ...triggerData };
          break;
        }

        // --- ACTIONS ---
        case 'create_task': {
          const rawTitle = node.data?.title || node.data?.task_title || 'Follow up task';
          const taskTitle = resolveFieldValue(rawTitle, context);
          const priority = node.data?.priority || 'high';
          const dueInDays = Number(node.data?.due_in_days || 2);
          const contactId = context.trigger?.contact?.id || context.trigger?.contact_id || null;

          if (isDryRun) {
            nodeOutput = {
              simulated: true,
              task: { title: taskTitle, priority, dueInDays },
              taskTitle,
              priority,
              dueInDays,
              action: `[DRY RUN] Would create CRM task "${taskTitle}" with priority ${priority}`,
            };
          } else {
            if (!supabase) throw new Error('Database client required for live task creation.');
            const { data: taskData, error: taskErr } = await supabase
              .from('tasks')
              .insert({
                workspace_id: workspaceId,
                contact_id: contactId,
                title: taskTitle,
                priority,
                status: 'pending',
                due_date: new Date(Date.now() + 86400000 * dueInDays).toISOString(),
              })
              .select('id')
              .single();

            if (taskErr) throw new Error(`Failed to create task: ${taskErr.message}`);
            nodeOutput = { taskId: taskData?.id, taskTitle, priority };
          }
          break;
        }

        case 'update_contact': {
          const contactId = context.trigger?.contact?.id || context.trigger?.contact_id;
          if (!contactId) throw new Error('No contact found in execution context to update.');

          const updates: Record<string, any> = {};
          if (node.data?.lifecycle_stage) updates.lifecycle_stage = node.data.lifecycle_stage;
          if (node.data?.lead_status) updates.lead_status = node.data.lead_status;

          const rawNote = node.data?.custom_notes;
          const noteText = rawNote ? resolveFieldValue(rawNote, context) : '';

          if (isDryRun) {
            nodeOutput = {
              simulated: true,
              contactId,
              updates,
              noteText,
              action: `[DRY RUN] Would update contact ${contactId} attributes: ${JSON.stringify(updates)}`,
            };
          } else {
            if (!supabase) throw new Error('Database client required for live contact update.');
            if (Object.keys(updates).length > 0) {
              const { error: updErr } = await supabase
                .from('contacts')
                .update(updates)
                .eq('workspace_id', workspaceId)
                .eq('id', contactId);

              if (updErr) throw new Error(`Failed to update contact: ${updErr.message}`);
            }

            if (noteText) {
              await supabase.from('activities').insert({
                workspace_id: workspaceId,
                contact_id: contactId,
                type: 'note',
                title: `Automated Workflow Note: ${workflowName}`,
                description: noteText,
              });
            }

            nodeOutput = { contactId, updatedFields: Object.keys(updates), noteAdded: Boolean(noteText) };
          }
          break;
        }

        case 'add_remove_tag': {
          const contactId = context.trigger?.contact?.id || context.trigger?.contact_id;
          if (!contactId) throw new Error('No contact found in execution context for tag operation.');

          const tag = String(resolveFieldValue(node.data?.tag, context)).trim();
          if (!tag) throw new Error('Tag name is required.');
          const operation = node.data?.operation || 'add';

          if (isDryRun) {
            nodeOutput = {
              simulated: true,
              contactId,
              tag,
              operation,
              action: `[DRY RUN] Would ${operation} tag "${tag}" on contact ${contactId}`,
            };
          } else {
            if (!supabase) throw new Error('Database client required for live tag operation.');
            const { data: contact } = await supabase
              .from('contacts')
              .select('tags')
              .eq('workspace_id', workspaceId)
              .eq('id', contactId)
              .single();

            const currentTags: string[] = Array.isArray(contact?.tags) ? contact.tags : [];
            let newTags = [...currentTags];

            if (operation === 'add') {
              if (!newTags.includes(tag)) newTags.push(tag);
            } else {
              newTags = newTags.filter((t) => t !== tag);
            }

            const { error: tagErr } = await supabase
              .from('contacts')
              .update({ tags: newTags })
              .eq('workspace_id', workspaceId)
              .eq('id', contactId);

            if (tagErr) throw new Error(`Failed to update tags: ${tagErr.message}`);
            nodeOutput = { contactId, tag, operation, tags: newTags };
          }
          break;
        }

        case 'update_deal_stage': {
          const dealId = context.trigger?.deal?.id || context.trigger?.deal_id;
          if (!dealId) throw new Error('No deal associated with execution event to update.');

          const stage = node.data?.stage || 'qualified';
          if (isDryRun) {
            nodeOutput = {
              simulated: true,
              dealId,
              stage,
              action: `[DRY RUN] Would update deal ${dealId} to stage "${stage}"`,
            };
          } else {
            if (!supabase) throw new Error('Database client required for live deal update.');
            const { error: dealErr } = await supabase
              .from('deals')
              .update({ stage })
              .eq('workspace_id', workspaceId)
              .eq('id', dealId);

            if (dealErr) throw new Error(`Failed to update deal stage: ${dealErr.message}`);

            await supabase.from('deal_stage_history').insert({
              workspace_id: workspaceId,
              deal_id: dealId,
              to_stage: stage,
            });

            nodeOutput = { dealId, updatedStage: stage };
          }
          break;
        }

        case 'send_email': {
          const rawSubject = node.data?.subject || '';
          const subject = resolveFieldValue(rawSubject, context);
          const rawBody = node.data?.body_html || '';
          const bodyHtml = resolveFieldValue(rawBody, context);

          const recipientEmail =
            node.data?.to ||
            context.trigger?.contact?.email ||
            context.trigger?.email ||
            context.trigger?.contact_email;

          if (isDryRun) {
            nodeOutput = {
              simulated: true,
              recipient: recipientEmail,
              subject,
              bodyPreview: typeof bodyHtml === 'string' ? bodyHtml.slice(0, 100) : '',
              action: `[DRY RUN] Would dispatch email "${subject}" to ${recipientEmail}`,
            };
            break;
          }

          const consentStatus = context.trigger?.contact?.consent_status || context.trigger?.consent_status;

          if (!recipientEmail || !isValidEmail(recipientEmail)) {
            throw new Error(`Recipient email address is invalid or missing (${recipientEmail || 'none'}).`);
          }

          if (consentStatus && consentStatus !== 'opted_in') {
            throw new Error(
              `Contact "${recipientEmail}" has consent_status "${consentStatus}". Marketing email sends require "opted_in".`
            );
          }

          // Check credentials
          if (!emailProvider) {
            let apiKey = process.env.RESEND_API_KEY || '';
            let fromEmail = process.env.RESEND_FROM_EMAIL || '';

            if (supabase) {
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
            }

            emailProvider = new ResendEmailProvider(apiKey, fromEmail);
          }

          if (!emailProvider.isConfigured()) {
            throw new Error(emailProvider.getMissingSetupInstructions());
          }
            const sendResult = await emailProvider.sendCampaignBatch({
              workspaceId,
              campaignId: `flow_${workflowId}`,
              subject,
              htmlContent: bodyHtml,
              recipients: [{ contactId: context.trigger?.contact?.id, email: recipientEmail }],
            });

            if (sendResult.sentCount === 0) {
              throw new Error(sendResult.results[0]?.error || 'Failed to dispatch email via Resend.');
            }

            nodeOutput = {
              messageId: sendResult.results[0]?.messageId,
              recipient: recipientEmail,
              subject,
            };
          break;
        }

        case 'webhook_request': {
          const rawUrl = node.data?.url || '';
          const targetUrl = resolveFieldValue(rawUrl, context);

          if (!targetUrl) throw new Error('Webhook destination URL is required.');

          const ssrfCheck = await validateSafePublicUrl(targetUrl);
          if (!ssrfCheck.safe) {
            throw new Error(`SSRF Block: Destination rejected: ${ssrfCheck.error}`);
          }

          let headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (node.data?.custom_headers) {
            try {
              const parsedHeaders = typeof node.data.custom_headers === 'string'
                ? JSON.parse(node.data.custom_headers)
                : node.data.custom_headers;
              headers = { ...headers, ...parsedHeaders };
            } catch {
              // Ignore header parsing error
            }
          }

          if (isDryRun) {
            nodeOutput = {
              simulated: true,
              targetUrl,
              action: `[DRY RUN] SSRF passed. Would dispatch POST request to ${targetUrl}`,
            };
          } else {
            const res = await safeFetch(targetUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                event: triggerType,
                workflow_id: workflowId,
                data: sanitizeLogPayload(context.trigger),
                timestamp: new Date().toISOString(),
              }),
              timeoutMs: 6000,
            });

            if (!res.ok) {
              throw new Error(`HTTP Webhook failed with status ${res.status} (${res.statusText})`);
            }

            nodeOutput = { status: res.status, ok: true };
          }
          break;
        }

        // --- LOGIC ---
        case 'if_else': {
          let conditionPassed = false;
          if (Array.isArray(node.data?.rules) && node.data.rules.length > 0) {
            conditionPassed = evaluateConditions(
              node.data.rules,
              node.data?.logical_operator || 'AND',
              context
            );
          } else {
            conditionPassed = evaluateConditionRule(
              {
                field: node.data?.field || '',
                operator: node.data?.operator || 'equals',
                value: node.data?.value,
              },
              context
            );
          }

          chosenNextHandle = conditionPassed ? 'true' : 'false';
          nodeOutput = {
            result: conditionPassed,
            branch: chosenNextHandle,
            rules: node.data?.rules,
            operator: node.data?.logical_operator || node.data?.operator,
          };
          break;
        }

        case 'delay': {
          const amount = Number(node.data?.amount || 1);
          const unit = node.data?.unit || 'hours';
          nodeOutput = { delayAmount: amount, delayUnit: unit };

          if (!isDryRun) {
            // Live delay: mark state as waiting and break flow execution
            overallStatus = 'waiting';
            nodeStatus = 'waiting';
            // Stop further downstream steps until worker resumes
          }
          break;
        }

        case 'end_workflow': {
          nodeOutput = { completed: true, reason: node.data?.reason || 'Workflow completed' };
          break;
        }

        default:
          throw new Error(`Unsupported node execution type: "${node.type}".`);
      }
    } catch (err: any) {
      nodeStatus = 'failed';
      nodeError = err.message || 'Execution error';
      overallSuccess = false;
      overallStatus = 'failed';
      failureReason = `Node "${nodeLabel}" failed: ${nodeError}`;
    }

    const nodeDuration = Date.now() - nodeStartTime;

    // Save node output to context so downstream nodes can map values: {{nodes.<nodeId>.output.key}}
    context.nodes[node.id] = {
      type: node.type,
      output: nodeOutput,
    };

    executedNodes.push({
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel,
      status: nodeStatus,
      inputData: sanitizeLogPayload(nodeInput),
      outputData: sanitizeLogPayload(nodeOutput),
      errorMessage: nodeError,
      durationMs: nodeDuration,
    });

    // Write durable per-node execution trace into database
    if (!isDryRun && executionId && !executionId.startsWith('mock_') && supabase) {
      await supabase.from('workflow_node_executions').insert({
        workspace_id: workspaceId,
        execution_id: executionId,
        node_id: node.id,
        node_type: node.type,
        node_label: nodeLabel,
        status: nodeStatus,
        input_data: sanitizeLogPayload(nodeInput),
        output_data: sanitizeLogPayload(nodeOutput),
        error_message: nodeError || null,
        duration_ms: nodeDuration,
      });
    }

    if (nodeStatus === 'failed' || nodeStatus === 'waiting' || node.type === 'end_workflow') {
      // Do not continue along this branch
      continue;
    }

    // Find outgoing edges from this node matching the chosen handle
    const outgoingEdges = edges.filter((e) => {
      if (e.source !== node.id) return false;
      if (node.type === 'if_else') {
        return (e.sourceHandle || 'true') === chosenNextHandle;
      }
      return true;
    });

    for (const edge of outgoingEdges) {
      queue.push({ nodeId: edge.target });
    }
  }

  const totalDuration = Date.now() - startTime;

  // Finalize workflow_executions row
  if (!isDryRun && executionId && !executionId.startsWith('mock_') && supabase) {
    await supabase
      .from('workflow_executions')
      .update({
        status: overallStatus,
        error_message: failureReason || null,
        completed_at: new Date().toISOString(),
        duration_ms: totalDuration,
      })
      .eq('id', executionId);

    // Update last_executed_at on workflow
    await supabase
      .from('automation_workflows')
      .update({ last_executed_at: new Date().toISOString() })
      .eq('id', workflowId);
  }

  return {
    success: overallSuccess,
    executionId,
    status: overallStatus,
    isDryRun,
    nodeExecutions: executedNodes,
    error: failureReason,
    durationMs: totalDuration,
  };
}
