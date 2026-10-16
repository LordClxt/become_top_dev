export interface Item {
  id: string;
  label: string;
}

/** Âge en années : deux nombres, rien d'autre. Avec `any`, '12' + 1 aurait donné '121'. */
export function ageInYears(birthYear: number, currentYear: number): number {
  return currentYear - birthYear;
}

export function longestWord(words: readonly string[]): string | undefined {
  let best: string | undefined;
  for (const word of words) {
    if (best === undefined || word.length > best.length) best = word;
  }
  return best;
}

/** Sélectionne par identifiant : le type interdit de passer l'objet entier à la place. */
export function selectItem(items: readonly Item[], id: string): Item | undefined {
  return items.find((item) => item.id === id);
}

export function labels(items: readonly Item[]): string[] {
  return items.map((item) => item.label);
}
