import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeWorkflowGraph } from '@/lib/automations/execution-engine';
import { WorkflowGraph } from '@/lib/types/automation-flow';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const adminSupabase = createAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { success: false, error: 'Database service unconfigured' },
      { status: 500 }
    );
  }

  // 1. Fetch workflow by webhook_slug
  const { data: workflow, error: wfErr } = await adminSupabase
    .from('automation_workflows')
    .select('*')
    .eq('webhook_slug', slug)
    .maybeSingle();

  if (wfErr || !workflow) {
    return NextResponse.json(
      { success: false, error: 'Webhook endpoint not found' },
      { status: 404 }
    );
  }

  if (workflow.status !== 'active' && !workflow.is_active) {
    return NextResponse.json(
      { success: false, error: 'Workflow is currently inactive or draft' },
      { status: 403 }
    );
  }

  // 2. Authenticate token
  const expectedToken = workflow.webhook_token;
  if (expectedToken) {
    const headerToken = request.headers.get('x-nexus-token') || request.headers.get('authorization')?.replace('Bearer ', '');
    const queryToken = request.nextUrl.searchParams.get('token');
    const providedToken = headerToken || queryToken;

    if (!providedToken || providedToken !== expectedToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing webhook authentication token' },
        { status: 401 }
      );
    }
  }

  // 3. Parse incoming payload
  let payload: Record<string, any> = {};
  try {
    payload = await request.json();
  } catch {
    payload = { raw: 'Non-JSON payload received' };
  }

  // 4. Execute workflow graph
  const graph: WorkflowGraph = {
    nodes: workflow.nodes || [],
    edges: workflow.edges || [],
  };

  const idempotencyKey = `wh_${workflow.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const result = await executeWorkflowGraph({
    workspaceId: workflow.workspace_id,
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowVersion: workflow.version || 1,
    graph,
    triggerType: 'webhook_incoming',
    triggerData: {
      headers: Object.fromEntries(request.headers.entries()),
      body: payload,
      url: request.url,
      receivedAt: new Date().toISOString(),
    },
    isDryRun: false,
    idempotencyKey,
    supabase: adminSupabase,
  });

  return NextResponse.json({
    success: result.success,
    executionId: result.executionId,
    status: result.status,
    durationMs: result.durationMs,
  });
}
