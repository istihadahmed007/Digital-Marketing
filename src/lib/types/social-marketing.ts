// ====================================================================
// Type Definitions: SMMFollows Social Marketing Module & Wallet Ledger
// ====================================================================

export type SmmOrderStatus =
  | 'pending'
  | 'processing'
  | 'in_progress'
  | 'completed'
  | 'partial'
  | 'canceled'
  | 'rejected'
  | 'failed';

export type SmmSubmissionState =
  | 'pending_submission'
  | 'submitted'
  | 'unresolved_timeout'
  | 'failed';

export interface SmmProviderServiceRaw {
  service: string | number;
  name: string;
  type: string;
  category: string;
  rate: string | number;
  min: string | number;
  max: string | number;
  refill?: boolean | string | number;
  cancel?: boolean | string | number;
  dripfeed?: boolean | string | number;
  [key: string]: any;
}

export interface SmmService {
  id: string;
  workspace_id: string;
  service_id: string; // SMMFollows provider ID
  name: string;
  type: string;
  category: string;
  rate: number; // Wholesale provider rate per 1,000 units
  retail_rate: number; // Retail customer rate per 1,000 units
  min_quantity: number;
  max_quantity: number;
  refill: boolean;
  cancel: boolean;
  dripfeed: boolean;
  is_enabled: boolean;
  raw_metadata?: Record<string, any>;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface SmmOrder {
  id: string;
  workspace_id: string;
  user_id: string | null;
  internal_order_id: string;
  provider_order_id: string | null;
  service_id: string;
  service_name: string;
  service_category: string;
  link: string;
  quantity: number;
  runs: number;
  interval_minutes: number;
  wholesale_rate: number;
  wholesale_cost: number;
  retail_rate: number;
  customer_charge: number;
  currency: string;
  submission_state: SmmSubmissionState;
  status: SmmOrderStatus;
  start_count: number;
  remains: number;
  provider_charge?: number | null;
  idempotency_key: string;
  submission_attempts: number;
  last_reconciliation_at: string | null;
  reconciliation_error: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmmOrderStatusHistory {
  id: string;
  workspace_id: string;
  order_id: string;
  previous_status: string | null;
  new_status: string;
  start_count?: number | null;
  remains?: number | null;
  provider_raw_response?: Record<string, any>;
  created_at: string;
}

export interface SmmRefillRequest {
  id: string;
  workspace_id: string;
  order_id: string;
  provider_refill_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmmCancellationRequest {
  id: string;
  workspace_id: string;
  order_id: string;
  provider_cancel_result: string | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmmSettings {
  workspace_id: string;
  is_enabled: boolean;
  api_key?: string | null;
  api_key_is_set?: boolean;
  default_markup_percent: number;
  min_order_margin: number;
  currency: string;
  connection_status: 'disconnected' | 'connected' | 'error';
  last_connection_test_at: string | null;
  connection_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWallet {
  id: string;
  workspace_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type WalletTransactionType = 'deposit' | 'order_charge' | 'refund' | 'adjustment';
export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface WorkspaceWalletTransaction {
  id: string;
  workspace_id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  status: WalletTransactionStatus;
  description: string;
  reference_id: string | null;
  metadata?: Record<string, any>;
  created_by: string | null;
  created_at: string;
}

export interface SmmProviderBalanceResponse {
  balance: string;
  currency: string;
}

export interface SmmProviderAddResponse {
  order: number | string;
  error?: string;
}

export interface SmmProviderStatusResponse {
  charge?: string | number;
  start_count?: string | number;
  status?: string;
  remains?: string | number;
  currency?: string;
  error?: string;
}

export interface SmmProviderRefillResponse {
  refill: number | string;
  error?: string;
}

export interface SmmProviderRefillStatusResponse {
  status: string;
  error?: string;
}

export interface SmmProviderCancelResponse {
  order?: number | string;
  cancel?: number | string | { [orderId: string]: any };
  error?: string;
}
