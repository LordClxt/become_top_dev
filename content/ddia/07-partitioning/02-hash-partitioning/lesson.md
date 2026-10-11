---
id: ddia-ch07-l02
title: "Hachage, hachage cohérent et clés brûlantes"
source: { chapter: 6, pages: "203-206" }
duration_min: 30
concepts:
  - id: ddia-hash-partitioning
    label: "Partitionnement par hachage : chaque partition reçoit une plage de valeurs de hachage, ce qui répartit uniformément mais détruit l'ordre des clés"
  - id: ddia-partition-hash-function
    label: "La fonction de hachage doit être stable entre processus et bien répartir (MD5, FNV), pas le hash interne d'un langage"
  - id: ddia-consistent-hashing-term
    label: "Le hachage cohérent est une technique de répartition de cache à bornes aléatoires ; en base de données, on parle plutôt de partitionnement par hachage"
  - id: ddia-compound-primary-key
    label: "Clé primaire composée (Cassandra) : la première colonne est hachée pour choisir la partition, les suivantes trient les lignes dans la partition"
  - id: ddia-hot-key-salting
    label: "Une clé brûlante reste un point chaud même hachée ; on la découpe en ajoutant un suffixe aléatoire, au prix de lectures multiples"
glossary:
  - term: "partitionnement par hachage (hash partitioning)"
    definition: "On calcule le hachage de la clé, et chaque partition reçoit un intervalle de valeurs de hachage."
  - term: "hachage cohérent (consistent hashing)"
    definition: "Technique de Karger et al. (1997) pour répartir la charge d'un cache sur Internet (CDN) avec des bornes choisies au hasard ; le nom est trompeur en contexte de base de données."
  - term: "clé primaire composée (compound primary key)"
    definition: "Clé de plusieurs colonnes dans Cassandra : seule la première sert à choisir la partition, les autres trient les lignes à l'intérieur."
  - term: "clé brûlante (hot key)"
    definition: "Clé unique qui reçoit une part énorme des lectures ou écritures, par exemple le compte d'une célébrité."
