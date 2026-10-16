export interface Person {
  name: string;
  age: number;
}

// TODO 1 : ce code fabrique des Person invalides sans que TypeScript proteste (assertions as).
// Remplace-les par des annotations ; les erreurs qui apparaissent sont les vraies, corrige-les.
export function makePerson(name: string, age: number): Person {
  return { name } as Person;
}

export function makePeople(names: readonly string[], age: number): Person[] {
  return names.map((name) => ({ name } as Person));
}

export const alice = { name: 'Alice' } as Person;

// TODO 2 : String est le type de l'objet enveloppe. Utilise le primitif.
export function initial(text: String): String {
  return text.charAt(0).toUpperCase();
}

// TODO 3 : `JSON.parse` renvoie une valeur dont la forme est inconnue. Ne l'asserte pas : vérifie-la.
// isPerson contrôle vraiment les propriétés ; parsePerson renvoie le Person ou null.
export function isPerson(value: unknown): value is Person {
  throw new Error('TODO: isPerson');
}

export function parsePerson(json: string): Person | null {
  return JSON.parse(json) as Person;
}
