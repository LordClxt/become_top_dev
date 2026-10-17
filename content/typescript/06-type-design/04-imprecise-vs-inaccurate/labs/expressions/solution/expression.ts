export type Expression = number | string | CallExpression;
export type CallExpression = MathCall | MinusCall | CaseCall | RGBCall;
export type MathCall = ['+' | '*' | '/' | '>' | '<', Expression, Expression];
/** Mapbox accepte le moins unaire : le type doit l'accepter aussi pour rester exact. */
export type MinusCall = ['-', Expression] | ['-', Expression, Expression];
/** case, des paires (condition, valeur), puis une valeur par défaut : une longueur paire. */
export interface CaseCall {
  0: 'case';
  [n: number]: Expression;
  length: 4 | 6 | 8 | 10;
}
export type RGBCall = ['rgb', Expression, Expression, Expression];

function num(expr: Expression): number {
  const value = evaluate(expr);
  if (typeof value !== 'number') throw new TypeError('nombre attendu');
  return value;
}

export function evaluate(expr: Expression): number | string | boolean {
  if (typeof expr === 'number' || typeof expr === 'string') return expr;
  switch (expr[0]) {
    case 'case': {
      const call: CaseCall = expr;
      for (let i = 1; i < call.length - 1; i += 2) {
        if (evaluate(call[i]!) === true) return evaluate(call[i + 1]!);
      }
      return evaluate(call[call.length - 1]!);
    }
    case 'rgb': {
      const [, r, g, b] = expr;
      return `rgb(${num(r)}, ${num(g)}, ${num(b)})`;
    }
    case '-': {
      const [, a, b] = expr;
      return b === undefined ? -num(a) : num(a) - num(b);
    }
    default: {
      const [op, a, b] = expr;
      switch (op) {
        case '+': return num(a) + num(b);
        case '*': return num(a) * num(b);
        case '/': return num(a) / num(b);
        case '>': return num(a) > num(b);
        case '<': return num(a) < num(b);
      }
    }
  }
}
