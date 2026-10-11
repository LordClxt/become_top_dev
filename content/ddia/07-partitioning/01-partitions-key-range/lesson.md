---
id: ddia-ch07-l01
title: "Partitions, réplicas et plages de clés"
source: { chapter: 6, pages: "199-203" }
duration_min: 30
concepts:
  - id: ddia-partition-definition
    label: "Une partition (shard, region, tablet, vnode) est une tranche des données : chaque enregistrement appartient à exactement une partition"
  - id: ddia-partition-replication-combo
    label: "Partitionnement et réplication se combinent : chaque partition a des copies, et un nœud est leader de certaines partitions et suiveur d'autres"
  - id: ddia-partition-skew-hotspot
    label: "Déséquilibre (skew) et point chaud : une partition qui reçoit une part disproportionnée de la charge annule le gain du partitionnement"
  - id: ddia-key-range-partitioning
    label: "Partitionnement par plage de clés : chaque partition couvre un intervalle continu de clés triées, ce qui rend les scans d'intervalle efficaces"
  - id: ddia-range-timestamp-hotspot
    label: "Une clé horodatée partitionnée par plage envoie toutes les écritures récentes dans la même partition ; on préfixe la clé pour répartir"
glossary:
  - term: "partition (shard, region, tablet, vnode, vBucket)"
    definition: "Sous-ensemble des données stocké comme une petite base indépendante. Le nom change selon le système : shard (MongoDB, Elasticsearch), region (HBase), tablet (Bigtable), vnode (Cassandra, Riak), vBucket (Couchbase)."
  - term: "déséquilibre (skew)"
    definition: "Répartition inégale des données ou de la charge entre partitions."
  - term: "point chaud (hot spot)"
    definition: "Partition qui reçoit une charge disproportionnée et devient le goulot d'étranglement du système."
  - term: "partitionnement par plage de clés (key range partitioning)"
    definition: "Chaque partition reçoit un intervalle continu de clés, entre une borne basse et une borne haute."
  - term: "bornes de partition (partition boundaries)"
    definition: "Clés qui séparent deux partitions voisines ; choisies à la main ou ajustées automatiquement par la base."
visuals: []
labs: [ddia-ch07-l01-lab-key-range-design]
xp: 40
---

## Pourquoi c'est important

Dans les modules précédents, chaque nœud gardait une **copie complète** des données : la réplication protège des pannes et multiplie la capacité de lecture, mais elle ne fait pas grossir la capacité d'**écriture** ni le **volume** stockable. Quand les données dépassent un disque, ou quand les écritures dépassent ce qu'une machine encaisse, il faut les **découper**. C'est le partitionnement. Bien fait, dix nœuds stockent dix fois plus et absorbent dix fois plus d'écritures. Mal fait, neuf nœuds se tournent les pouces pendant que le dixième sature.

## Une partition, plusieurs noms

Une **partition** est une tranche des données : chaque enregistrement (ligne, document, clé) appartient à **exactement une** partition. Chaque partition se comporte comme une petite base indépendante, même si la base peut faire des opérations qui en touchent plusieurs.

Le vocabulaire est une jungle : *shard* dans MongoDB et Elasticsearch, *region* dans HBase, *tablet* dans Bigtable, *vnode* dans Cassandra et Riak, *vBucket* dans Couchbase. C'est la même idée. Ne confonds pas non plus avec la « partition réseau » du module « Quand le réseau ment », qui est un tout autre problème.

La raison principale de partitionner est la **scalabilité** : des partitions différentes vivent sur des nœuds différents d'un cluster *shared-nothing*. Une requête qui ne touche qu'une partition s'exécute sur un seul nœud ; ajouter des nœuds augmente le débit. Les gros traitements analytiques, eux, peuvent même s'exécuter en parallèle sur toutes les partitions (leçon 5).

## Partitionner et répliquer

Partitionnement et réplication ne s'opposent pas : on fait **les deux**. Chaque partition est répliquée sur plusieurs nœuds, et un même nœud stocke plusieurs partitions.

Avec la réplication à leader (module « Réplication avec leader ») : chaque partition a son leader, placé sur un nœud, et ses suiveurs, placés sur d'autres. Un nœud est donc **leader de certaines partitions et suiveur d'autres**. Exemple : 4 nœuds, 8 partitions, facteur de réplication 3. Le cluster stocke 24 copies de partition, soit 6 par nœud ; chaque nœud est leader de 2 partitions et suiveur de 4. Si un nœud tombe, ses 2 partitions dirigées élisent un nouveau leader ailleurs (la bascule vue avec la réplication), et les autres nœuds continuent de servir.

Tout ce qu'on a vu sur la réplication s'applique tel quel à chaque partition. Les choix de partitionnement sont, en grande partie, **indépendants** des choix de réplication ; ce chapitre les traite donc à part.

