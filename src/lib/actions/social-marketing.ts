'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getAuthorizedWorkspace } from '@/lib/security/auth-context';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/security/crypto';
import {
  SmmFollowsClient,
  SmmTimeoutError,
} from '@/lib/integrations/social/smmfollows';
import {
  calculateSmmPrice,
  calculatePartialRefund,
  validateServiceQuantity,
  normalizeTargetUrl,
} from '@/lib/smm/pricing';
import {
  getOrCreateWorkspaceWallet,
  debitWalletForOrder,
  refundWalletForOrder,
  depositWalletFunds,
  getWorkspaceWalletTransactions,
} from '@/lib/smm/wallet';
import {
  SmmService,
  SmmOrder,
  SmmSettings,
  SmmOrderStatus,
  WorkspaceWallet,
  WorkspaceWalletTransaction,
} from '@/lib/types/social-marketing';
import { getTestStore } from '@/lib/security/test-mock-store';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Invariant safe in unit test environments
  }
}

/**
 * Resolves active SMMFollows API key for a workspace (DB encrypted secret > env var).
 */
async function resolveWorkspaceApiKey(workspaceId: string, supabase?: any): Promise<string> {
  if (supabase) {
    const { data: settings } = await supabase
      .from('social_marketing_settings')
      .select('api_key')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (settings?.api_key) {
      const decrypted = decryptSecret(settings.api_key);
      if (decrypted) return decrypted;
    }

    // Check central integrations table as fallback
    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'smmfollows')
      .maybeSingle();

    if (integration?.config?.apiKey) {
      const decrypted = decryptSecret(integration.config.apiKey);
      if (decrypted) return decrypted;
    }

    // Global DB fallback: check if any workspace in the database has an SMMFollows API key configured
    const { data: anySettings } = await supabase
      .from('social_marketing_settings')
      .select('api_key')
      .not('api_key', 'is', null)
      .limit(1)
      .maybeSingle();

    if (anySettings?.api_key) {
      const decrypted = decryptSecret(anySettings.api_key);
      if (decrypted) return decrypted;
    }
  }

  // Fallback to in-memory test store
  const testStore = getTestStore();
  if (testStore) {
    const s = testStore.smmSettings.get(workspaceId);
    if (s?.api_key) {
      return s.api_key;
    }
  }

  return process.env.SMMFOLLOWS_API_KEY || '';
}

// ==========================================
// 1. Settings & Connection
// ==========================================

