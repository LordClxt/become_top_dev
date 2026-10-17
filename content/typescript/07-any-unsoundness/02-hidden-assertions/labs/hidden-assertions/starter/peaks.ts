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

// TODO 1 : Promise<MountainPeak>, vérification minimale puis UNE assertion commentée.
export async function fetchPeak(id: string) {
  return api.getJSON(`https://peaks.example/${id}`);
}

// TODO 2 : mêmes clés propres, valeurs ===.
export function shallowObjectEqual(a: object, b: object): boolean {
  throw new Error('TODO: shallowObjectEqual');
}

// TODO 3 : même type que fn ; ne rappelle pas fn si les arguments sont superficiellement égaux.
export function cacheLast(fn: Function): Function {
  throw new Error('TODO: cacheLast');
}
