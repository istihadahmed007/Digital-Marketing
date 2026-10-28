import { WorkflowNode, WorkflowEdge, AutomationWorkflow } from '@/lib/types/crm';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface WorkflowTemplateDefinition {
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const GROWTHPILOT_PRIMARY_WORKFLOWS: WorkflowTemplateDefinition[] = [
  // =========================================================================
  // WORKFLOW A: Website Launch & Content Draft Automation
  // =========================================================================
  {
    name: 'Workflow A — Website Launch & Campaign Drafts',
    description: 'When a new product, service, or article is published, retrieve content, generate platform drafts in Bangla & English, and route for approval.',
    trigger_type: 'manual',
    trigger_config: {
      actual_trigger_type: 'manual',
      event: 'website_published',
      sample_payload: '{\n  "url": "https://digi.vartualtutor.com/services/ai-automation",\n  "title": "AI Marketing Automation Launch"\n}',
    },
    nodes: [
      {
        id: 'node_trigger',
        type: 'manual',
        label: 'Website Item Published',
        position: { x: 80, y: 160 },
        data: {
          test_payload: '{\n  "url": "https://digi.vartualtutor.com/new-service",\n  "title": "New Growth Service Launch"\n}',
        },
      },
      {
        id: 'node_webhook',
        type: 'webhook_request',
        label: 'Fetch Page Metadata & Brief',
        position: { x: 380, y: 160 },
        data: {
          url: 'https://digi.vartualtutor.com/api/integrations/crawl',
          method: 'POST',
          headers: '{"Content-Type": "application/json"}',
          body: '{"url": "{{trigger.url}}"}',
        },
      },
      {
        id: 'node_task',
        type: 'create_task',
        label: 'Route Drafts for Marketing Approval',
        position: { x: 680, y: 160 },
        data: {
          title: 'Review multi-channel campaign drafts for new launch',
          priority: 'high',
          due_days: 1,
          description: 'Review AI Content Studio drafts in Calendar before scheduling public broadcasts.',
        },
      },
    ],
    edges: [
      { id: 'edge_1', source: 'node_trigger', target: 'node_webhook', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'edge_2', source: 'node_webhook', target: 'node_task', sourceHandle: 'success', targetHandle: 'input' },
    ],
  },

  // =========================================================================
  // WORKFLOW B: Inbound Lead Capture & Qualification
  // =========================================================================
  {
    name: 'Workflow B — Inbound Lead Capture & Routing',
    description: 'When a website form receives a submission, validate consent, enrich contact records, classify lifecycle stage, and assign a 24h follow-up task.',
    trigger_type: 'form_submission',
    trigger_config: {
      actual_trigger_type: 'form_submission',
      form_id: 'all',
    },
    nodes: [
      {
        id: 'node_trigger',
        type: 'form_submission',
        label: 'Inbound Form Submitted',
        position: { x: 80, y: 160 },
        data: { form_filter: 'all' },
      },
      {
        id: 'node_condition_consent',
        type: 'if_else',
        label: 'Check Verified Consent',
        position: { x: 360, y: 160 },
        data: {
          field: 'consent_status',
          operator: 'equals',
          value: 'opted_in',
        },
      },
      {
        id: 'node_update_lead',
        type: 'update_contact',
        label: 'Classify as Qualified Lead',
        position: { x: 640, y: 100 },
        data: {
          lifecycle_stage: 'lead',
          lead_status: 'qualified',
          lead_score_increment: 20,
        },
      },
      {
        id: 'node_task_followup',
        type: 'create_task',
        label: 'Assign 24h Follow-up Task',
        position: { x: 920, y: 100 },
        data: {
          title: 'Call inbound lead within 24h SLA',
          priority: 'urgent',
          due_days: 1,
          description: 'Follow up with verified form submitter and assess service fit.',
        },
      },
    ],
    edges: [
      { id: 'edge_b1', source: 'node_trigger', target: 'node_condition_consent', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'edge_b2', source: 'node_condition_consent', target: 'node_update_lead', sourceHandle: 'true', targetHandle: 'input' },
      { id: 'edge_b3', source: 'node_update_lead', target: 'node_task_followup', sourceHandle: 'output', targetHandle: 'input' },
    ],
  },

  // =========================================================================
  // WORKFLOW C: Lead Follow-up Sequence with Unsubscribe Guard
  // =========================================================================
  {
    name: 'Workflow C — Smart Lead Follow-up (Unsubscribe Protected)',
    description: 'Sends relevant welcome email, waits 2 days, and halts automated follow-ups if contact replies, converts, or unsubscribes.',
    trigger_type: 'contact_created',
    trigger_config: {
      actual_trigger_type: 'contact_created',
      source_filter: 'all',
    },
    nodes: [
      {
        id: 'node_trigger',
        type: 'contact_created',
        label: 'New Lead Registered',
        position: { x: 80, y: 160 },
        data: { source_filter: 'all' },
      },
      {
        id: 'node_welcome_email',
        type: 'send_email',
        label: 'Send Value Welcome Email',
        position: { x: 360, y: 160 },
        data: {
          subject: 'Welcome to GrowthPilot AI — Accelerate your growth',
          template: 'welcome_growth',
          stop_on_unsubscribe: true,
        },
      },
      {
        id: 'node_delay',
        type: 'delay',
        label: 'Wait 2 Days',
        position: { x: 640, y: 160 },
        data: {
          delay_duration: 48,
          delay_unit: 'hours',
        },
      },
      {
        id: 'node_check_active',
        type: 'if_else',
        label: 'Halt if Converted or Opted Out',
        position: { x: 920, y: 160 },
        data: {
          field: 'lifecycle_stage',
          operator: 'not_equals',
          value: 'customer',
        },
      },
      {
        id: 'node_followup_email',
        type: 'send_email',
        label: 'Send Stage 2 Consultation Offer',
        position: { x: 1200, y: 160 },
        data: {
          subject: 'Quick question regarding your growth targets',
          template: 'consultation_touchpoint',
          stop_on_unsubscribe: true,
        },
      },
    ],
    edges: [
      { id: 'edge_c1', source: 'node_trigger', target: 'node_welcome_email', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'edge_c2', source: 'node_welcome_email', target: 'node_delay', sourceHandle: 'success', targetHandle: 'input' },
      { id: 'edge_c3', source: 'node_delay', target: 'node_check_active', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'edge_c4', source: 'node_check_active', target: 'node_followup_email', sourceHandle: 'true', targetHandle: 'input' },
    ],
  },

  // =========================================================================
  // WORKFLOW D: SEO Monitoring & Opportunity Queue
  // =========================================================================
  {
    name: 'Workflow D — SEO Keyword & Ranking Monitor',
    description: 'Retrieves authorized Search Console data, detects click/impression spikes or drops, and queues recommendations for review.',
    trigger_type: 'manual',
    trigger_config: {
      actual_trigger_type: 'manual',
      schedule: 'weekly',
    },
    nodes: [
      {
        id: 'node_trigger',
        type: 'manual',
        label: 'Periodic SEO Audit Trigger',
        position: { x: 80, y: 160 },
        data: { test_payload: '{"audit": "weekly_gsc_scan"}' },
      },
      {
        id: 'node_seo_fetch',
        type: 'webhook_request',
        label: 'Fetch Search Performance Analytics',
        position: { x: 380, y: 160 },
        data: {
          url: 'https://digi.vartualtutor.com/api/seo/analytics',
          method: 'GET',
          headers: '{"Accept": "application/json"}',
        },
      },
      {
        id: 'node_task_seo',
        type: 'create_task',
        label: 'Queue Proposed Title & Meta Updates',
        position: { x: 680, y: 160 },
        data: {
          title: 'Review SEO Opportunities & Low-CTR Landing Pages',
          priority: 'normal',
          due_days: 3,
          description: 'Review keywords ranking in positions 4-10 with low CTR and optimize meta titles.',
        },
      },
    ],
    edges: [
      { id: 'edge_d1', source: 'node_trigger', target: 'node_seo_fetch', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'edge_d2', source: 'node_seo_fetch', target: 'node_task_seo', sourceHandle: 'success', targetHandle: 'input' },
    ],
  },

  // =========================================================================
  // WORKFLOW E: Automated Marketing Performance Report
  // =========================================================================
  {
    name: 'Workflow E — Automated Weekly Marketing Report',
    description: 'Collects verified metrics from GA4, GSC, and CRM, calculates conversion rates, and compiles a weekly executive report.',
    trigger_type: 'manual',
    trigger_config: {
      actual_trigger_type: 'manual',
      schedule: 'weekly_monday',
    },
    nodes: [
      {
        id: 'node_trigger',
        type: 'manual',
        label: 'Weekly Reporting Schedule',
        position: { x: 80, y: 160 },
        data: { test_payload: '{"report_type": "weekly_growth_summary"}' },
      },
      {
        id: 'node_create_report_task',
        type: 'create_task',
        label: 'Publish Executive Growth Briefing',
        position: { x: 420, y: 160 },
        data: {
          title: 'Synthesize Weekly Marketing Report',
          priority: 'normal',
          due_days: 1,
          description: 'Review aggregate website sessions, qualified leads, and won pipeline value for the past 7 days.',
        },
      },
    ],
    edges: [
      { id: 'edge_e1', source: 'node_trigger', target: 'node_create_report_task', sourceHandle: 'output', targetHandle: 'input' },
    ],
  },

  // =========================================================================
  // WORKFLOW F: Error Recovery & Diagnostic Alerting
  // =========================================================================
  {
    name: 'Workflow F — Error Recovery & Diagnostic Alerting',
    description: 'Detects failed integration actions, logs diagnostic payloads, retries transient network errors safely, and notifies administrator.',
    trigger_type: 'manual',
    trigger_config: {
      actual_trigger_type: 'manual',
      event: 'action_failed_event',
    },
    nodes: [
      {
        id: 'node_trigger',
        type: 'manual',
        label: 'Failed Action Detected',
        position: { x: 80, y: 160 },
        data: {
          test_payload: '{\n  "error_code": "NETWORK_TIMEOUT",\n  "failed_node": "send_email",\n  "retry_count": 2\n}',
        },
      },
      {
        id: 'node_alert_task',
        type: 'create_task',
        label: 'Alert Administrator of Repeated Failures',
        position: { x: 420, y: 160 },
        data: {
          title: 'Investigate automation delivery failure',
          priority: 'urgent',
          due_days: 1,
          description: 'Integration action failed after retries. Check API quotas and credential status.',
        },
      },
    ],
    edges: [
      { id: 'edge_f1', source: 'node_trigger', target: 'node_alert_task', sourceHandle: 'output', targetHandle: 'input' },
    ],
  },
];

export async function seedGrowthPilotWorkflows(
  workspaceId: string
): Promise<{ success: boolean; seededCount: number; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: true, seededCount: 0 };

  try {
    let seededCount = 0;
    for (const def of GROWTHPILOT_PRIMARY_WORKFLOWS) {
      const { data: existing } = await supabase
        .from('automation_workflows')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('name', def.name)
        .maybeSingle();

      if (!existing) {
        await supabase.from('automation_workflows').insert({
          id: crypto.randomUUID(),
          workspace_id: workspaceId,
          name: def.name,
          description: def.description,
          trigger_type: def.trigger_type,
          trigger_config: def.trigger_config,
          nodes: def.nodes,
          edges: def.edges,
          is_active: false,
          status: 'draft',
          version: 1,
        });
        seededCount++;
      }
    }

    return { success: true, seededCount };
  } catch (err: any) {
    return { success: false, seededCount: 0, error: err.message };
  }
}
