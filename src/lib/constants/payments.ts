/**
 * Configuration and helpers for Paymently and workspace payment processing.
 */

export const DEFAULT_PAYMENTLY_URL =
  process.env.NEXT_PUBLIC_PAYMENTLY_URL ||
  'https://vartualtutor.paymently.io/paymentlink/default/BDT';

/**
 * Standard reference exchange rate for BDT to USD conversions.
 * Configurable via NEXT_PUBLIC_BDT_PER_USD (default: 125 BDT = 1 USD).
 */
export const DEFAULT_BDT_PER_USD = Number(process.env.NEXT_PUBLIC_BDT_PER_USD) || 125;

export function convertBdtToUsd(bdtAmount: number, rate: number = DEFAULT_BDT_PER_USD): number {
  if (!bdtAmount || bdtAmount <= 0) return 0;
  return Math.round((bdtAmount / rate) * 100) / 100;
}

export function convertUsdToBdt(usdAmount: number, rate: number = DEFAULT_BDT_PER_USD): number {
  if (!usdAmount || usdAmount <= 0) return 0;
  return Math.round(usdAmount * rate);
}
