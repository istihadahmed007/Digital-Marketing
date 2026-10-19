// ====================================================================
// SMMFollows API v2 Server-Side Provider Adapter
// High-resilience, typed client with timeout disambiguation,
// rate limit handling, and credential redaction.
// ====================================================================

import {
  SmmProviderBalanceResponse,
  SmmProviderAddResponse,
  SmmProviderStatusResponse,
  SmmProviderRefillResponse,
  SmmProviderRefillStatusResponse,
  SmmProviderServiceRaw,
} from '@/lib/types/social-marketing';

const DEFAULT_SMMFOLLOWS_ENDPOINT = 'https://smmfollows.com/api/v2';
const DEFAULT_TIMEOUT_MS = 15000;

export interface SmmFollowsConfig {
  apiKey?: string;
  endpointUrl?: string;
  timeoutMs?: number;
}

export class SmmTimeoutError extends Error {
  isTimeout: boolean = true;
  constructor(message: string) {
    super(message);
    this.name = 'SmmTimeoutError';
  }
}

export class SmmProviderError extends Error {
  statusCode?: number;
  providerErrorCode?: string;
  constructor(message: string, statusCode?: number, providerErrorCode?: string) {
    super(message);
    this.name = 'SmmProviderError';
    this.statusCode = statusCode;
    this.providerErrorCode = providerErrorCode;
  }
}

export class SmmFollowsClient {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(config?: SmmFollowsConfig) {
    // Strictly server-side
    if (typeof window !== 'undefined') {
      throw new Error('SmmFollowsClient cannot be initialized in browser environments.');
    }

