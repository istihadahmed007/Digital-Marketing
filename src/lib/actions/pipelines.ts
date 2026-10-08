'use server';

import { createClient } from '@/lib/supabase/server';
import { Pipeline, PipelineStage } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

const DEFAULT_STAGES = [
  { name: 'Lead', probability: 10, color: '#3b82f6', order_index: 0 },
  { name: 'Qualified', probability: 30, color: '#8b5cf6', order_index: 1 },
  { name: 'Proposal', probability: 60, color: '#ec4899', order_index: 2 },
  { name: 'Negotiation', probability: 80, color: '#f59e0b', order_index: 3 },
  { name: 'Closed Won', probability: 100, color: '#10b981', order_index: 4 },
  { name: 'Closed Lost', probability: 0, color: '#ef4444', order_index: 5 },
];

export async function getPipelines(workspaceId: string): Promise<Pipeline[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data: pipelines, error } = await supabase
    .from('pipelines')
    .select('*, stages:pipeline_stages(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error || !pipelines || pipelines.length === 0) {
    // Automatically seed default pipeline if none exists
    const defaultPipeline = await seedDefaultPipeline(workspaceId);
    return defaultPipeline ? [defaultPipeline] : [];
  }

  // Sort stages by order_index
  return pipelines.map((p: any) => ({
    ...p,
    stages: (p.stages || []).sort((a: any, b: any) => a.order_index - b.order_index),
  })) as Pipeline[];
}

export async function seedDefaultPipeline(workspaceId: string): Promise<Pipeline | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data: pipeline, error: pipeErr } = await supabase
    .from('pipelines')
    .insert({
      workspace_id: workspaceId,
      name: 'Standard Sales Pipeline',
      is_default: true,
    })
    .select()
    .single();

  if (pipeErr || !pipeline) {
    return null;
  }

  const stagesToInsert = DEFAULT_STAGES.map((s) => ({
    pipeline_id: pipeline.id,
    name: s.name,
    probability: s.probability,
    color: s.color,
    order_index: s.order_index,
  }));

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .insert(stagesToInsert)
    .select();

  return {
    ...pipeline,
    stages: (stages || []).sort((a: any, b: any) => a.order_index - b.order_index),
  } as Pipeline;
}

export async function createPipeline(
  workspaceId: string,
  name: string,
  stages: Array<{ name: string; probability: number; color?: string }>
): Promise<{ success: boolean; pipeline?: Pipeline; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database unconfigured' };

  if (!name.trim()) return { success: false, error: 'Pipeline name is required' };

  const { data: pipeline, error: pipeErr } = await supabase
    .from('pipelines')
    .insert({
      workspace_id: workspaceId,
      name: name.trim(),
      is_default: false,
    })
    .select()
    .single();

  if (pipeErr || !pipeline) {
    return { success: false, error: pipeErr?.message || 'Failed to create pipeline' };
  }

  const stageRows = stages.map((s, idx) => ({
    pipeline_id: pipeline.id,
    name: s.name.trim(),
    probability: Math.max(0, Math.min(100, s.probability)),
    color: s.color || '#6366f1',
    order_index: idx,
  }));

  const { data: stageData } = await supabase
    .from('pipeline_stages')
    .insert(stageRows)
    .select();

  revalidatePath('/deals');
  return {
    success: true,
    pipeline: {
      ...pipeline,
      stages: (stageData || []).sort((a: any, b: any) => a.order_index - b.order_index),
    } as Pipeline,
  };
}
