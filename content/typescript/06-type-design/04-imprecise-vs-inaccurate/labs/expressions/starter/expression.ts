// TODO 1 : un type récursif exact (MathCall, MinusCall unaire ou binaire, CaseCall, RGBCall).
export type Expression = any;

// TODO 2 : l'évaluateur.
export function evaluate(expr: Expression): number | string | boolean {
  throw new Error('TODO: evaluate');
}
