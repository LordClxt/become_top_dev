// TODO 1 : déclare et exporte une interface `State` (name, capital), puis annote `states` avec State[].
// TODO 2 : laisse TypeScript te montrer la faute de frappe cachée dans les données, et corrige-la.

export const states = [
  { name: 'Alabama', capital: 'Montgomery' },
  { name: 'Alaska', capitol: 'Juneau' },
  { name: 'Arizona', capital: 'Phoenix' },
  { name: 'Arkansas', capital: 'Little Rock' },
];

// TODO 3 : tape les paramètres et le retour de ces deux fonctions.
export function capitals(list) {
  throw new Error('TODO: renvoyer la capitale de chaque État');
}

export function byCapital(list, capital) {
  throw new Error('TODO: trouver l’État dont la capitale correspond, sans tenir compte de la casse');
}
