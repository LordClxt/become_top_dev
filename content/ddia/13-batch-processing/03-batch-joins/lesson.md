---
id: ddia-ch13-l03
title: "Jointures et regroupements : côté reduce, côté map"
source: { chapter: 10, pages: "403-411" }
duration_min: 45
concepts:
  - id: ddia-batch-sort-merge-join
    label: "Jointure sort-merge côté reduce : les deux entrées sont clé par l'identifiant, le shuffle rassemble ce qui va ensemble"
  - id: ddia-batch-secondary-sort
    label: "Tri secondaire : ordonner les valeurs d'une clé (le profil d'abord, puis les événements par date)"
  - id: ddia-batch-group-by
    label: "GROUP BY et sessionisation : la clé de regroupement devient la clé émise par le mapper"
  - id: ddia-batch-skew-hot-keys
    label: "Clés chaudes et déséquilibre : un reducer surchargé ralentit tout le job ; jointures et agrégations en deux temps"
  - id: ddia-batch-broadcast-hash-join
    label: "Broadcast hash join : la petite entrée tient en mémoire de chaque mapper, la grande défile"
  - id: ddia-batch-partitioned-hash-join
    label: "Partitioned hash join : deux entrées partitionnées de la même façon, chaque mapper ne charge qu'une partition"
  - id: ddia-batch-map-side-merge-join
    label: "Map-side merge join : entrées partitionnées et triées de la même façon, fusionnées sans reducer"
glossary:
  - term: "jointure côté reduce (reduce-side join)"
    definition: "Les mappers émettent les deux entrées sous la même clé ; la jointure se fait dans le reducer, sans hypothèse sur les entrées."
  - term: "jointure côté map (map-side join)"
    definition: "Jointure faite dans les mappers, sans tri ni reducer, possible seulement si les entrées ont certaines propriétés (taille, partitionnement, tri)."
  - term: "tri secondaire (secondary sort)"
    definition: "Ordre imposé aux valeurs d'une même clé, obtenu en triant sur une clé composée tout en partitionnant sur sa première partie."
  - term: "clé chaude (hot key, linchpin object)"
    definition: "Clé qui concentre une part disproportionnée des enregistrements, par exemple le compte d'une célébrité."
  - term: "sessionisation"
    definition: "Regrouper toutes les actions d'un utilisateur pour reconstituer ses sessions et l'ordre de ses actions."
visuals: []
labs: [ddia-ch13-l03-lab-join-strategy]
xp: 40
---

## Pourquoi c'est important

Au module 1, tu as vu qu'un modèle relationnel résout les liens par des **jointures**. Une base OLTP fait une jointure en cherchant quelques lignes dans un index. Un job de lots, lui, veut joindre **tout** : chaque clic de la journée avec le profil de son auteur. Pas d'index, pas de recherche ligne à ligne : il faut d'autres algorithmes. Le choix entre eux décide si ton job tourne en 20 minutes ou en 6 heures.

## Le problème : clics et profils

Une table d'**événements d'activité** (le *clickstream*) : `user_id`, date, URL. Une base de **profils** : `user_id`, date de naissance, pays. Question : quelles pages intéressent les 18-25 ans ? Il faut joindre chaque événement à son profil.

La solution naïve : pour chaque événement, interroger la base de profils. C'est une catastrophe : des milliards de requêtes aléatoires sur le réseau, un débit limité par l'aller-retour, une base de production noyée, et un résultat **non déterministe** car la base change pendant le job. La bonne approche : prendre une **copie** de la base de profils (extraite par un ETL, un instantané) et la mettre dans HDFS, à côté des événements. Ensuite, tout est local et rejouable.

## Jointure sort-merge côté reduce

Deux mappers, un par entrée :

- le mapper des événements émet `(user_id, événement)` ;
- le mapper des profils émet `(user_id, profil)`.

Le partitionnement par hachage envoie toutes les paires d'un même `user_id` au même reducer, et le tri les rend adjacentes. Avec un **tri secondaire**, le reducer voit d'abord le profil, puis les événements dans l'ordre chronologique. Il garde le profil dans une variable, émet une ligne par événement (`URL, âge`), puis passe à l'utilisateur suivant. Il ne tient **qu'un seul profil en mémoire** et ne fait **aucune requête réseau**.

Comment obtenir ce tri secondaire ? En émettant une clé composée, par exemple `user_id + "0"` pour le profil et `user_id + "1" + date` pour un événement, triée en entier, mais **partitionnée et regroupée sur le seul `user_id`**. C'est exactement ce que tu codes dans le projet Tinybase.

L'idée profonde : le mapper **envoie un message** au reducer, la clé étant l'adresse de destination. MapReduce **sépare la communication réseau de la logique** : ton code ne voit ni le réseau ni les pannes, et le framework relance en sécurité une tâche qui échoue.

