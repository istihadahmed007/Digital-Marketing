import { describe, it, expect } from 'vitest';
import { Deal, Task } from '../src/lib/types/crm';
import {
  calculatePipelineMetrics,
  getDefaultProbability,
  filterPendingTasks,
} from '../src/lib/crm/metrics';

describe('CRM Operations & Metrics Aggregation', () => {
  const sampleDeals: Deal[] = [
    {
      id: 'deal-1',
      workspace_id: 'ws-1',
      company_id: null,
      contact_id: null,
      title: 'Enterprise Growth Package',
      amount: 15000,
      currency: 'USD',
      stage: 'proposal',
      probability: 60,
      expected_close_date: '2026-11-01',
      owner_id: null,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'deal-2',
      workspace_id: 'ws-1',
      company_id: null,
      contact_id: null,
      title: 'Marketing Automation Setup',
      amount: 8500,
      currency: 'USD',
      stage: 'closed_won',
      probability: 100,
      expected_close_date: '2026-10-15',
      owner_id: null,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'deal-3',
      workspace_id: 'ws-1',
      company_id: null,
      contact_id: null,
      title: 'Consulting Retainer',
      amount: 5000,
      currency: 'USD',
      stage: 'closed_lost',
      probability: 0,
      expected_close_date: '2026-10-10',
      owner_id: null,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'deal-4',
      workspace_id: 'ws-1',
      company_id: null,
      contact_id: null,
      title: 'Archived Deal',
      amount: 20000,
      currency: 'USD',
      stage: 'lead',
      probability: 10,
      expected_close_date: null,
      owner_id: null,
      is_archived: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('correctly computes pipeline values, active deals, and win rate', () => {
    const metrics = calculatePipelineMetrics(sampleDeals);

    expect(metrics.totalDeals).toBe(4);
    // Active deals (not archived, not closed_lost) -> deal-1 (proposal) and deal-2 (closed_won)
    expect(metrics.activeDealsCount).toBe(2);
    // Open pipeline value (excluding won, lost, archived) -> deal-1 only (15000)
    expect(metrics.totalPipelineValue).toBe(15000);
    // Won value -> deal-2 (8500)
    expect(metrics.wonValue).toBe(8500);
    // Closed deals: deal-2 (won) + deal-3 (lost) = 2. Won = 1 -> 50%
    expect(metrics.winRate).toBe(50);
  });

  it('handles empty pipeline state with zero metrics and no NaN/null errors', () => {
    const metrics = calculatePipelineMetrics([]);
    expect(metrics.totalDeals).toBe(0);
    expect(metrics.activeDealsCount).toBe(0);
    expect(metrics.totalPipelineValue).toBe(0);
    expect(metrics.wonValue).toBe(0);
    expect(metrics.winRate).toBe(0);
  });

  it('sets accurate stage probabilities based on pipeline progression', () => {
    expect(getDefaultProbability('lead')).toBe(10);
    expect(getDefaultProbability('qualified')).toBe(30);
    expect(getDefaultProbability('proposal')).toBe(60);
    expect(getDefaultProbability('negotiation')).toBe(80);
    expect(getDefaultProbability('closed_won')).toBe(100);
    expect(getDefaultProbability('closed_lost')).toBe(0);
  });

  it('filters pending vs completed tasks accurately', () => {
    const tasks: Task[] = [
      {
        id: 't-1',
        workspace_id: 'ws-1',
        contact_id: null,
        company_id: null,
        deal_id: null,
        title: 'Follow up call',
        description: null,
        due_date: '2026-10-15',
        priority: 'high',
        status: 'pending',
        assigned_to: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 't-2',
        workspace_id: 'ws-1',
        contact_id: null,
        company_id: null,
        deal_id: null,
        title: 'Send contract draft',
        description: null,
        due_date: '2026-10-16',
        priority: 'urgent',
        status: 'in_progress',
        assigned_to: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 't-3',
        workspace_id: 'ws-1',
        contact_id: null,
        company_id: null,
        deal_id: null,
        title: 'Initial introduction',
        description: null,
        due_date: '2026-10-01',
        priority: 'low',
        status: 'completed',
        assigned_to: null,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const pending = filterPendingTasks(tasks);
    expect(pending.length).toBe(2);
    expect(pending.map((t) => t.id)).toEqual(['t-1', 't-2']);
  });
});
