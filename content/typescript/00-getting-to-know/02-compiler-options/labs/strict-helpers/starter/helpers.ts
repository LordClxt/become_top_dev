// Ce fichier est valide en JavaScript, donc en TypeScript : mais sous `strict`, il ne passe pas le vérificateur.
// Lance les tests, lis les erreurs de tsc (TS7006, TS2531…) et corrige-les UNE par une, en typant ce qu'il faut.

export function add(a, b) {
  return a + b;
}

// Texte absent ou vide → ''.
export function firstWord(text) {
  return text.trim().split(/\s+/)[0];
}

// Liste vide → undefined. Le type de retour doit le dire.
export function lastItem(items) {
  return items[items.length - 1];
}

// TODO : déclare et exporte l'interface StatusElement (textContent: string | null),
// puis fais de setStatus une fonction qui accepte l'élément OU null.
export function setStatus(el, text) {
  el.textContent = text;
  return true;
}
