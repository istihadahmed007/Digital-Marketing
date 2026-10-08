'use server';

import { createClient } from '@/lib/supabase/server';
import { Integration, IntegrationProvider } from '@/lib/types/crm';
import { revalidatePath } from 'next/cache';
import { safeFetch } from '@/lib/security/ssrf';
import { encryptSecret, decryptSecret, sanitizeConfigForClient } from '@/lib/security/crypto';
import { MauticClient } from '@/lib/integrations/mautic/client';

export async function getIntegrations(workspaceId: string): Promise<Integration[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error || !data) {
    console.error('Error fetching integrations:', error);
    return [];
  }

  // Sanitize and mask secrets before returning to client browser components
  return data.map((item: any) => ({
    ...item,
    config: sanitizeConfigForClient(item.config || {}),
  })) as Integration[];
}

export async function saveIntegration(
  workspaceId: string,
  provider: IntegrationProvider,
  name: string,
  config: Record<string, any>,
  isEnabled: boolean
): Promise<{ success: boolean; integration?: Integration; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  // Fetch existing config to preserve existing secrets if the client passed a masked value
  const { data: existing } = await supabase
    .from('integrations')
    .select('config')
    .eq('workspace_id', workspaceId)
    .eq('provider', provider)
    .maybeSingle();

  const existingConfig = existing?.config || {};
  const processedConfig: Record<string, any> = { ...config };

  const secretKeys = ['apiKey', 'secretKey', 'token', 'signingSecret', 'password', 'accessToken', 'webhookUrl'];

  for (const key of secretKeys) {
    if (processedConfig[key] !== undefined) {
      const val = String(processedConfig[key]).trim();
      // If client didn't change the masked placeholder '••••', keep previous encrypted value
      if (val.includes('••••') && existingConfig[key]) {
        processedConfig[key] = existingConfig[key];
      } else if (val) {
        // Encrypt secret value before storing in database
        processedConfig[key] = encryptSecret(val);
      }
    }
  }

  const { data, error } = await supabase
    .from('integrations')
    .upsert(
      {
        workspace_id: workspaceId,
        provider,
        name,
        config: processedConfig,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id, provider' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving integration:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/integrations');
  return {
    success: true,
    integration: {
      ...data,
      config: sanitizeConfigForClient(data.config || {}),
    } as Integration,
  };
}

export async function syncMautic(
  workspaceId: string
): Promise<{ success: boolean; syncedContactsCount?: number; message?: string; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Database connection not configured' };

  // 1. Fetch configured mautic integration
  const { data: mauticIntegration } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'mautic')
    .maybeSingle();

  let baseUrl = process.env.MAUTIC_BASE_URL || '';
  let publicKey = process.env.MAUTIC_PUBLIC_KEY || '';
  let secretKey = process.env.MAUTIC_SECRET_KEY || '';
  let accessToken = process.env.MAUTIC_ACCESS_TOKEN || '';

  if (mauticIntegration?.is_enabled && mauticIntegration.config) {
    baseUrl = mauticIntegration.config.baseUrl || baseUrl;
    if (mauticIntegration.config.publicKey) {
      publicKey = decryptSecret(mauticIntegration.config.publicKey) || mauticIntegration.config.publicKey;
    }
    if (mauticIntegration.config.secretKey) {
      secretKey = decryptSecret(mauticIntegration.config.secretKey) || mauticIntegration.config.secretKey;
    }
    if (mauticIntegration.config.accessToken) {
      accessToken = decryptSecret(mauticIntegration.config.accessToken) || mauticIntegration.config.accessToken;
    }
  }

  const client = new MauticClient({
    baseUrl,
    publicKey,
    secretKey,
    accessToken,
  });

  if (!client.isConfigured()) {
    return {
      success: false,
      error: client.getSetupInstructions(),
    };
  }

  // 2. Perform authentic synchronization
  const result = await client.syncToSupabase(workspaceId, supabase);

  if (!result.success) {
    return {
      success: false,
      error: result.message,
    };
  }

  // 3. Update last_synced_at timestamp
  if (mauticIntegration?.id) {
    await supabase
      .from('integrations')
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mauticIntegration.id);
  }

  revalidatePath('/integrations');
  revalidatePath('/contacts');

  return {
    success: true,
    syncedContactsCount: result.syncedCount,
    message: result.message,
  };
}

export async function testWebhook(
  workspaceId: string,
  webhookUrl: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: 'Please enter a valid HTTP or HTTPS webhook destination URL.' };
  }

  try {
    const payload = {
      event: 'nexusmark.webhook.test',
      timestamp: new Date().toISOString(),
      workspace_id: workspaceId,
      sample_data: {
        lead_name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        deal_value: 5000,
        event_id: `evt_test_${Date.now()}`,
      },
    };

    // Dispatch request using SSRF-safe fetch
    const res = await safeFetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NexusMark-CRM-Webhook/1.0',
        'X-NexusMark-Delivery': `del_${Date.now()}`,
      },
      body: JSON.stringify(payload),
      timeoutMs: 5000,
    });

    // Enforce: only 2xx responses are successes
    if (res.ok) {
      return {
        success: true,
        message: `Webhook endpoint responded with HTTP ${res.status} (${res.statusText || 'OK'}). Test payload acknowledged successfully.`,
      };
    }

    return {
      success: false,
      error: `Webhook delivery failed: Destination responded with non-2xx status HTTP ${res.status} (${res.statusText || 'Error'}).`,
    };
  } catch (err: any) {
    // Network failures, DNS failures, timeouts, and SSRF security rejections are strict failures
    return {
      success: false,
      error: `Webhook dispatch failed: ${err.message}`,
    };
  }
}
