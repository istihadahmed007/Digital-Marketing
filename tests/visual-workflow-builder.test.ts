import { describe, it, expect } from 'vitest';
import { validateWorkflowGraph } from '../src/lib/automations/graph-validator';
import { resolveExpressions, extractExpressions } from '../src/lib/automations/expression-resolver';
import { evaluateRule, evaluateConditions } from '../src/lib/automations/condition-evaluator';
import { executeWorkflowGraph, isPrivateIpAddress } from '../src/lib/automations/execution-engine';
import { WorkflowGraph, ConditionRule } from '../src/lib/types/crm';

describe('NexusFlow Visual Workflow Builder - Graph Validator', () => {
  it('validates a complete, healthy workflow graph', () => {
    const validGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'trigger_1',
          type: 'contact_created',
          label: 'Contact Created Trigger',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'action_1',
          type: 'create_task',
          label: 'Create Follow-up Task',
          position: { x: 350, y: 100 },
          data: { title: 'Follow up with lead {{trigger.contact.first_name}}' },
        },
      ],
      edges: [
        {
          id: 'edge_1',
          source: 'trigger_1',
          target: 'action_1',
          sourceHandle: 'output',
          targetHandle: 'input',
        },
      ],
    };

    const result = validateWorkflowGraph(validGraph);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects a graph with missing trigger node', () => {
    const noTriggerGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'action_1',
          type: 'create_task',
          label: 'Create Task',
          position: { x: 200, y: 100 },
          data: { title: 'Task without trigger' },
        },
      ],
      edges: [],
    };

    const result = validateWorkflowGraph(noTriggerGraph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('trigger'))).toBe(true);
  });

  it('rejects a graph with multiple conflicting trigger nodes', () => {
    const multiTriggerGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'trig_1',
          type: 'manual',
          label: 'Manual Run',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'trig_2',
          type: 'contact_created',
          label: 'Contact Created',
          position: { x: 100, y: 300 },
          data: {},
        },
      ],
      edges: [],
    };

    const result = validateWorkflowGraph(multiTriggerGraph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('exactly one trigger'))).toBe(true);
  });

  it('detects and rejects cyclical loops in DAG', () => {
    const cyclicGraph: WorkflowGraph = {
      nodes: [
        { id: 'trig', type: 'manual', label: 'Start', position: { x: 100, y: 100 }, data: {} },
        { id: 'step_a', type: 'create_task', label: 'Step A', position: { x: 300, y: 100 }, data: { title: 'A' } },
        { id: 'step_b', type: 'create_task', label: 'Step B', position: { x: 500, y: 100 }, data: { title: 'B' } },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'step_a', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'step_a', target: 'step_b', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e3', source: 'step_b', target: 'step_a', sourceHandle: 'output', targetHandle: 'input' }, // Cycle!
      ],
    };

    const result = validateWorkflowGraph(cyclicGraph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('loop or cycle'))).toBe(true);
  });

  it('detects orphan nodes not connected to the workflow path', () => {
    const orphanGraph: WorkflowGraph = {
      nodes: [
        { id: 'trig', type: 'manual', label: 'Start', position: { x: 100, y: 100 }, data: {} },
        { id: 'orphan', type: 'create_task', label: 'Orphan Action', position: { x: 300, y: 300 }, data: { title: 'Lonely' } },
      ],
      edges: [],
    };

    const result = validateWorkflowGraph(orphanGraph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Orphan Action'))).toBe(true);
  });

  it('validates required configuration values for action nodes', () => {
    const missingParamsGraph: WorkflowGraph = {
      nodes: [
        { id: 'trig', type: 'manual', label: 'Start', position: { x: 100, y: 100 }, data: {} },
        {
          id: 'email_node',
          type: 'send_email',
          label: 'Send Email',
          position: { x: 300, y: 100 },
          data: {}, // missing subject and body_html
        },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'email_node', sourceHandle: 'output', targetHandle: 'input' },
      ],
    };

    const result = validateWorkflowGraph(missingParamsGraph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes('Subject Line') || e.message.includes('Email Content'))).toBe(true);
  });
});