    this.apiKey = (config?.apiKey || process.env.SMMFOLLOWS_API_KEY || '').trim();
    this.endpoint = config?.endpointUrl || DEFAULT_SMMFOLLOWS_ENDPOINT;
    this.timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5 && !this.apiKey.includes('your-api-key'));
  }

  public getSetupInstructions(): string {
    return 'SMMFollows integration is not configured. Provide an API key via environment variable SMMFOLLOWS_API_KEY or save it in Social Marketing Settings.';
  }

  /**
   * Sanitizes any error message by stripping the API key if it inadvertently appeared.
   */
  private redact(message: string): string {
    if (!this.apiKey) return message;
    return message.split(this.apiKey).join('••••••••');
  }

  /**
   * Low-level dispatcher to POST https://smmfollows.com/api/v2 with application/x-www-form-urlencoded
   */
  private async postForm<T = any>(params: Record<string, string | number | boolean | undefined>): Promise<T> {
    if (!this.isConfigured()) {
      throw new SmmProviderError(this.getSetupInstructions(), 401);
    }

    const bodyParams = new URLSearchParams();
    bodyParams.append('key', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        bodyParams.append(key, String(value));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'NexusMark-SMMFollows-Client/1.0',
          'Accept': 'application/json',
        },
        body: bodyParams.toString(),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('timeout') || err.code === 'ETIMEDOUT') {
        throw new SmmTimeoutError(
          `Request to SMMFollows timed out after ${this.timeoutMs}ms. The operation status is ambiguous.`
        );
      }
      throw new SmmProviderError(`Network error communicating with SMMFollows: ${this.redact(err.message)}`);
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429) {
      throw new SmmProviderError('SMMFollows rate limit reached (HTTP 429). Please slow down requests.', 429);
    }

    const responseText = await res.text();
    let data: any;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new SmmProviderError(
        `Invalid response received from SMMFollows (HTTP ${res.status}): ${this.redact(responseText.slice(0, 150))}`,
        res.status
      );
    }

    // Provider-level error in JSON: { "error": "Incorrect request" }
    if (data && typeof data === 'object' && data.error) {
      throw new SmmProviderError(
        `SMMFollows rejected request: ${this.redact(String(data.error))}`,
        res.status,
        String(data.error)
      );
    }

    if (!res.ok) {
      throw new SmmProviderError(
        `SMMFollows responded with HTTP ${res.status}: ${this.redact(responseText.slice(0, 150))}`,
        res.status
      );
    }

    return data as T;
  }

  // ==========================================
  // 1. Services Catalog
  // ==========================================
  public async getServices(): Promise<SmmProviderServiceRaw[]> {
    const data = await this.postForm<SmmProviderServiceRaw[]>({
      action: 'services',
    });

    if (!Array.isArray(data)) {
      throw new SmmProviderError('Unexpected services format from SMMFollows: expected an array.');
    }

    return data;
  }

  // ==========================================
  // 2. Provider Account Balance
  // ==========================================
  public async getBalance(): Promise<SmmProviderBalanceResponse> {
    const data = await this.postForm<SmmProviderBalanceResponse>({
      action: 'balance',
    });

    if (!data || data.balance === undefined) {
      throw new SmmProviderError('Malformed balance response received from SMMFollows.');
    }

    return {
      balance: String(data.balance),
      currency: data.currency || 'USD',
    };
  }

  // ==========================================
  // 3. Create Order
  // ==========================================
  public async addOrder(params: {
    service: string | number;
    link: string;
    quantity: number;
    runs?: number;
    interval?: number;
    comments?: string;
  }): Promise<SmmProviderAddResponse> {
    const postData: Record<string, any> = {
      action: 'add',
      service: params.service,
      link: params.link,
      quantity: params.quantity,
    };

    if (params.runs && params.runs > 1) {
      postData.runs = params.runs;
    }
    if (params.interval && params.interval > 0) {
      postData.interval = params.interval;
    }
    if (params.comments) {
      postData.comments = params.comments;
    }

    const data = await this.postForm<SmmProviderAddResponse>(postData);

    if (!data || !data.order) {
      throw new SmmProviderError(
        data?.error ? `SMMFollows error: ${data.error}` : 'Order creation response missing order ID.'
      );
    }

    return data;
  }

  // ==========================================
  // 4. Single Order Status
  // ==========================================
  public async getOrderStatus(orderId: string | number): Promise<SmmProviderStatusResponse> {
    const data = await this.postForm<SmmProviderStatusResponse>({
      action: 'status',
      order: orderId,
    });

    if (!data) {
      throw new SmmProviderError(`Empty status response for order ID ${orderId}`);
    }

    return data;
  }

  // ==========================================
  // 5. Batch Order Status (Up to 100 IDs)
  // ==========================================
  public async getMultiOrderStatus(
    orderIds: Array<string | number>
  ): Promise<Record<string, SmmProviderStatusResponse>> {
    if (!orderIds || orderIds.length === 0) {
      return {};
    }

    if (orderIds.length > 100) {
      throw new SmmProviderError('Maximum of 100 order IDs allowed per batch status check.');
    }

    const joinedOrders = orderIds.map((id) => String(id).trim()).filter(Boolean).join(',');

    const data = await this.postForm<Record<string, SmmProviderStatusResponse>>({
      action: 'status',
      orders: joinedOrders,
    });

    if (!data || typeof data !== 'object') {
      throw new SmmProviderError('Malformed multi-status response received from SMMFollows.');
    }

    return data;
  }

  // ==========================================
  // 6. Refill Requests
  // ==========================================
  public async requestRefill(orderId: string | number): Promise<SmmProviderRefillResponse> {
    const data = await this.postForm<SmmProviderRefillResponse>({
      action: 'refill',
      order: orderId,
    });

    if (!data || (!data.refill && !data.error)) {
      throw new SmmProviderError(`Invalid refill response for order ID ${orderId}`);
    }

    return data;
  }

  public async requestMultiRefill(
    orderIds: Array<string | number>
  ): Promise<Array<{ order: string | number; refill?: string | number; error?: string }>> {
    if (orderIds.length > 100) {
      throw new SmmProviderError('Maximum 100 orders allowed per batch refill request.');
    }

    const joined = orderIds.map(String).join(',');
    const data = await this.postForm<any>({
      action: 'refill',
      orders: joined,
    });

    if (Array.isArray(data)) {
      return data;
    }
    return [{ order: orderIds[0], refill: data?.refill, error: data?.error }];
  }

  public async getRefillStatus(refillId: string | number): Promise<SmmProviderRefillStatusResponse> {
    const data = await this.postForm<SmmProviderRefillStatusResponse>({
      action: 'refill_status',
      refill: refillId,
    });

    return data;
  }

  public async getMultiRefillStatus(
    refillIds: Array<string | number>
  ): Promise<Array<{ refill: string | number; status?: string; error?: string }>> {
    if (refillIds.length > 100) {
      throw new SmmProviderError('Maximum 100 refill IDs allowed per batch status check.');
    }

    const joined = refillIds.map(String).join(',');
    const data = await this.postForm<any>({
      action: 'refill_status',
      refills: joined,
    });

    if (Array.isArray(data)) {
      return data;
    }
    return [{ refill: refillIds[0], status: data?.status, error: data?.error }];
  }

  // ==========================================
  // 7. Cancellation Requests (Up to 100 IDs)
  // ==========================================
  public async cancelOrders(
    orderIds: Array<string | number>
  ): Promise<Array<{ order: string | number; cancel?: string | number; error?: string }>> {
    if (!orderIds || orderIds.length === 0) {
      return [];
    }

    if (orderIds.length > 100) {
      throw new SmmProviderError('Maximum 100 orders allowed per batch cancellation request.');
    }

    const joined = orderIds.map(String).join(',');
    const data = await this.postForm<any>({
      action: 'cancel',
      orders: joined,
    });

    if (Array.isArray(data)) {
      return data;
    }
    return [{ order: orderIds[0], cancel: data?.cancel, error: data?.error }];
  }
}
