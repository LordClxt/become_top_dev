## Contexte

Tinybase va stocker des documents dont la forme change au fil des versions du produit. Tu construis `Collection`, un petit magasin de documents **versionnés** : le champ `_v` indique la version du schéma, et une liste d'`Upgrader` fait passer un document d'une version à la suivante. C'est le schema-on-read du chapitre, avec la migration « eager » en complément.

## Jalon 1 — Stocker sans partager la mémoire
`Put` copie en profondeur et estampille `_v` = version courante (sans modifier le document de l'appelant). `PutRaw` charge une donnée « telle quelle » (pour simuler le passé). `Raw`, `Delete`, `Len`. Toutes les copies sont **profondes** : maps et slices imbriquées.

## Jalon 2 — Schema-on-read
`Get` renvoie une copie à la version courante. Un document de version `v` passe par `upgraders[v-1]`, puis `upgraders[v]`, etc. ; le stockage reste inchangé. Erreurs : `ErrNotFound`, `ErrFutureVersion` (si `_v` dépasse la version courante) et l'erreur d'un upgrader, **enveloppée** avec `%w`.

## Jalon 3 — Chercher et migrer
`Find(path, value)` : chemin pointé (`"address.city"`), comparaison par `reflect.DeepEqual` **après** mise à niveau ; les documents illisibles sont ignorés. `PendingMigration` compte les documents anciens ; `Migrate` les réécrit, par identifiants triés, et s'arrête au premier échec.

## Fournis pour toi
`deepCopy`, `version` et `versionKey` sont déjà écrits.