export async function getSmmSettingsAction(requestedWorkspaceId?: string): Promise<SmmSettings> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase
      .from('social_marketing_settings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (data) {
      const decrypted = data.api_key ? decryptSecret(data.api_key) : null;
      return {
        ...data,
        api_key: decrypted ? maskSecret(decrypted) : null,
        api_key_is_set: Boolean(decrypted || process.env.SMMFOLLOWS_API_KEY),
        default_markup_percent: parseFloat(String(data.default_markup_percent || 30)),
        min_order_margin: parseFloat(String(data.min_order_margin || 0.05)),
      } as SmmSettings;
    }
  }

  const testStore = getTestStore();
  if (testStore) {
    const s = testStore.smmSettings.get(workspaceId);
    if (s) {
      return {
        ...s,
        api_key: s.api_key ? maskSecret(s.api_key) : null,
        api_key_is_set: Boolean(s.api_key || process.env.SMMFOLLOWS_API_KEY),
      };
    }
  }

  return {
    workspace_id: workspaceId,
    is_enabled: false,
    api_key: null,
    api_key_is_set: Boolean(process.env.SMMFOLLOWS_API_KEY),
    default_markup_percent: 30.0,
    min_order_margin: 0.05,
    currency: 'USD',
    connection_status: 'disconnected',
    last_connection_test_at: null,
    connection_error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updateSmmSettingsAction(
  requestedWorkspaceId: string,
  settings: {
    apiKey?: string;
    defaultMarkupPercent?: number;
    minOrderMargin?: number;
    isEnabled?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId, requiredRole: 'admin' });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  const testStore = getTestStore();

  let encryptedKey: string | undefined = undefined;
  if (settings.apiKey && !settings.apiKey.includes('••••')) {
    encryptedKey = encryptSecret(settings.apiKey.trim());
  }

  if (supabase) {
    const payload: Record<string, any> = {
      workspace_id: workspaceId,
      updated_at: new Date().toISOString(),
    };

    if (encryptedKey !== undefined) payload.api_key = encryptedKey;
    if (settings.defaultMarkupPercent !== undefined) payload.default_markup_percent = settings.defaultMarkupPercent;
    if (settings.minOrderMargin !== undefined) payload.min_order_margin = settings.minOrderMargin;
    if (settings.isEnabled !== undefined) payload.is_enabled = settings.isEnabled;

    const { error } = await supabase
      .from('social_marketing_settings')
      .upsert(payload, { onConflict: 'workspace_id' });

    if (error) {
      return { success: false, error: error.message };
    }

    safeRevalidate('/social-marketing/settings');
    return { success: true };
  }

  if (testStore) {
    const existing = testStore.smmSettings.get(workspaceId) || {
      workspace_id: workspaceId,
      is_enabled: false,
      default_markup_percent: 30,
      min_order_margin: 0.05,
      currency: 'USD',
      connection_status: 'disconnected',
      last_connection_test_at: null,
      connection_error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (settings.apiKey && !settings.apiKey.includes('••••')) {
      existing.api_key = settings.apiKey;
    }
    if (settings.defaultMarkupPercent !== undefined) existing.default_markup_percent = settings.defaultMarkupPercent;
    if (settings.minOrderMargin !== undefined) existing.min_order_margin = settings.minOrderMargin;
    if (settings.isEnabled !== undefined) existing.is_enabled = settings.isEnabled;

    testStore.smmSettings.set(workspaceId, existing);
    return { success: true };
  }

  return { success: true };
}

export async function testSmmConnectionAction(
  requestedWorkspaceId: string,
  providedApiKey?: string
): Promise<{ success: boolean; balance?: string; currency?: string; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId, requiredRole: 'admin' });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  let apiKey = providedApiKey?.trim();

  if (!apiKey || apiKey.includes('••••')) {
    apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'Cannot test connection: No SMMFollows API key provided or configured.',
    };
  }

  const client = new SmmFollowsClient({ apiKey });

  try {
    const balanceRes = await client.getBalance();

    // Connection genuine success: record verified state
    if (supabase) {
      await supabase
        .from('social_marketing_settings')
        .upsert(
          {
            workspace_id: workspaceId,
            connection_status: 'connected',
            last_connection_test_at: new Date().toISOString(),
            connection_error: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id' }
        );
    }

    const testStore = getTestStore();
    if (testStore) {
      const s = testStore.smmSettings.get(workspaceId) || {
        workspace_id: workspaceId,
        is_enabled: true,
        default_markup_percent: 30,
        min_order_margin: 0.05,
        currency: 'USD',
        connection_status: 'connected',
        last_connection_test_at: new Date().toISOString(),
        connection_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      s.connection_status = 'connected';
      s.last_connection_test_at = new Date().toISOString();
      s.connection_error = null;
      testStore.smmSettings.set(workspaceId, s);
    }

    safeRevalidate('/social-marketing/settings');

    return {
      success: true,
      balance: balanceRes.balance,
      currency: balanceRes.currency,
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Connection test failed';

    if (supabase) {
      await supabase
        .from('social_marketing_settings')
        .upsert(
          {
            workspace_id: workspaceId,
            connection_status: 'error',
            last_connection_test_at: new Date().toISOString(),
            connection_error: errorMsg,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id' }
        );
    }

    const testStore = getTestStore();
    if (testStore) {
      const s = testStore.smmSettings.get(workspaceId);
      if (s) {
        s.connection_status = 'error';
        s.connection_error = errorMsg;
      }
    }

    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function getSmmProviderBalanceAction(
  requestedWorkspaceId?: string
): Promise<{ balance: string; currency: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId, requiredRole: 'admin' });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  const apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  const client = new SmmFollowsClient({ apiKey });

  return client.getBalance();
}

// ==========================================
// 2. Services Catalog
// ==========================================

export async function getSmmServicesAction(
  requestedWorkspaceId?: string,
  options?: { category?: string; search?: string; onlyEnabled?: boolean }
): Promise<SmmService[]> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = await createClient();
  if (supabase) {
    let query = supabase
      .from('social_marketing_services')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (options?.onlyEnabled !== false) {
      query = query.eq('is_enabled', true);
    }

    if (options?.category && options.category !== 'All') {
      query = query.eq('category', options.category);
    }

    if (options?.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    const { data, error } = await query.order('category').order('name');
    if (error) {
      console.error('Error fetching SMM services:', error.message);
      return [];
    }

    return (data || []).map((s: any) => ({
      ...s,
      rate: parseFloat(String(s.rate || 0)),
      retail_rate: parseFloat(String(s.retail_rate || 0)),
    })) as SmmService[];
  }

  const testStore = getTestStore();
  if (testStore) {
    let list = testStore.smmServices.get(workspaceId) || [];
    if (options?.onlyEnabled !== false) {
      list = list.filter((s) => s.is_enabled);
    }
    if (options?.category && options.category !== 'All') {
      list = list.filter((s) => s.category === options.category);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    return list;
  }

  return [];
}

export async function syncSmmServicesAction(
  requestedWorkspaceId?: string
): Promise<{ success: boolean; count: number; message: string; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId, requiredRole: 'admin' });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  const apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  const client = new SmmFollowsClient({ apiKey });

  let rawServices;
  try {
    rawServices = await client.getServices();
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: 'Failed to fetch services catalog from SMMFollows.',
      error: err.message,
    };
  }

  const settings = await getSmmSettingsAction(workspaceId);
  const markupPercent = settings.default_markup_percent || 30;

  function cleanHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'");
  }

  const mappedServices: SmmService[] = rawServices.map((raw) => {
    const wholesaleRate = parseFloat(String(raw.rate || 0));
    const retailRate = Math.round(wholesaleRate * (1 + markupPercent / 100) * 10000) / 10000;

    return {
      id: `srv-${workspaceId}-${raw.service}`,
      workspace_id: workspaceId,
      service_id: String(raw.service),
      name: cleanHtml(String(raw.name)),
      type: String(raw.type || 'Default'),
      category: cleanHtml(String(raw.category || 'General')),
      rate: wholesaleRate,
      retail_rate: retailRate,
      min_quantity: parseInt(String(raw.min || 1), 10),
      max_quantity: parseInt(String(raw.max || 10000), 10),
      refill: Boolean(raw.refill === true || raw.refill === '1' || raw.refill === 1),
      cancel: Boolean(raw.cancel === true || raw.cancel === '1' || raw.cancel === 1),
      dripfeed: Boolean(raw.dripfeed === true || raw.dripfeed === '1' || raw.dripfeed === 1),
      is_enabled: true,
      raw_metadata: raw,
      last_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  if (supabase) {
    // Upsert into public.social_marketing_services in safe batches of 500 records
    const BATCH_SIZE = 500;
    for (let i = 0; i < mappedServices.length; i += BATCH_SIZE) {
      const chunk = mappedServices.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('social_marketing_services').upsert(
        chunk.map((s) => ({
          workspace_id: s.workspace_id,
          service_id: s.service_id,
          name: s.name,
          type: s.type,
          category: s.category,
          rate: s.rate,
          retail_rate: s.retail_rate,
          min_quantity: s.min_quantity,
          max_quantity: s.max_quantity,
          refill: s.refill,
          cancel: s.cancel,
          dripfeed: s.dripfeed,
          is_enabled: true,
          raw_metadata: s.raw_metadata,
          last_synced_at: s.last_synced_at,
          updated_at: s.updated_at,
        })),
        { onConflict: 'workspace_id,service_id' }
      );

      if (error) {
        return { success: false, count: i, message: `Database error: ${error.message}`, error: error.message };
      }
    }
  }

  const testStore = getTestStore();
  if (testStore) {
    testStore.smmServices.set(workspaceId, mappedServices);
  }

  safeRevalidate('/social-marketing/services');
  safeRevalidate('/social-marketing/new-order');

  return {
    success: true,
    count: mappedServices.length,
    message: `Successfully synchronized ${mappedServices.length} services from SMMFollows.`,
  };
}

export async function updateServicePricingAction(
  requestedWorkspaceId: string,
  serviceId: string,
  updates: { isEnabled?: boolean; customRetailRate?: number | null }
): Promise<{ success: boolean; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId, requiredRole: 'admin' });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  if (supabase) {
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.isEnabled !== undefined) payload.is_enabled = updates.isEnabled;
    if (updates.customRetailRate !== undefined) payload.retail_rate = updates.customRetailRate;

    const { error } = await supabase
      .from('social_marketing_services')
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('service_id', serviceId);

    if (error) return { success: false, error: error.message };
  }

  const testStore = getTestStore();
  if (testStore) {
    const list = testStore.smmServices.get(workspaceId) || [];
    const item = list.find((s) => s.service_id === serviceId);
    if (item) {
      if (updates.isEnabled !== undefined) item.is_enabled = updates.isEnabled;
      if (updates.customRetailRate !== undefined && updates.customRetailRate !== null) {
        item.retail_rate = updates.customRetailRate;
      }
    }
  }

  safeRevalidate('/social-marketing/services');
  return { success: true };
}

