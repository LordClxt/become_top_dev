---
id: ddia-ch09-l02
title: "Partitionner une base en série, et ses limites"
source: { chapter: 7, pages: "254-256" }
duration_min: 30
concepts:
  - id: ddia-serial-partition-per-core
    label: "Un thread par partition : le débit croît avec le nombre de cœurs tant que chaque transaction reste dans une partition"
  - id: ddia-cross-partition-tx-cost
    label: "Une transaction multi-partitions doit être coordonnée sur toutes les partitions concernées : débit bien plus faible, qui ne monte pas avec les machines"
  - id: ddia-partitionable-workload
    label: "Clé de partition alignée sur les transactions ; les index secondaires multiplient les transactions multi-partitions"
  - id: ddia-serial-exec-constraints
    label: "Les quatre conditions de l'exécution en série : transactions courtes, données actives en mémoire, débit d'écriture d'un cœur par partition, peu de multi-partitions"
  - id: ddia-anti-caching
    label: "Anti-caching : abandonner la transaction qui touche une donnée froide, la charger en mémoire, puis la relancer"
glossary:
  - term: "transaction multi-partitions (cross-partition)"
    definition: "Transaction qui lit ou écrit dans plusieurs partitions ; elle doit être exécutée en coordination sur toutes, ce qui les bloque ensemble."
  - term: "clé de partition"
    definition: "Valeur qui détermine dans quelle partition vit une donnée (voir le chapitre sur le partitionnement)."
  - term: "anti-caching"
    definition: "Technique où les données rarement lues sont sur disque ; une transaction qui en a besoin est abandonnée, la donnée est chargée en mémoire de façon asynchrone, puis la transaction est relancée."
  - term: "donnée active (working set)"
    definition: "La partie des données réellement consultée par les transactions courantes."
