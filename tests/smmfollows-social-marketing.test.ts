import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SmmFollowsClient,
  SmmTimeoutError,
} from '../src/lib/integrations/social/smmfollows';
import {
  calculateSmmPrice,
  calculatePartialRefund,
  validateServiceQuantity,
  normalizeTargetUrl,
} from '../src/lib/smm/pricing';
import {
  getOrCreateWorkspaceWallet,
  debitWalletForOrder,
  refundWalletForOrder,
  depositWalletFunds,
  getWorkspaceWalletTransactions,
  InsufficientBalanceError,
} from '../src/lib/smm/wallet';
import {
  createSmmOrderAction,
  syncOrderStatusAction,
  requestOrderRefillAction,
  requestOrderCancellationAction,
  testSmmConnectionAction,
  getSmmProviderBalanceAction,
  getSmmServicesAction,
  submitPaymentlyDepositAction,
} from '../src/lib/actions/social-marketing';
import {
  DEFAULT_PAYMENTLY_URL,
  DEFAULT_BDT_PER_USD,
  convertBdtToUsd,
  convertUsdToBdt,
} from '../src/lib/constants/payments';
import {
  initTestStore,
  resetTestStore,
  getTestStore,
} from '../src/lib/security/test-mock-store';
import { setTestAuthSession } from '../src/lib/security/auth-context';
import { encryptSecret, decryptSecret, maskSecret } from '../src/lib/security/crypto';

