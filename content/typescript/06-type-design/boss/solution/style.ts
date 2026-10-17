export type Value = number | string | boolean | null;
export interface Feature {
  properties: Record<string, Value>;
}

export type StyleExpression = number | string | boolean | CallExpression;
export type CallExpression = GetCall | MathCall | MinusCall | CompareCall | CaseCall | MatchCall | CoalesceCall;
export type GetCall = ['get', string];
export type MathCall = ['+' | '*' | '/', StyleExpression, StyleExpression];
/** Moins unaire ou binaire : les deux sont valides, le type accepte les deux. */
export type MinusCall = ['-', StyleExpression] | ['-', StyleExpression, StyleExpression];
export type CompareCall = ['==' | '!=' | '>' | '<' | '>=' | '<=', StyleExpression, StyleExpression];
/** case, paires (condition, valeur), défaut. */
export interface CaseCall {
  0: 'case';
  [n: number]: StyleExpression;
  length: 4 | 6 | 8 | 10;
}
/** match, entrée, paires (étiquette, valeur), défaut. */
export interface MatchCall {
  0: 'match';
  [n: number]: StyleExpression;
  length: 5 | 7 | 9 | 11;
}
export type CoalesceCall = ['coalesce', StyleExpression, ...StyleExpression[]];

function num(expr: StyleExpression, feature: Feature): number {
  const value = evaluate(expr, feature);
  if (typeof value !== 'number') throw new TypeError('nombre attendu');
  return value;
}

export function evaluate(expr: StyleExpression, feature: Feature): Value {
  if (typeof expr !== 'object') return expr;
  switch (expr[0]) {
    case 'get': return feature.properties[expr[1]] ?? null;
    case 'case': {
      const call: CaseCall = expr;
      for (let i = 1; i < call.length - 1; i += 2) {
        if (evaluate(call[i]!, feature) === true) return evaluate(call[i + 1]!, feature);
      }
      return evaluate(call[call.length - 1]!, feature);
    }
    case 'match': {
      const call: MatchCall = expr;
      const input = evaluate(call[1]!, feature);
      for (let i = 2; i < call.length - 1; i += 2) {
        if (call[i] === input) return evaluate(call[i + 1]!, feature);
      }
      return evaluate(call[call.length - 1]!, feature);
    }
    case 'coalesce': {
      const [, ...options] = expr;
      for (const option of options) {
        const value = evaluate(option, feature);
        if (value !== null) return value;
      }
      return null;
    }
    case '-': {
      const [, a, b] = expr;
      return b === undefined ? -num(a, feature) : num(a, feature) - num(b, feature);
    }
    case '==': return evaluate(expr[1], feature) === evaluate(expr[2], feature);
    case '!=': return evaluate(expr[1], feature) !== evaluate(expr[2], feature);
    default: {
      const [op, a, b] = expr;
      const x = num(a, feature);
      const y = num(b, feature);
      switch (op) {
        case '+': return x + y;
        case '*': return x * y;
        case '/': return x / y;
        case '>': return x > y;
        case '<': return x < y;
        case '>=': return x >= y;
        case '<=': return x <= y;
      }
    }
  }
}

export function propertiesUsed(expr: StyleExpression): string[] {
  const names = new Set<string>();
  const visit = (e: StyleExpression): void => {
    if (typeof e !== 'object') return;
    if (e[0] === 'get') {
      names.add(e[1]);
      return;
    }
    const call: { length: number; [n: number]: StyleExpression | undefined } = e;
    for (let i = 1; i < call.length; i++) {
      const child = call[i];
      if (child !== undefined) visit(child);
    }
  };
  visit(expr);
  return [...names];
}
