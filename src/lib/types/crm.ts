export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'customer';
export type LifecycleStage = 'subscriber' | 'lead' | 'mql' | 'sql' | 'opportunity' | 'customer';
export type ContactSource = 'direct' | 'website' | 'organic_search' | 'referral' | 'paid_ad' | 'form_submission' | 'csv_import' | 'cold_outreach' | 'social';
export type ConsentStatus = 'opted_in' | 'opted_out' | 'pending' | 'not_applicable';

export interface LeadScoreReason {
  reason: string;
  points: number;
}

export interface Contact {
  id: string;
  workspace_id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  lead_status: LeadStatus;
  lifecycle_stage: LifecycleStage;
  tags: string[];
  is_archived: boolean;
  owner_id?: string | null;
  source?: ContactSource;
  consent_status?: ConsentStatus;
  custom_fields?: Record<string, any>;
  lead_score?: number;
  lead_score_reasons?: LeadScoreReason[];
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company?: Company | null;
}

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  order_index: number;
  probability: number;
  color: string;
  created_at: string;
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  stages?: PipelineStage[];
  created_at: string;
  updated_at: string;
}

export interface DealStageHistory {
  id: string;
  deal_id: string;
  workspace_id: string;
  from_stage: string | null;
  to_stage: string;
  amount: number | null;
  changed_by: string | null;
  created_at: string;
}

export interface ContactView {
  id: string;
  workspace_id: string;
  name: string;
  filters: Record<string, any>;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  workspace_id: string;
  company_id: string | null;
  contact_id: string | null;
  pipeline_id?: string | null;
  stage_id?: string | null;
  title: string;
  amount: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date: string | null;
  owner_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  contact?: Contact | null;
  company?: Company | null;
  stageHistory?: DealStageHistory[];
}

export type ActivityType = 'note' | 'call' | 'meeting' | 'email' | 'status_change' | 'deal_created' | 'stage_change';

export interface Activity {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  type: ActivityType;
  title: string;
  description: string | null;
  user_id: string | null;
  created_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CsvContactRow {
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  job_title?: string;
  company_name?: string;
  lead_status?: LeadStatus;
  lifecycle_stage?: LifecycleStage;
  tags?: string[];
}

export interface CsvImportResult {
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: { row: number; email?: string; message: string }[];
}

// ==========================================
// Phase 2 Types: Marketing & Growth Engine
// ==========================================

export type FormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select fields
  mapsToContactField?: 'email' | 'first_name' | 'last_name' | 'phone' | 'job_title' | 'company' | null;
}

export interface Form {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  description: string | null;
  fields: FormField[];
  is_published: boolean;
  success_message: string | null;
  redirect_url: string | null;
  created_at: string;
  updated_at: string;
  submissions_count?: number;
}

export interface FormSubmission {
  id: string;
  workspace_id: string;
  form_id: string;
  contact_id: string | null;
  data: Record<string, string>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  contact?: Contact | null;
  form?: Form | null;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'archived';

export interface EmailCampaign {
  id: string;
  workspace_id: string;
  name: string;
  subject: string;
  preview_text: string | null;
  content_html: string | null;
  status: CampaignStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  unsubscribed_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  target_audience?: {
    lifecycle_stage?: LifecycleStage | 'all';
    lead_status?: LeadStatus | 'all';
    tag?: string;
  };
}

export * from './automation-flow';
import {
  WorkflowNode,
  WorkflowEdge,
  WorkflowViewport,
  WorkflowStatus,
} from './automation-flow';

export type AutomationTriggerType =
  | 'form_submission'
  | 'contact_created'
  | 'contact_updated'
  | 'deal_stage_changed'
  | 'tag_added'
  | 'manual'
  | 'schedule'
  | 'webhook_incoming';

export interface AutomationStep {
  id: string;
  type: 'send_email' | 'create_task' | 'update_lifecycle' | 'add_tag' | 'webhook';
  title: string;
  config: Record<string, any>;
}

export interface AutomationWorkflow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger_type: AutomationTriggerType;
  trigger_config: Record<string, any>;
  steps: AutomationStep[];
  is_active: boolean;
  status?: WorkflowStatus;
  version?: number;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  viewport?: WorkflowViewport;
  published_at?: string | null;
  last_executed_at?: string | null;
  webhook_token?: string | null;
  webhook_slug?: string | null;
  created_at: string;
  updated_at: string;
  execution_count?: number;
}

export interface AutomationLog {
  id: string;
  workspace_id: string;
  workflow_id: string;
  contact_id: string | null;
  status: 'success' | 'failed' | 'retrying' | 'skipped';
  details: Record<string, any>;
  executed_at: string;
  contact?: Contact | null;
  workflow?: AutomationWorkflow | null;
}

export type IntegrationProvider = 'mautic' | 'sendgrid' | 'resend' | 'slack' | 'webhook' | 'google_calendar';

export interface Integration {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  name: string;
  config: Record<string, any>;
  is_enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'failed';

export interface EmailCampaignEvent {
  id: string;
  workspace_id: string;
  campaign_id: string;
  contact_id: string | null;
  recipient_email: string;
  provider: string;
  provider_message_id: string | null;
  status: EmailDeliveryStatus;
  error_message: string | null;
  idempotency_key: string;
  event_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AutomationStepLog {
  id: string;
  workspace_id: string;
  workflow_id: string;
  log_id: string | null;
  step_id: string;
  step_type: string;
  step_title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error_message?: string | null;
  output?: Record<string, any>;
  executed_at: string;
}

export interface SandboxedStepResult {
  stepId: string;
  stepTitle: string;
  stepType: string;
  status: 'simulated_success' | 'simulated_failure' | 'invalid_config';
  actionSummary: string;
  simulatedOutput?: Record<string, any>;
  error?: string;
}

export interface SandboxedWorkflowResult {
  workflowId: string;
  workflowName: string;
  isSandbox: true;
  simulatedContact: {
    id: string;
    name: string;
    email: string;
  };
  steps: SandboxedStepResult[];
  overallStatus: 'passed' | 'failed';
  warnings: string[];
}

