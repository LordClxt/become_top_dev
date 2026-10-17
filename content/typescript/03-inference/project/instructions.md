## Contexte

Jalon 3 de **Parse**. Ce chapitre portait sur l'inférence : comment TypeScript choisit un type, l'élargit ou le rétrécit. Un bon validateur en tire parti : `enumeration(['admin', 'editor'])` doit produire le type `'admin' | 'editor'`, pas `string`, et un raffinement doit **rétrécir** le type validé.

Tu édites `parse.ts` (les jalons précédents sont fournis).

## Jalon 1 — `enumeration(values)`

Accepte uniquement les chaînes de la liste, sinon `ParseError(path, "une valeur parmi admin, editor, viewer est attendue")`. Le schéma expose `options`. L'appelant ne doit **pas** avoir à écrire `as const` : le paramètre de type porte le modificateur `const` (TypeScript 5.0, l'équivalent d'un `as const` appliqué par la fonction).

## Jalon 2 — `refine(inner, guard, message)`

Valide d'abord avec `inner`, puis applique le type guard ; s'il échoue, `ParseError(path, message)`. Le type de sortie est celui du prédicat : `refine(string(), (s): s is \`${string}@${string}\` => …)` produit des chaînes contenant `@`.

## Jalon 3 — `withDefault(inner, fallback)`

`undefined` → `fallback` ; toute autre valeur passe par `inner` (`null` reste refusé si `inner` le refuse). Le type de sortie n'inclut pas `undefined`, et une valeur par défaut hors du type de `inner` est refusée : `fallback` est typé `NoInfer<T>` (TS 5.4) pour que `T` soit déduit de `inner` seul.

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
