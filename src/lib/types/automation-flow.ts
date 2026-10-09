/**
 * NexusFlow — Visual Workflow Builder & Execution Engine Type System
 */

export type NodeCategory = 'trigger' | 'action' | 'logic';

export type TriggerNodeType =
  | 'manual'
  | 'contact_created'
  | 'contact_updated'
  | 'form_submission'
  | 'deal_stage_changed'
  | 'tag_added'
  | 'schedule'
  | 'webhook_incoming';

export type ActionNodeType =
  | 'create_task'
  | 'update_contact'
  | 'add_remove_tag'
  | 'update_deal_stage'
  | 'send_email'
  | 'webhook_request';

export type LogicNodeType =
  | 'if_else'
  | 'delay'
  | 'end_workflow';

export type WorkflowNodeType = TriggerNodeType | ActionNodeType | LogicNodeType;

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'error';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  position: WorkflowNodePosition;
  data: Record<string, any>;
  notes?: string;
  disabled?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // 'output' | 'true' | 'false'
  targetHandle?: string; // 'input'
  label?: string;
}

export interface WorkflowViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: WorkflowViewport;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'date_after'
  | 'date_before';

export interface ConditionRule {
  id?: string;
  field: string; // e.g. '{{trigger.email}}' or 'trigger.lead_score'
  operator: ConditionOperator;
  value?: any;
}

export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'waiting'
  | 'cancelled';

export type NodeExecutionStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'waiting';

export interface WorkflowExecution {
  id: string;
  workspace_id: string;
  workflow_id: string;
  workflow_version: number;
  trigger_type: string;
  trigger_data: Record<string, any>;
  status: ExecutionStatus;
  is_dry_run: boolean;
  idempotency_key: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  created_at: string;
  node_executions?: WorkflowNodeExecution[];
  workflow?: {
    name: string;
  };
}

export interface WorkflowNodeExecution {
  id: string;
  workspace_id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  node_label: string;
  status: NodeExecutionStatus;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  created_at: string;
}

export interface WorkflowAuditLog {
  id: string;
  workspace_id: string;
  workflow_id?: string | null;
  user_id?: string | null;
  action: 'created' | 'updated' | 'published' | 'paused' | 'deleted' | 'retried';
  version?: number | null;
  details: Record<string, any>;
  created_at: string;
}

export interface NodeFieldSchema {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'json' | 'conditions' | 'expression';
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: string }>;
  supportsExpressions?: boolean;
}

export interface NodeTypeDefinition {
  type: WorkflowNodeType;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  inputs: Array<{ id: string; label: string }>;
  outputs: Array<{ id: string; label: string; color?: string }>;
  fields: NodeFieldSchema[];
  defaultData: Record<string, any>;
}

export interface GraphValidationError {
  nodeId?: string;
  edgeId?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface GraphValidationResult {
  isValid: boolean;
  errors: GraphValidationError[];
  warnings: GraphValidationError[];
}
