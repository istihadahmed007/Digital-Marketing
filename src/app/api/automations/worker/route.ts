import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { executeWorkflowGraph } from '@/lib/automations/execution-engine';
import { WorkflowGraph } from '@/lib/types/automation-flow';

/**
 * Secured Worker & Scheduler Endpoint
 * Can be triggered via cron job or external scheduler (e.g. Supabase pg_cron, Vercel Cron, or custom timer).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If CRON_SECRET is configured, require bearer token
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid worker cron secret' },
      { status: 401 }
    );
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    return NextResponse.json(
      { success: false, error: 'Database service unconfigured' },
      { status: 500 }
    );
  }

  // 1. Process waiting/queued executions whose retry/delay deadline has elapsed
  const now = new Date().toISOString();
  const { data: pendingExecutions } = await adminSupabase
    .from('workflow_executions')
    .select('*, workflow:automation_workflows(*)')
    .in('status', ['waiting', 'queued'])
    .lte('next_retry_at', now)
    .limit(10);

  let processedCount = 0;

  if (pendingExecutions && pendingExecutions.length > 0) {
    for (const exec of pendingExecutions) {
      if (!exec.workflow) continue;

      const graph: WorkflowGraph = {
        nodes: exec.workflow.nodes || [],
        edges: exec.workflow.edges || [],
      };

      await executeWorkflowGraph({
        workspaceId: exec.workspace_id,
        workflowId: exec.workflow_id,
        workflowName: exec.workflow.name,
        workflowVersion: exec.workflow_version,
        graph,
        triggerType: exec.trigger_type,
        triggerData: exec.trigger_data,
        isDryRun: false,
        idempotencyKey: `worker_resume_${exec.id}_${Date.now()}`,
        supabase: adminSupabase,
      });

      processedCount++;
    }
  }

  // 2. Scheduled Triggers Check (run active workflows with 'schedule' trigger)
  const { data: scheduledWorkflows } = await adminSupabase
    .from('automation_workflows')
    .select('*')
    .eq('trigger_type', 'schedule')
    .eq('status', 'active');

  let scheduledRunsCount = 0;
  if (scheduledWorkflows && scheduledWorkflows.length > 0) {
    for (const wf of scheduledWorkflows) {
      const graph: WorkflowGraph = {
        nodes: wf.nodes || [],
        edges: wf.edges || [],
      };

      const idempotencyKey = `schedule_${wf.id}_${new Date().toISOString().slice(0, 13)}`; // Once per hour
      await executeWorkflowGraph({
        workspaceId: wf.workspace_id,
        workflowId: wf.id,
        workflowName: wf.name,
        workflowVersion: wf.version || 1,
        graph,
        triggerType: 'schedule',
        triggerData: {
          tick: now,
          source: 'worker_cron',
        },
        isDryRun: false,
        idempotencyKey,
        supabase: adminSupabase,
      });
      scheduledRunsCount++;
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Worker execution completed successfully.',
    resumedExecutions: processedCount,
    scheduledRuns: scheduledRunsCount,
    timestamp: now,
  });
}
