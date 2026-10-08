import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Guard function simulating server-side tenant isolation check
export function verifyWorkspaceAccess(
  userMemberships: { workspace_id: string; role: string }[],
  targetWorkspaceId: string,
  requiredRole?: 'owner' | 'admin'
): { allowed: boolean; reason?: string } {
  const membership = userMemberships.find((m) => m.workspace_id === targetWorkspaceId);

  if (!membership) {
    return {
      allowed: false,
      reason: 'Unauthorized: User does not belong to this workspace',
    };
  }

  if (requiredRole && membership.role !== requiredRole && membership.role !== 'owner') {
    return {
      allowed: false,
      reason: `Forbidden: Action requires ${requiredRole} privileges`,
    };
  }

  return { allowed: true };
}

// Multi-tenant query filter enforcer
export function applyWorkspaceFilter<T extends { workspace_id: string }>(
  records: T[],
  activeWorkspaceId: string
): T[] {
  return records.filter((r) => r.workspace_id === activeWorkspaceId);
}

describe('Workspace Data Access Isolation & Multi-Tenancy Guard', () => {
  const userMemberships = [
    { workspace_id: 'ws-acme', role: 'member' },
    { workspace_id: 'ws-stark', role: 'owner' },
  ];

  it('allows access only to workspaces where user has membership', () => {
    expect(verifyWorkspaceAccess(userMemberships, 'ws-acme').allowed).toBe(true);
    expect(verifyWorkspaceAccess(userMemberships, 'ws-stark').allowed).toBe(true);
  });

  it('strictly blocks access to foreign workspaces (tenant isolation)', () => {
    const foreignAttempt = verifyWorkspaceAccess(userMemberships, 'ws-rogue-corp');
    expect(foreignAttempt.allowed).toBe(false);
    expect(foreignAttempt.reason).toContain('User does not belong to this workspace');
  });

  it('enforces role requirements for administrative actions', () => {
    // Acme membership is member (not admin/owner)
    const adminCheckAcme = verifyWorkspaceAccess(userMemberships, 'ws-acme', 'admin');
    expect(adminCheckAcme.allowed).toBe(false);

    // Stark membership is owner (has owner privileges)
    const adminCheckStark = verifyWorkspaceAccess(userMemberships, 'ws-stark', 'admin');
    expect(adminCheckStark.allowed).toBe(true);
  });

  it('filters out records belonging to other workspaces', () => {
    const dataset = [
      { id: '1', workspace_id: 'ws-acme', name: 'Acme Contact 1' },
      { id: '2', workspace_id: 'ws-stark', name: 'Stark Contact 1' },
      { id: '3', workspace_id: 'ws-acme', name: 'Acme Contact 2' },
      { id: '4', workspace_id: 'ws-other', name: 'Other Contact' },
    ];

    const acmeRecords = applyWorkspaceFilter(dataset, 'ws-acme');
    expect(acmeRecords.length).toBe(2);
    expect(acmeRecords.every((r) => r.workspace_id === 'ws-acme')).toBe(true);

    const starkRecords = applyWorkspaceFilter(dataset, 'ws-stark');
    expect(starkRecords.length).toBe(1);
    expect(starkRecords[0].id).toBe('2');
  });

  it('verifies SQL migration mandates workspace_id and RLS on every CRM table', () => {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261007000000_phase1_crm_schema.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    const expectedTables = ['companies', 'contacts', 'deals', 'activities', 'tasks'];

    for (const table of expectedTables) {
      // Must contain table creation with workspace_id
      expect(sqlContent).toContain(`create table if not exists public.${table}`);
      expect(sqlContent).toContain(`workspace_id uuid not null references public.workspaces(id)`);
      // Must enable RLS
      expect(sqlContent).toContain(`alter table public.${table} enable row level security;`);
      // Must include tenant isolation policies
      expect(sqlContent).toContain(`Tenant isolation: select ${table}`);
      expect(sqlContent).toContain(`Tenant isolation: insert ${table}`);
      expect(sqlContent).toContain(`Tenant isolation: update ${table}`);
      expect(sqlContent).toContain(`Tenant isolation: delete ${table}`);
    }
  });
});
