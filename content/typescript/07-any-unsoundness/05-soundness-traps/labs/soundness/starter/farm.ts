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

// TODO 1 : T | undefined.
export function nth<T>(xs: readonly T[], i: number): T {
  return xs[i]!;
}

// TODO 2 : readonly ; withAnimal renvoie un nouveau tableau.
export function countLegs(animals: Animal[]): number {
  return animals.reduce((sum, a) => sum + a.legs, 0);
}

export function withAnimal(animals: Animal[], animal: Animal): Animal[] {
  animals.push(animal);
  return animals;
}

// TODO 3 : syntaxe propriété (vérification stricte des paramètres).
export interface Feeder {
  feed(animal: Animal): string;
}

export interface FunFact {
  fact: string;
  author?: string;
}

// TODO 4 : la valeur d'AVANT l'appel de beforePrint.
export function announce(fact: FunFact, beforePrint: (fact: FunFact) => void): string {
  if (fact.author) {
    beforePrint(fact);
    return `${fact.author.trim()} : ${fact.fact}`;
  }
  beforePrint(fact);
  return `anonyme : ${fact.fact}`;
}
