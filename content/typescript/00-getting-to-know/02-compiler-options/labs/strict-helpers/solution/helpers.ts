export function add(a: number, b: number): number {
  return a + b;
}

/** Premier mot d'un texte, ou '' s'il n'y en a pas (texte absent ou vide). */
export function firstWord(text: string | null): string {
  if (text === null) return '';
  return text.trim().split(/\s+/)[0] ?? '';
}

/** Dernier élément, ou undefined si la liste est vide. */
export function lastItem(items: readonly string[]): string | undefined {
  return items[items.length - 1];
}

/** Ce que l'on utilise d'un élément du DOM : un nœud dont on peut écrire le texte. */
export interface StatusElement {
  textContent: string | null;
}

/** Écrit `text` dans l'élément s'il existe ; renvoie false quand il manque (getElementById peut renvoyer null). */
export function setStatus(el: StatusElement | null, text: string): boolean {
  if (el === null) return false;
  el.textContent = text;
  return true;
}
