## Contexte

Pendant tout le cours, tu construis **Parse**, une petite bibliothèque de validation à la Zod. Le principe est celui de la leçon 3 : un type TypeScript disparaît à l'exécution, donc pour contrôler des données externes il faut un **schéma qui existe à l'exécution** — et dont on déduit le type, sans l'écrire deux fois.

Tu édites `parse.ts`. Les types `ParseError`, `Schema<T>`, `SafeResult<T>` et `Infer` sont fournis, ainsi que les signatures.

## Jalon 1 — les primitives

- `schema(run)` construit un `Schema<T>` à partir d'une fonction `run(input, path)` qui valide et renvoie la valeur ou lève `ParseError`. `parse(input)` appelle `run(input, '$')` ; `safeParse` renvoie `{ success: true, data }` ou `{ success: false, error }` (jamais d'exception pour une `ParseError`).
- `string()`, `number()` (refuse `NaN`), `boolean()` : lèvent `new ParseError(path, message)` si le type est mauvais.

## Jalon 2 — les objets

`object(shape)` valide chaque clé de `shape` avec le schéma correspondant, **ne garde que ces clés** et construit le chemin de chaque champ : `$.owner.age`. Une valeur qui n'est pas un objet (`null`, tableau…) est rejetée au chemin courant.

## Jalon 3 — l'optionnel

`optional(schema)` accepte `undefined` (le champ reste présent avec la valeur `undefined`) et délègue sinon.

## Contraintes

Pas de `any`. Une seule assertion `as` est justifiée dans `object` (construire le résultat champ par champ) : commente-la. Les tests vérifient que `Infer<typeof schema>` produit le bon type.
