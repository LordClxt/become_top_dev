// TODO 1 : sku est l'identité d'un article : il ne change jamais (lecture seule).
export interface Item {
  sku: string;
  name: string;
  qty: number;
  price: number;
}

// TODO 2 : types dérivés, sans rien recopier.
//  Inventory   : une table sku → article, en lecture seule (articles compris), type ReadonlyMap.
//  ItemPatch   : les modifications possibles d'un article = tous ses champs optionnels SAUF sku.
//  Transform   : une fonction Inventory → Inventory (nomme la signature).
export type Inventory = never;
export type ItemPatch = never;
export type Transform = never;

// Les opérations ne modifient JAMAIS l'inventaire reçu : elles renvoient un nouvel inventaire.
// addItem : sku déjà présent → Error. L'article ajouté est une copie.
export function addItem(inventory: Inventory, item: Item): Inventory {
  throw new Error('TODO: addItem');
}

// applyPatch : sku inconnu → Error.
export function applyPatch(inventory: Inventory, sku: string, patch: ItemPatch): Inventory {
  throw new Error('TODO: applyPatch');
}

// totalValue : somme de qty × price, arrondie au centime.
export function totalValue(inventory: Inventory): number {
  throw new Error('TODO: totalValue');
}

// lowStock : articles dont qty est STRICTEMENT inférieure au seuil, triés par sku.
export function lowStock(inventory: Inventory, threshold: number): Item[] {
  throw new Error('TODO: lowStock');
}

// withoutEmpty : retire les articles de quantité 0 (annote toute l'expression avec Transform).
export function withoutEmpty(inventory: Inventory): Inventory {
  throw new Error('TODO: withoutEmpty');
}

// compose : applique les transformations de gauche à droite.
export function compose(...transforms: Transform[]): Transform {
  throw new Error('TODO: compose');
}