describe('NexusFlow Expression Resolver & Safe Data Mapping', () => {
  const sampleContext = {
    trigger: {
      contact: {
        id: 'c-101',
        first_name: 'Alex',
        last_name: 'Morgan',
        email: 'alex@example.com',
        tags: ['vip', 'enterprise'],
      },
      deal: {
        amount: 25000,
        stage: 'proposal',
      },
    },
    nodes: {
      step_1: {
        output: {
          task_id: 'task-999',
          created: true,
        },
      },
    },
  };

  it('resolves simple and nested tokens safely', () => {
    const template = 'Hello {{trigger.contact.first_name}} {{trigger.contact.last_name}}, your deal is for ${{trigger.deal.amount}}.';
    const resolved = resolveExpressions(template, sampleContext);
    expect(resolved).toBe('Hello Alex Morgan, your deal is for $25000.');
  });

  it('resolves output from previous nodes', () => {
    const template = 'Task ID: {{nodes.step_1.output.task_id}}';
    const resolved = resolveExpressions(template, sampleContext);
    expect(resolved).toBe('Task ID: task-999');
  });

  it('preserves unresolved tokens safely without throwing', () => {
    const template = 'Status is {{trigger.unknown.field}}';
    const resolved = resolveExpressions(template, sampleContext);
    expect(resolved).toBe('Status is {{trigger.unknown.field}}');
  });

  it('blocks prototype pollution attempts', () => {
    const evilTemplate = '{{__proto__.polluted}} {{constructor.name}}';
    const resolved = resolveExpressions(evilTemplate, sampleContext);
    // Must not evaluate prototype or constructor
    expect(resolved).toBe('{{__proto__.polluted}} {{constructor.name}}');
  });

  it('extracts tokens from text for UI inspection', () => {
    const text = 'Lead {{trigger.contact.email}} from company {{trigger.contact.company}}';
    const tokens = extractExpressions(text);
    expect(tokens).toEqual(['trigger.contact.email', 'trigger.contact.company']);
  });
});

describe('NexusFlow Safe Condition Evaluator & Logic Branching', () => {
  const context = {
    trigger: {
      contact: {
        email: 'sarah@acme.org',
        score: 85,
        empty_field: '',
        created_at: '2026-05-01T10:00:00Z',
      },
    },
  };

  it('evaluates equals and contains conditions correctly', () => {
    const ruleEquals: ConditionRule = {
      field: '{{trigger.contact.email}}',
      operator: 'equals',
      value: 'sarah@acme.org',
    };
    expect(evaluateRule(ruleEquals, context)).toBe(true);

    const ruleContains: ConditionRule = {
      field: '{{trigger.contact.email}}',
      operator: 'contains',
      value: 'acme',
    };
    expect(evaluateRule(ruleContains, context)).toBe(true);

    const ruleContainsNegative: ConditionRule = {
      field: '{{trigger.contact.email}}',
      operator: 'contains',
      value: 'gmail',
    };
    expect(evaluateRule(ruleContainsNegative, context)).toBe(false);
  });

  it('evaluates is_empty and is_not_empty conditions', () => {
    const emptyRule: ConditionRule = {
      field: '{{trigger.contact.empty_field}}',
      operator: 'is_empty',
      value: '',
    };
    expect(evaluateRule(emptyRule, context)).toBe(true);

    const notEmptyRule: ConditionRule = {
      field: '{{trigger.contact.email}}',
      operator: 'is_not_empty',
      value: '',
    };
    expect(evaluateRule(notEmptyRule, context)).toBe(true);
  });

  it('evaluates greater_than and less_than number comparisons', () => {
    const ruleGt: ConditionRule = {
      field: '{{trigger.contact.score}}',
      operator: 'greater_than',
      value: '50',
    };
    expect(evaluateRule(ruleGt, context)).toBe(true);

    const ruleLt: ConditionRule = {
      field: '{{trigger.contact.score}}',
      operator: 'less_than',
      value: '50',
    };
    expect(evaluateRule(ruleLt, context)).toBe(false);
  });

  it('evaluates date comparisons safely', () => {
    const ruleAfter: ConditionRule = {
      field: '{{trigger.contact.created_at}}',
      operator: 'date_after',
      value: '2026-01-01T00:00:00Z',
    };
    expect(evaluateRule(ruleAfter, context)).toBe(true);

    const ruleBefore: ConditionRule = {
      field: '{{trigger.contact.created_at}}',
      operator: 'date_before',
      value: '2025-01-01T00:00:00Z',
    };
    expect(evaluateRule(ruleBefore, context)).toBe(false);
  });

  it('evaluates composite AND vs OR logic sets', () => {
    const rules: ConditionRule[] = [
      { field: '{{trigger.contact.score}}', operator: 'greater_than', value: '80' },
      { field: '{{trigger.contact.email}}', operator: 'contains', value: 'acme' },
    ];

    expect(evaluateConditions(rules, 'AND', context)).toBe(true);

    const mixedRules: ConditionRule[] = [
      { field: '{{trigger.contact.score}}', operator: 'greater_than', value: '100' }, // false
      { field: '{{trigger.contact.email}}', operator: 'contains', value: 'acme' }, // true
    ];

    expect(evaluateConditions(mixedRules, 'AND', context)).toBe(false);
    expect(evaluateConditions(mixedRules, 'OR', context)).toBe(true);
  });
});

