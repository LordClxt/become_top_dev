export interface State {
  name: string;
  capital: string;
}

export const states: State[] = [
  { name: 'Alabama', capital: 'Montgomery' },
  { name: 'Alaska', capital: 'Juneau' },
  { name: 'Arizona', capital: 'Phoenix' },
  { name: 'Arkansas', capital: 'Little Rock' },
];

/** Les capitales, dans l'ordre de la liste. */
export function capitals(list: readonly State[]): string[] {
  return list.map((state) => state.capital);
}

/** L'État dont la capitale porte ce nom (sans tenir compte de la casse), ou undefined. */
export function byCapital(list: readonly State[], capital: string): State | undefined {
  const wanted = capital.toLowerCase();
  return list.find((state) => state.capital.toLowerCase() === wanted);
}
