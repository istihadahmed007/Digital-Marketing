export type JourneyTimeState = 'scheduled' | 'live' | 'completed' | 'draft';
export type JourneyChannel = 'video' | 'email' | 'seo' | 'forms' | 'crm';
export type JourneyStage = 'discover' | 'consider' | 'convert';

export interface JourneyOutcome {
  metricType: 'views' | 'clicks' | 'leads' | 'revenue' | 'rate';
  primaryValue: string;
  primaryLabel: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  rawCount?: number;
}

export interface JourneyActivity {
  id: string;
  title: string;
  description?: string;
  channel: JourneyChannel;
  stage: JourneyStage;
  timeState: JourneyTimeState;
  date: string;
  displayDate: string;
  statusLabel: string;
  platformBadge?: string;
  externalUrl?: string;
  internalHref: string;
  connectionStatus: 'connected' | 'needs_setup' | 'internal';
  outcome: JourneyOutcome;
  metadata?: Record<string, any>;
}

export interface JourneyFilterState {
  timeState: 'all' | JourneyTimeState;
  channel: 'all' | JourneyChannel;
  stage: 'all' | JourneyStage;
  searchQuery?: string;
}

export interface JourneySummaryStats {
  totalActivities: number;
  scheduledCount: number;
  liveCount: number;
  completedCount: number;
  activeChannelsCount: number;
  totalLeadsGenerated: number;
  pipelineValueGenerated: number;
}
