'use server';

import { createClient } from '@/lib/supabase/server';
import { Workspace, WorkspaceMember } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';

export async function getUserWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Query workspaces where user is in workspace_members
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(*)')
    .eq('user_id', user.id);

  if (error || !data) {
    console.error('Error fetching user workspaces:', error);
    return [];
  }

  // Type safe flatten
  const workspaces: Workspace[] = [];
  for (const item of data) {
    if (item.workspace) {
      workspaces.push(item.workspace as unknown as Workspace);
    }
  }

  return workspaces;
}

export async function createWorkspace(name: string, slug?: string): Promise<{ success: boolean; workspace?: Workspace; error?: string }> {
  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: 'Supabase credentials not configured' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User is not authenticated' };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { success: false, error: 'Workspace name is required' };
  }

  const generatedSlug = (slug || cleanName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).substring(2, 6);

  // 1. Insert Workspace
  const { data: workspaceData, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      name: cleanName,
      slug: generatedSlug,
    })
    .select('*')
    .single();

  if (wsError || !workspaceData) {
    return { success: false, error: wsError?.message || 'Failed to create workspace' };
  }

  // 2. Add creator as Owner in workspace_members
  const { error: memberError } = await supabase.from('workspace_members').insert({
    workspace_id: workspaceData.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    return { success: false, error: memberError.message };
  }

  revalidatePath('/dashboard');
  return { success: true, workspace: workspaceData as Workspace };
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error || !data) {
    return [];
  }

  return data as WorkspaceMember[];
}