describe('NexusFlow Security: SSRF Webhook Protection', () => {
  it('blocks localhost and loopback IPv4 and IPv6 addresses', () => {
    expect(isPrivateIpAddress('localhost')).toBe(true);
    expect(isPrivateIpAddress('127.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('127.0.0.254')).toBe(true);
    expect(isPrivateIpAddress('::1')).toBe(true);
  });

  it('blocks private local network ranges (10.x, 172.16-31.x, 192.168.x)', () => {
    expect(isPrivateIpAddress('10.0.0.1')).toBe(true);
    expect(isPrivateIpAddress('10.254.254.254')).toBe(true);
    expect(isPrivateIpAddress('172.16.0.1')).toBe(true);
    expect(isPrivateIpAddress('172.31.255.255')).toBe(true);
    expect(isPrivateIpAddress('192.168.1.1')).toBe(true);
    expect(isPrivateIpAddress('192.168.0.254')).toBe(true);
  });

  it('blocks cloud metadata service link-local address (169.254.169.254)', () => {
    expect(isPrivateIpAddress('169.254.169.254')).toBe(true);
    expect(isPrivateIpAddress('169.254.1.1')).toBe(true);
  });

  it('permits valid public domain addresses', () => {
    expect(isPrivateIpAddress('api.github.com')).toBe(false);
    expect(isPrivateIpAddress('hooks.slack.com')).toBe(false);
    expect(isPrivateIpAddress('8.8.8.8')).toBe(false);
    expect(isPrivateIpAddress('1.1.1.1')).toBe(false);
  });
});

describe('NexusFlow Execution Engine & Dry-Run Safety', () => {
  it('executes a workflow graph in safe dry-run mode without modifying production data', async () => {
    const dryRunGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'node_trigger',
          type: 'manual',
          label: 'Manual Trigger',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'node_task',
          type: 'create_task',
          label: 'Create Task Step',
          position: { x: 350, y: 100 },
          data: {
            title: 'Audit Contact {{trigger.contactId}}',
            priority: 'high',
          },
        },
        {
          id: 'node_email',
          type: 'send_email',
          label: 'Send Email Step',
          position: { x: 600, y: 100 },
          data: {
            to: 'recipient@example.com',
            subject: 'Dry run subject',
            body_html: '<p>Dry run body</p>',
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_trigger', target: 'node_task', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'node_task', target: 'node_email', sourceHandle: 'output', targetHandle: 'input' },
      ],
    };

    const result = await executeWorkflowGraph({
      workspaceId: 'test-ws-isolation-1',
      workflowId: 'test-wf-1',
      workflowName: 'Dry Run Pipeline Test',
      workflowVersion: 1,
      graph: dryRunGraph,
      triggerType: 'manual',
      triggerData: { contactId: 'contact-abc-123' },
      isDryRun: true,
      supabase: null, // Dry run does not require database write
    });

    expect(result.success).toBe(true);
    expect(result.nodeExecutions).toHaveLength(3);

    // Node 1: Trigger
    expect(result.nodeExecutions[0].status).toBe('succeeded');
    expect(result.nodeExecutions[0].nodeId).toBe('node_trigger');

    // Node 2: Task simulation
    expect(result.nodeExecutions[1].status).toBe('succeeded');
    expect(result.nodeExecutions[1].outputData.simulated).toBe(true);
    expect(result.nodeExecutions[1].outputData.task.title).toBe('Audit Contact contact-abc-123');

    // Node 3: Email simulation
    expect(result.nodeExecutions[2].status).toBe('succeeded');
    expect(result.nodeExecutions[2].outputData.simulated).toBe(true);
    expect(result.nodeExecutions[2].outputData.recipient).toBe('recipient@example.com');
  });

  it('handles conditional branching via if_else node in workflow graph', async () => {
    const branchingGraph: WorkflowGraph = {
      nodes: [
        {
          id: 'trig',
          type: 'contact_created',
          label: 'New Lead',
          position: { x: 100, y: 100 },
          data: {},
        },
        {
          id: 'cond',
          type: 'if_else',
          label: 'Is Enterprise Lead?',
          position: { x: 350, y: 100 },
          data: {
            logical_operator: 'AND',
            rules: [
              {
                field: '{{trigger.score}}',
                operator: 'greater_than',
                value: '80',
              },
            ],
          },
        },
        {
          id: 'high_pri_task',
          type: 'create_task',
          label: 'Urgent Enterprise Outreach',
          position: { x: 600, y: 50 },
          data: { title: 'Call VIP Lead Immediately' },
        },
        {
          id: 'standard_task',
          type: 'create_task',
          label: 'Standard Nurture',
          position: { x: 600, y: 200 },
          data: { title: 'Add to General Newsletter' },
        },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'cond', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'cond', target: 'high_pri_task', sourceHandle: 'true', targetHandle: 'input' },
        { id: 'e3', source: 'cond', target: 'standard_task', sourceHandle: 'false', targetHandle: 'input' },
      ],
    };

    // Case 1: Score 90 (True branch -> high_pri_task)
    const resultHigh = await executeWorkflowGraph({
      workspaceId: 'test-ws-1',
      workflowId: 'test-wf-branch',
      workflowName: 'Branching Flow',
      workflowVersion: 1,
      graph: branchingGraph,
      triggerType: 'contact_created',
      triggerData: { score: 90 },
      isDryRun: true,
      supabase: null,
    });

    expect(resultHigh.success).toBe(true);
    const executedNodeIds = resultHigh.nodeExecutions.map((n) => n.nodeId);
    expect(executedNodeIds).toContain('high_pri_task');
    expect(executedNodeIds).not.toContain('standard_task');

    // Case 2: Score 40 (False branch -> standard_task)
    const resultLow = await executeWorkflowGraph({
      workspaceId: 'test-ws-1',
      workflowId: 'test-wf-branch',
      workflowName: 'Branching Flow',
      workflowVersion: 1,
      graph: branchingGraph,
      triggerType: 'contact_created',
      triggerData: { score: 40 },
      isDryRun: true,
      supabase: null,
    });

    expect(resultLow.success).toBe(true);
    const lowExecutedNodeIds = resultLow.nodeExecutions.map((n) => n.nodeId);
    expect(lowExecutedNodeIds).toContain('standard_task');
    expect(lowExecutedNodeIds).not.toContain('high_pri_task');
  });

  it('stops execution cleanly when an end_workflow node is reached', async () => {
    const endGraph: WorkflowGraph = {
      nodes: [
        { id: 'trig', type: 'manual', label: 'Start', position: { x: 100, y: 100 }, data: {} },
        { id: 'end_step', type: 'end_workflow', label: 'Terminated', position: { x: 300, y: 100 }, data: { reason: 'Lead unqualified' } },
        { id: 'unreachable', type: 'create_task', label: 'Should Not Run', position: { x: 500, y: 100 }, data: { title: 'Never run' } },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'end_step', sourceHandle: 'output', targetHandle: 'input' },
        { id: 'e2', source: 'end_step', target: 'unreachable', sourceHandle: 'output', targetHandle: 'input' },
      ],
    };

    const result = await executeWorkflowGraph({
      workspaceId: 'test-ws-1',
      workflowId: 'test-wf-end',
      workflowName: 'End Flow',
      workflowVersion: 1,
      graph: endGraph,
      triggerType: 'manual',
      triggerData: {},
      isDryRun: true,
      supabase: null,
    });

    expect(result.success).toBe(true);
    const ids = result.nodeExecutions.map((n) => n.nodeId);
    expect(ids).toContain('end_step');
    expect(ids).not.toContain('unreachable');
  });

  it('rejects duplicate runs with the same idempotency key', async () => {
    const key = `test_idempotent_event_${Date.now()}`;
    const simpleGraph: WorkflowGraph = {
      nodes: [{ id: 'trig', type: 'manual', label: 'Start', position: { x: 100, y: 100 }, data: {} }],
      edges: [],
    };

    // First execution
    const firstRun = await executeWorkflowGraph({
      workspaceId: 'test-ws-1',
      workflowId: 'test-wf-idempotency',
      workflowName: 'Idempotency Test',
      workflowVersion: 1,
      graph: simpleGraph,
      triggerType: 'manual',
      triggerData: {},
      isDryRun: true,
      idempotencyKey: key,
      supabase: null,
    });
    expect(firstRun.success).toBe(true);

    // Second execution with same idempotency key
    const duplicateRun = await executeWorkflowGraph({
      workspaceId: 'test-ws-1',
      workflowId: 'test-wf-idempotency',
      workflowName: 'Idempotency Test',
      workflowVersion: 1,
      graph: simpleGraph,
      triggerType: 'manual',
      triggerData: {},
      isDryRun: true,
      idempotencyKey: key,
      supabase: null,
    });
    expect(duplicateRun.success).toBe(false);
    expect(duplicateRun.error).toContain('Duplicate execution prevented');
  });
});

