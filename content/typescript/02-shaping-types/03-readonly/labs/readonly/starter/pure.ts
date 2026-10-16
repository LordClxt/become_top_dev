// Ces fonctions modifient leurs arguments sans le dire. Rends l'intention explicite avec `readonly`,
// puis corrige ce que TypeScript te signale.

export function arraySum(arr: number[]): number {
  let sum = 0;
  let num: number | undefined;
  while ((num = arr.pop()) !== undefined) {
    sum += num;
  }
  return sum;
}

// Les sommes cumulées de 0..n-1 : 0 1 3 6 10… (utilise arraySum)
export function triangles(n: number): number[] {
  throw new Error('TODO: triangles');
}

// Copie triée par ordre croissant, sans toucher à l'original.
export function sortedCopy(nums: number[]): number[] {
  return nums.sort((a, b) => a - b);
}

// TODO : l'identifiant d'un utilisateur ne change jamais.
export interface User {
  id: string;
  name: string;
  tags: string[];
}

// Nouvel utilisateur renommé ; `user` ne doit pas être modifié, et les tags ne sont pas partagés.
export function rename(user: User, name: string): User {
  user.name = name;
  return user;
}

// Les deux derniers éléments (une paire en lecture seule), ou undefined s'il y en a moins de deux.
export function lastTwo(items: string[]): string[] | undefined {
  throw new Error('TODO: lastTwo');
}
