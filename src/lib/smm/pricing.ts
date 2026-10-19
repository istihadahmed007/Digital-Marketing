// ====================================================================
// SMMFollows Pricing, Markup, and URL Normalization Engine
// ====================================================================

export interface PriceCalculationResult {
  quantity: number;
  wholesaleRate: number; // Provider rate per 1,000 units
  wholesaleCost: number; // Actual wholesale provider cost
  retailRate: number; // Retail rate per 1,000 units
  customerCharge: number; // Final customer charge deducted
  markupPercent: number;
  marginAmount: number;
  currency: string;
}

/**
 * Standard SMMFollows pricing calculates costs per 1,000 units.
 * For example: $1.20 per 1,000 units => 500 units = $0.60.
 */
export function calculateSmmPrice(options: {
  quantity: number;
  wholesaleRate: number;
  markupPercent?: number;
  customRetailRate?: number | null;
  minMargin?: number;
  currency?: string;
}): PriceCalculationResult {
  const {
    quantity,
    wholesaleRate,
    markupPercent = 30, // Default 30% margin
    customRetailRate,
    minMargin = 0.05,
    currency = 'USD',
  } = options;

  if (quantity <= 0) {
    throw new Error('Order quantity must be greater than zero.');
  }

  if (wholesaleRate < 0) {
    throw new Error('Wholesale rate cannot be negative.');
  }

  // Provider rate is per 1,000 units
  const wholesaleCost = Math.round(((quantity / 1000) * wholesaleRate) * 10000) / 10000;

  let retailRate: number;
  if (customRetailRate && customRetailRate > wholesaleRate) {
    retailRate = customRetailRate;
  } else {
    retailRate = Math.round((wholesaleRate * (1 + markupPercent / 100)) * 10000) / 10000;
  }

  let calculatedRetailCharge = Math.round(((quantity / 1000) * retailRate) * 10000) / 10000;

  // Enforce minimum margin guarantee
  if (calculatedRetailCharge - wholesaleCost < minMargin) {
    calculatedRetailCharge = Math.round((wholesaleCost + minMargin) * 10000) / 10000;
    retailRate = Math.round(((calculatedRetailCharge * 1000) / quantity) * 10000) / 10000;
  }

  const marginAmount = Math.round((calculatedRetailCharge - wholesaleCost) * 10000) / 10000;
  const effectiveMarkup = wholesaleCost > 0 ? Math.round(((marginAmount / wholesaleCost) * 100) * 100) / 100 : 0;

  return {
    quantity,
    wholesaleRate,
    wholesaleCost,
    retailRate,
    customerCharge: calculatedRetailCharge,
    markupPercent: effectiveMarkup,
    marginAmount,
    currency,
  };
}

/**
 * Calculates pro-rated refund amount for partially delivered orders.
 * Example: Ordered 1,000 for $10. 200 remain unfulfilled -> Refund = $2.00
 */
export function calculatePartialRefund(
  quantity: number,
  remains: number,
  customerCharge: number
): number {
  if (quantity <= 0 || remains <= 0 || customerCharge <= 0) {
    return 0;
  }

  const unfulfilledQuantity = Math.min(quantity, Math.max(0, remains));
  const refund = (unfulfilledQuantity / quantity) * customerCharge;
  return Math.round(refund * 10000) / 10000;
}

/**
 * Validates quantity against service min and max constraints.
 */
export function validateServiceQuantity(
  quantity: number,
  minQuantity: number,
  maxQuantity: number
): { valid: boolean; error?: string } {
  if (typeof quantity !== 'number' || isNaN(quantity) || !Number.isInteger(quantity)) {
    return { valid: false, error: 'Quantity must be an integer.' };
  }

  if (quantity < minQuantity) {
    return {
      valid: false,
      error: `Quantity ${quantity.toLocaleString()} is below the minimum allowed quantity of ${minQuantity.toLocaleString()}.`,
    };
  }

  if (quantity > maxQuantity) {
    return {
      valid: false,
      error: `Quantity ${quantity.toLocaleString()} exceeds the maximum allowed quantity of ${maxQuantity.toLocaleString()}.`,
    };
  }

  return { valid: true };
}

/**
 * Validates and normalizes target links/handles before dispatching to provider.
 */
export function normalizeTargetUrl(input: string): { valid: boolean; normalized?: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Target link or account handle cannot be empty.' };
  }

  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Target link is too short.' };
  }

  // If input starts with @ (social handle like @nexusmark), keep or standardize
  if (trimmed.startsWith('@')) {
    const handle = trimmed.slice(1);
    if (!/^[a-zA-Z0-9._-]+$/.test(handle)) {
      return { valid: false, error: 'Invalid social handle characters.' };
    }
    return { valid: true, normalized: `@${handle}` };
  }

  // If input is an absolute URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      if (!url.hostname || !url.hostname.includes('.')) {
        return { valid: false, error: 'Invalid link domain name.' };
      }
      return { valid: true, normalized: url.href };
    } catch {
      return { valid: false, error: 'Invalid URL syntax.' };
    }
  }

  // If input looks like domain/path (e.g., instagram.com/brand or youtube.com/watch?v=...)
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    try {
      const url = new URL(`https://${trimmed}`);
      return { valid: true, normalized: url.href };
    } catch {
      return { valid: false, error: 'Invalid URL structure.' };
    }
  }

  // Handle username without @
  if (/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return { valid: true, normalized: trimmed };
  }

  return { valid: false, error: 'Please enter a valid social profile URL, post link, or username.' };
}
