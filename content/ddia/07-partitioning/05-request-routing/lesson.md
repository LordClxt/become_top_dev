---
id: ddia-ch07-l05
title: "Router les requêtes et exécuter en parallèle"
source: { chapter: 6, pages: "214-218" }
duration_min: 30
concepts:
  - id: ddia-request-routing-approaches
    label: "Trois façons de trouver le bon nœud : contacter n'importe quel nœud qui transmet, passer par une couche de routage, ou un client qui connaît l'affectation"
  - id: ddia-zookeeper-partition-metadata
    label: "Un service de coordination (ZooKeeper) garde l'affectation partition → nœud faisant autorité ; nœuds et routeurs s'y abonnent"
  - id: ddia-gossip-routing
    label: "Protocole de bavardage (gossip) : les nœuds se transmettent les changements d'état du cluster, sans service externe (Cassandra, Riak)"
  - id: ddia-mpp-parallel-query
    label: "Les bases MPP découpent une requête analytique en étapes et en morceaux exécutés en parallèle sur les partitions"
  - id: ddia-partitioning-summary
    label: "Bilan : plage ou hachage, index local ou global, stratégie de rééquilibrage et routage se choisissent ensemble"
glossary:
  - term: "découverte de services (service discovery)"
    definition: "Problème général de savoir à quelle adresse joindre un service ; le routage des requêtes partitionnées en est un cas particulier."
  - term: "couche de routage (routing tier)"
    definition: "Équilibreur de charge qui connaît les partitions : il ne traite pas les requêtes, il les transmet au bon nœud."
  - term: "ZooKeeper"
    definition: "Service de coordination qui garde des métadonnées faisant autorité et notifie les abonnés quand elles changent."
  - term: "protocole de bavardage (gossip protocol)"
    definition: "Chaque nœud échange périodiquement son état avec quelques autres, jusqu'à ce que l'information se propage à tout le cluster."
  - term: "MPP (massively parallel processing)"
    definition: "Base relationnelle analytique qui exécute une même requête en parallèle sur de nombreux nœuds."
visuals: []
labs: [ddia-ch07-l05-lab-routing-design]
xp: 40
---

## Pourquoi c'est important

Les données sont réparties, le rééquilibrage les déplace de temps en temps. Reste une question très concrète : quand ton client veut lire la clé `user:42`, **à quelle adresse IP** envoie-t-il la requête ? L'affectation des partitions change, et quelqu'un doit savoir laquelle est en vigueur, même pendant un transfert. Se tromper, c'est lire au mauvais endroit ou écrire deux fois. C'est la dernière pièce du puzzle, et elle t'amène à ton premier service de **coordination**.

## Trois façons de trouver le bon nœud

C'est un cas particulier de la **découverte de services**, problème qui dépasse les bases de données : tout logiciel accessible par le réseau en a besoin, surtout s'il vise la haute disponibilité. Trois approches de haut niveau :

1. **Contacter n'importe quel nœud** (par exemple via un équilibreur de charge à tourniquet, *round-robin*). Si ce nœud possède la partition, il répond ; sinon, il **transmet** la requête au bon nœud, reçoit la réponse et la renvoie au client.
2. **Passer par une couche de routage** : toutes les requêtes vont d'abord à un composant dédié qui connaît l'affectation et transmet au bon nœud. Elle ne traite aucune requête elle-même : c'est un **équilibreur de charge qui connaît les partitions**.
3. **Rendre le client conscient des partitions** : il connaît l'affectation et se connecte directement au bon nœud, sans intermédiaire.

Dans les trois cas, le problème de fond est le même : **comment le composant qui décide apprend-il les changements d'affectation ?** Il faut que tous les participants soient d'accord, sinon des requêtes partent au mauvais nœud. C'est un problème de **consensus**, que le module « Consensus » traitera en profondeur ; ici, on regarde les solutions en pratique.

## ZooKeeper, le registre faisant autorité

Beaucoup de systèmes distribués s'appuient sur un **service de coordination** séparé comme **ZooKeeper** pour suivre les métadonnées du cluster :

- chaque nœud **s'enregistre** dans ZooKeeper ;
- ZooKeeper garde l'**affectation partition → nœud faisant autorité** ;
- les autres acteurs (la couche de routage, ou les clients conscients des partitions) **s'abonnent** à cette information ;
- quand une partition change de propriétaire, ou qu'un nœud arrive ou part, ZooKeeper **notifie** les abonnés, qui mettent à jour leur table de routage.

