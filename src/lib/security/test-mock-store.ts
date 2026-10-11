import { ShortsProject, ShortsClip, ShortsPublishingJob } from '@/lib/types/shorts';

export interface TestMockStore {
  projects: Map<string, ShortsProject[]>;
  clips: Map<string, ShortsClip[]>;
  jobs: Map<string, ShortsPublishingJob[]>;
  integrations: Map<string, Map<string, any>>;
}

let currentTestStore: TestMockStore | null = null;

export function initTestStore(): TestMockStore {
  currentTestStore = {
    projects: new Map(),
    clips: new Map(),
    jobs: new Map(),
    integrations: new Map(),
  };
  return currentTestStore;
}

export function resetTestStore(): void {
  currentTestStore = null;
}

export function getTestStore(): TestMockStore | null {
  if (process.env.NODE_ENV !== 'test') {
    return null; // Strict: Never accessible outside test runner
  }
  if (!currentTestStore) {
    currentTestStore = {
      projects: new Map(),
      clips: new Map(),
      jobs: new Map(),
      integrations: new Map(),
    };
  }
  return currentTestStore;
}
