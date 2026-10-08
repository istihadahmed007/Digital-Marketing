import { Deal, DealStage, Task } from '@/lib/types/crm';

export function calculatePipelineMetrics(deals: Deal[]) {
  const activeDeals = deals.filter(
    (d) => !d.is_archived && d.stage !== 'closed_lost'
  );
  const wonDeals = deals.filter(
    (d) => !d.is_archived && d.stage === 'closed_won'
  );
  const closedDeals = deals.filter(
    (d) =>
      !d.is_archived && (d.stage === 'closed_won' || d.stage === 'closed_lost')
  );

  const totalPipelineValue = deals
    .filter(
      (d) =>
        !d.is_archived &&
        d.stage !== 'closed_won' &&
        d.stage !== 'closed_lost'
    )
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const wonValue = wonDeals.reduce((sum, d) => sum + Number(d.amount), 0);

  const winRate =
    closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : 0;

  return {
    totalDeals: deals.length,
    activeDealsCount: activeDeals.length,
    totalPipelineValue,
    wonValue,
    winRate: Math.round(winRate * 10) / 10,
  };
}

export function getDefaultProbability(stage: DealStage): number {
  switch (stage) {
    case 'lead':
      return 10;
    case 'qualified':
      return 30;
    case 'proposal':
      return 60;
    case 'negotiation':
      return 80;
    case 'closed_won':
      return 100;
    case 'closed_lost':
      return 0;
  }
}

export function filterPendingTasks(tasks: Task[]): Task[] {
  return tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );
}
