export type Value = number | string | boolean | null;
export interface Feature {
  properties: Record<string, Value>;
}

// TODO 1 : un type récursif exact.
export type StyleExpression = unknown;

// TODO 2
export function evaluate(expr: StyleExpression, feature: Feature): Value {
  throw new Error('TODO: evaluate');
}

// TODO 3
export function propertiesUsed(expr: StyleExpression): string[] {
  throw new Error('TODO: propertiesUsed');
}
