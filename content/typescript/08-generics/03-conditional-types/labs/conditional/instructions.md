## Contexte

Trois fonctions dont le type de retour dépend du type de l'argument. Leur version actuelle utilise des surcharges, qui refusent les unions. Tu les réécris avec des **types conditionnels**, puis tu écris deux types qui utilisent `infer`.

Tu édites `conditional.ts`.

## À faire

1. `double(x)` : `T extends string ? string : number` (une signature publique + une implémentation). Les nombres sont doublés, les chaînes répétées.
2. `Convert<K>` : `'int'` → `number`, `'bool'` → `boolean`, `'text'` → `string`. `convert(kind, raw)` (raw est une chaîne) : `'int'` → `parseInt` (base 10 ; `NaN` → `Error("entier invalide")`), `'bool'` → `raw === 'true'`, `'text'` → `raw`.
3. `Unwrap<T>` : le type contenu dans une `Promise`, sinon `T`. `ElementOf<T>` : le type des éléments d'un tableau (même `readonly`), sinon `never`.
4. `firstOrSelf(x)` : le premier élément si `x` est un tableau, sinon `x` lui-même. Type de retour : `T extends readonly (infer E)[] ? E | undefined : T`.

## Contraintes

Pas de surcharges multiples (une seule signature publique par fonction), pas d'assertion `as`.
