export interface Person {
  name: string;
  age: number;
}

/** Fabrique un Person : le retour est annoté, un champ oublié serait signalé. */
export function makePerson(name: string, age: number): Person {
  return { name, age };
}

/** Un Person par nom, tous du même âge. Le retour de la flèche est annoté (`: Person`). */
export function makePeople(names: readonly string[], age: number): Person[] {
  return names.map((name): Person => ({ name, age }));
}

export const alice: Person = { name: 'Alice', age: 30 };

/** Initiale d'un texte, en primitif string (jamais String). */
export function initial(text: string): string {
  return text.charAt(0).toUpperCase();
}

/** Garde de type : à l'exécution, on vérifie vraiment la forme au lieu de l'affirmer. */
export function isPerson(value: unknown): value is Person {
  return typeof value === 'object' && value !== null
    && typeof (value as Record<string, unknown>).name === 'string'
    && typeof (value as Record<string, unknown>).age === 'number';
}

/** Lit un Person depuis du JSON, ou null s'il n'a pas la bonne forme. */
export function parsePerson(json: string): Person | null {
  const value: unknown = JSON.parse(json);
  return isPerson(value) ? value : null;
}
