// Les tests vérifient les types de retour INFÉRÉS : n'annote ni les retours, ni les tableaux.

// TODO 1 : number[]
export function range(start: number, limit: number) {
  throw new Error('TODO: range');
}

// TODO 2 : (string | number)[]
export function tokenize(text: string) {
  throw new Error('TODO: tokenize');
}

// TODO 3 : number | null (pars de let result = null)
export function parseOrNull(text: string) {
  throw new Error('TODO: parseOrNull');
}

// TODO 4 : number[], avec une boucle (pas de forEach)
export function squaresOf(xs: readonly number[]) {
  throw new Error('TODO: squaresOf');
}
