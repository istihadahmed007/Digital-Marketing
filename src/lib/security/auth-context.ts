import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { WorkspaceRole } from '@/lib/types/crm';
import { AsyncLocalStorage } from 'async_hooks';

export class AuthorizationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

export interface AuthorizedSession {
  user: {
    id: string;
    email?: string;
  };
  workspaceId: string;
  role: WorkspaceRole;
  memberships: Array<{ workspace_id: string; role: WorkspaceRole }>;
}

// Scoped AsyncLocalStorage for isolated unit and integration tests
// undefined: not set; null: explicitly unauthenticated; object: authenticated session
const testAuthStorage = new AsyncLocalStorage<AuthorizedSession | null | undefined>();
let globalTestSession: AuthorizedSession | null | undefined = undefined;

/**
 * Executes a function within an isolated test authorization context.
 * Pass null to simulate an unauthenticated request.
 */
export function runWithTestAuth<T>(session: AuthorizedSession | null, callback: () => T): T {
  return testAuthStorage.run(session, callback);
}

/**
 * Fallback setter for sequential test runners.
 */
export function setTestAuthSession(session: AuthorizedSession | null | undefined) {
  globalTestSession = session;
}

export function getTestAuthSession(): AuthorizedSession | null | undefined {
  const store = testAuthStorage.getStore();
  if (store !== undefined) return store;
  return globalTestSession;
}

/**
 * Central server-side authorization guard.
 * Verifies authenticated user session, workspace membership, and required role.
 * NEVER trusts browser-supplied workspaceId without verifying membership.
 */
export async function getAuthorizedWorkspace(options?: {
  requestedWorkspaceId?: string | null;
  requiredRole?: WorkspaceRole;
}): Promise<AuthorizedSession> {
  const testSession = getTestAuthSession();

  // If test session is explicitly set to null -> unauthenticated request
  if (testSession === null) {
    throw new AuthorizationError('Unauthorized: Active user session required', 401);
  }

  // If a mock test session was provided
  if (testSession) {
    const requested = options?.requestedWorkspaceId?.trim();
    if (requested && requested !== 'ws-default') {
      const match = testSession.memberships.find((m) => m.workspace_id === requested);
      if (!match) {
        throw new AuthorizationError('Forbidden: User is not a member of the requested workspace', 403);
      }
      if (options?.requiredRole) {
        enforceRole(match.role, options.requiredRole);
      }
      return {
        ...testSession,
        workspaceId: match.workspace_id,
        role: match.role,
      };
    }

    if (options?.requiredRole) {
      enforceRole(testSession.role, options.requiredRole);
    }
    return testSession;
  }

  // In test environment when no mock was explicitly specified, use auto test context
  if (process.env.NODE_ENV === 'test') {
    const wsId = options?.requestedWorkspaceId?.trim() || 'ws-test-default';
    return {
      user: { id: 'test-user-id', email: 'tester@nexusmark.local' },
      workspaceId: wsId,
      role: 'owner',
      memberships: [{ workspace_id: wsId, role: 'owner' }],
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    throw new AuthorizationError('Authentication service is not configured.', 500);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AuthorizationError('Unauthorized: Active user session required', 401);
  }

  // Fetch all verified workspace memberships for this user
  const { data: memberships, error: memError } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id);

  if (memError || !memberships || memberships.length === 0) {
    throw new AuthorizationError('Forbidden: User has no active workspace memberships', 403);
  }

  const typedMemberships: Array<{ workspace_id: string; role: WorkspaceRole }> = memberships.map((m: any) => ({
    workspace_id: String(m.workspace_id),
    role: m.role as WorkspaceRole,
  }));

  const requested = options?.requestedWorkspaceId?.trim();
  let targetMembership: { workspace_id: string; role: WorkspaceRole } | undefined;

  if (requested && requested !== 'ws-default') {
    targetMembership = typedMemberships.find((m) => m.workspace_id === requested);
    if (!targetMembership) {
      throw new AuthorizationError('Forbidden: User is not a member of the requested workspace', 403);
    }
  } else {
    // Derive active workspace from verified cookie or fallback to user's first workspace
    let activeFromCookie: string | undefined;
    try {
      const cookieStore = await cookies();
      activeFromCookie = cookieStore.get('nexusmark_active_workspace')?.value;
    } catch {
      // Non-cookie context
    }

    if (activeFromCookie) {
      targetMembership = typedMemberships.find((m) => m.workspace_id === activeFromCookie);
    }
    if (!targetMembership) {
      targetMembership = typedMemberships[0];
    }
  }

  if (options?.requiredRole) {
    enforceRole(targetMembership.role, options.requiredRole);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    workspaceId: targetMembership.workspace_id,
    role: targetMembership.role,
    memberships: typedMemberships,
  };
}

function enforceRole(currentRole: WorkspaceRole, requiredRole: WorkspaceRole) {
  if (requiredRole === 'owner' && currentRole !== 'owner') {
    throw new AuthorizationError('Forbidden: Action requires owner privileges', 403);
  }
  if (requiredRole === 'admin' && currentRole !== 'admin' && currentRole !== 'owner') {
    throw new AuthorizationError('Forbidden: Action requires admin or owner privileges', 403);
  }
}

/**
 * Verifies that a project exists and belongs strictly to the authorized workspace.
 */
export async function verifyProjectOwnership(
  workspaceId: string,
  projectId: string
): Promise<{ id: string; workspace_id: string; source_video_url: string; [key: string]: any }> {
  const supabase = (await createClient()) || createAdminClient();
  if (supabase) {
    const { data: project, error } = await supabase
      .from('shorts_projects')
      .select('*')
      .eq('id', projectId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !project) {
      throw new AuthorizationError('Project not found in authorized workspace', 404);
    }
    return project;
  }

  const { getTestStore } = await import('@/lib/security/test-mock-store');
  const testStore = getTestStore();
  if (testStore) {
    const list = testStore.projects.get(workspaceId) || [];
    const proj = list.find((p) => p.id === projectId);
    if (!proj) {
      throw new AuthorizationError('Project not found in authorized workspace', 404);
    }
    return proj;
  }

  throw new AuthorizationError('Database client unavailable', 500);
}

/**
 * Verifies that a clip exists and belongs strictly to the authorized workspace.
 */
export async function verifyClipOwnership(
  workspaceId: string,
  clipId: string
): Promise<{ id: string; workspace_id: string; project_id: string; [key: string]: any }> {
  const supabase = (await createClient()) || createAdminClient();
  if (supabase) {
    const { data: clip, error } = await supabase
      .from('shorts_clips')
      .select('*')
      .eq('id', clipId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (error || !clip) {
      throw new AuthorizationError('Clip not found in authorized workspace', 404);
    }
    return clip;
  }

  const { getTestStore } = await import('@/lib/security/test-mock-store');
  const testStore = getTestStore();
  if (testStore) {
    const list = testStore.clips.get(workspaceId) || [];
    const clip = list.find((c) => c.id === clipId);
    if (!clip) {
      throw new AuthorizationError('Clip not found in authorized workspace', 404);
    }
    return clip;
  }

  throw new AuthorizationError('Database client unavailable', 500);
}