## Le but : répartir la charge équitablement

Le partitionnement vise à répartir données **et** requêtes uniformément. Si 10 nœuds se partagent la charge équitablement, ils traitent 10 fois plus que 1 nœud. Mais si la répartition est **déséquilibrée** (*skewed*), certaines partitions reçoivent plus que d'autres. Le cas extrême : toute la charge tombe sur une partition, 9 nœuds sur 10 sont inactifs, et le goulot d'étranglement est un seul nœud. Cette partition surchargée est un **point chaud** (*hot spot*).

Solution naïve : placer chaque enregistrement sur un nœud **au hasard**. La charge est parfaite… mais pour relire une clé, tu ne sais pas où elle est : il faut interroger **tous** les nœuds. Il faut donc une règle **déterministe** qui, à partir de la clé, dit où elle vit. Deux grandes familles : par plage de clés (cette leçon) et par hachage (leçon suivante).

## Partitionner par plage de clés

Pense aux volumes d'une encyclopédie papier : le tome 1 couvre A–B, le tome 12 T–Z. Chaque partition reçoit un **intervalle continu** de clés. Si tu connais les bornes, tu sais immédiatement quelle partition contient une clé, et si tu sais quel nœud porte quelle partition, tu vas droit au bon nœud.

Exemple : un annuaire partitionné sur 4 nœuds avec les bornes `g`, `n`, `t`.

| Partition | Clés couvertes |
|---|---|
| P1 | de `a` (inclus) à `g` (exclu) |
| P2 | de `g` à `n` |
| P3 | de `n` à `t` |
| P4 | de `t` à la fin |

`gaston` va dans P2 (la borne basse est incluse), `zoé` dans P4.

Deux points importants :

- **Les bornes ne sont pas équidistantes.** Si les noms en A et B sont nombreux et ceux en X, Y, Z rares, une découpe alphabétique régulière déséquilibre tout. Les bornes doivent **suivre les données**. Elles sont choisies à la main par un administrateur, ou ajustées automatiquement par la base (leçon 4). C'est la stratégie de Bigtable, de son équivalent libre HBase, de RethinkDB et de MongoDB avant la version 2.4.
- **Les clés restent triées dans chaque partition.** Chaque partition peut garder ses clés en ordre (les SSTables et LSM-trees du module « Stockage et index »). Les **scans d'intervalle** deviennent faciles : « toutes les clés de `martin` à `mathilde` » ne touche qu'une partition, lue séquentiellement. On peut même traiter la clé comme un index concaténé et récupérer plusieurs enregistrements liés en une requête.

## Le piège des clés horodatées

Le revers : certains accès créent des points chauds. Prenons un réseau de capteurs qui écrit une mesure par seconde et par capteur, avec pour clé l'horodatage `2026-10-11T14:03:07`. Les scans « toutes les mesures d'octobre » sont parfaits, une partition par jour par exemple. Mais **toutes les écritures** tombent dans la partition d'aujourd'hui : elle sature pendant que les autres dorment. Avec 8 partitions et 24 000 écritures par seconde, une seule partition encaisse les 24 000, au lieu de 3 000 chacune.

Correction : **préfixer** la clé par autre chose que le temps, par exemple le nom du capteur : `capteur-017/2026-10-11T14:03:07`. Les écritures se répartissent entre tous les capteurs, donc entre toutes les partitions. Le prix à payer : pour lire les mesures de **tous** les capteurs sur une période, il faut une requête d'intervalle **par capteur**. La lecture d'un capteur sur une semaine reste, elle, un seul scan dans une seule partition.

C'est un compromis typique : le choix de la clé décide quelles requêtes sont bon marché.

## Pièges fréquents

- **Découper l'espace des clés en tranches égales** : les données réelles ne sont presque jamais uniformes. Les bornes doivent suivre la distribution.
- **Croire que partitionner remplace la réplication** : sans copie, la perte d'un nœud fait perdre ses partitions. On combine les deux.
- **Mettre l'horodatage en tête de clé** dans une base partitionnée par plage : point chaud garanti sur la partition la plus récente.
- **Placer les enregistrements au hasard** : la charge est équilibrée, mais chaque lecture devient une requête à tous les nœuds.

## À retenir

- Partitionner = découper les données pour que chaque nœud n'en porte qu'une partie : c'est ce qui fait grandir le volume et le débit d'écriture.
- Chaque partition est répliquée ; un nœud est leader de certaines partitions et suiveur d'autres.
- L'ennemi est le déséquilibre : un point chaud ramène tout le cluster à la vitesse d'un nœud.
- La plage de clés garde l'ordre (scans faciles) mais exige des bornes adaptées aux données, et punit les clés monotones comme les horodatages.
