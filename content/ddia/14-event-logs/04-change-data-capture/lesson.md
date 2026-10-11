---
id: ddia-ch14-l04
title: "Bases de données et flux : la capture des changements"
source: { chapter: 11, pages: "451-457" }
duration_min: 40
concepts:
  - id: ddia-replication-log-as-stream
    label: "Le log de réplication d'une base est déjà un flux d'événements d'écriture ; le rejouer dans le même ordre donne le même état"
  - id: ddia-dual-writes-problem
    label: "Les doubles écritures (le code écrit dans la base puis dans l'index) divergent : condition de course et échec partiel"
  - id: ddia-change-data-capture
    label: "La capture des changements (CDC) extrait chaque écriture de la base et la publie, dans l'ordre, pour les systèmes dérivés"
  - id: ddia-cdc-initial-snapshot
    label: "Pour amorcer un système dérivé, on part d'un snapshot cohérent associé à une position connue du log des changements"
  - id: ddia-log-compaction-keyed
    label: "La compaction par clé garde la dernière valeur de chaque clé et retire les clés supprimées (tombstone) : le log tient autant que la base"
  - id: ddia-change-stream-apis
    label: "De plus en plus de bases exposent leurs changements comme un flux (RethinkDB, Firebase, CouchDB, VoltDB, Kafka Connect)"
glossary:
  - term: "double écriture (dual write)"
    definition: "Le code applicatif écrit lui-même la même donnée dans plusieurs systèmes (base, cache, index)."
  - term: "capture des changements (change data capture, CDC)"
    definition: "Observer toutes les écritures d'une base et les extraire sous une forme réplicable vers d'autres systèmes, en général comme un flux."
  - term: "système de référence (system of record)"
    definition: "Le système qui détient la version qui fait foi d'une donnée ; les autres en sont dérivés."
  - term: "snapshot cohérent"
    definition: "Copie de toute la base à un instant, associée à la position exacte du log des changements à cet instant."
  - term: "compaction de log"
    definition: "Tâche de fond qui supprime d'un log les enregistrements écrasés par une écriture plus récente de la même clé."
  - term: "tombstone (pierre tombale)"
    definition: "Message de valeur nulle qui signale la suppression d'une clé ; la compaction finit par retirer la clé du log."
visuals: []
labs: [ddia-ch14-l04-lab-cdc-design]
xp: 40
---

## Pourquoi c'est important

Aucun système ne sait tout faire. Une application réelle combine une base transactionnelle, un cache, un index de recherche plein texte, un entrepôt de données. Chacun garde **sa copie** des mêmes données, sous la forme qui lui convient, et ces copies doivent rester **synchronisées** : un produit renommé en base doit l'être aussi dans la recherche. La manière naïve de le faire est fausse, et le bug qu'elle produit est silencieux. Cette leçon montre pourquoi, et comment les logs de la leçon précédente donnent une solution propre.

## La base est déjà un flux

On a parlé des événements comme de choses venues de l'extérieur : clics, capteurs. Mais une **écriture en base** est aussi un événement. Le module « Réplication avec leader » l'a montré sans le dire : le log de réplication est un **flux d'événements d'écriture**, produit par le leader et consommé par les suiveurs. Et l'on verra dans le module « Linéarisabilité et ordre » le principe de la réplication par machine à états : si chaque réplica traite les **mêmes** événements dans le **même** ordre, il arrive au **même** état. Gardons cette idée : elle résout le problème de la synchronisation.

## Le piège des doubles écritures

Si recharger toute la base chaque nuit (ETL, module « Traitement par lots ») est trop lent, on est tenté par les **doubles écritures** : le code applicatif écrit lui-même dans chaque système, la base puis l'index de recherche, puis le cache. Deux problèmes graves.

**La condition de course.** Deux clients modifient l'article X presque en même temps. Le client 1 écrit `X = A`, le client 2 écrit `X = B`. La base reçoit d'abord 1 puis 2 : elle contient B. L'index reçoit, à cause d'un délai réseau, d'abord 2 puis 1 : il contient A. Aucune erreur n'a été signalée, et les deux systèmes divergent **pour toujours**, jusqu'à la prochaine écriture de X. Sans mécanisme de détection de concurrence (comme les vecteurs de version du module « Multi-leader et sans leader »), personne ne s'en apercevra.

**L'échec partiel.** L'écriture en base réussit, celle dans l'index échoue (timeout, index en maintenance). Les deux systèmes sont incohérents. Les rendre atomiques ensemble demande un commit atomique (commit en deux phases), coûteux et rarement disponible entre une base et un index.

La racine des deux problèmes : il y a **deux leaders**. Si l'on avait **un seul** leader (la base) et que l'index en était un **suiveur**, l'ordre serait celui de la base, partout.

## La capture des changements (CDC)

Le log de réplication d'une base a longtemps été un détail interne, sans API publique. La **capture des changements** (*change data capture*, CDC) consiste à observer toutes les écritures d'une base et à les extraire sous une forme réplicable vers d'autres systèmes, de préférence **comme un flux**, au moment où elles se produisent.

