/**
 * NexusFlow — Safe Data Mapping Expression Resolver
 * Resolves template strings like `{{trigger.contact.email}}` against execution context
 * WITHOUT arbitrary code execution (no eval, no Function).
 */

const EXPRESSION_REGEX = /\{\{\s*([a-zA-Z0-9_.[\]]+)(?:\s*\|\|\s*['"]?([^'"}]+)['"]?)?\s*\}\}/g;

/**
 * Safely resolves nested property path on an object.
 * e.g. getNestedValue({ contact: { email: 'test@example.com' } }, 'contact.email')
 */
export function getNestedValue(obj: any, path: string): any {
  if (obj === null || obj === undefined || !path) return undefined;

  // Split by dot or bracket notation e.g. 'items[0].name' -> ['items', '0', 'name']
  const cleanPath = path.replace(/\[(\w+)\]/g, '.$1');
  const parts = cleanPath.split('.').filter(Boolean);

  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    // Disallow prototype pollution / dangerous properties
    if (part === '__proto__' || part === 'prototype' || part === 'constructor') {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Resolves template string containing `{{path}}` expressions.
 */
export function resolveExpressions(
  template: string | null | undefined,
  context: Record<string, any>
): string {
  if (!template) return '';
  if (typeof template !== 'string') return String(template);

  return template.replace(EXPRESSION_REGEX, (match, path, fallback) => {
    const val = getNestedValue(context, path.trim());

    if (val !== undefined && val !== null) {
      if (typeof val === 'object') {
        return JSON.stringify(val);
      }
      return String(val);
    }

    if (fallback !== undefined) {
      return fallback.trim();
    }

    return match;
  });
}

/**
 * Resolves an individual field value which could be a raw value or template.
 */
export function resolveFieldValue(
  value: any,
  context: Record<string, any>
): any {
  if (typeof value === 'string') {
    // If the entire string is exactly `{{path}}`, return the raw typed value (e.g. number, boolean, array)
    const exactMatch = value.trim().match(/^\{\{\s*([a-zA-Z0-9_.[\]]+)\s*\}\}$/);
    if (exactMatch) {
      const resolved = getNestedValue(context, exactMatch[1]);
      if (resolved !== undefined) return resolved;
    }
    return resolveExpressions(value, context);
  }
  return value;
}

export interface AvailableToken {
  token: string;
  category: string;
  label: string;
  sampleValue?: any;
}

/**
 * Flattens a sample context object into a list of selectable tokens for visual field picker.
 */
export function extractAvailableTokens(
  context: Record<string, any>,
  prefix = '',
  category = 'Trigger'
): AvailableToken[] {
  const tokens: AvailableToken[] = [];

  if (!context || typeof context !== 'object') return tokens;

  for (const [key, val] of Object.entries(context)) {
    // Avoid internal metadata
    if (key.startsWith('_')) continue;

    const fullPath = prefix ? `${prefix}.${key}` : key;
    const token = `{{${fullPath}}}`;

    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      // Recurse into nested objects up to 3 levels
      if (fullPath.split('.').length < 4) {
        tokens.push(...extractAvailableTokens(val, fullPath, category));
      }
    } else {
      tokens.push({
        token,
        category,
        label: fullPath,
        sampleValue: Array.isArray(val) ? `[${val.length} items]` : val,
      });
    }
  }

  return tokens;
}

/**
 * Extracts all `path` tokens from a template string (e.g. `{{trigger.contact.email}}` -> `trigger.contact.email`).
 */
export function extractExpressions(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches: string[] = [];
  const regex = /\{\{\s*([a-zA-Z0-9_.[\]]+)(?:\s*\|\|\s*['"]?[^'"}]+['"]?)?\s*\}\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) matches.push(match[1]);
  }
  return matches;
}

