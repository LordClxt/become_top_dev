---
id: ddia-ch07-l05
title: Router les requêtes vers la bonne partition
source:
  chapter: 6
  pages: 214-217
duration_min: 30
concepts:
- id: ddia-service-discovery
  label: Savoir à quel nœud envoyer une requête est un problème de découverte de service, qui change avec le rééquilibrage
- id: ddia-routing-approaches
  label: 'Trois approches : nœud quelconque qui transmet, couche de routage, client conscient des partitions'
- id: ddia-coordination-service
  label: Un service de coordination (ZooKeeper) tient l'affectation partitions → nœuds et notifie les acteurs
- id: ddia-gossip
  label: Cassandra et Riak propagent l'état du cluster par protocole de bavardage (gossip), sans service externe
- id: ddia-mpp
  label: Les bases MPP décomposent une requête d'analyse en étapes parallèles sur plusieurs partitions
glossary:
- term: découverte de service
  definition: Trouver l'adresse du processus qui peut traiter une demande ; problème plus général que les bases de données.
- term: ZooKeeper
  definition: Service de coordination qui garde l'affectation autoritaire des partitions aux nœuds et prévient les abonnés.
- term: gossip
  definition: Protocole par lequel les nœuds diffusent entre eux les changements d'état du cluster.
- term: MPP (massively parallel processing)
  definition: Base relationnelle analytique qui exécute les étapes d'une requête en parallèle sur plusieurs nœuds.
visuals: []
labs:
- ddia-ch07-l05-lab-routing-design
- ddia-ch07-l05-lab-routing-tier-design
extra: false
xp: 30
---

## Pourquoi c'est important

Les données sont réparties sur plusieurs nœuds. Quand un client fait une requête, **comment sait-il à quel nœud se connecter** ? Et comme les partitions sont rééquilibrées, l'affectation change. Quelqu'un doit suivre ces changements pour répondre : « si je veux lire ou écrire la clé *foo*, à quelle adresse IP et quel port dois-je me connecter ? » C'est un cas particulier du problème de la **découverte de service**, qui ne se limite pas aux bases de données : tout logiciel accessible par le réseau et visant la haute disponibilité (exécuté en configuration redondante sur plusieurs machines) l'a.

## Trois approches

1. **Laisser les clients contacter n'importe quel nœud** (par exemple via un répartiteur de charge en tourniquet). Si ce nœud possède par hasard la partition visée, il traite la requête. Sinon, il la **transmet** au bon nœud, reçoit la réponse et la renvoie au client.
2. **Envoyer toutes les requêtes à une couche de routage** qui détermine le nœud responsable et lui transmet la requête. Cette couche ne traite pas elle-même les requêtes : c'est un répartiteur de charge **conscient des partitions**.
3. **Exiger que les clients connaissent le partitionnement** et l'affectation des partitions aux nœuds. Un client se connecte alors directement au bon nœud, sans intermédiaire.


Dans tous les cas, la question clé est : **comment le composant qui décide du routage** (un nœud, la couche de routage, ou le client) **apprend-il les changements d'affectation** ? C'est difficile, car tous les participants doivent être d'accord : sinon des requêtes iraient aux mauvais nœuds. Il existe des protocoles de consensus, mais ils sont difficiles à implémenter correctement (module 12).

### Le service de coordination

Beaucoup de systèmes s'appuient sur un **service de coordination** distinct comme **ZooKeeper** pour suivre ces métadonnées du cluster. Chaque nœud s'y enregistre, et ZooKeeper garde l'affectation **autoritaire** des partitions aux nœuds. Les autres acteurs, comme la couche de routage ou le client conscient des partitions, s'y **abonnent**. Chaque fois qu'une partition change de propriétaire, ou qu'un nœud est ajouté ou retiré, ZooKeeper prévient la couche de routage, qui garde ses informations à jour.

Exemples : Espresso de LinkedIn utilise Helix pour la gestion du cluster (qui s'appuie sur ZooKeeper) avec une couche de routage. HBase, SolrCloud et Kafka utilisent aussi ZooKeeper pour suivre l'affectation. MongoDB a une architecture similaire avec ses propres serveurs de configuration et ses démons *mongos* comme couche de routage.

### Le bavardage (gossip)

Cassandra et Riak font autrement : un **protocole de gossip** entre les nœuds diffuse tout changement d'état du cluster. Les requêtes peuvent être envoyées à n'importe quel nœud, qui les transmet au bon nœud (approche 1). Ce modèle met davantage de complexité dans les nœuds, mais évite la dépendance à un service de coordination externe. Couchbase ne rééquilibre pas automatiquement, ce qui simplifie la conception : il est normalement configuré avec une couche de routage, *moxi*, qui apprend les changements de routage des nœuds du cluster.

Quand on utilise une couche de routage ou un nœud au hasard, les clients doivent encore trouver les **adresses IP** à joindre. Elles changent moins vite que l'affectation des partitions, donc un simple **DNS** suffit souvent.

## Exécution parallèle de requêtes

Jusqu'ici, on a vu des requêtes simples (lire ou écrire une clé, plus le scatter/gather des index par document), le niveau de la plupart des bases NoSQL distribuées. Les bases relationnelles à **traitement massivement parallèle** (MPP), utilisées pour l'analytique, sont bien plus sophistiquées. Une requête typique d'entrepôt contient plusieurs jointures, filtres, regroupements et agrégations. L'optimiseur MPP la décompose en **étapes d'exécution** et en partitions, dont beaucoup s'exécutent **en parallèle sur différents nœuds**. Les requêtes qui parcourent de grandes parties du jeu de données en profitent particulièrement. On reverra des techniques d'exécution parallèle au module 13.

## Pièges fréquents

- **Une table de routage obsolète** : le client envoie à l'ancien propriétaire. Il faut une version et refuser les anciennes tables (tu le codes dans le projet).
- **Un service de coordination point unique de défaillance** : il doit lui-même être répliqué.
- **Mélanger l'adresse IP et l'affectation des partitions** : la seconde change bien plus vite.
- **Router côté client sans protocole de mise à jour** : tous les clients doivent converger.

## À retenir

- Trois approches : nœud quelconque qui transmet, couche de routage, client conscient.
- Le point difficile : tous doivent s'accorder sur l'affectation courante ; ZooKeeper la centralise, le gossip la diffuse.
- DNS pour les adresses, qui changent moins vite que l'affectation des partitions.
- Les requêtes d'analyse sont décomposées en étapes parallèles (MPP).
