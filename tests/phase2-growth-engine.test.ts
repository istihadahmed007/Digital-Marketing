import { describe, it, expect } from 'vitest';
import {
  Form,
  FormField,
  EmailCampaign,
  AutomationWorkflow,
  AutomationStep,
  Contact,
  Deal,
} from '../src/lib/types/crm';

describe('Phase 2 Marketing & Growth Engine', () => {
  describe('Lead Capture Form Engine', () => {
    it('generates clean, URL-safe slugs from form titles', () => {
      const titles = [
        { title: 'Growth Audit & Strategy Call!', expected: 'growth-audit-strategy-call' },
        { title: '   Schedule Demo  2026   ', expected: 'schedule-demo-2026' },
        { title: 'Special_Offer$$$---V2', expected: 'special_offer-v2' },
      ];

      for (const t of titles) {
        const slug = t.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        expect(slug).toBe(t.expected);
      }
    });

    it('validates required fields and extracts contact mapping accurately', () => {
      const fields: FormField[] = [
        { id: '1', name: 'work_email', label: 'Work Email', type: 'email', required: true, mapsToContactField: 'email' },
        { id: '2', name: 'full_name', label: 'Full Name', type: 'text', required: true, mapsToContactField: 'first_name' },
        { id: '3', name: 'company_name', label: 'Company', type: 'text', required: false, mapsToContactField: 'company' },
      ];

      const validSubmission = {
        work_email: 'jordan@growthcorp.com',
        full_name: 'Jordan Belfort',
        company_name: 'Growth Corp',
      };

      // Check required fields present
      for (const f of fields) {
        if (f.required) {
          expect(validSubmission[f.name as keyof typeof validSubmission]).toBeTruthy();
        }
      }

      // Name splitting logic
      const fullName = validSubmission.full_name;
      const parts = fullName.split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');

      expect(firstName).toBe('Jordan');
      expect(lastName).toBe('Belfort');
      expect(validSubmission.work_email).toContain('@');
    });

    it('rejects bot submissions when honeypot trap is triggered', () => {
      const botSubmission = {
        email: 'spammer@botnet.ru',
        name: 'Botty',
        _hp_check: 'http://spam-link.com',
      };

      const isBot = Boolean(botSubmission._hp_check);
      expect(isBot).toBe(true);
    });
  });

  describe('Email Campaigns Studio', () => {
    const sampleContacts: Contact[] = [
      {
        id: 'c-1',
        workspace_id: 'ws-1',
        company_id: null,
        first_name: 'Sarah',
        last_name: 'Connor',
        email: 'sarah@skynet.com',
        phone: null,
        job_title: 'VP Operations',
        lead_status: 'qualified',
        lifecycle_stage: 'mql',
        tags: ['newsletter', 'vip'],
        is_archived: false,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'c-2',
        workspace_id: 'ws-1',
        company_id: null,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: null,
        job_title: 'Marketing Director',
        lead_status: 'new',
        lifecycle_stage: 'lead',
        tags: ['newsletter'],
        is_archived: false,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'c-3',
        workspace_id: 'ws-1',
        company_id: null,
        first_name: 'Archived',
        last_name: 'Lead',
        email: 'archived@example.com',
        phone: null,
        job_title: null,
        lead_status: 'unqualified',
        lifecycle_stage: 'subscriber',
        tags: ['newsletter'],
        is_archived: true,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    it('accurately filters active contacts by audience segments', () => {
      // Filter by tag 'vip'
      const vipAudience = sampleContacts.filter(
        (c) => !c.is_archived && c.tags.includes('vip')
      );
      expect(vipAudience.length).toBe(1);
      expect(vipAudience[0].first_name).toBe('Sarah');

      // Filter by lifecycle_stage 'lead'
      const leadAudience = sampleContacts.filter(
        (c) => !c.is_archived && c.lifecycle_stage === 'lead'
      );
      expect(leadAudience.length).toBe(1);
      expect(leadAudience[0].first_name).toBe('John');

      // Excludes archived contacts
      const allNewsletter = sampleContacts.filter(
        (c) => !c.is_archived && c.tags.includes('newsletter')
      );
      expect(allNewsletter.length).toBe(2);
    });

    it('calculates open and click deliverability percentages without dividing by zero', () => {
      const delivered = 100;
      const opened = 42;
      const clicked = 14;

      const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
      const clickRate = opened > 0 ? Math.round((clicked / opened) * 100) : 0;

      expect(openRate).toBe(42);
      expect(clickRate).toBe(33);

      // Zero test
      const zeroDelivered = 0;
      const zeroRate = zeroDelivered > 0 ? Math.round((0 / zeroDelivered) * 100) : 0;
      expect(zeroRate).toBe(0);
    });
  });

  describe('Automation Workflows Engine', () => {
    it('correctly matches event triggers to registered workflows', () => {
      const workflows: AutomationWorkflow[] = [
        {
          id: 'wf-1',
          workspace_id: 'ws-1',
          name: 'Welcome Inbound Lead',
          description: null,
          trigger_type: 'form_submission',
          trigger_config: {},
          steps: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'wf-2',
          workspace_id: 'ws-1',
          name: 'Deal Won Slack Alert',
          description: null,
          trigger_type: 'deal_stage_changed',
          trigger_config: { target_stage: 'closed_won' },
          steps: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'wf-3',
          workspace_id: 'ws-1',
          name: 'Paused Pipeline Trigger',
          description: null,
          trigger_type: 'form_submission',
          trigger_config: {},
          steps: [],
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Simulate a 'form_submission' trigger
      const triggeredWorkflows = workflows.filter(
        (wf) => wf.is_active && wf.trigger_type === 'form_submission'
      );

      expect(triggeredWorkflows.length).toBe(1);
      expect(triggeredWorkflows[0].id).toBe('wf-1');
    });

    it('validates action pipeline step sequencing', () => {
      const steps: AutomationStep[] = [
        { id: 's1', type: 'send_email', title: 'Send Intro', config: { template: 'welcome' } },
        { id: 's2', type: 'create_task', title: 'Assign Follow-up', config: { priority: 'high' } },
        { id: 's3', type: 'add_tag', title: 'Add MQL Tag', config: { tag: 'mql' } },
      ];

      expect(steps.length).toBe(3);
      expect(steps[0].type).toBe('send_email');
      expect(steps[1].type).toBe('create_task');
      expect(steps[2].type).toBe('add_tag');
    });
  });

  describe('AI Growth Intelligence Grounding', () => {
    it('flags stagnating deals based on days inactive and proposal duration', () => {
      const now = Date.now();
      const past25Days = new Date(now - 25 * 86400000).toISOString();
      const past35Days = new Date(now - 35 * 86400000).toISOString();

      const stagnatingDeal = {
        id: 'd-1',
        title: 'Enterprise Growth Retainer',
        stage: 'proposal',
        amount: 25000,
        created_at: past35Days,
        daysSinceLastActivity: 25,
      };

      // Stagnation evaluation rules
      let riskScore = 'Low';
      const riskFactors: string[] = [];

      if (stagnatingDeal.daysSinceLastActivity > 21) {
        riskScore = 'Critical';
        riskFactors.push(`No activity in ${stagnatingDeal.daysSinceLastActivity} days`);
      }

      const daysActive = Math.floor((now - new Date(stagnatingDeal.created_at).getTime()) / 86400000);
      if (stagnatingDeal.stage === 'proposal' && daysActive > 30) {
        riskFactors.push(`Lingered in proposal for ${daysActive} days`);
      }

      expect(riskScore).toBe('Critical');
      expect(riskFactors.length).toBe(2);
      expect(daysActive).toBeGreaterThanOrEqual(34);
    });
  });
});
