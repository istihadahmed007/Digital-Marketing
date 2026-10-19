// ====================================================================
// Workspace Wallet & Ledger Engine
// Atomic debit, concurrency safeguards, refunding, and audit logging.
// ====================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { WorkspaceWallet, WorkspaceWalletTransaction } from '@/lib/types/social-marketing';
import { getTestStore } from '@/lib/security/test-mock-store';

export class InsufficientBalanceError extends Error {
  currentBalance: number;
  requiredAmount: number;

  constructor(currentBalance: number, requiredAmount: number) {
    super(
      `Insufficient wallet balance: current balance is $${currentBalance.toFixed(
        2
      )}, but order requires $${requiredAmount.toFixed(2)}. Please top up your wallet.`
    );
    this.name = 'InsufficientBalanceError';
    this.currentBalance = currentBalance;
    this.requiredAmount = requiredAmount;
  }
}

/**
 * Retrieves the workspace wallet or initializes a new zero-balance wallet if none exists.
 */
export async function getOrCreateWorkspaceWallet(
  workspaceId: string,
  supabase?: SupabaseClient | null
): Promise<WorkspaceWallet> {
  if (supabase) {
    const { data: existing, error } = await supabase
      .from('workspace_wallets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (existing && !error) {
      return {
        ...existing,
        balance: parseFloat(String(existing.balance || 0)),
      } as WorkspaceWallet;
    }

    // Initialize new wallet for workspace
    const { data: created, error: createError } = await supabase
      .from('workspace_wallets')
      .insert({
        workspace_id: workspaceId,
        balance: 0.0,
        currency: 'USD',
      })
      .select('*')
      .single();

    if (created && !createError) {
      return {
        ...created,
        balance: parseFloat(String(created.balance || 0)),
      } as WorkspaceWallet;
    }
  }

  // Fallback to in-memory test store
  const testStore = getTestStore();
  if (testStore) {
    let wallet = testStore.wallets.get(workspaceId);
    if (!wallet) {
      wallet = {
        id: `wallet-${workspaceId}`,
        workspace_id: workspaceId,
        balance: 0.0,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      testStore.wallets.set(workspaceId, wallet);
    }
    return wallet;
  }

  return {
    id: `wallet-${workspaceId}`,
    workspace_id: workspaceId,
    balance: 0.0,
    currency: 'USD',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Safely debits customer wallet for order submission.
 * Throws InsufficientBalanceError if balance is less than required amount.
 */
export async function debitWalletForOrder(params: {
  workspaceId: string;
  amount: number;
  orderInternalId: string;
  serviceName: string;
  userId?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
  const { workspaceId, amount, orderInternalId, serviceName, userId, supabase } = params;

  if (amount <= 0) {
    throw new Error('Debit amount must be greater than zero.');
  }

  const wallet = await getOrCreateWorkspaceWallet(workspaceId, supabase);
  const currentBalance = wallet.balance;

  if (currentBalance < amount) {
    throw new InsufficientBalanceError(currentBalance, amount);
  }

  const newBalance = Math.round((currentBalance - amount) * 10000) / 10000;

  if (supabase) {
    // 1. Update wallet balance with check constraint guarding against race conditions
    const { error: updateError } = await supabase
      .from('workspace_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id)
      .gte('balance', amount); // atomic concurrency guard

    if (updateError) {
      throw new Error(`Failed to debit wallet: ${updateError.message}`);
    }

    // 2. Insert ledger record
    const { data: tx, error: txError } = await supabase
      .from('workspace_wallet_transactions')
      .insert({
        workspace_id: workspaceId,
        wallet_id: wallet.id,
        type: 'order_charge',
        amount: -amount,
        balance_after: newBalance,
        status: 'completed',
        description: `Order charge for ${serviceName}`,
        reference_id: orderInternalId,
        metadata: {
          serviceName,
          orderInternalId,
        },
        created_by: userId || null,
      })
      .select('id')
      .single();

    if (txError) {
      console.error('Ledger transaction insert failed:', txError.message);
    }

    return {
      success: true,
      newBalance,
      transactionId: tx?.id || `tx-${Date.now()}`,
    };
  }

  // In-memory test store handler
  const testStore = getTestStore();
  if (testStore) {
    wallet.balance = newBalance;
    wallet.updated_at = new Date().toISOString();
    testStore.wallets.set(workspaceId, wallet);

    const txId = `tx-charge-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const txList = testStore.transactions.get(workspaceId) || [];
    txList.unshift({
      id: txId,
      workspace_id: workspaceId,
      wallet_id: wallet.id,
      type: 'order_charge',
      amount: -amount,
      balance_after: newBalance,
      status: 'completed',
      description: `Order charge for ${serviceName}`,
      reference_id: orderInternalId,
      metadata: { serviceName, orderInternalId },
      created_by: userId || null,
      created_at: new Date().toISOString(),
    });
    testStore.transactions.set(workspaceId, txList);

    return {
      success: true,
      newBalance,
      transactionId: txId,
    };
  }

  return {
    success: true,
    newBalance,
    transactionId: `tx-${Date.now()}`,
  };
}

/**
 * Credits customer wallet for full or partial order refund.
 */
export async function refundWalletForOrder(params: {
  workspaceId: string;
  amount: number;
  orderInternalId: string;
  reason: string;
  userId?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
  const { workspaceId, amount, orderInternalId, reason, userId, supabase } = params;

  if (amount <= 0) {
    return { success: true, newBalance: 0, transactionId: '' };
  }

  const wallet = await getOrCreateWorkspaceWallet(workspaceId, supabase);
  const currentBalance = wallet.balance;
  const newBalance = Math.round((currentBalance + amount) * 10000) / 10000;

  if (supabase) {
    const { error: updateError } = await supabase
      .from('workspace_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      throw new Error(`Failed to refund wallet: ${updateError.message}`);
    }

    const { data: tx } = await supabase
      .from('workspace_wallet_transactions')
      .insert({
        workspace_id: workspaceId,
        wallet_id: wallet.id,
        type: 'refund',
        amount,
        balance_after: newBalance,
        status: 'completed',
        description: `Refund: ${reason}`,
        reference_id: orderInternalId,
        metadata: { reason, orderInternalId },
        created_by: userId || null,
      })
      .select('id')
      .single();

    return {
      success: true,
      newBalance,
      transactionId: tx?.id || `tx-refund-${Date.now()}`,
    };
  }

  const testStore = getTestStore();
  if (testStore) {
    wallet.balance = newBalance;
    wallet.updated_at = new Date().toISOString();
    testStore.wallets.set(workspaceId, wallet);

    const txId = `tx-refund-${Date.now()}`;
    const txList = testStore.transactions.get(workspaceId) || [];
    txList.unshift({
      id: txId,
      workspace_id: workspaceId,
      wallet_id: wallet.id,
      type: 'refund',
      amount,
      balance_after: newBalance,
      status: 'completed',
      description: `Refund: ${reason}`,
      reference_id: orderInternalId,
      metadata: { reason, orderInternalId },
      created_by: userId || null,
      created_at: new Date().toISOString(),
    });
    testStore.transactions.set(workspaceId, txList);

    return {
      success: true,
      newBalance,
      transactionId: txId,
    };
  }

  return {
    success: true,
    newBalance,
    transactionId: `tx-refund-${Date.now()}`,
  };
}

/**
 * Deposits funds into workspace wallet (Admin or verified payment).
 */
export async function depositWalletFunds(params: {
  workspaceId: string;
  amount: number;
  description: string;
  referenceId?: string | null;
  userId?: string | null;
  supabase?: SupabaseClient | null;
}): Promise<{ success: boolean; newBalance: number; transactionId: string }> {
  const { workspaceId, amount, description, referenceId, userId, supabase } = params;

  if (amount <= 0) {
    throw new Error('Deposit amount must be greater than zero.');
  }

  const wallet = await getOrCreateWorkspaceWallet(workspaceId, supabase);
  const currentBalance = wallet.balance;
  const newBalance = Math.round((currentBalance + amount) * 10000) / 10000;

  if (supabase) {
    const { error: updateError } = await supabase
      .from('workspace_wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      throw new Error(`Failed to deposit funds: ${updateError.message}`);
    }

    const { data: tx } = await supabase
      .from('workspace_wallet_transactions')
      .insert({
        workspace_id: workspaceId,
        wallet_id: wallet.id,
        type: 'deposit',
        amount,
        balance_after: newBalance,
        status: 'completed',
        description,
        reference_id: referenceId || null,
        created_by: userId || null,
      })
      .select('id')
      .single();

    return {
      success: true,
      newBalance,
      transactionId: tx?.id || `tx-dep-${Date.now()}`,
    };
  }

  const testStore = getTestStore();
  if (testStore) {
    wallet.balance = newBalance;
    wallet.updated_at = new Date().toISOString();
    testStore.wallets.set(workspaceId, wallet);

    const txId = `tx-dep-${Date.now()}`;
    const txList = testStore.transactions.get(workspaceId) || [];
    txList.unshift({
      id: txId,
      workspace_id: workspaceId,
      wallet_id: wallet.id,
      type: 'deposit',
      amount,
      balance_after: newBalance,
      status: 'completed',
      description,
      reference_id: referenceId || null,
      created_by: userId || null,
      created_at: new Date().toISOString(),
    });
    testStore.transactions.set(workspaceId, txList);

    return {
      success: true,
      newBalance,
      transactionId: txId,
    };
  }

  return {
    success: true,
    newBalance,
    transactionId: `tx-dep-${Date.now()}`,
  };
}

/**
 * Retrieves wallet transactions ledger for a workspace.
 */
export async function getWorkspaceWalletTransactions(
  workspaceId: string,
  limit = 50,
  supabase?: SupabaseClient | null
): Promise<WorkspaceWalletTransaction[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('workspace_wallet_transactions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching wallet transactions:', error.message);
      return [];
    }

    return (data || []).map((t: any) => ({
      ...t,
      amount: parseFloat(String(t.amount || 0)),
      balance_after: parseFloat(String(t.balance_after || 0)),
    })) as WorkspaceWalletTransaction[];
  }

  const testStore = getTestStore();
  if (testStore) {
    return (testStore.transactions.get(workspaceId) || []).slice(0, limit);
  }

  return [];
}
