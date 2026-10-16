/** Somme sans modifier le tableau : le paramètre est en lecture seule. */
export function arraySum(arr: readonly number[]): number {
  let sum = 0;
  for (const num of arr) sum += num;
  return sum;
}

/** Sommes cumulées successives : 0 1 3 6 10… */
export function triangles(n: number): number[] {
  const nums: number[] = [];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    nums.push(i);
    out.push(arraySum(nums));
  }
  return out;
}

/** Copie triée par ordre croissant, sans toucher à l'original. */
export function sortedCopy(nums: readonly number[]): number[] {
  return [...nums].sort((a, b) => a - b);
}

export interface User {
  readonly id: string;
  name: string;
  tags: string[];
}

/** Renvoie un nouvel utilisateur renommé ; l'argument est en lecture seule. */
export function rename(user: Readonly<User>, name: string): User {
  return { ...user, name, tags: [...user.tags] };
}

/** Les deux derniers éléments, ou undefined s'il y en a moins de deux. */
export function lastTwo(items: readonly string[]): readonly [string, string] | undefined {
  if (items.length < 2) return undefined;
  return [items[items.length - 2]!, items[items.length - 1]!];
}