On capture les changements de la base et on les applique, **dans le même ordre**, à l'index de recherche : l'index finit dans le même état que la base. La base est le **système de référence** (le leader), l'index, le cache et l'entrepôt sont des **systèmes dérivés** (les suiveurs). Un broker à base de log est le transport idéal, puisqu'il **préserve l'ordre** dans une partition (la redistribution des files classiques le casserait, leçon 2).

Deux façons de l'implémenter :

- des **déclencheurs** (*triggers*) qui écrivent chaque changement dans une table de journal : fragile, et coûteux en performance ;
- la **lecture du log de réplication** : plus robuste, mais il faut gérer par exemple les changements de schéma.

Exemples : Databus (LinkedIn), Wormhole (Facebook), Sherpa (Yahoo!) à grande échelle ; Bottled Water pour PostgreSQL, qui décode le WAL ; Maxwell et Debezium pour MySQL, qui lisent le binlog ; Mongoriver pour l'oplog de MongoDB ; GoldenGate pour Oracle.

La CDC est en général **asynchrone** : la base n'attend pas que les consommateurs aient appliqué le changement. Avantage : ajouter un consommateur lent ne ralentit presque pas la base. Inconvénient : tous les problèmes de **retard de réplication** s'appliquent (un index peut montrer l'ancien nom d'un produit pendant quelques secondes).

## L'amorçage : le snapshot initial

Si tu avais le log de **tous** les changements depuis la création de la base, rejouer ce log reconstruirait tout. Mais garder tous les changements pour toujours prend trop de place, et les rejouer prendrait trop de temps : le log est tronqué.

Pour construire un **nouvel** index de recherche, il faut donc partir d'une **copie complète** : un **snapshot cohérent** de la base. Et ce snapshot doit correspondre à une **position connue** du log des changements, par exemple « snapshot pris à l'offset 182 340 ». Sinon, on ne sait pas d'où reprendre l'application des changements : trop tôt, on applique deux fois des écritures ; trop tard, on en manque. Certains outils de CDC intègrent cette étape, d'autres la laissent à ta charge.

## La compaction de log

Si l'on ne garde qu'un historique limité, il faut un snapshot à chaque nouveau consommateur. La **compaction de log** offre une alternative. On l'a vue dans le module « Stockage et index » pour les segments d'une base clé-valeur : une tâche de fond cherche les enregistrements de **même clé**, jette les doublons et ne garde que **la plus récente** mise à jour. Une suppression s'écrit avec une valeur **nulle**, une **tombstone**, qui finit par faire disparaître la clé.

Pour la CDC, la condition est simple : chaque changement porte une **clé primaire**, et chaque mise à jour **remplace** entièrement la valeur précédente de cette clé. Alors garder la dernière écriture de chaque clé suffit. Exemple : 10 millions d'écritures sur 200 000 produits, dont 5 000 supprimés ; après compaction, il reste 195 000 messages (les tombstones finissent aussi par partir). L'espace dépend du **contenu actuel** de la base, pas du **nombre d'écritures** passées.

Le bénéfice : pour reconstruire un index, on lance un **nouveau consommateur** à l'offset **0** du sujet compacté et on lit tout. On obtient une copie complète **sans** nouveau snapshot. Kafka propose cette fonction, ce qui permet d'utiliser un broker à base de log comme **stockage durable**, et pas seulement comme transport.

## Les bases s'ouvrent aux flux

De plus en plus de bases offrent les flux de changements comme une interface de premier ordre, au lieu de l'ajouter après coup : RethinkDB permet de s'abonner aux changements du résultat d'une requête ; Firebase et CouchDB synchronisent les données à partir d'un flux de changements, et Meteor s'appuie sur l'oplog de MongoDB pour faire de même ; VoltDB exporte en continu les données de ses transactions sous forme de flux. Et **Kafka Connect** fédère des connecteurs CDC pour de nombreuses bases vers Kafka, puis de Kafka vers des index et des entrepôts.

## Pièges fréquents

- **Écrire dans la base et dans l'index depuis le code** : deux leaders, des écritures concurrentes qui arrivent dans des ordres différents, une divergence silencieuse.
- **Prendre un snapshot sans noter sa position dans le log** : impossible de savoir d'où reprendre les changements.
- **Compacter un sujet dont les messages ne sont pas des valeurs complètes** : si un message dit « +1 au stock » plutôt que « stock = 12 », garder le dernier perd tout le reste.
- **Utiliser des triggers pour la CDC sur une base très sollicitée** : chaque écriture en coûte deux.
- **Oublier que la CDC est asynchrone** : l'index est en retard sur la base, et un utilisateur peut ne pas voir sa propre modification tout de suite.

## À retenir

- Une écriture en base est un événement ; le log de réplication est un flux.
- Les doubles écritures divergent (course, échec partiel) parce qu'il y a deux leaders.
- CDC : la base est le système de référence, tous les autres en sont des suiveurs alimentés dans l'ordre par un log.
- Un nouveau suiveur part d'un snapshot cohérent associé à une position du log.
- La compaction par clé (dernière valeur, tombstones) borne le log à la taille de la base et permet de tout reconstruire depuis l'offset 0.