describe('SMMFollows Social Marketing Module & Wallet Engine', () => {
  const wsAlpha = 'ws-alpha-tenant';
  const wsBeta = 'ws-beta-tenant';

  const adminSession = {
    user: { id: 'user-admin', email: 'admin@nexusmark.local' },
    workspaceId: wsAlpha,
    role: 'owner' as const,
    memberships: [{ workspace_id: wsAlpha, role: 'owner' as const }],
  };

  const memberSession = {
    user: { id: 'user-member', email: 'member@nexusmark.local' },
    workspaceId: wsAlpha,
    role: 'member' as const,
    memberships: [{ workspace_id: wsAlpha, role: 'member' as const }],
  };

  const foreignSession = {
    user: { id: 'user-foreign', email: 'outsider@othercorp.local' },
    workspaceId: wsBeta,
    role: 'owner' as const,
    memberships: [{ workspace_id: wsBeta, role: 'owner' as const }],
  };

  beforeEach(() => {
    initTestStore();
    setTestAuthSession(adminSession);
  });

  afterEach(() => {
    setTestAuthSession(undefined);
    resetTestStore();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. SMMFollows Provider Adapter Unit Tests
  // =========================================================================
  describe('1. SMMFollows Provider Client Adapter & Resilience', () => {
    it('detects unconfigured credentials honestly', () => {
      const client = new SmmFollowsClient({ apiKey: '' });
      expect(client.isConfigured()).toBe(false);
      expect(client.getSetupInstructions()).toContain('SMMFollows integration is not configured');
    });

    it('redacts sensitive API key from error messages and logs', async () => {
      const secretKey = 'super-secret-smm-key-999';
      const client = new SmmFollowsClient({ apiKey: secretKey });

      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: `Invalid key: ${secretKey}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      await expect(client.getBalance()).rejects.toThrow('••••••••');
    });

    it('parses provider-level JSON errors correctly', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });

      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Incorrect request' }), {
            status: 200, // Provider returned 200 but body contains error!
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      await expect(client.getBalance()).rejects.toThrow('SMMFollows rejected request: Incorrect request');
    });

    it('handles HTTP 429 rate limit errors with a clear message', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });

      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response('Too Many Requests', {
            status: 429,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      );

      await expect(client.getServices()).rejects.toThrow(/rate limit reached/i);
    });

    it('handles malformed non-JSON provider responses gracefully', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });

      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response('<html><title>502 Bad Gateway</title></html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          })
        )
      );

      await expect(client.getServices()).rejects.toThrow(/Invalid response received from SMMFollows/i);
    });

    it('identifies network timeouts as SmmTimeoutError with ambiguous status', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key', timeoutMs: 100 });

      vi.spyOn(global, 'fetch').mockImplementationOnce(() => {
        const err: any = new Error('The operation was aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });

      await expect(
        client.addOrder({ service: 123, link: 'https://instagram.com/test', quantity: 1000 })
      ).rejects.toThrowError(SmmTimeoutError);
    });

    it('successfully retrieves and parses provider services catalog', async () => {
      const mockServices = [
        {
          service: 1,
          name: 'Instagram Followers [High Quality]',
          type: 'Default',
          category: 'Instagram Followers',
          rate: '0.85',
          min: '100',
          max: '50000',
          refill: true,
          cancel: false,
        },
        {
          service: 2,
          name: 'YouTube Views [Guaranteed]',
          type: 'Default',
          category: 'YouTube Views',
          rate: '1.40',
          min: '500',
          max: '100000',
          refill: true,
          cancel: true,
        },
      ];

      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify(mockServices), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const services = await client.getServices();
      expect(services).toHaveLength(2);
      expect(services[0].name).toBe('Instagram Followers [High Quality]');
      expect(services[1].rate).toBe('1.40');
      expect(services[1].cancel).toBe(true);
    });

    it('successfully retrieves provider wholesale balance', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ balance: '142.508', currency: 'USD' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const bal = await client.getBalance();
      expect(bal.balance).toBe('142.508');
      expect(bal.currency).toBe('USD');
    });

    it('creates order with correct application/x-www-form-urlencoded payload', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });
      let capturedBody = '';

      vi.spyOn(global, 'fetch').mockImplementationOnce((url, options: any) => {
        capturedBody = options.body;
        return Promise.resolve(
          new Response(JSON.stringify({ order: 987654 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const res = await client.addOrder({
        service: 42,
        link: 'https://youtube.com/watch?v=123',
        quantity: 2500,
        runs: 5,
        interval: 30,
      });

      expect(res.order).toBe(987654);
      expect(capturedBody).toContain('key=valid-test-key');
      expect(capturedBody).toContain('action=add');
      expect(capturedBody).toContain('service=42');
      expect(capturedBody).toContain('quantity=2500');
      expect(capturedBody).toContain('runs=5');
      expect(capturedBody).toContain('interval=30');
    });

    it('supports single and batch status checks up to 100 IDs', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });

      // Single
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              charge: '0.85',
              start_count: '1200',
              status: 'Completed',
              remains: '0',
              currency: 'USD',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      const single = await client.getOrderStatus(987654);
      expect(single.status).toBe('Completed');
      expect(single.remains).toBe('0');

      // Batch
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              '101': { status: 'In progress', charge: '0.40', remains: '500' },
              '102': { status: 'Completed', charge: '1.20', remains: '0' },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      const batch = await client.getMultiOrderStatus([101, 102]);
      expect(batch['101'].status).toBe('In progress');
      expect(batch['102'].status).toBe('Completed');

      // Rejects batch > 100
      const excessiveList = Array.from({ length: 101 }, (_, i) => i + 1);
      await expect(client.getMultiOrderStatus(excessiveList)).rejects.toThrow(
        'Maximum of 100 order IDs allowed'
      );
    });

    it('submits refill and cancellation requests safely', async () => {
      const client = new SmmFollowsClient({ apiKey: 'valid-test-key' });

      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ refill: 554433 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      const ref = await client.requestRefill(987654);
      expect(ref.refill).toBe(554433);

      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify([{ order: 987654, cancel: 1 }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      const can = await client.cancelOrders([987654]);
      expect(can[0].cancel).toBe(1);
    });
  });

  // =========================================================================
  // 2. Pricing, Markup, and URL Normalization Engine
  // =========================================================================
  describe('2. Pricing Engine, Markup Calculations & Normalization', () => {
    it('calculates wholesale cost per 1,000 units with default markup', () => {
      // Rate: $2.00 per 1,000. Qty: 2,500 => Wholesale: $5.00
      // 30% markup => Retail rate: $2.60 per 1,000 => Customer charge: $6.50
      const pricing = calculateSmmPrice({
        quantity: 2500,
        wholesaleRate: 2.0,
        markupPercent: 30,
      });

      expect(pricing.wholesaleCost).toBe(5.0);
      expect(pricing.retailRate).toBe(2.6);
      expect(pricing.customerCharge).toBe(6.5);
      expect(pricing.marginAmount).toBe(1.5);
    });

    it('enforces minimum margin guarantee when wholesale cost is tiny', () => {
      // 100 units at $0.10/1k => wholesale = $0.01. With minMargin $0.05 => charge = $0.06
      const pricing = calculateSmmPrice({
        quantity: 100,
        wholesaleRate: 0.1,
        markupPercent: 20,
        minMargin: 0.05,
      });

      expect(pricing.customerCharge).toBeCloseTo(pricing.wholesaleCost + 0.05, 4);
      expect(pricing.marginAmount).toBeGreaterThanOrEqual(0.05);
    });

    it('correctly calculates pro-rated partial delivery refunds', () => {
      // Ordered 1,000 units for $10.00. 250 remains unfulfilled => Refund: $2.50
      const refund = calculatePartialRefund(1000, 250, 10.0);
      expect(refund).toBe(2.5);

      // 0 remains => 0 refund
      expect(calculatePartialRefund(1000, 0, 10.0)).toBe(0);
    });

    it('validates service quantity bounds strictly', () => {
      expect(validateServiceQuantity(500, 100, 10000).valid).toBe(true);
      expect(validateServiceQuantity(50, 100, 10000).valid).toBe(false);
      expect(validateServiceQuantity(50, 100, 10000).error).toContain('below the minimum');
      expect(validateServiceQuantity(15000, 100, 10000).valid).toBe(false);
      expect(validateServiceQuantity(15000, 100, 10000).error).toContain('exceeds the maximum');
    });

    it('normalizes target URLs and social handles', () => {
      expect(normalizeTargetUrl('https://instagram.com/nexusmark').normalized).toBe(
        'https://instagram.com/nexusmark'
      );
      expect(normalizeTargetUrl('instagram.com/nexusmark').normalized).toBe(
        'https://instagram.com/nexusmark'
      );
      expect(normalizeTargetUrl('@digigrowth').normalized).toBe('@digigrowth');
      expect(normalizeTargetUrl('   ').valid).toBe(false);
      expect(normalizeTargetUrl('not a url with spaces').valid).toBe(false);
    });
  });

  // =========================================================================
  // 3. Concurrency-Safe Wallet Ledger
  // =========================================================================
  describe('3. Concurrency-Safe Workspace Wallet Ledger', () => {
    it('initializes zero balance wallet and records deposit ledger transaction', async () => {
      const wallet = await getOrCreateWorkspaceWallet(wsAlpha);
      expect(wallet.balance).toBe(0.0);

      const dep = await depositWalletFunds({
        workspaceId: wsAlpha,
        amount: 50.0,
        description: 'Verified test deposit',
        userId: 'admin-user',
      });

      expect(dep.success).toBe(true);
      expect(dep.newBalance).toBe(50.0);

      const txs = await getWorkspaceWalletTransactions(wsAlpha);
      expect(txs).toHaveLength(1);
      expect(txs[0].type).toBe('deposit');
      expect(txs[0].amount).toBe(50.0);
      expect(txs[0].balance_after).toBe(50.0);
    });

    it('debits wallet for order and records charge in ledger', async () => {
      await depositWalletFunds({
        workspaceId: wsAlpha,
        amount: 25.0,
        description: 'Deposit',
      });

      const debit = await debitWalletForOrder({
        workspaceId: wsAlpha,
        amount: 8.5,
        orderInternalId: 'NEX-SMM-1234',
        serviceName: 'Instagram Followers',
      });

      expect(debit.success).toBe(true);
      expect(debit.newBalance).toBe(16.5);

      const txs = await getWorkspaceWalletTransactions(wsAlpha);
      expect(txs[0].type).toBe('order_charge');
      expect(txs[0].amount).toBe(-8.5);
      expect(txs[0].balance_after).toBe(16.5);
    });

    it('blocks order and throws InsufficientBalanceError when wallet funds are low', async () => {
      await depositWalletFunds({
        workspaceId: wsAlpha,
        amount: 5.0,
        description: 'Small deposit',
      });

      await expect(
        debitWalletForOrder({
          workspaceId: wsAlpha,
          amount: 12.0, // Exceeds $5.00
          orderInternalId: 'NEX-SMM-5678',
          serviceName: 'YouTube Views',
        })
      ).rejects.toThrowError(InsufficientBalanceError);
    });

    it('credits refund to wallet and updates transaction ledger', async () => {
      await depositWalletFunds({
        workspaceId: wsAlpha,
        amount: 20.0,
        description: 'Initial',
      });
      await debitWalletForOrder({
        workspaceId: wsAlpha,
        amount: 10.0,
        orderInternalId: 'NEX-SMM-REFUND-TEST',
        serviceName: 'TikTok Views',
      });

      const ref = await refundWalletForOrder({
        workspaceId: wsAlpha,
        amount: 10.0,
        orderInternalId: 'NEX-SMM-REFUND-TEST',
        reason: 'Order rejected by provider',
      });

      expect(ref.newBalance).toBe(20.0);
      const txs = await getWorkspaceWalletTransactions(wsAlpha);
      expect(txs[0].type).toBe('refund');
      expect(txs[0].amount).toBe(10.0);
      expect(txs[0].balance_after).toBe(20.0);
    });
  });

  // =========================================================================
  // 4. Server Actions: End-to-End Order Lifecycle & Idempotency
  // =========================================================================
  describe('4. Social Marketing Server Actions Lifecycle', () => {
    beforeEach(async () => {
      // Setup test service in catalog
      const store = getTestStore();
      if (store) {
        store.smmServices.set(wsAlpha, [
          {
            id: 'srv-1',
            workspace_id: wsAlpha,
            service_id: '10',
            name: 'Instagram Likes [Fast]',
            type: 'Default',
            category: 'Instagram',
            rate: 1.0, // $1.00 / 1k wholesale
            retail_rate: 1.3, // $1.30 / 1k retail
            min_quantity: 100,
            max_quantity: 10000,
            refill: true,
            cancel: true,
            dripfeed: false,
            is_enabled: true,
            last_synced_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        // Seed wallet
        store.wallets.set(wsAlpha, {
          id: 'wallet-ws-alpha',
          workspace_id: wsAlpha,
          balance: 50.0,
          currency: 'USD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        // Seed SMM settings with valid API key
        store.smmSettings.set(wsAlpha, {
          workspace_id: wsAlpha,
          is_enabled: true,
          api_key: 'test-smm-valid-key',
          default_markup_percent: 30,
          min_order_margin: 0.05,
          currency: 'USD',
          connection_status: 'connected',
          last_connection_test_at: new Date().toISOString(),
          connection_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    it('successfully places an order when valid and provider confirms', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ order: 1234567 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const res = await createSmmOrderAction(wsAlpha, {
        serviceId: '10',
        link: 'https://instagram.com/p/abc123xyz',
        quantity: 1000,
      });

      expect(res.success).toBe(true);
      expect(res.order?.provider_order_id).toBe('1234567');
      expect(res.order?.submission_state).toBe('submitted');
      expect(res.order?.status).toBe('pending');
      expect(res.order?.customer_charge).toBe(1.3);

      // Verify wallet was debited: $50.00 - $1.30 = $48.70
      const store = getTestStore();
      expect(store?.wallets.get(wsAlpha)?.balance).toBe(48.7);
    });

    it('automatically refunds wallet if provider rejects order', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'Service temporarily disabled by provider' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const res = await createSmmOrderAction(wsAlpha, {
        serviceId: '10',
        link: 'https://instagram.com/p/abc123xyz',
        quantity: 1000,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Service temporarily disabled');

      // Balance was returned to $50.00
      const store = getTestStore();
      expect(store?.wallets.get(wsAlpha)?.balance).toBe(50.0);
    });

    it('marks order as unresolved_timeout without blind retry on timeout', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(() => {
        const err: any = new Error('The operation was aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      });

      const res = await createSmmOrderAction(wsAlpha, {
        serviceId: '10',
        link: 'https://instagram.com/p/abc123xyz',
        quantity: 1000,
      });

      expect(res.success).toBe(true);
      expect(res.order?.submission_state).toBe('unresolved_timeout');
      expect(res.error).toContain('reconciliation');
    });

    it('enforces request idempotency and prevents duplicate submissions', async () => {
      const fixedIdempotencyKey = 'unique-client-uuid-999';

      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ order: 888777 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const first = await createSmmOrderAction(wsAlpha, {
        serviceId: '10',
        link: 'https://instagram.com/p/first',
        quantity: 1000,
        idempotencyKey: fixedIdempotencyKey,
      });
      expect(first.success).toBe(true);

      // Attempt second submission with same idempotency key
      const second = await createSmmOrderAction(wsAlpha, {
        serviceId: '10',
        link: 'https://instagram.com/p/first',
        quantity: 1000,
        idempotencyKey: fixedIdempotencyKey,
      });

      // Returns existing order without second provider call
      expect(second.success).toBe(true);
      expect(second.order?.internal_order_id).toBe(first.order?.internal_order_id);
    });

    it('processes partial completion refund upon status sync', async () => {
      const store = getTestStore();
      const testOrder = {
        id: 'ord-partial-test',
        workspace_id: wsAlpha,
        user_id: 'user-admin',
        internal_order_id: 'NEX-SMM-PARTIAL',
        provider_order_id: '112233',
        service_id: '10',
        service_name: 'Instagram Likes',
        service_category: 'Instagram',
        link: 'https://instagram.com/p/test',
        quantity: 1000,
        runs: 1,
        interval_minutes: 0,
        wholesale_rate: 1.0,
        wholesale_cost: 1.0,
        retail_rate: 1.3,
        customer_charge: 1.3,
        currency: 'USD',
        submission_state: 'submitted' as const,
        status: 'in_progress' as const,
        start_count: 50,
        remains: 1000,
        provider_charge: null,
        idempotency_key: 'idem-partial',
        submission_attempts: 1,
        last_reconciliation_at: null,
        reconciliation_error: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store?.smmOrders.set(wsAlpha, [testOrder]);

      // Mock provider returning "Partial" with 400 remains (600 delivered)
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              charge: '0.60',
              start_count: '50',
              status: 'Partial',
              remains: '400',
              currency: 'USD',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );

      const syncRes = await syncOrderStatusAction(wsAlpha, 'ord-partial-test');
      expect(syncRes.success).toBe(true);
      expect(syncRes.status).toBe('partial');

      // 400 / 1000 * $1.30 = $0.52 refunded to wallet
      const txs = store?.transactions.get(wsAlpha) || [];
      const refundTx = txs.find((t) => t.type === 'refund');
      expect(refundTx).toBeDefined();
      expect(refundTx?.amount).toBe(0.52);
    });

    it('enforces refill and cancellation eligibility rules', async () => {
      const store = getTestStore();
      const pendingOrder = {
        id: 'ord-pending',
        workspace_id: wsAlpha,
        user_id: 'user-admin',
        internal_order_id: 'NEX-SMM-PENDING',
        provider_order_id: '556677',
        service_id: '10',
        service_name: 'Instagram Likes',
        service_category: 'Instagram',
        link: 'https://instagram.com/p/test',
        quantity: 1000,
        runs: 1,
        interval_minutes: 0,
        wholesale_rate: 1.0,
        wholesale_cost: 1.0,
        retail_rate: 1.3,
        customer_charge: 1.3,
        currency: 'USD',
        submission_state: 'submitted' as const,
        status: 'pending' as const,
        start_count: 0,
        remains: 1000,
        provider_charge: null,
        idempotency_key: 'idem-p',
        submission_attempts: 1,
        last_reconciliation_at: null,
        reconciliation_error: null,
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store?.smmOrders.set(wsAlpha, [pendingOrder]);

      // Refill on pending order is rejected
      const refillRes = await requestOrderRefillAction(wsAlpha, 'ord-pending');
      expect(refillRes.success).toBe(false);
      expect(refillRes.error).toContain('not eligible for refill');

      // Cancel on pending order is allowed
      vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify([{ order: 556677, cancel: 1 }]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const cancelRes = await requestOrderCancellationAction(wsAlpha, 'ord-pending');
      expect(cancelRes.success).toBe(true);
    });
  });

  // =========================================================================
  // 5. Admin Privileges & Multi-Tenant Access Security
  // =========================================================================
  describe('5. Administration Privileges & Tenant Isolation', () => {
    it('restricts connection testing and provider balance to admin or owner', async () => {
      setTestAuthSession(memberSession); // Regular member

      await expect(testSmmConnectionAction(wsAlpha, 'key')).rejects.toThrow(
        /Action requires admin or owner privileges/i
      );

      await expect(getSmmProviderBalanceAction(wsAlpha)).rejects.toThrow(
        /Action requires admin or owner privileges/i
      );
    });

    it('strictly isolates data between different workspaces', async () => {
      // Store has services for wsAlpha
      const store = getTestStore();
      store?.smmServices.set(wsAlpha, [
        {
          id: 'srv-alpha',
          workspace_id: wsAlpha,
          service_id: '99',
          name: 'Confidential Service Alpha',
          type: 'Default',
          category: 'Test',
          rate: 1.0,
          retail_rate: 1.5,
          min_quantity: 100,
          max_quantity: 1000,
          refill: false,
          cancel: false,
          dripfeed: false,
          is_enabled: true,
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      setTestAuthSession(foreignSession); // wsBeta session

      // Cannot access wsAlpha services
      await expect(getSmmServicesAction(wsAlpha)).rejects.toThrow(
        /User is not a member of the requested workspace/i
      );
    });

    it('encrypts API keys at rest and sanitizes client responses', async () => {
      const plaintext = 'live-smm-follows-api-key-xyz123';
      const encrypted = encryptSecret(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

      const decrypted = decryptSecret(encrypted);
      expect(decrypted).toBe(plaintext);

      const masked = maskSecret(plaintext);
      expect(masked).toContain('••••••••');
      expect(masked).not.toBe(plaintext);
    });
  });

  // =========================================================================
  // 7. Paymently Gateway Integration & BDT Wallet Deposits
  // =========================================================================
  describe('7. Paymently Gateway Integration & BDT Currency Conversions', () => {
    it('provides the correct default Paymently BDT checkout link and exchange rate', () => {
      expect(DEFAULT_PAYMENTLY_URL).toBe('https://vartualtutor.paymently.io/paymentlink/default/BDT');
      expect(DEFAULT_BDT_PER_USD).toBe(125);
    });

    it('accurately converts BDT to USD and USD to BDT using exchange rate', () => {
      const bdtAmount = 1250;
      const usdAmount = convertBdtToUsd(bdtAmount, 125);
      expect(usdAmount).toBe(10.0);

      const convertedBdt = convertUsdToBdt(10.0, 125);
      expect(convertedBdt).toBe(1250);

      // Edge cases
      expect(convertBdtToUsd(0)).toBe(0);
      expect(convertUsdToBdt(0)).toBe(0);
    });

    it('submits a Paymently deposit and credits workspace wallet balance', async () => {
      const store = getTestStore()!;
      store.wallets.set(wsAlpha, {
        id: `wallet-${wsAlpha}`,
        workspace_id: wsAlpha,
        balance: 5.0,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await submitPaymentlyDepositAction(wsAlpha, {
        amountUsd: 20.0,
        amountBdt: 2500,
        trxId: 'TRX-PAYMENTLY-9988',
        paymentMethod: 'bKash',
        notes: 'Paid via bKash 01700000000',
      });

      expect(res.success).toBe(true);
      expect(res.newBalance).toBe(25.0);

      const wallet = store.wallets.get(wsAlpha);
      expect(wallet?.balance).toBe(25.0);

      const txs = store.transactions.get(wsAlpha);
      expect(txs?.length).toBeGreaterThanOrEqual(1);
      const latestTx = txs![txs!.length - 1];
      expect(latestTx.type).toBe('deposit');
      expect(latestTx.amount).toBe(20.0);
      expect(latestTx.description).toContain('Paymently Deposit (৳2,500 BDT) via bKash');
      expect(latestTx.reference_id).toBe('TRX-PAYMENTLY-9988');
    });

    it('rejects Paymently deposits with missing TrxID or invalid amount', async () => {
      const resNoTrx = await submitPaymentlyDepositAction(wsAlpha, {
        amountUsd: 10.0,
        trxId: '',
      });
      expect(resNoTrx.success).toBe(false);
      expect(resNoTrx.error).toMatch(/Transaction ID.*is required/i);

      const resZeroAmount = await submitPaymentlyDepositAction(wsAlpha, {
        amountUsd: 0,
        trxId: 'TRX-1234',
      });
      expect(resZeroAmount.success).toBe(false);
      expect(resZeroAmount.error).toMatch(/greater than \$0\.00/i);
    });
  });
});
