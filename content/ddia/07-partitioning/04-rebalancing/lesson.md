---
id: ddia-ch07-l04
title: "Rééquilibrer les partitions"
source: { chapter: 6, pages: "209-214" }
duration_min: 35
concepts:
  - id: ddia-rebalancing-requirements
    label: "Rééquilibrer : répartir la charge équitablement, continuer à servir pendant l'opération, ne déplacer que le strict nécessaire"
  - id: ddia-hash-mod-n-pitfall
    label: "hash mod N déplace presque toutes les clés quand N change : à éviter"
  - id: ddia-fixed-partition-count
    label: "Nombre fixe de partitions, bien supérieur au nombre de nœuds : un nouveau nœud vole des partitions entières, seule l'affectation change"
  - id: ddia-dynamic-partitioning
    label: "Partitionnement dynamique : une partition trop grosse se découpe en deux, une trop petite fusionne ; le nombre s'adapte au volume"
  - id: ddia-partitions-per-node
    label: "Partitions proportionnelles aux nœuds : un nombre fixe par nœud ; un nouveau nœud découpe des partitions existantes et en prend la moitié"
  - id: ddia-automatic-rebalancing-risk
    label: "Le rééquilibrage entièrement automatique, couplé à la détection de panne, peut provoquer une cascade ; garder un humain dans la boucle"
glossary:
  - term: "rééquilibrage (rebalancing)"
    definition: "Déplacer des données et des requêtes d'un nœud vers un autre pour répartir à nouveau la charge."
  - term: "hash mod N"
    definition: "Choisir le nœud par le reste de la division du hachage par le nombre de nœuds ; simple mais catastrophique quand N change."
  - term: "pré-découpage (pre-splitting)"
    definition: "Créer à l'avance plusieurs partitions vides sur une base neuve, avec des bornes estimées, pour éviter qu'un seul nœud reçoive tout au début."
  - term: "découpage (split)"
    definition: "Couper une partition devenue trop grosse en deux moitiés à peu près égales."
  - term: "panne en cascade"
    definition: "Une réaction automatique à une panne apparente surcharge d'autres nœuds, qui tombent ou ralentissent à leur tour."
visuals: []
labs: [ddia-ch07-l04-lab-rebalance-design]
xp: 40
---

## Pourquoi c'est important

