// Le comportement est déjà correct. Le problème : tout est `any`, donc rien n'est protégé.
// Remplace chaque `any` par le type le plus précis possible, sans changer le comportement.
// (Les tests de types vérifient aussi qu'on ne peut plus appeler ces fonctions n'importe comment.)

// TODO : déclare et exporte l'interface Item { id: string; label: string }.

export function ageInYears(birthYear: any, currentYear: any): any {
  return currentYear - birthYear;
}

export function longestWord(words: any): any {
  let best;
  for (const word of words) {
    if (best === undefined || word.length > best.length) best = word;
  }
  return best;
}

export function selectItem(items: any, id: any): any {
  return items.find((item: any) => item.id === id);
}

export function labels(items: any): any {
  return items.map((item: any) => item.label);
}
