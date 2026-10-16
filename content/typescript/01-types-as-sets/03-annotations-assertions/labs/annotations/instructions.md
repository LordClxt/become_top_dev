## Contexte

Ce code est rempli d'assertions `as` qui fabriquent des `Person` invalides en toute discrétion : `alice.age` vaut `undefined`, alors que le type affirme un `number`. Tu remplaces les assertions par des annotations, laisses TypeScript montrer les vrais problèmes, puis tu vérifies à l'exécution ce que tu ne peux pas affirmer.

Tu édites `people.ts`.

## À faire

1. Remplace chaque `as Person` par une annotation (`const x: Person = …`, `(name): Person => …`) et corrige les erreurs révélées : `makePerson`, `makePeople` (même âge pour tous) et `alice` (30 ans).
2. `initial` n'utilise que des primitifs `string` (pas `String`).
3. `isPerson(value: unknown)` est une **garde de type** qui contrôle `name` (chaîne) et `age` (nombre) ; `parsePerson(json)` s'en sert pour renvoyer le `Person` ou `null`.

## Contraintes

Pas de `any`. Les seules assertions tolérées sont celles qui regardent une valeur déjà vérifiée comme objet (dans `isPerson`).
