import { ConditionOperator, ConditionRule } from '@/lib/types/automation-flow';
import { resolveFieldValue } from './expression-resolver';

/**
 * NexusFlow — Deterministic Condition Evaluator
 * Safely evaluates boolean rules without executing arbitrary JavaScript.
 */
export function evaluateCondition(
  actualValue: any,
  operator: ConditionOperator,
  targetValue?: any
): boolean {
  switch (operator) {
    case 'equals': {
      if (actualValue === null || actualValue === undefined) {
        return targetValue === null || targetValue === undefined || targetValue === '';
      }
      return String(actualValue).toLowerCase().trim() === String(targetValue ?? '').toLowerCase().trim();
    }

    case 'not_equals': {
      return !evaluateCondition(actualValue, 'equals', targetValue);
    }

    case 'contains': {
      if (actualValue === null || actualValue === undefined) return false;
      if (Array.isArray(actualValue)) {
        return actualValue.some((item) =>
          String(item).toLowerCase().includes(String(targetValue ?? '').toLowerCase().trim())
        );
      }
      return String(actualValue)
        .toLowerCase()
        .includes(String(targetValue ?? '').toLowerCase().trim());
    }

    case 'not_contains': {
      return !evaluateCondition(actualValue, 'contains', targetValue);
    }

    case 'is_empty': {
      if (actualValue === null || actualValue === undefined) return true;
      if (typeof actualValue === 'string') return actualValue.trim().length === 0;
      if (Array.isArray(actualValue)) return actualValue.length === 0;
      if (typeof actualValue === 'object') return Object.keys(actualValue).length === 0;
      return false;
    }

    case 'is_not_empty': {
      return !evaluateCondition(actualValue, 'is_empty');
    }

    case 'greater_than': {
      const numA = Number(actualValue);
      const numB = Number(targetValue);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA > numB;
      }
      return String(actualValue) > String(targetValue);
    }

    case 'less_than': {
      const numA = Number(actualValue);
      const numB = Number(targetValue);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA < numB;
      }
      return String(actualValue) < String(targetValue);
    }

    case 'date_after': {
      const dateA = new Date(actualValue).getTime();
      const dateB = new Date(targetValue).getTime();
      if (isNaN(dateA) || isNaN(dateB)) return false;
      return dateA > dateB;
    }

    case 'date_before': {
      const dateA = new Date(actualValue).getTime();
      const dateB = new Date(targetValue).getTime();
      if (isNaN(dateA) || isNaN(dateB)) return false;
      return dateA < dateB;
    }

    default:
      return false;
  }
}

/**
 * Evaluates an entire condition rule against the execution context.
 */
export function evaluateConditionRule(
  rule: ConditionRule,
  context: Record<string, any>
): boolean {
  const actualValue = resolveFieldValue(rule.field, context);
  const resolvedTargetValue = resolveFieldValue(rule.value, context);

  return evaluateCondition(actualValue, rule.operator, resolvedTargetValue);
}

export const evaluateRule = evaluateConditionRule;

/**
 * Evaluates a composite set of condition rules with AND / OR conjunction.
 */
export function evaluateConditions(
  rules: ConditionRule[],
  operator: 'AND' | 'OR' = 'AND',
  context: Record<string, any> = {}
): boolean {
  if (!rules || rules.length === 0) return true;
  if (operator === 'OR') {
    return rules.some((r) => evaluateConditionRule(r, context));
  }
  return rules.every((r) => evaluateConditionRule(r, context));
}

