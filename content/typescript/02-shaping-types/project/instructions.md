## Contexte

Jalon 2 de **Parse**. Un validateur utile doit décrire des paires de coordonnées, des dictionnaires aux clés inconnues, et **dériver** un schéma d'un autre sans le réécrire. Chaque brique correspond à une leçon du chapitre : types mappés sur un tuple, `Map` à la place d'une signature d'index, `Pick` et `Partial` appliqués aux schémas.

Tu édites `parse.ts`. `object` renvoie désormais un `ObjectSchema` qui garde sa `shape`.

## Jalon 1 — `tuple(...items)`

Un tableau de **longueur fixe** : chaque position a son schéma, et le type de sortie est un tuple (`[number, number]`). Une longueur différente (ou une entrée qui n'est pas un tableau) : `ParseError(path, "un tableau de N éléments est attendu")`. Les chemins portent l'indice (`$[1]`).

## Jalon 2 — `record(value)`

Un dictionnaire aux clés inconnues, validé valeur par valeur : le résultat est une `Map<string, T>`. Chemin d'une erreur : `$.clé`. Un tableau ou `null` est refusé.

## Jalon 3 — `pick` et `partial`

`pick(source, keys)` renvoie un `ObjectSchema` limité aux champs demandés ; `partial(source)` rend chaque champ facultatif (l'`undefined` est accepté). Le schéma d'origine n'est jamais modifié.

## Contraintes

Pas de `any`. Les assertions `as` sont justifiées par un commentaire.
