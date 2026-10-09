import {
  WorkflowNodeType,
  NodeTypeDefinition,
  NodeCategory,
} from '@/lib/types/automation-flow';

export const NODE_DEFINITIONS: Record<WorkflowNodeType, NodeTypeDefinition> = {
  // ==========================================
  // TRIGGERS
  // ==========================================
  manual: {
    type: 'manual',
    category: 'trigger',
    label: 'Manual Run',
    description: 'Trigger workflow manually on-demand or for testing.',
    icon: 'Play',
    color: '#8b5cf6', // Violet
    inputs: [],
    outputs: [{ id: 'output', label: 'Triggered' }],
    fields: [
      {
        name: 'test_payload',
        label: 'Sample Trigger Payload',
        type: 'json',
        description: 'Optional JSON payload to pass into workflow execution context.',
        defaultValue: '{\n  "source": "manual_test",\n  "contact_email": "demo@example.com"\n}',
      },
    ],
    defaultData: {
      test_payload: '{\n  "source": "manual_test",\n  "contact_email": "demo@example.com"\n}',
    },
  },

  contact_created: {
    type: 'contact_created',
    category: 'trigger',
    label: 'Contact Created',
    description: 'Fires immediately when a new contact is added to this workspace.',
    icon: 'UserPlus',
    color: '#8b5cf6',
    inputs: [],
    outputs: [{ id: 'output', label: 'Contact Created' }],
    fields: [
      {
        name: 'source_filter',
        label: 'Filter by Source',
        type: 'select',
        description: 'Only trigger for contacts created via specific sources.',
        defaultValue: 'all',
        options: [
          { label: 'All Sources', value: 'all' },
          { label: 'Manual Creation', value: 'manual' },
          { label: 'CSV Import', value: 'import' },
          { label: 'Public Form', value: 'form' },
          { label: 'API / Integration', value: 'api' },
        ],
      },
    ],
    defaultData: { source_filter: 'all' },
  },

  contact_updated: {
    type: 'contact_updated',
    category: 'trigger',
    label: 'Contact Updated',
    description: 'Fires when an existing contact details or stage are modified.',
    icon: 'UserCheck',
    color: '#8b5cf6',
    inputs: [],
    outputs: [{ id: 'output', label: 'Contact Updated' }],
    fields: [
      {
        name: 'watch_field',
        label: 'Watch Specific Field',
        type: 'select',
        description: 'Only trigger when this specific contact attribute changes.',
        defaultValue: 'any',
        options: [
          { label: 'Any Attribute Changed', value: 'any' },
          { label: 'Lifecycle Stage Changed', value: 'lifecycle_stage' },
          { label: 'Lead Status Changed', value: 'lead_status' },
          { label: 'Lead Score Changed', value: 'lead_score' },
          { label: 'Consent Status Changed', value: 'consent_status' },
        ],
      },
    ],
    defaultData: { watch_field: 'any' },
  },

  form_submission: {
    type: 'form_submission',
    category: 'trigger',
    label: 'Public Form Submitted',
    description: 'Fires when a visitor submits any or a specific lead capture form.',
    icon: 'FileText',
    color: '#8b5cf6',
    inputs: [],
    outputs: [{ id: 'output', label: 'Form Submitted' }],
    fields: [
      {
        name: 'form_id',
        label: 'Select Form',
        type: 'text',
        description: 'Optional Form ID or slug. Leave empty to trigger for all forms.',
        placeholder: 'e.g. contact-us or form-uuid',
        defaultValue: '',
      },
    ],
    defaultData: { form_id: '' },
  },

  deal_stage_changed: {
    type: 'deal_stage_changed',
    category: 'trigger',
    label: 'Deal Stage Changed',
    description: 'Fires when a deal transitions to another stage in the pipeline.',
    icon: 'Briefcase',
    color: '#8b5cf6',
    inputs: [],
    outputs: [{ id: 'output', label: 'Stage Changed' }],
    fields: [
      {
        name: 'target_stage',
        label: 'Target Stage',
        type: 'select',
        description: 'Only fire when deal moves to this specific stage (or Any).',
        defaultValue: 'any',
        options: [
          { label: 'Any Stage Transition', value: 'any' },
          { label: 'Lead (10%)', value: 'lead' },
          { label: 'Qualified (30%)', value: 'qualified' },
          { label: 'Proposal (60%)', value: 'proposal' },
          { label: 'Negotiation (80%)', value: 'negotiation' },
          { label: 'Closed Won (100%)', value: 'closed_won' },
          { label: 'Closed Lost (0%)', value: 'closed_lost' },
        ],
      },
    ],
    defaultData: { target_stage: 'any' },
  },

  tag_added: {
    type: 'tag_added',
    category: 'trigger',
    label: 'Tag Added',
    description: 'Fires when a specific tag is attached to a contact.',
    icon: 'Tag',
    color: '#8b5cf6',
    inputs: [],
    outputs: [{ id: 'output', label: 'Tag Attached' }],
    fields: [
      {
        name: 'tag',
        label: 'Target Tag Name',
        type: 'text',
        description: 'Exact tag string to watch for.',
        placeholder: 'e.g. vip, enterprise, webinar-attendee',
        required: true,
        defaultValue: '',
      },
    ],
    defaultData: { tag: '' },
  },

  schedule: {
    type: 'schedule',
    category: 'trigger',
    label: 'Scheduled Trigger',
    description: 'Executes automatically at regular intervals or standard cron times.',
    icon: 'Clock',
    color: '#8b5cf6',
    inputs: [],
    outputs: [{ id: 'output', label: 'Tick' }],
    fields: [
      {
        name: 'frequency',
        label: 'Frequency',
        type: 'select',
        description: 'Recurring execution cadence.',
        defaultValue: 'daily',
        options: [
          { label: 'Hourly', value: 'hourly' },
          { label: 'Daily (9:00 AM UTC)', value: 'daily' },
          { label: 'Weekly (Monday 9:00 AM UTC)', value: 'weekly' },
          { label: 'Monthly (1st day)', value: 'monthly' },
        ],
      },
    ],
    defaultData: { frequency: 'daily' },
  },

  webhook_incoming: {
    type: 'webhook_incoming',
    category: 'trigger',
    label: 'Incoming Webhook',
    description: 'Trigger workflow via authenticated HTTP POST to this endpoint.',
    icon: 'Radio',
    color: '#8b5cf6',
    inputs: [],
    outputs: [{ id: 'output', label: 'Webhook Received' }],
    fields: [
      {
        name: 'auth_header',
        label: 'Auth Header Name',
        type: 'text',
        description: 'Header checked for webhook token authentication.',
        defaultValue: 'x-nexus-token',
        required: true,
      },
      {
        name: 'secret_token',
        label: 'Webhook Secret Token',
        type: 'text',
        description: 'Secret token callers must provide in header or ?token= param.',
        placeholder: 'Generated automatically on save if blank',
        defaultValue: '',
      },
    ],
    defaultData: { auth_header: 'x-nexus-token', secret_token: '' },
  },

  // ==========================================
  // ACTIONS
  // ==========================================
  create_task: {
    type: 'create_task',
    category: 'action',
    label: 'Create CRM Task',
    description: 'Schedules a follow-up task linked to the contact in workspace.',
    icon: 'CheckSquare',
    color: '#0284c7', // Sky Blue
    inputs: [{ id: 'input', label: 'Trigger/Previous' }],
    outputs: [{ id: 'output', label: 'Task Created' }],
    fields: [
      {
        name: 'task_title',
        label: 'Task Title',
        type: 'text',
        description: 'Title of the created task. Supports expressions like {{trigger.contact.first_name}}.',
        placeholder: 'e.g. Follow up with {{trigger.contact.first_name}}',
        required: true,
        supportsExpressions: true,
        defaultValue: 'Follow up on {{trigger.type}}',
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        description: 'Task urgency level.',
        defaultValue: 'high',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'urgent' },
        ],
      },
      {
        name: 'due_in_days',
        label: 'Due in (Days)',
        type: 'number',
        description: 'Number of days from now the task is due.',
        defaultValue: 2,
      },
    ],
    defaultData: {
      task_title: 'Follow up with {{trigger.contact.first_name}}',
      priority: 'high',
      due_in_days: 2,
    },
  },

  update_contact: {
    type: 'update_contact',
    category: 'action',
    label: 'Update Contact Fields',
    description: 'Modifies attributes of the contact in context.',
    icon: 'UserCog',
    color: '#0284c7',
    inputs: [{ id: 'input', label: 'Previous' }],
    outputs: [{ id: 'output', label: 'Contact Updated' }],
    fields: [
      {
        name: 'lifecycle_stage',
        label: 'Set Lifecycle Stage',
        type: 'select',
        description: 'Lifecycle stage update (or leave unchanged).',
        defaultValue: '',
        options: [
          { label: 'Leave Unchanged', value: '' },
          { label: 'Subscriber', value: 'subscriber' },
          { label: 'Lead', value: 'lead' },
          { label: 'Marketing Qualified Lead (MQL)', value: 'mql' },
          { label: 'Sales Qualified Lead (SQL)', value: 'sql' },
          { label: 'Opportunity', value: 'opportunity' },
          { label: 'Customer', value: 'customer' },
        ],
      },
      {
        name: 'lead_status',
        label: 'Set Lead Status',
        type: 'select',
        description: 'Lead engagement status (or leave unchanged).',
        defaultValue: '',
        options: [
          { label: 'Leave Unchanged', value: '' },
          { label: 'New', value: 'new' },
          { label: 'Contacted', value: 'contacted' },
          { label: 'Qualified', value: 'qualified' },
          { label: 'Unqualified', value: 'unqualified' },
          { label: 'Customer', value: 'customer' },
        ],
      },
      {
        name: 'custom_notes',
        label: 'Append Timeline Note',
        type: 'textarea',
        description: 'Logs an activity note to the contact timeline.',
        supportsExpressions: true,
        placeholder: 'e.g. Automatically progressed by {{workflow.name}}',
        defaultValue: '',
      },
    ],
    defaultData: { lifecycle_stage: '', lead_status: '', custom_notes: '' },
  },

  add_remove_tag: {
    type: 'add_remove_tag',
    category: 'action',
    label: 'Add / Remove Tag',
    description: 'Appends or removes a tag on the target contact.',
    icon: 'Tags',
    color: '#0284c7',
    inputs: [{ id: 'input', label: 'Previous' }],
    outputs: [{ id: 'output', label: 'Tags Updated' }],
    fields: [
      {
        name: 'operation',
        label: 'Operation',
        type: 'select',
        description: 'Whether to add or remove the tag.',
        defaultValue: 'add',
        options: [
          { label: 'Add Tag', value: 'add' },
          { label: 'Remove Tag', value: 'remove' },
        ],
      },
      {
        name: 'tag',
        label: 'Tag Name',
        type: 'text',
        description: 'Tag string to add or remove.',
        placeholder: 'e.g. newsletter, hot-lead',
        required: true,
        defaultValue: '',
      },
    ],
    defaultData: { operation: 'add', tag: '' },
  },

  update_deal_stage: {
    type: 'update_deal_stage',
    category: 'action',
    label: 'Update Deal Stage',
    description: 'Moves the deal associated with this event to another pipeline stage.',
    icon: 'TrendingUp',
    color: '#0284c7',
    inputs: [{ id: 'input', label: 'Previous' }],
    outputs: [{ id: 'output', label: 'Deal Updated' }],
    fields: [
      {
        name: 'stage',
        label: 'Target Stage',
        type: 'select',
        description: 'Pipeline stage to move the deal to.',
        required: true,
        defaultValue: 'qualified',
        options: [
          { label: 'Lead (10%)', value: 'lead' },
          { label: 'Qualified (30%)', value: 'qualified' },
          { label: 'Proposal (60%)', value: 'proposal' },
          { label: 'Negotiation (80%)', value: 'negotiation' },
          { label: 'Closed Won (100%)', value: 'closed_won' },
          { label: 'Closed Lost (0%)', value: 'closed_lost' },
        ],
      },
    ],
    defaultData: { stage: 'qualified' },
  },

  send_email: {
    type: 'send_email',
    category: 'action',
    label: 'Send Email (Resend)',
    description: 'Dispatches an email via configured Resend provider with consent checking.',
    icon: 'Mail',
    color: '#0284c7',
    inputs: [{ id: 'input', label: 'Previous' }],
    outputs: [{ id: 'output', label: 'Email Sent' }],
    fields: [
      {
        name: 'subject',
        label: 'Subject Line',
        type: 'text',
        description: 'Subject of email. Supports expressions like {{trigger.contact.first_name}}.',
        placeholder: 'e.g. Welcome to NexusMark, {{trigger.contact.first_name}}!',
        required: true,
        supportsExpressions: true,
        defaultValue: '',
      },
      {
        name: 'body_html',
        label: 'Email Content (HTML / Text)',
        type: 'textarea',
        description: 'Message body. Supports variables like {{trigger.contact.email}}.',
        placeholder: '<p>Hi {{trigger.contact.first_name}}, thanks for reaching out.</p>',
        required: true,
        supportsExpressions: true,
        defaultValue: '<p>Hi {{trigger.contact.first_name}},</p><p>Thank you for getting in touch with our team!</p>',
      },
    ],
    defaultData: {
      subject: 'Welcome to our platform, {{trigger.contact.first_name}}',
      body_html: '<p>Hi {{trigger.contact.first_name}},</p><p>Thank you for connecting with us!</p>',
    },
  },

  webhook_request: {
    type: 'webhook_request',
    category: 'action',
    label: 'HTTP Webhook Request',
    description: 'Dispatches authenticated JSON POST request to external URL with SSRF protection.',
    icon: 'Send',
    color: '#0284c7',
    inputs: [{ id: 'input', label: 'Previous' }],
    outputs: [{ id: 'output', label: 'Response Received' }],
    fields: [
      {
        name: 'url',
        label: 'Destination URL',
        type: 'text',
        description: 'Public HTTPS endpoint URL (private and local IPs are blocked by SSRF guard).',
        placeholder: 'https://api.yourdomain.com/webhook',
        required: true,
        defaultValue: '',
      },
      {
        name: 'custom_headers',
        label: 'Custom Headers (JSON)',
        type: 'json',
        description: 'Optional HTTP headers in JSON key-value format.',
        defaultValue: '{\n  "Authorization": "Bearer YOUR_TOKEN"\n}',
      },
    ],
    defaultData: {
      url: '',
      custom_headers: '{}',
    },
  },

  // ==========================================
  // LOGIC & BRANCHING
  // ==========================================
  if_else: {
    type: 'if_else',
    category: 'logic',
    label: 'If / Else Condition',
    description: 'Splits execution path into True and False branches based on rule evaluations.',
    icon: 'GitFork',
    color: '#10b981', // Emerald
    inputs: [{ id: 'input', label: 'Inflow' }],
    outputs: [
      { id: 'true', label: 'True', color: '#10b981' },
      { id: 'false', label: 'False', color: '#ef4444' },
    ],
    fields: [
      {
        name: 'field',
        label: 'Field to Check',
        type: 'text',
        description: 'Data field or mapping expression, e.g. {{trigger.contact.lead_score}} or {{trigger.contact.lifecycle_stage}}.',
        placeholder: '{{trigger.contact.lead_score}}',
        required: true,
        supportsExpressions: true,
        defaultValue: '{{trigger.contact.lead_score}}',
      },
      {
        name: 'operator',
        label: 'Operator',
        type: 'select',
        description: 'Comparison operator.',
        defaultValue: 'greater_than',
        options: [
          { label: 'Equals (=)', value: 'equals' },
          { label: 'Does Not Equal (!=)', value: 'not_equals' },
          { label: 'Contains', value: 'contains' },
          { label: 'Does Not Contain', value: 'not_contains' },
          { label: 'Is Empty', value: 'is_empty' },
          { label: 'Is Not Empty', value: 'is_not_empty' },
          { label: 'Greater Than (>)', value: 'greater_than' },
          { label: 'Less Than (<)', value: 'less_than' },
          { label: 'Date After', value: 'date_after' },
          { label: 'Date Before', value: 'date_before' },
        ],
      },
      {
        name: 'value',
        label: 'Comparison Value',
        type: 'text',
        description: 'Value to compare against (leave empty for is_empty/is_not_empty).',
        placeholder: 'e.g. 50 or qualified or 2026-01-01',
        defaultValue: '50',
      },
    ],
    defaultData: {
      field: '{{trigger.contact.lead_score}}',
      operator: 'greater_than',
      value: '50',
    },
  },

  delay: {
    type: 'delay',
    category: 'logic',
    label: 'Wait / Delay',
    description: 'Pauses workflow execution for a set duration before resuming.',
    icon: 'Hourglass',
    color: '#f59e0b', // Amber
    inputs: [{ id: 'input', label: 'Inflow' }],
    outputs: [{ id: 'output', label: 'Resume' }],
    fields: [
      {
        name: 'amount',
        label: 'Delay Amount',
        type: 'number',
        description: 'Number of units to wait.',
        required: true,
        defaultValue: 1,
      },
      {
        name: 'unit',
        label: 'Unit',
        type: 'select',
        description: 'Time unit.',
        defaultValue: 'hours',
        options: [
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' },
        ],
      },
    ],
    defaultData: { amount: 1, unit: 'hours' },
  },

  end_workflow: {
    type: 'end_workflow',
    category: 'logic',
    label: 'End Workflow',
    description: 'Explicit terminal point for a workflow execution branch.',
    icon: 'Square',
    color: '#64748b', // Slate
    inputs: [{ id: 'input', label: 'Inflow' }],
    outputs: [],
    fields: [],
    defaultData: {},
  },
};

export function getNodeDefinition(type: WorkflowNodeType): NodeTypeDefinition {
  return NODE_DEFINITIONS[type] || NODE_DEFINITIONS.manual;
}

export function getNodesByCategory(category: NodeCategory): NodeTypeDefinition[] {
  return Object.values(NODE_DEFINITIONS).filter((n) => n.category === category);
}
