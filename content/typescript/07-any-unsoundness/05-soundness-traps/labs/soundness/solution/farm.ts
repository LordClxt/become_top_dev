export class Animal {
  legs = 4;
  name = 'animal';
}
export class Hen extends Animal {
  legs = 2;
  name = 'poule';
  cluck(): string { return 'cot cot'; }
}
export class Fox extends Animal {
  name = 'renard';
}

export function nth<T>(xs: readonly T[], i: number): T | undefined {
  return i >= 0 && i < xs.length ? xs[i] : undefined;
}

/** readonly : un Hen[] peut être passé sans risque, la fonction ne peut pas y écrire. */
export function countLegs(animals: readonly Animal[]): number {
  return animals.reduce((sum, a) => sum + a.legs, 0);
}

export function withAnimal(animals: readonly Animal[], animal: Animal): Animal[] {
  return [...animals, animal];
}

/** Syntaxe propriété : les paramètres sont vérifiés strictement (pas de bivariance). */
export interface Feeder {
  feed: (animal: Animal) => string;
}

export interface FunFact {
  fact: string;
  author?: string;
}

export function announce(fact: FunFact, beforePrint: (fact: FunFact) => void): string {
  const { author, fact: text } = fact;
  beforePrint(fact);
  return `${author ? author.trim() : 'anonyme'} : ${text}`;
}
