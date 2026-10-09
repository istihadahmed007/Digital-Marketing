import {
  WorkflowGraph,
  WorkflowNode,
  GraphValidationResult,
  GraphValidationError,
} from '@/lib/types/automation-flow';
import { NODE_DEFINITIONS } from './node-registry';

const MAX_WORKFLOW_NODES = 50;

/**
 * Validates a workflow graph before saving, testing, or publishing.
 */
export function validateWorkflowGraph(graph: WorkflowGraph): GraphValidationResult {
  const errors: GraphValidationError[] = [];
  const warnings: GraphValidationError[] = [];

  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  // 1. Max nodes check
  if (nodes.length > MAX_WORKFLOW_NODES) {
    errors.push({
      message: `Workflow exceeds the maximum limit of ${MAX_WORKFLOW_NODES} nodes (current: ${nodes.length}).`,
      severity: 'error',
    });
  }

  // 2. Trigger Node Validation
  const triggerNodes = nodes.filter(
    (n) => NODE_DEFINITIONS[n.type]?.category === 'trigger'
  );

  if (triggerNodes.length === 0) {
    errors.push({
      message: 'Workflow must have at least one trigger node to initiate execution.',
      severity: 'error',
    });
  } else if (triggerNodes.length > 1) {
    errors.push({
      message: `Workflow currently has ${triggerNodes.length} trigger nodes. Workflows must have exactly one trigger node.`,
      severity: 'error',
    });
  }

  const nodeMap = new Map<string, WorkflowNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // 3. Node Configuration Validation
  for (const node of nodes) {
    const def = NODE_DEFINITIONS[node.type];
    if (!def) {
      errors.push({
        nodeId: node.id,
        message: `Unsupported node type: "${node.type}".`,
        severity: 'error',
      });
      continue;
    }

    const data = node.data || {};

    // Special validation for if_else nodes: supports both composite `rules` array or single `field`
    if (node.type === 'if_else') {
      const hasRules = Array.isArray(data.rules) && data.rules.length > 0;
      const hasField = data.field !== undefined && data.field !== null && String(data.field).trim() !== '';
      if (!hasRules && !hasField) {
        errors.push({
          nodeId: node.id,
          field: 'field',
          message: `Node "${node.label || def.label}" is missing a condition rule or field to evaluate.`,
          severity: 'error',
        });
      }
      continue;
    }

    for (const field of def.fields) {
      if (field.required) {
        let val = data[field.name];
        if (field.name === 'task_title' && (val === undefined || val === null || String(val).trim() === '')) {
          val = data['title'];
        }
        if (val === undefined || val === null || String(val).trim() === '') {
          errors.push({
            nodeId: node.id,
            field: field.name,
            message: `Node "${node.label || def.label}" is missing required field: ${field.label}.`,
            severity: 'error',
          });
        }
      }
    }
  }

  // 4. Edge Validation
  const validEdgeSet = new Set<string>();
  const adjacencyList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacencyList.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (edge.source === edge.target) {
      errors.push({
        edgeId: edge.id,
        message: `Self-connection detected on node "${edge.source}". Nodes cannot connect directly to themselves.`,
        severity: 'error',
      });
      continue;
    }

    if (!nodeMap.has(edge.source)) {
      errors.push({
        edgeId: edge.id,
        message: `Edge source "${edge.source}" does not exist in graph.`,
        severity: 'error',
      });
      continue;
    }

    if (!nodeMap.has(edge.target)) {
      errors.push({
        edgeId: edge.id,
        message: `Edge target "${edge.target}" does not exist in graph.`,
        severity: 'error',
      });
      continue;
    }

    const sourceNode = nodeMap.get(edge.source)!;
    const targetNode = nodeMap.get(edge.target)!;

    // Check if target is a trigger (triggers should not have inputs)
    if (NODE_DEFINITIONS[targetNode.type]?.category === 'trigger') {
      errors.push({
        edgeId: edge.id,
        nodeId: targetNode.id,
        message: `Trigger node "${targetNode.label}" cannot have inbound connections.`,
        severity: 'error',
      });
    }

    const edgeKey = `${edge.source}:${edge.sourceHandle || 'output'}->${edge.target}`;
    if (validEdgeSet.has(edgeKey)) {
      warnings.push({
        edgeId: edge.id,
        message: `Duplicate connection from node "${sourceNode.label}" to "${targetNode.label}".`,
        severity: 'warning',
      });
    }
    validEdgeSet.add(edgeKey);

    adjacencyList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // 5. Reachability and Orphan Node Checks
  if (triggerNodes.length === 1) {
    const triggerId = triggerNodes[0].id;
    const reachable = new Set<string>();
    const queue = [triggerId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!reachable.has(current)) {
        reachable.add(current);
        const neighbors = adjacencyList.get(current) || [];
        for (const next of neighbors) {
          if (!reachable.has(next)) {
            queue.push(next);
          }
        }
      }
    }

    for (const node of nodes) {
      if (!reachable.has(node.id) && NODE_DEFINITIONS[node.type]?.category !== 'trigger') {
        errors.push({
          nodeId: node.id,
          message: `Orphan node "${node.label}" is not connected to the trigger path and will not execute.`,
          severity: 'error',
        });
      }
    }
  }

  // 6. Cycle Detection (DFS) to prevent infinite execution loops
  const visited = new Map<string, 'unvisited' | 'visiting' | 'visited'>();
  for (const node of nodes) {
    visited.set(node.id, 'unvisited');
  }

  function detectCycle(nodeId: string, path: string[]): boolean {
    visited.set(nodeId, 'visiting');
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const next of neighbors) {
      const status = visited.get(next);
      if (status === 'visiting') {
        errors.push({
          nodeId: next,
          message: `Infinite loop or cycle detected in workflow graph: cycle found along path [${path.join(' -> ')} -> ${next}]. Workflows must be acyclic.`,
          severity: 'error',
        });
        return true;
      }
      if (status === 'unvisited') {
        if (detectCycle(next, [...path])) return true;
      }
    }

    visited.set(nodeId, 'visited');
    return false;
  }

  for (const node of nodes) {
    if (visited.get(node.id) === 'unvisited') {
      detectCycle(node.id, []);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
