-- ====================================================================
-- Migration: Fix automation_workflows trigger_type check constraint
-- Supports all NexusFlow visual builder and scheduling triggers:
-- 'form_submission', 'contact_created', 'contact_updated',
-- 'deal_stage_changed', 'tag_added', 'manual', 'schedule', 'webhook_incoming'
-- ====================================================================

-- 1. Drop the legacy 4-value check constraint if it exists
alter table public.automation_workflows
    drop constraint if exists automation_workflows_trigger_type_check;

-- 2. Add the comprehensive check constraint covering all visual builder triggers
alter table public.automation_workflows
    add constraint automation_workflows_trigger_type_check
    check (trigger_type in (
        'form_submission',
        'contact_created',
        'contact_updated',
        'deal_stage_changed',
        'tag_added',
        'manual',
        'schedule',
        'webhook_incoming'
    ));