Exemple : la partition 17 migre du nœud A vers le nœud D pendant un rééquilibrage. Quand le transfert est fini, l'affectation change dans ZooKeeper ; la couche de routage reçoit la notification et envoie désormais les requêtes de la partition 17 à D. Pendant le transfert, A continuait de servir.

Qui fait quoi :

| Système | Mécanisme |
|---|---|
| Espresso (LinkedIn) | Helix, qui s'appuie sur ZooKeeper |
| HBase, SolrCloud, Kafka | ZooKeeper |
| MongoDB | ses propres serveurs de configuration, et des routeurs `mongos` |
| Cassandra, Riak | protocole de bavardage entre nœuds |
| Couchbase | pas de rééquilibrage automatique ; couche de routage `moxi` qui apprend les changements des nœuds |

## Le bavardage, sans service externe

Cassandra et Riak évitent la dépendance à un service externe. Les nœuds utilisent un **protocole de bavardage** (*gossip*) : chacun échange régulièrement son état avec quelques autres, et les changements finissent par atteindre tout le cluster. Les requêtes peuvent arriver à **n'importe quel nœud**, qui les transmet au bon (approche 1). Plus de complexité dans chaque nœud de la base, mais aucun composant externe à opérer ni à surveiller.

Et pour joindre la couche de routage ou un nœud au hasard ? Ces adresses changent peu : le **DNS** suffit généralement.

> **Aller plus loin.** Les systèmes récents remplacent souvent ZooKeeper par un consensus intégré : Kafka a remplacé ZooKeeper par KRaft (Raft interne) ; etcd, basé sur Raft, joue le même rôle pour Kubernetes ; CockroachDB stocke l'emplacement de ses plages dans des plages système répliquées. L'idée ne change pas : une seule source faisant autorité pour l'affectation.

## Exécuter une requête en parallèle

Jusqu'ici, on a parlé de requêtes simples qui lisent ou écrivent **une clé** (plus le scatter/gather des index locaux). C'est le niveau d'accès de la plupart des bases NoSQL distribuées.

Les bases relationnelles analytiques **MPP** (*massively parallel processing*) vont beaucoup plus loin. Une requête d'entrepôt de données (module « Analytique et stockage en colonnes ») contient des jointures, des filtres, des regroupements et des agrégations. L'optimiseur la découpe en **étapes** et en **morceaux** exécutés en **parallèle** sur différents nœuds, chaque nœud travaillant sur ses partitions. Les requêtes qui balayent de grandes portions des données en profitent énormément. Les techniques d'exécution parallèle seront détaillées avec le traitement par lots.

## Bilan du chapitre

Partitionner, c'est répartir données et charge pour dépasser une machine en évitant les points chauds. Il faut choisir un schéma adapté aux données, et rééquilibrer quand la flotte change.

- **Plage de clés** : clés triées, scans d'intervalle efficaces, mais risque de points chauds sur les accès voisins ; partitions souvent dynamiques (découpage en deux).
- **Hachage** : répartition uniforme, mais plus de scans d'intervalle ; souvent un nombre fixe de partitions, mais le dynamique est possible. Hybride : clé composée.
- **Index secondaires** : locaux (écriture simple, lecture scatter/gather) ou globaux (lecture ciblée, écriture sur plusieurs partitions, souvent asynchrone).
- **Routage** : du simple équilibreur conscient des partitions au moteur parallèle complet.

Chaque partition fonctionne surtout de façon indépendante. Mais une écriture qui touche **plusieurs** partitions (un index global, un transfert entre deux comptes) pose une question difficile : que se passe-t-il si elle réussit ici et échoue là ? C'est le sujet des transactions, juste après.

## Pièges fréquents

- **Coder en dur les adresses des nœuds dans le client** : au premier rééquilibrage, les requêtes partent au mauvais endroit.
- **Laisser chaque routeur décider seul de l'affectation** : sans source faisant autorité, deux routeurs peuvent avoir des avis différents.
- **Oublier que la couche de routage est un composant à rendre disponible** : elle aussi doit être redondante.
- **Croire qu'une base NoSQL fait des jointures parallèles comme une base MPP** : la plupart ne servent que des accès par clé.

## À retenir

- Trouver le bon nœud : n'importe quel nœud qui transmet, une couche de routage, ou un client conscient des partitions.
- Tous doivent connaître la même affectation : ZooKeeper (HBase, Kafka, SolrCloud), des serveurs de config (MongoDB) ou le bavardage (Cassandra, Riak).
- Les nœuds s'enregistrent, les routeurs s'abonnent, et les changements sont notifiés.
- Les bases MPP exécutent une même requête analytique en parallèle sur toutes les partitions.
