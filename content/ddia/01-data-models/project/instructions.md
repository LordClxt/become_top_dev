## Contexte

Tinybase va stocker des documents dont la forme change au fil des versions du produit. Tu construis `Collection`, un petit magasin de documents **versionnés** : le champ `_v` indique la version du schéma, et une liste d'`Upgrader` fait passer un document d'une version à la suivante. C'est le schema-on-read du chapitre, avec la migration « eager » en complément.

## Jalon 1 — Stocker sans partager la mémoire
`put` copie en profondeur et estampille `_v` = version courante (sans modifier le document de l'appelant). `putRaw` charge une donnée « telle quelle » (pour simuler le passé). `raw` (ou `undefined`), `delete`, `size`. Toutes les copies sont **profondes** : objets et tableaux imbriqués.

## Jalon 2 — Schema-on-read
`get` renvoie une copie à la version courante. Un document de version `v` passe par `upgraders[v-1]`, puis `upgraders[v]`, etc. ; le stockage reste inchangé. Erreurs levées : `NotFoundError`, `FutureVersionError` (si `_v` dépasse la version courante), et pour un upgrader qui échoue, une `Error` dont l'erreur d'origine est la **`cause`** (`new Error(message, { cause })`).

## Jalon 3 — Chercher et migrer
`find(path, value)` : chemin pointé (`"address.city"`), égalité **profonde** (`isDeepStrictEqual`) **après** mise à niveau ; les documents illisibles sont ignorés. `pendingMigration` compte les documents anciens ; `migrate` les réécrit, par identifiants triés, et s'arrête au premier échec en levant une `MigrationError` qui porte le nombre de documents déjà migrés.

## Fournis pour toi
Les types `Json`, `Doc`, `Upgrader`, les classes d'erreur, `deepCopy` (un `structuredClone`) et `version` sont déjà écrits.
