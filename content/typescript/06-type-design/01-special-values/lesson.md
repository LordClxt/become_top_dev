---
id: ts-ch06-l01
title: "Un type distinct pour les valeurs spéciales"
source: { chapter: 4, pages: "162-165" }
duration_min: 20
concepts:
  - id: ts-magic-values
    label: "Une valeur magique dans le domaine normal (indexOf qui renvoie -1, un prix à -1) se mélange aux valeurs valides sans que le vérificateur ne le voie"
  - id: ts-null-special-value
    label: "Renvoyer null (ou undefined) pour « pas trouvé » oblige l'appelant à traiter le cas, grâce à strictNullChecks"
  - id: ts-tagged-special-value
    label: "Quand null est ambigu ou qu'il y a plusieurs cas spéciaux, une union taguée nomme chaque cas"
glossary:
  - term: "valeur sentinelle"
    definition: "Valeur conventionnelle (-1, 0, '') qui signale un cas particulier mais appartient au même type que les valeurs normales."
visuals: []
labs: [ts-ch06-l01-lab-special-values]
extra: false
xp: 20
---

## Pourquoi c'est important

`indexOf` renvoie `-1` quand l'élément est absent. C'est une **valeur sentinelle** : elle a le même type (`number`) que les résultats valides. TypeScript ne peut donc pas te rappeler de la tester, et l'oubli produit des résultats faux plutôt qu'une erreur.

## Le concept

### Le bug de la sentinelle

```ts
function splitAround<T>(vals: readonly T[], val: T): [T[], T[]] {
  const index = vals.indexOf(val);
  return [vals.slice(0, index), vals.slice(index + 1)];
}

splitAround([1, 2, 3, 4, 5], 3);   // [[1, 2], [4, 5]] : correct
splitAround([1, 2, 3, 4, 5], 6);   // [[1, 2, 3, 4], [1, 2, 3, 4, 5]] : absurde
```

Quand `val` est absent, `index` vaut `-1`, `slice(0, -1)` coupe le dernier élément et `slice(0)` renvoie tout. Aucune erreur, juste un résultat faux.

### Un type distinct : null

```ts
function safeIndexOf<T>(vals: readonly T[], val: T): number | null {
  const index = vals.indexOf(val);
  return index === -1 ? null : index;
}

function splitAround<T>(vals: readonly T[], val: T): [T[], T[]] {
  const index = safeIndexOf(vals, val);
  return [vals.slice(0, index), vals.slice(index + 1)];
  //                    ~~~~~              ~~~~~ 'index' is possibly 'null'
}
```

Le vérificateur force maintenant à décider ce qui se passe quand l'élément manque (renvoyer `[vals, []]`, lever une erreur…).

### Les sentinelles dans les données

Le livre raconte l'histoire d'un `Product` dont le prix devient parfois inconnu. Pour éviter une migration, on documente `priceDollars: -1` comme « prix inconnu ». Une semaine plus tard, du code qui ignorait cette convention a **crédité de l'argent sur les cartes des clients** : un prix de -1 dollar, c'est un remboursement. Avec `priceDollars: number | null`, chaque calcul aurait dû traiter le cas. (Le lab reprend l'idée avec un autre cas spécial, les achats payés en crédits, d'où une union taguée.)

```ts
type Price = { kind: 'dollars'; amount: number } | { kind: 'credits'; count: number };
```

`null` convient s'il n'y a **qu'un** cas spécial et que son sens est évident. Si `null` peut vouloir dire plusieurs choses (« pas encore chargé », « inexistant », « interdit »), une union taguée nomme chaque cas.

Attention aussi aux tableaux : `xs[i]` hors limites renvoie `undefined` mais est typé `T` par défaut. L'option `noUncheckedIndexedAccess` ajoute `| undefined` à ces accès (module 07).

## Pièges fréquents

- **`-1`, `0` ou `''` pour « absent »** : ils passent tous les tests de type.
- **Oublier de tester `indexOf(x) === -1`** : `slice`, `splice` acceptent `-1` sans broncher.
- **`null` pour plusieurs significations** : préfère une union taguée.

## À retenir

- Une valeur spéciale doit avoir un type distinct des valeurs normales.
- `null`/`undefined` + `strictNullChecks` forcent l'appelant à traiter le cas.
- Plusieurs cas spéciaux, ou un `null` ambigu : une union taguée.