visuals: []
labs: [ddia-ch09-l02-lab-partition-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente a fixé un plafond : une base mono-thread ne dépasse pas le débit **d'un cœur**. Pour une application qui écrit beaucoup, ce plafond arrive vite. La sortie naturelle, c'est le **partitionnement** (chapitre précédent sur le partitionnement) : plusieurs threads, chacun maître de sa tranche de données. Mais cette sortie a un prix caché, que beaucoup découvrent en production : la transaction qui touche **plusieurs** partitions. Comprendre ce prix, c'est savoir si l'exécution en série est le bon choix pour ton modèle de données.

## Un thread par partition

Le principe : on découpe les données en partitions, et **chaque partition a son propre thread** de traitement des transactions, indépendant des autres. Tant qu'une transaction ne lit et n'écrit que dans **une seule partition**, elle s'exécute en série au sein de cette partition, sans aucune coordination avec les autres.

Le débit monte alors **linéairement** avec le nombre de cœurs : chaque cœur fait tourner une partition. Avec 16 partitions à 30 000 transactions par seconde chacune, on atteint **480 000** transactions par seconde, à condition que la charge soit bien répartie (sinon, une partition chaude reste limitée à un cœur, comme on l'a vu avec les points chauds du partitionnement).

## Le prix des transactions multi-partitions

Dès qu'une transaction touche **plusieurs partitions**, la base doit la coordonner sur toutes celles qu'elle concerne : la procédure s'exécute **en lock-step**, toutes les partitions concernées s'arrêtent ensemble pour l'exécuter, afin de garantir la sérialisabilité **à travers tout le système**.

Cette coordination est beaucoup plus lente que le cas mono-partition. VoltDB annonce de l'ordre de **1 000 écritures multi-partitions par seconde**, plusieurs ordres de grandeur en dessous du débit mono-partition. Et surtout, ce chiffre **ne monte pas** quand on ajoute des machines : plus de partitions, c'est plus de participants à coordonner.

Fais le calcul sur un exemple. Une banque a 16 partitions qui supportent ensemble 480 000 transactions mono-partition par seconde. Si **2 %** des transactions sont des virements entre comptes situés dans des partitions différentes, et que la base plafonne à 1 000 multi-partitions par seconde, alors le débit total ne peut pas dépasser 1 000 / 0,02 = **50 000** transactions par seconde. Dix fois moins que la capacité théorique, à cause de 2 % des transactions.

## Une charge facile ou difficile à partitionner

Tout dépend donc de la **structure des données** :

- **Facile** : un simple modèle clé-valeur, où chaque transaction touche une seule clé. Ou des données organisées autour d'une entité (un utilisateur et toutes ses commandes, partitionnés par identifiant d'utilisateur), où chaque transaction reste chez une entité.
- **Difficile** : des données avec **plusieurs index secondaires**. Rappelle-toi le chapitre sur le partitionnement : un index secondaire est partitionné soit par document (une écriture reste locale, mais une lecture par l'index interroge toutes les partitions), soit par terme (une lecture est locale, mais une écriture touche plusieurs partitions). Dans les deux cas, beaucoup de transactions deviennent multi-partitions.

La question à se poser avant de choisir : **ma clé de partition est-elle alignée sur mes transactions ?** Si un virement relie presque toujours deux clients au hasard, aucune clé ne le rendra local.

## Les quatre conditions

L'exécution en série est une manière viable d'obtenir la sérialisabilité **sous certaines contraintes**. Résumons-les :

1. **Chaque transaction est petite et rapide.** Une seule transaction lente bloque toutes les autres de sa partition.
2. **Les données actives tiennent en mémoire.** Les données rarement lues peuvent être sur disque, mais si une transaction a besoin d'y accéder en plein milieu de la boucle, le thread s'arrête pour tout le monde.
3. **Le débit d'écriture tient dans un cœur**, ou les transactions se partitionnent sans coordination entre partitions.
4. **Les transactions multi-partitions sont possibles, mais rares** : leur débit est plafonné, sans recours.

Sur le point 2, une parade existe : l'**anti-caching**. Si une transaction a besoin d'une donnée qui n'est pas en mémoire, la base l'**abandonne**, charge la donnée en mémoire **de façon asynchrone** pendant que les autres transactions continuent, puis **relance** la transaction. C'est l'inverse d'un cache classique : par défaut tout est en mémoire, et seul ce qui est froid est envoyé sur disque.

## Aller plus loin : les héritiers

*(Au-delà du livre.)* L'idée « un thread par partition, pas de verrou » a essaimé. Redis reste mono-thread pour l'exécution des commandes, et Redis Cluster refuse purement et simplement un script dont les clés sont dans des emplacements de hachage différents (d'où les *hash tags* `{user42}` pour forcer des clés à cohabiter). Des bases déterministes comme Calvin, puis FaunaDB, ont généralisé l'idée : fixer d'abord **l'ordre** global des transactions par un log, puis laisser chaque partition les exécuter dans cet ordre, sans verrou distribué. La contrainte de départ demeure : il faut connaître à l'avance ce que la transaction va lire et écrire.

## Pièges fréquents

- **Calculer le débit en multipliant les partitions** sans regarder la part de transactions multi-partitions : quelques pour cent suffisent à diviser le débit par dix.
- **Ajouter des machines pour accélérer les multi-partitions** : leur débit ne monte pas, il peut même baisser.
- **Partitionner par une clé que les transactions ne respectent pas** (par pays, alors que les virements sont internationaux).
- **Oublier les index secondaires** : chacun est une source de transactions multi-partitions.
- **Laisser une donnée froide être lue en plein milieu d'une transaction** : tout le thread attend le disque.

## À retenir

- Un thread par partition : le débit croît avec les cœurs **tant que les transactions restent dans une partition**.
- Une transaction multi-partitions est coordonnée sur toutes les partitions concernées : ~1 000 par seconde chez VoltDB, sans gain en ajoutant des machines.
- Débit total ≤ plafond multi-partitions / part de multi-partitions.
- Conditions : transactions courtes, données actives en mémoire, écriture d'un cœur par partition, multi-partitions rares. L'anti-caching aide quand une donnée froide est nécessaire.