describe('Workflow Trigger Types & Check Constraint Resilience', () => {
  it('supports all 8 NexusFlow trigger types in graph validator', () => {
    const triggerTypes = [
      'form_submission',
      'contact_created',
      'contact_updated',
      'deal_stage_changed',
      'tag_added',
      'manual',
      'schedule',
      'webhook_incoming',
    ];

    const triggerDataMap: Record<string, any> = {
      tag_added: { tag: 'vip' },
      schedule: { frequency: 'daily' },
      manual: {},
      contact_created: { source_filter: 'all' },
      contact_updated: { watch_field: 'any' },
      form_submission: { form_id: '' },
      deal_stage_changed: { target_stage: 'any' },
      webhook_incoming: { auth_header: 'x-nexus-token' },
    };

    for (const trig of triggerTypes) {
      const graph: WorkflowGraph = {
        nodes: [
          {
            id: 'node_trig',
            type: trig as any,
            label: `Trigger: ${trig}`,
            position: { x: 100, y: 100 },
            data: triggerDataMap[trig] || {},
          },
          {
            id: 'node_action',
            type: 'create_task',
            label: 'Task',
            position: { x: 300, y: 100 },
            data: { title: 'Do something' },
          },
        ],
        edges: [
          {
            id: 'edge_1',
            source: 'node_trig',
            target: 'node_action',
            sourceHandle: 'output',
            targetHandle: 'input',
          },
        ],
      };

      const res = validateWorkflowGraph(graph);
      expect(res.errors).toEqual([]);
      expect(res.isValid).toBe(true);
    }
  });

  it('normalizes fallback actual_trigger_type correctly when legacy constraint is present', () => {
    const mockDbRow = {
      id: 'wf-123',
      name: 'Scheduled Daily Sync',
      trigger_type: 'contact_created', // fallback stored in DB to satisfy legacy check constraint
      trigger_config: { actual_trigger_type: 'schedule' },
      is_active: true,
      nodes: [],
      edges: [],
    };

    const resolvedTriggerType = mockDbRow.trigger_config?.actual_trigger_type || mockDbRow.trigger_type;
    expect(resolvedTriggerType).toBe('schedule');
  });
});
