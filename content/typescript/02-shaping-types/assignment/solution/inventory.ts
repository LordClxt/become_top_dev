export interface Item {
  readonly sku: string;
  name: string;
  qty: number;
  price: number;
}

/** Un inventaire se lit sans se modifier : les opérations renvoient un NOUVEL inventaire. */
export type Inventory = ReadonlyMap<string, Readonly<Item>>;
/** Modifications possibles : tout sauf le sku, qui est l'identité. */
export type ItemPatch = Partial<Omit<Item, 'sku'>>;
/** Une transformation d'inventaire : une signature nommée, réutilisée partout. */
export type Transform = (inventory: Inventory) => Inventory;

export function addItem(inventory: Inventory, item: Item): Inventory {
  if (inventory.has(item.sku)) throw new Error(`sku déjà présent : ${item.sku}`);
  return new Map(inventory).set(item.sku, { ...item });
}

export function applyPatch(inventory: Inventory, sku: string, patch: ItemPatch): Inventory {
  const current = inventory.get(sku);
  if (current === undefined) throw new Error(`sku inconnu : ${sku}`);
  return new Map(inventory).set(sku, { ...current, ...patch });
}

export function totalValue(inventory: Inventory): number {
  let total = 0;
  for (const item of inventory.values()) total += item.qty * item.price;
  return Math.round(total * 100) / 100;
}

/** Les articles dont le stock est strictement inférieur au seuil, triés par sku. */
export function lowStock(inventory: Inventory, threshold: number): Readonly<Item>[] {
  return [...inventory.values()].filter((item) => item.qty < threshold).sort((a, b) => a.sku.localeCompare(b.sku));
}

export const withoutEmpty: Transform = (inventory) =>
  new Map([...inventory].filter(([, item]) => item.qty > 0));

export function compose(...transforms: readonly Transform[]): Transform {
  return (inventory) => transforms.reduce((current, transform) => transform(current), inventory);
}
