## Contexte

Une équipe décrit son API dans un objet de spécification : chaque endpoint a une méthode, un chemin à paramètres (`/users/:id`) et la forme de sa réponse (`{ name: 'string', tags: 'string[]', age: 'number?' }`). À partir de cette seule description, tu produis **trois choses** : des types calculés, un client d'exécution qui valide les réponses, et le code source d'interfaces générées. La suite de tests de types est stricte (`Equals`) : les types doivent être aplatis.

Tu édites `sdk.ts`.

## À faire

1. Types :
   - `FieldType<F>` (`'string' | 'number' | 'boolean'`, suffixe `[]` pour un tableau, `?` pour optionnel) et `ResponseOf<R>` : l'objet de réponse, champs `?` optionnels, **aplati** ;
   - `PathParams<P>` : les paramètres d'un chemin (`{}` sans paramètre), en récursion terminale ;
   - `Client<S>` : pour chaque endpoint `K`, une méthode `(params: PathParams<path>) => Promise<ResponseOf<response>>`.
2. `createClient(spec, transport)` : `transport(method, url)` renvoie un `unknown`. Chaque méthode construit l'URL (paramètres encodés), appelle le transport, **valide** la réponse (objet, chaque champ obligatoire présent et du bon type, chaque champ optionnel absent ou du bon type), sinon `Error("réponse invalide : <champ>")` (ou `"réponse invalide : objet attendu"`). Les champs inconnus sont retirés.
3. `generateTypes(spec)` : pour chaque endpoint (ordre alphabétique), une interface `` `${PascalCase(nom)}Response` `` ; une ligne par champ (`  age?: number;`), interfaces séparées par une ligne vide.

## Contraintes

Pas de `any`. Une assertion justifiée autorisée pour construire le client, une pour la réponse validée.
