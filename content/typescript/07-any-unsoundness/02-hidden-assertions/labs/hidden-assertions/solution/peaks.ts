export interface MountainPeak {
  name: string;
  continent: string;
  elevationMeters: number;
  firstAscentYear: number;
}

/** Faux réseau : renvoie du JSON non typé. */
export const api = {
  calls: 0,
  async getJSON(url: string): Promise<unknown> {
    this.calls++;
    if (url.endsWith('/everest')) return { name: 'Everest', continent: 'Asie', elevationMeters: 8849, firstAscentYear: 1953 };
    if (url.endsWith('/broken')) return { title: 'oups' };
    return null;
  },
};

export async function fetchPeak(id: string): Promise<MountainPeak> {
  const data = await api.getJSON(`https://peaks.example/${id}`);
  if (typeof data !== 'object' || data === null || !('name' in data) || typeof data.name !== 'string') {
    throw new Error('réponse invalide');
  }
  // Assertion justifiée : l'API documente cette forme ; on a vérifié le champ indispensable.
  return data as MountainPeak;
}

export function shallowObjectEqual(a: object, b: object): boolean {
  for (const [k, aVal] of Object.entries(a)) {
    // Assertion justifiée : `k in b` garantit que la propriété existe, on la lit comme une inconnue.
    if (!(k in b) || aVal !== (b as Record<string, unknown>)[k]) return false;
  }
  return Object.keys(a).length === Object.keys(b).length;
}

function sameArgs(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

// any[] dans la contrainte seulement : c'est la façon idiomatique de dire « n'importe quelle fonction ».
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cacheLast<F extends (...args: any[]) => unknown>(fn: F): F {
  let lastArgs: unknown[] | null = null;
  let lastResult: unknown;
  const call: (...args: unknown[]) => unknown = fn;
  const cached = (...args: unknown[]) => {
    if (!lastArgs || !sameArgs(lastArgs, args)) {
      lastResult = call(...args);
      lastArgs = args;
    }
    return lastResult;
  };
  // Assertion justifiée : cached accepte les mêmes arguments que fn et renvoie son résultat.
  return cached as unknown as F;
}