visuals: []
labs: [ddia-ch07-l02-lab-hash-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente a montré que la plage de clés crée facilement des points chauds. La plupart des bases distribuées clé-valeur (Cassandra, MongoDB en mode haché, Riak, Couchbase, Voldemort, DynamoDB) choisissent donc une autre règle : **hacher** la clé. Le hachage efface le déséquilibre… et l'ordre des clés avec lui. Savoir ce que tu perds, et comment Cassandra récupère une partie de l'ordre, te permet de choisir une clé qui sert vraiment tes requêtes. Et même le hachage ne sauve pas d'une célébrité.

## Hacher la clé

Une bonne fonction de hachage transforme des données biaisées en valeurs **uniformément réparties**. Deux clés presque identiques, `user-41` et `user-42`, donnent des hachages sans rapport. Une fonction sur 32 bits renvoie un nombre « au hasard » entre 0 et 2³² − 1, mais toujours le même pour la même clé.

On attribue alors à chaque partition une **plage de hachages** (et non plus une plage de clés). Exemple : 4 partitions de même largeur sur 2³² valeurs, soit 1 073 741 824 valeurs chacune. Une clé dont le hachage vaut 3 000 000 000 tombe dans la troisième, celle qui couvre [2 147 483 648, 3 221 225 472). Les bornes peuvent être régulières, ou choisies pseudo-aléatoirement.

### Quelle fonction ?

Pour partitionner, la fonction n'a **pas besoin d'être cryptographiquement forte** : Cassandra et MongoDB utilisent MD5, Voldemort la fonction de Fowler-Noll-Vo (FNV). Elle doit en revanche être **stable** : la même clé doit donner le même hachage dans tous les processus, sur toutes les machines, à chaque redémarrage. Les fonctions intégrées aux langages pour leurs tables de hachage ne conviennent souvent pas : `Object.hashCode()` en Java ou `Object#hash` en Ruby peuvent donner un résultat différent d'un processus à l'autre. En Go, le hachage des `map` est volontairement aléatoire à chaque exécution ; pour partitionner, on prend `hash/fnv` ou équivalent.

## Ce que le hachage coûte : l'ordre

Des clés autrefois voisines sont maintenant **éparpillées** dans toutes les partitions. Une requête d'intervalle sur la clé (« utilisateurs 100 à 200 ») ne sait plus où chercher. Dans MongoDB en mode haché, elle est envoyée à **toutes** les partitions ; Riak, Couchbase et Voldemort ne proposent tout simplement pas de requête d'intervalle sur la clé primaire.

Résumé du compromis :

| | Plage de clés | Hachage |
|---|---|---|
| Répartition | dépend des bornes et des données | uniforme |
| Scan d'intervalle sur la clé | une ou quelques partitions | toutes les partitions |
| Risque de point chaud | clés monotones (horodatage) | seulement les clés individuellement brûlantes |

### Le compromis de Cassandra : la clé composée

Cassandra combine les deux. Une table peut avoir une **clé primaire composée** de plusieurs colonnes : **seule la première est hachée** pour choisir la partition ; les autres servent d'**index concaténé** pour trier les lignes dans les SSTables de cette partition.

Exemple : un réseau social stocke les publications avec la clé `(user_id, update_timestamp)`. Toutes les publications d'un utilisateur sont dans **une seule** partition, triées par date. « Les publications de l'utilisateur 42 entre le 1ᵉʳ et le 7 octobre » devient un scan d'intervalle dans une partition. Les utilisateurs, eux, sont répartis uniformément par le hachage. En revanche, une requête d'intervalle **sur la première colonne** (« utilisateurs 100 à 200 ») reste impossible sans tout interroger. C'est une modélisation idéale pour les relations un-à-plusieurs.

## « Hachage cohérent » : un nom trompeur

Tu entendras souvent que les bases « utilisent le hachage cohérent ». Le terme vient d'un article de Karger et al. (1997) : une façon de répartir la charge d'un **cache** à l'échelle d'Internet, comme un CDN, en choisissant les bornes **au hasard** pour éviter toute coordination centrale. Ici, « cohérent » n'a rien à voir avec la cohérence des réplicas ni avec la cohérence ACID ; il décrit une façon de **rééquilibrer**.

Cette approche ne marche pas très bien pour les bases de données et y est peu utilisée telle quelle (la leçon 4 explique pourquoi). Comme le terme sème la confusion, mieux vaut dire simplement **partitionnement par hachage**.

## Clés brûlantes : quand le hachage ne suffit pas

Le hachage répartit les **clés**, pas la **charge d'une clé**. Toutes les lectures et écritures sur la même clé arrivent toujours dans la même partition. Cas extrême : sur un réseau social, une célébrité aux millions d'abonnés publie, et une tempête de commentaires s'abat sur la même clé (l'identifiant de la publication, ou de l'utilisateur). Le hachage n'y peut rien : deux clés identiques ont le même hachage.

La plupart des bases ne compensent pas automatiquement. C'est à l'**application** de réduire le biais. Technique simple : **ajouter un nombre aléatoire** au début ou à la fin de la clé brûlante. Avec un suffixe à deux chiffres (00 à 99), les écritures se répartissent sur 100 clés différentes, donc sur des partitions différentes.

Exemple chiffré : la clé reçoit 45 000 écritures/s et une partition en encaisse 8 000. Il faut au moins ⌈45 000 / 8 000⌉ = 6 sous-clés. Le prix :

- **toute lecture** de cette clé doit maintenant lire les 6 sous-clés et combiner les résultats ;
- il faut **se souvenir** quelles clés sont découpées : n'appliquer la technique qu'au petit nombre de clés brûlantes, car pour les autres elle ne ferait qu'ajouter du travail.

> **Aller plus loin.** Les bases récentes détectent parfois les clés brûlantes et les découpent ou les mettent en cache automatiquement (DynamoDB a ajouté une « capacité adaptative » qui isole une clé chaude sur sa propre partition). Mais le réflexe applicatif reste indispensable : un compteur global incrémenté par tout le monde ne se partitionne pas.

## Pièges fréquents

- **Hacher avec la fonction de hachage du langage** : différente d'un processus à l'autre, elle envoie la même clé sur deux partitions.
- **Promettre des requêtes d'intervalle sur une clé hachée** : elles partent vers toutes les partitions.
- **Croire que le hachage supprime tous les points chauds** : une clé unique très demandée reste sur une seule partition.
- **Saler toutes les clés « au cas où »** : chaque lecture paie un aller-retour vers N sous-clés.
- **Confondre hachage cohérent et cohérence des données** : rien à voir.

## À retenir

- Hacher la clé répartit uniformément, mais détruit l'ordre : plus de scan d'intervalle efficace sur la clé.
- La fonction doit être stable entre processus (MD5, FNV), pas forcément cryptographique.
- La clé composée de Cassandra hache la première colonne et trie sur les suivantes : un bon modèle pour « tous les éléments d'un parent, triés ».
- Une clé brûlante se découpe à la main avec un suffixe aléatoire, au prix de lectures multiples et de comptabilité.