## Regroupements (GROUP BY)

Même mécanique : le mapper émet la **clé de regroupement** (`GROUP BY url`), le reducer combine (compter, sommer, garder le top k). Cas classique : la **sessionisation**, qui regroupe toutes les actions d'un utilisateur pour reconstituer ses sessions, par exemple pour savoir si la variante B d'un test A/B convertit mieux. Les logs viennent de plusieurs serveurs web, mais la clé « session » ou « utilisateur » les rassemble.

## Clés chaudes et déséquilibre

Si une clé concentre énormément de données (le compte d'une célébrité suivi par 50 millions de personnes, un *linchpin object*), son reducer reçoit tout. Exemple : 1 milliard d'événements, 100 reducers, mais une clé qui en porte 30 % ; ce reducer traite 300 millions de lignes quand les autres en traitent environ 7. Le job ne finit que quand le **plus lent** a fini.

Remèdes :

- **Jointure asymétrique de Pig** (*skewed join*) : un job d'échantillonnage repère les clés chaudes ; leurs enregistrements sont envoyés à **l'un de plusieurs reducers choisi au hasard**, et l'autre entrée de la jointure est **répliquée** sur tous ces reducers.
- **Crunch** (*sharded join*) : même idée, mais les clés chaudes sont déclarées à la main.
- **Hive** : les clés chaudes sont déclarées dans les métadonnées de la table, stockées à part, et jointes côté map.
- **Agrégation en deux temps** pour un GROUP BY : une première étape envoie les enregistrements d'une clé chaude à des reducers **au hasard**, chacun calcule un résultat partiel ; une seconde étape combine ces résultats partiels.

## Jointures côté map

La jointure côté reduce marche toujours, mais trier, copier vers les reducers et fusionner coûte cher. Si tu **sais quelque chose de tes entrées**, tu peux joindre dans les mappers, **sans reducer ni tri** : chaque mapper lit un bloc et écrit directement sa sortie.

- **Broadcast hash join** : une entrée est **petite** (les 5 000 pays, 200 000 produits) et tient en mémoire. Chaque mapper la charge entièrement dans une table de hachage, puis parcourt sa part de la grande entrée et cherche chaque clé dans la table. « Broadcast » : chaque mapper de la grande entrée lit **toute** la petite. Pig (*replicated join*), Hive (*MapJoin*), Cascading, Crunch et Impala le font. Variante : stocker la petite entrée dans un index en lecture seule sur le disque local, que le cache de l'OS garde en mémoire.
- **Partitioned hash join** : les deux entrées sont **partitionnées de la même façon** (même clé, même fonction, même nombre de partitions), par exemple selon le dernier chiffre du `user_id`. Le mapper de la partition 3 des événements ne charge que la partition 3 des profils : une table 10 fois plus petite. Hive appelle cela *bucketed map join*.
- **Map-side merge join** : les entrées sont partitionnées **et triées** de la même façon. Le mapper lit les deux fichiers en parallèle et les **fusionne** comme le ferait un reducer, sans rien charger en mémoire. Typique quand les entrées sortent elles-mêmes de jobs précédents qui les ont déjà partitionnées et triées.

Conséquence sur la sortie : une jointure côté reduce produit une sortie **partitionnée et triée par la clé de jointure** ; une jointure côté map produit une sortie partitionnée et triée **comme la grande entrée**. Pour savoir quelle jointure est possible, il faut connaître le rangement physique des données : d'où les catalogues de métadonnées comme HCatalog et le metastore de Hive.

## Pièges fréquents

- **Interroger la base de production depuis un mapper** : lent, surcharge la base, et rend le job non déterministe. Joins une copie.
- **Broadcast d'une entrée « petite » qui grossit** : la table de profils passe de 2 à 40 Go, et les mappers manquent de mémoire. Vérifie la taille, pas l'intuition.
- **Partitioned hash join sur des partitionnements différents** (8 partitions d'un côté, 10 de l'autre, ou deux fonctions de hachage) : les clés ne se retrouvent plus.
- **Ignorer une clé chaude** : 99 reducers finissent en 3 minutes, le centième en 2 heures.

## À retenir

- Côté reduce : sans hypothèse sur les entrées ; le shuffle rassemble par clé, le tri secondaire ordonne les valeurs.
- GROUP BY : la clé de regroupement devient la clé du mapper.
- Clés chaudes : répartir sur plusieurs reducers (en répliquant l'autre côté) ou agréger en deux temps.
- Côté map : broadcast si une entrée tient en mémoire ; partitioned hash si les deux sont partitionnées pareil ; merge si elles sont aussi triées pareil.
