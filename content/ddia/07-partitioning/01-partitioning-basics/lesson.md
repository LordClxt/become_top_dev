---
id: ddia-ch07-l01
title: Pourquoi partitionner, et ce que veut dire équilibré
source:
  chapter: 6
  pages: 199-201
duration_min: 25
concepts:
- id: ddia-partitioning
  label: 'Partitionner (sharding) : découper la base en morceaux, chaque donnée appartenant à exactement une partition, pour passer à l''échelle'
- id: ddia-partition-vs-network
  label: Ne pas confondre partition de données et partition réseau (netsplit) ; shard, region, tablet, vnode, vBucket sont des synonymes
- id: ddia-partition-replication
  label: 'Partitionnement et réplication se combinent : un nœud est leader de certaines partitions et follower d''autres'
- id: ddia-skew-hotspot
  label: Un partitionnement injuste crée du skew et des hot spots qui annulent le bénéfice de l'échelle
glossary:
- term: partition (shard)
  definition: Un morceau de la base ; chaque enregistrement appartient à exactement une partition. Appelé région dans HBase, tablet dans Bigtable,
    vnode dans Cassandra et Riak, vBucket dans Couchbase.
- term: shared-nothing
  definition: Chaque nœud a son propre CPU, sa mémoire et ses disques ; les nœuds ne se coordonnent que par le réseau.
- term: skew
  definition: 'Répartition injuste : certaines partitions ont plus de données ou de requêtes que d''autres.'
- term: hot spot
  definition: Une partition qui reçoit une charge disproportionnée.
visuals: []
labs:
- ddia-ch07-l01-lab-skew-design
- ddia-ch07-l01-lab-partition-replica-design
extra: false
xp: 25
---

## Pourquoi c'est important

La réplication copie les **mêmes** données sur plusieurs machines. Pour des jeux de données très gros, ou un débit de requêtes très élevé, ça ne suffit pas : chaque réplica contient encore **tout**. Il faut découper les données en **partitions** (on dit aussi *sharding*, « éclatement »). Ce que ce chapitre appelle partition s'appelle *shard* dans MongoDB, Elasticsearch et SolrCloud, *region* dans HBase, *tablet* dans Bigtable, *vnode* dans Cassandra et Riak, *vBucket* dans Couchbase. « Partitionnement » est le terme le plus établi, on le garde.

> **Attention au mot.** Le partitionnement de ce module découpe volontairement une grosse base en petites. Il n'a **rien à voir** avec une *partition réseau* (netsplit), un type de panne du réseau entre nœuds, qu'on étudie au module 10.

## Le principe

Normalement, chaque donnée (enregistrement, ligne, document) appartient à **exactement une partition**. Chaque partition est en fait une petite base de données à elle seule, même si la base peut offrir des opérations qui touchent plusieurs partitions à la fois.

La raison principale est la **scalabilité**. Des partitions différentes peuvent être placées sur des nœuds différents dans un cluster *shared-nothing*. Un gros jeu de données se répartit sur plusieurs disques, et la charge de requêtes sur plusieurs processeurs. Pour une requête qui ne touche qu'une partition, chaque nœud l'exécute indépendamment : le débit augmente en ajoutant des nœuds. De grosses requêtes complexes peuvent être parallélisées sur plusieurs nœuds, bien que ce soit nettement plus difficile.

C'est une idée ancienne : les bases partitionnées ont été lancées dans les années 1980 (Teradata, Tandem NonStop SQL), puis redécouvertes par les bases NoSQL et les entrepôts de données basés sur Hadoop. Que la charge soit transactionnelle ou analytique, les fondamentaux sont les mêmes.

## Partitionnement et réplication

Le partitionnement est presque toujours **combiné** à la réplication : chaque partition est copiée sur plusieurs nœuds pour tolérer les pannes. Même si chaque enregistrement appartient à une seule partition, il peut donc être stocké sur plusieurs nœuds. Un nœud peut stocker plusieurs partitions. Avec la réplication par leader, chaque partition a son leader sur un nœud et ses followers sur d'autres. **Un nœud est leader de certaines partitions et follower d'autres.**

Tout ce qu'on a vu sur la réplication (module 05 et 06) s'applique à la réplication des partitions. Le choix du schéma de partitionnement est en grande partie **indépendant** du choix du schéma de réplication : dans ce module, on ignore la réplication pour simplifier.


## Équilibrer : skew et hot spots

Le but : répartir **équitablement** les données et la charge de requêtes entre les nœuds. Si chaque nœud prend sa part, 10 nœuds devraient, en théorie, traiter 10 fois plus de données et 10 fois plus de débit en lecture et en écriture qu'un seul.

Si le partitionnement est injuste (certaines partitions ont plus de données ou de requêtes que d'autres), on parle de **skew**, et il réduit fortement l'efficacité. Dans le cas extrême, toute la charge finit sur une seule partition : 9 nœuds sur 10 sont inactifs et le goulot est le nœud unique, très occupé. Une partition à la charge disproportionnée s'appelle un **hot spot**.

Le moyen le plus simple d'éviter les hot spots : affecter les enregistrements **aux nœuds au hasard**. Les données se répartissent bien, mais gros défaut : quand tu cherches un élément précis, **tu ne sais pas sur quel nœud il est**, et tu dois interroger tous les nœuds en parallèle. On peut faire mieux. Les deux leçons suivantes montrent comment, en supposant un modèle clé-valeur où l'on accède toujours à un enregistrement par sa clé primaire (comme chercher une entrée dans une encyclopédie par son titre).

## Pièges fréquents

- **Confondre partition de données et partition réseau.**
- **Croire que 10 nœuds donnent toujours 10 fois le débit** : le skew peut tout ramener à un nœud.
- **Penser qu'une répartition au hasard est la solution** : on perd la capacité de retrouver une clé sans tout interroger.
- **Oublier que chaque nœud mélange rôles de leader et de follower** : une panne touche des partitions de rôles différents.

## À retenir

- Partitionner = découper les données ; chaque enregistrement est dans une seule partition ; on combine avec la réplication.
- Le but est d'équilibrer données et charge ; le skew et les hot spots l'empêchent.
- Une répartition aléatoire équilibre mais empêche de retrouver une clé sans tout interroger.
