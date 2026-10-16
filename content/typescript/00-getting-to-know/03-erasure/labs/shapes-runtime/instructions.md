## Contexte

Les types TypeScript sont **effacés** à la compilation : seul le JavaScript s'exécute. Trois morceaux de code ont l'air corrects mais confondent « type » et « valeur ». Tu les répares avec des constructions qui existent aussi à l'exécution.

Tu édites `shapes.ts`.

## 1. `area` avec une union taguée

- Ajoute une propriété `kind` à `Square` (`'square'`), `Rectangle` (`'rectangle'`) et crée `Circle` (`'circle'`, `radius`).
- `Shape` est l'union des trois. `area` lit `shape.kind` pour décider.

## 2. `asNumber`

`val as number` ne convertit rien. Renvoie un vrai nombre : `'42'` → `42`, `' 3.5 '` → `3.5`. Une chaîne vide ou non numérique lève `RangeError`.

## 3. `parseSwitch(raw: unknown)`

Une valeur venue de l'extérieur (réseau, formulaire) peut ne pas respecter le type annoncé. Accepte `true`/`false` et les chaînes `'on'`/`'off'` (casse libre, espaces ignorés). Tout le reste lève `TypeError`.

## Contraintes

Pas de `as`, pas de `any`. Les tests de types refusent une forme `{ kind: 'hexagon' }`.