// ==========================================
// 3. Orders Placement & Lifecycle
// ==========================================

export async function createSmmOrderAction(
  requestedWorkspaceId: string,
  params: {
    serviceId: string;
    link: string;
    quantity: number;
    runs?: number;
    intervalMinutes?: number;
    idempotencyKey?: string;
  }
): Promise<{ success: boolean; order?: SmmOrder; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;
  const userId = auth.user.id;

  const supabase = (await createClient()) || createAdminClient();
  const testStore = getTestStore();

  // 1. Fetch service details
  let service: SmmService | undefined;
  if (supabase) {
    const { data } = await supabase
      .from('social_marketing_services')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('service_id', params.serviceId)
      .maybeSingle();

    if (data) {
      service = {
        ...data,
        rate: parseFloat(String(data.rate || 0)),
        retail_rate: parseFloat(String(data.retail_rate || 0)),
      } as SmmService;
    }
  }

  if (!service && testStore) {
    const list = testStore.smmServices.get(workspaceId) || [];
    service = list.find((s) => s.service_id === params.serviceId);
  }

  if (!service) {
    return { success: false, error: `Service ID ${params.serviceId} was not found in active catalog.` };
  }

  if (!service.is_enabled) {
    return { success: false, error: `Service "${service.name}" is currently disabled by administrator.` };
  }

  // 2. Validate quantity limits
  const qtyCheck = validateServiceQuantity(params.quantity, service.min_quantity, service.max_quantity);
  if (!qtyCheck.valid) {
    return { success: false, error: qtyCheck.error };
  }

  // 3. Normalize and validate target link
  const urlCheck = normalizeTargetUrl(params.link);
  if (!urlCheck.valid || !urlCheck.normalized) {
    return { success: false, error: urlCheck.error || 'Invalid target URL.' };
  }
  const normalizedLink = urlCheck.normalized;

  // 4. Calculate prices
  const priceResult = calculateSmmPrice({
    quantity: params.quantity,
    wholesaleRate: service.rate,
    customRetailRate: service.retail_rate,
  });

  const internalOrderId = `NEX-SMM-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;
  const idempotencyKey = params.idempotencyKey || `idem-${internalOrderId}`;

  // 5. Idempotency check: prevent duplicate submits
  if (supabase) {
    const { data: existing } = await supabase
      .from('social_marketing_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      return { success: true, order: existing as SmmOrder };
    }
  }

  if (testStore) {
    const orders = testStore.smmOrders.get(workspaceId) || [];
    const existing = orders.find((o) => o.idempotency_key === idempotencyKey);
    if (existing) {
      return { success: true, order: existing };
    }
  }

  // 6. Concurrency-safe atomic debit of customer wallet
  try {
    await debitWalletForOrder({
      workspaceId,
      amount: priceResult.customerCharge,
      orderInternalId: internalOrderId,
      serviceName: service.name,
      userId,
      supabase,
    });
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to debit wallet balance.',
    };
  }

  // 7. Persist order in pending_submission state before dispatching to provider
  const initialOrderRecord: SmmOrder = {
    id: `ord-${Date.now()}`,
    workspace_id: workspaceId,
    user_id: userId,
    internal_order_id: internalOrderId,
    provider_order_id: null,
    service_id: service.service_id,
    service_name: service.name,
    service_category: service.category,
    link: normalizedLink,
    quantity: params.quantity,
    runs: params.runs || 1,
    interval_minutes: params.intervalMinutes || 0,
    wholesale_rate: priceResult.wholesaleRate,
    wholesale_cost: priceResult.wholesaleCost,
    retail_rate: priceResult.retailRate,
    customer_charge: priceResult.customerCharge,
    currency: priceResult.currency,
    submission_state: 'pending_submission',
    status: 'pending',
    start_count: 0,
    remains: params.quantity,
    provider_charge: null,
    idempotency_key: idempotencyKey,
    submission_attempts: 1,
    last_reconciliation_at: null,
    reconciliation_error: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    const { data: inserted, error: insertError } = await supabase
      .from('social_marketing_orders')
      .insert(initialOrderRecord)
      .select('*')
      .single();

    if (insertError) {
      // Rollback wallet debit
      await refundWalletForOrder({
        workspaceId,
        amount: priceResult.customerCharge,
        orderInternalId: internalOrderId,
        reason: 'Order record creation failed',
        userId,
        supabase,
      });
      return { success: false, error: `Database error: ${insertError.message}` };
    }
    initialOrderRecord.id = inserted.id;
  }

  if (testStore) {
    const orders = testStore.smmOrders.get(workspaceId) || [];
    orders.unshift(initialOrderRecord);
    testStore.smmOrders.set(workspaceId, orders);
  }

  // 8. Contact SMMFollows provider
  const apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  const client = new SmmFollowsClient({ apiKey });

  try {
    const providerRes = await client.addOrder({
      service: service.service_id,
      link: normalizedLink,
      quantity: params.quantity,
      runs: params.runs,
      interval: params.intervalMinutes,
    });

    // Provider confirmed acceptance: record provider order ID
    const providerOrderId = String(providerRes.order);
    initialOrderRecord.provider_order_id = providerOrderId;
    initialOrderRecord.submission_state = 'submitted';
    initialOrderRecord.status = 'pending';
    initialOrderRecord.updated_at = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('social_marketing_orders')
        .update({
          provider_order_id: providerOrderId,
          submission_state: 'submitted',
          status: 'pending',
          updated_at: initialOrderRecord.updated_at,
        })
        .eq('id', initialOrderRecord.id);

      await supabase.from('social_marketing_order_status_history').insert({
        workspace_id: workspaceId,
        order_id: initialOrderRecord.id,
        previous_status: 'pending_submission',
        new_status: 'pending',
        start_count: 0,
        remains: params.quantity,
        provider_raw_response: providerRes,
      });
    }

    safeRevalidate('/social-marketing/orders');
    return { success: true, order: initialOrderRecord };
  } catch (err: any) {
    // 9. Ambiguous outcome handling
    if (err instanceof SmmTimeoutError) {
      // Timeout: do NOT refund or blindly resubmit. Mark for reconciliation.
      initialOrderRecord.submission_state = 'unresolved_timeout';
      initialOrderRecord.reconciliation_error = 'Provider request timed out. Awaiting status reconciliation.';
      initialOrderRecord.updated_at = new Date().toISOString();

      if (supabase) {
        await supabase
          .from('social_marketing_orders')
          .update({
            submission_state: 'unresolved_timeout',
            reconciliation_error: initialOrderRecord.reconciliation_error,
            updated_at: initialOrderRecord.updated_at,
          })
          .eq('id', initialOrderRecord.id);
      }

      return {
        success: true,
        order: initialOrderRecord,
        error:
          'Provider submission timed out. Your order has been placed in an unresolved reconciliation state to prevent duplicate charges.',
      };
    }

    // Definite failure: refund customer wallet immediately and mark failed
    const errorDetails = err.message || 'Provider rejected order.';
    initialOrderRecord.submission_state = 'failed';
    initialOrderRecord.status = 'failed';
    initialOrderRecord.error_message = errorDetails;
    initialOrderRecord.updated_at = new Date().toISOString();

    await refundWalletForOrder({
      workspaceId,
      amount: priceResult.customerCharge,
      orderInternalId: internalOrderId,
      reason: `Order submission failed: ${errorDetails}`,
      userId,
      supabase,
    });

    if (supabase) {
      await supabase
        .from('social_marketing_orders')
        .update({
          submission_state: 'failed',
          status: 'failed',
          error_message: errorDetails,
          updated_at: initialOrderRecord.updated_at,
        })
        .eq('id', initialOrderRecord.id);
    }

    return {
      success: false,
      error: errorDetails,
    };
  }
}

// ==========================================
// 4. Orders History & Status Synchronization
// ==========================================

export async function getSmmOrdersAction(
  requestedWorkspaceId?: string,
  options?: { status?: string; search?: string; limit?: number }
): Promise<SmmOrder[]> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = await createClient();
  if (supabase) {
    let query = supabase
      .from('social_marketing_orders')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options?.search) {
      query = query.or(
        `internal_order_id.ilike.%${options.search}%,service_name.ilike.%${options.search}%,link.ilike.%${options.search}%`
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(options?.limit || 50);

    if (error) {
      console.error('Error fetching SMM orders:', error.message);
      return [];
    }

    return (data || []).map((o: any) => ({
      ...o,
      wholesale_rate: parseFloat(String(o.wholesale_rate || 0)),
      wholesale_cost: parseFloat(String(o.wholesale_cost || 0)),
      retail_rate: parseFloat(String(o.retail_rate || 0)),
      customer_charge: parseFloat(String(o.customer_charge || 0)),
      provider_charge: o.provider_charge ? parseFloat(String(o.provider_charge)) : null,
    })) as SmmOrder[];
  }

  const testStore = getTestStore();
  if (testStore) {
    let list = testStore.smmOrders.get(workspaceId) || [];
    if (options?.status && options.status !== 'all') {
      list = list.filter((o) => o.status === options.status);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(
        (o) =>
          o.internal_order_id.toLowerCase().includes(q) ||
          o.service_name.toLowerCase().includes(q) ||
          o.link.toLowerCase().includes(q)
      );
    }
    return list.slice(0, options?.limit || 50);
  }

  return [];
}

export async function getSmmOrderDetailsAction(
  requestedWorkspaceId: string,
  orderId: string
): Promise<{
  order: SmmOrder | null;
  history: any[];
  refills: any[];
  cancellations: any[];
}> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = await createClient();
  if (supabase) {
    const { data: order } = await supabase
      .from('social_marketing_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return { order: null, history: [], refills: [], cancellations: [] };

    const [histRes, refRes, canRes] = await Promise.all([
      supabase
        .from('social_marketing_order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('social_marketing_refill_requests')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
      supabase
        .from('social_marketing_cancellation_requests')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
    ]);

    return {
      order: {
        ...order,
        wholesale_rate: parseFloat(String(order.wholesale_rate || 0)),
        wholesale_cost: parseFloat(String(order.wholesale_cost || 0)),
        retail_rate: parseFloat(String(order.retail_rate || 0)),
        customer_charge: parseFloat(String(order.customer_charge || 0)),
        provider_charge: order.provider_charge ? parseFloat(String(order.provider_charge)) : null,
      } as SmmOrder,
      history: histRes.data || [],
      refills: refRes.data || [],
      cancellations: canRes.data || [],
    };
  }

  const testStore = getTestStore();
  if (testStore) {
    const orders = testStore.smmOrders.get(workspaceId) || [];
    const ord = orders.find((o) => o.id === orderId || o.internal_order_id === orderId);
    return {
      order: ord || null,
      history: [],
      refills: [],
      cancellations: [],
    };
  }

  return { order: null, history: [], refills: [], cancellations: [] };
}

/**
 * Synchronizes single order status with SMMFollows provider.
 */
export async function syncOrderStatusAction(
  requestedWorkspaceId: string,
  orderId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  let order: SmmOrder | undefined;

  if (supabase) {
    const { data } = await supabase
      .from('social_marketing_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', orderId)
      .maybeSingle();

    if (data) {
      order = data as SmmOrder;
    }
  }

  const testStore = getTestStore();
  if (!order && testStore) {
    const list = testStore.smmOrders.get(workspaceId) || [];
    order = list.find((o) => o.id === orderId || o.internal_order_id === orderId);
  }

  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  if (!order.provider_order_id) {
    return { success: false, error: 'Order does not have an assigned provider ID yet.' };
  }

  const apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  const client = new SmmFollowsClient({ apiKey });

  try {
    const statusRes = await client.getOrderStatus(order.provider_order_id);

    // Standardize provider status string to NexusMark SmmOrderStatus
    const rawStatus = (statusRes.status || '').toLowerCase().trim();
    let standardizedStatus: SmmOrderStatus = order.status;

    if (rawStatus === 'completed') standardizedStatus = 'completed';
    else if (rawStatus === 'processing' || rawStatus === 'in progress' || rawStatus === 'inprogress') {
      standardizedStatus = 'in_progress';
    } else if (rawStatus === 'partial') standardizedStatus = 'partial';
    else if (rawStatus === 'canceled' || rawStatus === 'cancelled') standardizedStatus = 'canceled';
    else if (rawStatus === 'rejected') standardizedStatus = 'rejected';
    else if (rawStatus === 'pending') standardizedStatus = 'pending';

    const startCount = statusRes.start_count !== undefined ? parseInt(String(statusRes.start_count), 10) : order.start_count;
    const remains = statusRes.remains !== undefined ? parseInt(String(statusRes.remains), 10) : order.remains;
    const providerCharge = statusRes.charge ? parseFloat(String(statusRes.charge)) : order.provider_charge;

    // Handle partial completion or cancellation refunds
    if (
      standardizedStatus === 'partial' &&
      order.status !== 'partial' &&
      remains > 0
    ) {
      const refundAmount = calculatePartialRefund(order.quantity, remains, order.customer_charge);
      if (refundAmount > 0) {
        await refundWalletForOrder({
          workspaceId,
          amount: refundAmount,
          orderInternalId: order.internal_order_id,
          reason: `Partial completion refund (${remains} units unfulfilled)`,
          userId: auth.user.id,
          supabase,
        });
      }
    } else if (
      (standardizedStatus === 'canceled' || standardizedStatus === 'rejected') &&
      order.status !== 'canceled' &&
      order.status !== 'rejected'
    ) {
      await refundWalletForOrder({
        workspaceId,
        amount: order.customer_charge,
        orderInternalId: order.internal_order_id,
        reason: `Order ${standardizedStatus} by provider`,
        userId: auth.user.id,
        supabase,
      });
    }

    const previousStatus = order.status;
    order.status = standardizedStatus;
    order.start_count = startCount;
    order.remains = remains;
    order.provider_charge = providerCharge;
    order.submission_state = 'submitted';
    order.last_reconciliation_at = new Date().toISOString();
    order.updated_at = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('social_marketing_orders')
        .update({
          status: standardizedStatus,
          start_count: startCount,
          remains: remains,
          provider_charge: providerCharge,
          submission_state: 'submitted',
          last_reconciliation_at: order.last_reconciliation_at,
          updated_at: order.updated_at,
        })
        .eq('id', order.id);

      await supabase.from('social_marketing_order_status_history').insert({
        workspace_id: workspaceId,
        order_id: order.id,
        previous_status: previousStatus,
        new_status: standardizedStatus,
        start_count: startCount,
        remains: remains,
        provider_raw_response: statusRes,
      });
    }

    safeRevalidate('/social-marketing/orders');
    safeRevalidate(`/social-marketing/orders/${order.id}`);

    return { success: true, status: standardizedStatus };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Synchronizes batch of order statuses (up to 100 orders).
 */
export async function syncBatchOrdersAction(
  requestedWorkspaceId?: string,
  orderIds?: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  let ordersToSync: SmmOrder[] = [];

  if (supabase) {
    let q = supabase
      .from('social_marketing_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .not('provider_order_id', 'is', null)
      .in('status', ['pending', 'in_progress', 'processing']);

    if (orderIds && orderIds.length > 0) {
      q = q.in('id', orderIds);
    }

    const { data } = await q.limit(100);
    ordersToSync = (data || []) as SmmOrder[];
  }

  const testStore = getTestStore();
  if (ordersToSync.length === 0 && testStore) {
    const list = testStore.smmOrders.get(workspaceId) || [];
    ordersToSync = list.filter((o) => o.provider_order_id && ['pending', 'in_progress'].includes(o.status));
  }

  if (ordersToSync.length === 0) {
    return { success: true, count: 0 };
  }

  const apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  const client = new SmmFollowsClient({ apiKey });

  const providerOrderIds = ordersToSync.map((o) => o.provider_order_id as string);

  try {
    const multiStatus = await client.getMultiOrderStatus(providerOrderIds);

    let updatedCount = 0;
    for (const ord of ordersToSync) {
      const pId = ord.provider_order_id;
      if (!pId || !multiStatus[pId]) continue;

      const stat = multiStatus[pId];
      if (stat.error) continue;

      const raw = (stat.status || '').toLowerCase().trim();
      let std: SmmOrderStatus = ord.status;
      if (raw === 'completed') std = 'completed';
      else if (raw === 'in progress' || raw === 'processing') std = 'in_progress';
      else if (raw === 'partial') std = 'partial';
      else if (raw === 'canceled' || raw === 'cancelled') std = 'canceled';
      else if (raw === 'rejected') std = 'rejected';

      ord.status = std;
      if (stat.start_count !== undefined) ord.start_count = parseInt(String(stat.start_count), 10);
      if (stat.remains !== undefined) ord.remains = parseInt(String(stat.remains), 10);
      if (stat.charge !== undefined) ord.provider_charge = parseFloat(String(stat.charge));

      if (supabase) {
        await supabase
          .from('social_marketing_orders')
          .update({
            status: std,
            start_count: ord.start_count,
            remains: ord.remains,
            provider_charge: ord.provider_charge,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ord.id);
      }
      updatedCount++;
    }

    safeRevalidate('/social-marketing/orders');
    return { success: true, count: updatedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

// ==========================================
// 5. Refill & Cancellation Requests
// ==========================================

export async function requestOrderRefillAction(
  requestedWorkspaceId: string,
  orderId: string
): Promise<{ success: boolean; refillId?: string; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  let order: SmmOrder | undefined;

  if (supabase) {
    const { data } = await supabase
      .from('social_marketing_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', orderId)
      .maybeSingle();
    if (data) order = data as SmmOrder;
  }

  const testStore = getTestStore();
  if (!order && testStore) {
    const list = testStore.smmOrders.get(workspaceId) || [];
    order = list.find((o) => o.id === orderId || o.internal_order_id === orderId);
  }

  if (!order || !order.provider_order_id) {
    return { success: false, error: 'Order not eligible for refill: missing provider order ID.' };
  }

  // Refill is permitted only for completed or partial orders
  if (!['completed', 'partial'].includes(order.status)) {
    return {
      success: false,
      error: `Order status "${order.status}" is not eligible for refill. Must be completed or partial.`,
    };
  }

  const apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  const client = new SmmFollowsClient({ apiKey });

  try {
    const refillRes = await client.requestRefill(order.provider_order_id);
    const refillId = refillRes.refill ? String(refillRes.refill) : null;

    if (supabase) {
      await supabase.from('social_marketing_refill_requests').insert({
        workspace_id: workspaceId,
        order_id: order.id,
        provider_refill_id: refillId,
        status: 'pending',
      });
    }

    safeRevalidate(`/social-marketing/orders/${order.id}`);
    return { success: true, refillId: refillId || undefined };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit refill request.' };
  }
}

export async function requestOrderCancellationAction(
  requestedWorkspaceId: string,
  orderId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = (await createClient()) || createAdminClient();
  let order: SmmOrder | undefined;

  if (supabase) {
    const { data } = await supabase
      .from('social_marketing_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('id', orderId)
      .maybeSingle();
    if (data) order = data as SmmOrder;
  }

  const testStore = getTestStore();
  if (!order && testStore) {
    const list = testStore.smmOrders.get(workspaceId) || [];
    order = list.find((o) => o.id === orderId || o.internal_order_id === orderId);
  }

  if (!order || !order.provider_order_id) {
    return { success: false, error: 'Order not eligible for cancellation: missing provider order ID.' };
  }

  if (!['pending', 'in_progress', 'processing'].includes(order.status)) {
    return {
      success: false,
      error: `Order status "${order.status}" cannot be cancelled. Only pending or in-progress orders can be requested for cancellation.`,
    };
  }

  const apiKey = await resolveWorkspaceApiKey(workspaceId, supabase);
  const client = new SmmFollowsClient({ apiKey });

  try {
    const cancelRes = await client.cancelOrders([order.provider_order_id]);
    const cancelResult = cancelRes[0];

    if (supabase) {
      await supabase.from('social_marketing_cancellation_requests').insert({
        workspace_id: workspaceId,
        order_id: order.id,
        provider_cancel_result: cancelResult ? JSON.stringify(cancelResult) : null,
        status: cancelResult?.error ? 'rejected' : 'pending',
        error_message: cancelResult?.error ? String(cancelResult.error) : null,
      });
    }

    safeRevalidate(`/social-marketing/orders/${order.id}`);

    if (cancelResult?.error) {
      return { success: false, error: String(cancelResult.error) };
    }

    return {
      success: true,
      message: 'Cancellation request submitted to provider.',
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit cancellation request.' };
  }
}

// ==========================================
// 6. Wallet Management Actions
// ==========================================

export async function getWorkspaceWalletAction(requestedWorkspaceId?: string): Promise<WorkspaceWallet> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = await createClient();
  return getOrCreateWorkspaceWallet(workspaceId, supabase);
}

export async function getWalletTransactionsAction(
  requestedWorkspaceId?: string,
  limit = 50
): Promise<WorkspaceWalletTransaction[]> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;

  const supabase = await createClient();
  return getWorkspaceWalletTransactions(workspaceId, limit, supabase);
}

export async function adminDepositFundsAction(
  requestedWorkspaceId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId, requiredRole: 'admin' });
  const workspaceId = auth.workspaceId;
  const userId = auth.user.id;

  if (amount <= 0) {
    return { success: false, error: 'Deposit amount must be greater than zero.' };
  }

  const supabase = (await createClient()) || createAdminClient();

  try {
    const result = await depositWalletFunds({
      workspaceId,
      amount,
      description: description || 'Admin manual balance deposit',
      userId,
      supabase,
    });

    safeRevalidate('/social-marketing/wallet');
    return { success: true, newBalance: result.newBalance };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function submitPaymentlyDepositAction(
  requestedWorkspaceId: string,
  params: {
    amountUsd: number;
    amountBdt?: number;
    trxId: string;
    paymentMethod?: string;
    notes?: string;
  }
): Promise<{ success: boolean; newBalance?: number; transactionId?: string; error?: string }> {
  const auth = await getAuthorizedWorkspace({ requestedWorkspaceId });
  const workspaceId = auth.workspaceId;
  const userId = auth.user.id;

  if (!params.amountUsd || params.amountUsd <= 0) {
    return { success: false, error: 'Deposit amount must be greater than $0.00 USD.' };
  }

  const cleanTrx = (params.trxId || '').trim();
  if (!cleanTrx) {
    return { success: false, error: 'Paymently Transaction ID (TrxID) or payment reference is required.' };
  }

  const supabase = (await createClient()) || createAdminClient();

  const methodLabel = params.paymentMethod ? ` via ${params.paymentMethod}` : '';
  const bdtLabel = params.amountBdt ? ` (৳${params.amountBdt.toLocaleString()} BDT)` : '';
  const memo = `Paymently Deposit${bdtLabel}${methodLabel} - TrxID: ${cleanTrx}${params.notes ? ` - ${params.notes}` : ''}`;

  try {
    const result = await depositWalletFunds({
      workspaceId,
      amount: Math.round(params.amountUsd * 100) / 100,
      description: memo,
      referenceId: cleanTrx,
      userId,
      supabase,
    });

    safeRevalidate('/social-marketing/wallet');
    safeRevalidate('/social-marketing/new-order');
    safeRevalidate('/social-marketing');
    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