Un cluster ne reste jamais figé : le volume de requêtes grandit (il faut plus de CPU), les données grossissent (plus de disque et de RAM), des machines tombent (d'autres doivent reprendre leur part). Chaque fois, il faut **déplacer** des données et des requêtes d'un nœud à l'autre : c'est le **rééquilibrage**. Mal conçu, il transfère des téraoctets inutiles sur le réseau au pire moment. Cette leçon compare les stratégies et donne le chiffre à retenir : combien de données bougent.

## Ce qu'on attend d'un rééquilibrage

Quel que soit le schéma de partitionnement, trois exigences minimales :

1. **après**, la charge (stockage, lectures, écritures) est répartie équitablement entre les nœuds ;
2. **pendant**, la base continue d'accepter lectures et écritures ;
3. on ne déplace **pas plus de données que nécessaire**, pour que l'opération soit rapide et charge le moins possible le réseau et les disques.

## La fausse bonne idée : hash mod N

Avec le hachage, il est tentant d'affecter la clé au nœud `hash(clé) mod N` (`%` en Go). Tant que N ne change pas, c'est parfait. Mais dès que N change, **presque toutes** les clés changent de nœud.

Calcul : de 4 à 5 nœuds, une clé reste en place seulement si `h mod 4 == h mod 5`. Sur les 20 restes possibles de `h mod 20`, seuls 0, 1, 2 et 3 conviennent : **20 % restent, 80 % bougent**. De 10 à 11 nœuds, c'est pire : seuls 10 restes sur 110, donc environ **91 %** des clés déménagent, alors qu'il suffirait d'en déplacer 1/11 ≈ 9 % pour donner sa part au nouveau venu. Un rééquilibrage coûteux à chaque ajout de machine.

## Nombre fixe de partitions

Solution simple : créer **beaucoup plus de partitions que de nœuds**, et affecter plusieurs partitions à chaque nœud. Par exemple, 10 nœuds et 1 000 partitions, soit 100 partitions par nœud.

- **Ajout d'un nœud** : il **vole** quelques partitions entières à chacun des nœuds existants, jusqu'à ce que la répartition soit de nouveau équitable. Avec 11 nœuds, il prend environ 1 000 / 11 ≈ 91 partitions, soit à peu près 9 % des données, exactement le minimum.
- **Retrait d'un nœud** : l'inverse, ses partitions sont redistribuées.
- **Ce qui ne change jamais** : le nombre de partitions et l'affectation **clé → partition**. Seule l'affectation **partition → nœud** change. Le transfert prend du temps ; pendant ce temps, l'ancienne affectation continue de servir les lectures et écritures.

Bonus : on peut tenir compte d'un matériel hétérogène en donnant plus de partitions aux machines plus puissantes. Riak, Elasticsearch, Couchbase et Voldemort utilisent cette approche.

Le revers : le nombre de partitions est fixé **à la création** de la base et en pratique ne change plus. Il doit être assez grand pour le nombre maximal de nœuds envisagé (chaque nœud doit avoir de quoi voler), mais chaque partition a un **coût de gestion** fixe : trop de partitions, c'est du gaspillage. Si le volume total varie énormément, aucun nombre ne convient : des partitions trop grosses rendent rééquilibrage et reprise après panne coûteux ; trop petites, elles coûtent en gestion.

## Partitionnement dynamique

Pour les bases partitionnées par **plage de clés**, un nombre fixe avec des bornes fixes serait pénible : de mauvaises bornes laissent toutes les données dans quelques partitions, et les reconfigurer à la main est fastidieux. HBase et RethinkDB créent donc les partitions **dynamiquement** :

- quand une partition dépasse une taille configurée (10 Go par défaut dans HBase), elle est **découpée en deux** moitiés à peu près égales ;
- quand elle rétrécit sous un seuil (suppressions), elle peut **fusionner** avec une voisine.

C'est exactement ce que fait le haut d'un B-tree (module « Stockage et index ») : des pages qui se scindent. Chaque partition est affectée à un nœud, et une moitié peut migrer vers un autre nœud pour équilibrer (HBase transfère les fichiers via HDFS).

Avantage : le **nombre de partitions suit le volume**. Une petite base a peu de partitions, donc peu de frais ; une énorme base en a beaucoup, chacune de taille bornée. Une table qui grossit à 1 To avec un seuil de 10 Go aura au moins 100 partitions.

Piège : une base **vide** commence avec **une seule** partition, faute d'information pour placer des bornes. Tant qu'elle n'a pas atteint le seuil, **toutes les écritures** vont sur un seul nœud et les autres dorment. HBase et MongoDB proposent donc le **pré-découpage** (*pre-splitting*) : créer d'emblée des partitions avec des bornes estimées (il faut connaître à l'avance la distribution des clés). Le partitionnement dynamique marche aussi avec des plages de **hachages** : MongoDB, depuis la version 2.4, le propose dans les deux modes.

## Partitions proportionnelles aux nœuds

Dans les deux approches précédentes, le nombre de partitions dépend du **volume** (dynamique) ou est indépendant de tout (fixe). Cassandra et Ketama choisissent une troisième voie : un **nombre fixe de partitions par nœud** (256 par défaut dans Cassandra).

- À nœuds constants, la taille de chaque partition grandit avec les données.
- Quand un nœud arrive, il choisit au hasard un nombre fixe de partitions existantes, les **coupe en deux** et en prend une moitié chacune. Les partitions redeviennent plus petites.
- Résultat : la taille des partitions reste à peu près stable quand la flotte grandit avec les données.

Le choix aléatoire des bornes impose un partitionnement **par hachage** (les bornes sont tirées dans l'espace des hachages). C'est l'approche la plus proche de la définition originale du hachage cohérent (leçon 2). Avec peu de partitions, le découpage aléatoire peut être injuste ; avec 256 par nœud, cela se moyenne, et des algorithmes plus récents évitent ces découpages inéquitables.

## Automatique ou manuel ?

Le rééquilibrage peut être **entièrement automatique** (le système décide seul quand et quoi déplacer) ou **entièrement manuel** (un administrateur configure l'affectation). Entre les deux, Couchbase, Riak et Voldemort **proposent** une affectation automatiquement, mais attendent qu'un administrateur la **valide**.

Pourquoi garder un humain ? Le rééquilibrage est coûteux : il re-route des requêtes et déplace beaucoup de données. Combiné à la **détection automatique de panne**, il peut déclencher une **cascade** :

1. un nœud est surchargé et répond lentement ;
2. les autres le croient mort ;
3. le système rééquilibre automatiquement pour le décharger ;
4. le transfert ajoute de la charge sur ce nœud, sur les autres et sur le réseau ;
5. d'autres nœuds ralentissent et sont déclarés morts à leur tour.

Un humain dans la boucle est plus lent, mais évite les mauvaises surprises opérationnelles.

## Pièges fréquents

- **Utiliser hash mod N** : un ajout de nœud fait déménager 80 à 90 % des données.
- **Choisir un nombre fixe de partitions trop petit** : on ne pourra jamais dépasser ce nombre de nœuds (une partition ne se partage pas entre deux nœuds).
- **Démarrer une base dynamique vide sans pré-découpage** avant un chargement massif : un seul nœud travaille.
- **Brancher le rééquilibrage automatique sur la détection de panne** : un nœud lent peut déclencher une cascade.

## À retenir

- Un bon rééquilibrage égalise la charge, ne bloque pas le service et ne déplace que le nécessaire.
- hash mod N : à proscrire. Nombre fixe de partitions : seule l'affectation partition → nœud change.
- Dynamique : découpage et fusion selon la taille, idéal pour les plages de clés, avec pré-découpage pour démarrer.
- Proportionnel aux nœuds (Cassandra) : taille des partitions stable, exige le hachage.
- Garder un humain pour valider les grands déplacements.
