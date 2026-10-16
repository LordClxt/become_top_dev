// TODO 1 : une ligne de CSV a des clés DYNAMIQUES (les en-têtes viennent du fichier).
// Remplace la signature d'index par le bon type : une Map de chaîne vers chaîne.
export type Row = { [column: string]: string };

// parseCSV : première ligne = en-têtes ; lignes vides ignorées ; espaces autour des cellules retirés ;
// une ligne avec un autre nombre de colonnes lève RangeError.
export function parseCSV(input: string): Row[] {
  throw new Error('TODO: parseCSV');
}

// TODO 2 : ici les clés sont connues : une interface Rocket { name: string; variant: string; thrustKn: number }.
export type Rocket = { [property: string]: string };

// toRocket lit les colonnes name, variant et thrust d'une ligne ; il manque une colonne ou thrust n'est
// pas un nombre : TypeError.
export function toRocket(row: Row): Rocket {
  throw new Error('TODO: toRocket');
}

// TODO 3 : Vec3D a EXACTEMENT les clés x, y, z (nombres).
export type Vec3D = { [axis: string]: number };

export function addVec(a: Vec3D, b: Vec3D): Vec3D {
  throw new Error('TODO: addVec');
}

// TODO 4 : accepte tout ce qu'on peut parcourir (tableau, Set, générateur…).
export function sumAll(xs: number[]): number {
  throw new Error('TODO: sumAll');
}

// TODO 5 : premier élément de tout ce qui a une longueur et des indices, ou undefined si c'est vide.
export function first(xs: any): any {
  throw new Error('TODO: first');
}
