## Contexte

Jalon 7 de **Parse**. Ce chapitre portait sur `any`, `unknown` et les trous de soundness. Parse est justement l'outil qui transforme un `unknown` en type fiable, sans `any` ni assertion chez l'appelant.

Tu édites `parse.ts` (les jalons précédents sont fournis).

## Jalon 1 — `instanceOf(ctor)`

Accepte une instance de la classe (`instanceof`), sinon `ParseError(path, "une instance de Date est attendue")`. Le type de sortie est le type d'instance.

## Jalon 2 — `is(schema, value)` et `assertValid(schema, value)`

`is` est un **type guard** (`value is T`) qui ne lève jamais. `assertValid` est une **fonction d'assertion** (`asserts value is T`) : elle lève la `ParseError` si la valeur est invalide ; après l'appel, la variable est rétrécie. Tu changes leurs types de retour.

## Jalon 3 — `strict(objectSchema)`

Les types d'objets de TypeScript sont **ouverts** : une valeur peut avoir des propriétés en plus, et une faute de frappe (`agee`) passe inaperçue. `strict` refuse toute clé absente de la `shape` : `ParseError("$.agee", "propriété inconnue")`. Il renvoie un `ObjectSchema` avec la même `shape`.

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
