---
id: ddia-ch07-l04
title: 'Rééquilibrer : ajouter et retirer des nœuds'
source:
  chapter: 6
  pages: 209-214
duration_min: 45
concepts:
- id: ddia-rebalancing
  label: 'Rééquilibrer : déplacer des données et des requêtes d''un nœud à un autre ; équité, disponibilité continue, déplacements minimaux'
- id: ddia-hash-mod-n
  label: 'À ne pas faire : hash mod N déplace presque toutes les clés quand N change'
- id: ddia-fixed-partitions
  label: 'Nombre fixe de partitions : beaucoup plus de partitions que de nœuds ; le nouveau nœud vole des partitions entières'
- id: ddia-dynamic-partitioning
  label: 'Partitionnement dynamique : on découpe une partition trop grosse, on fusionne les petites ; pré-découpage pour démarrer'
- id: ddia-proportional-partitioning
  label: 'Partitions proportionnelles aux nœuds (Cassandra) : nombre fixe de partitions par nœud, un nouveau nœud en découpe au hasard'
- id: ddia-auto-vs-manual
  label: 'Rééquilibrage automatique ou manuel : l''automatique + détection de pannes peut provoquer une panne en cascade'
glossary:
- term: rééquilibrage (rebalancing)
  definition: Le processus de déplacement de charge d'un nœud à un autre du cluster.
- term: pré-découpage (pre-splitting)
  definition: Configurer un ensemble initial de partitions sur une base vide pour éviter qu'un seul nœud reçoive tout au début.
- term: panne en cascade
  definition: Une surcharge entraîne un rééquilibrage qui surcharge encore plus le système.
visuals: []
labs:
- ddia-ch07-l04-lab-rebalancing-design
extra: false
xp: 45
---

## Pourquoi c'est important

Au fil du temps tout change : le débit augmente (il faut plus de CPU), le jeu de données grossit (plus de disques et de RAM), une machine tombe (les autres reprennent ses tâches). Tout cela exige de **déplacer données et requêtes d'un nœud à un autre**. C'est le **rééquilibrage**. Mal fait, il rend le cluster inutilisable pendant des heures.

Quel que soit le schéma, on attend au minimum trois choses :

- après le rééquilibrage, la charge (stockage, lectures, écritures) est **répartie équitablement** entre les nœuds ;
- pendant le rééquilibrage, la base **continue d'accepter lectures et écritures** ;
- on ne déplace **pas plus de données que nécessaire**, pour aller vite et limiter la charge réseau et disque.

## Comment ne pas faire : hash mod N

Quand on partitionne par hachage, on découpe l'espace des hachages en plages. On pourrait se demander : pourquoi pas simplement `hash(key) mod N` (N nœuds numérotés de 0 à N−1) ? C'est facile, mais **dès que N change, presque toutes les clés doivent changer de nœud**. Exemple : `hash(key) = 123456`. Avec 10 nœuds, la clé est sur le nœud 6 (123456 mod 10 = 6). Avec 11 nœuds, elle passe au nœud 3 (mod 11 = 3), avec 12 nœuds au nœud 0. Ces déplacements fréquents rendent le rééquilibrage excessivement coûteux. Il faut une approche qui ne déplace pas les données plus que nécessaire.

> **Le chiffre à retenir.** Quand on passe de 10 à 11 nœuds, une clé garde le même nœud avec une probabilité d'environ 9 % (10 cas sur 110) : **près de 91 % des clés bougent**.

## Nombre fixe de partitions

Solution simple : créer **beaucoup plus de partitions que de nœuds**, et affecter plusieurs partitions à chaque nœud. Un cluster de 10 nœuds peut être découpé en 1 000 partitions dès le départ : environ 100 par nœud. Si on ajoute un nœud, il **vole quelques partitions à chaque nœud existant** jusqu'à une répartition équitable. Si on en retire un, l'inverse. **Seules des partitions entières** sont déplacées. Le nombre de partitions et l'affectation des clés aux partitions ne changent pas : seule change l'affectation partitions → nœuds. Ce changement n'est pas instantané (il faut du temps pour transférer les données), donc l'ancienne affectation sert aux lectures et écritures pendant le transfert. On peut même tenir compte de matériel inégal : des nœuds plus puissants reçoivent plus de partitions.

C'est utilisé par Riak, Elasticsearch, Couchbase et Voldemort. Le nombre de partitions est généralement fixé à l'installation. Il est donc le **nombre maximal de nœuds** que tu pourras avoir : il faut le choisir assez grand pour la croissance future. Mais chaque partition a un coût de gestion : trop grand est contre-productif. La difficulté vient de la taille : chaque partition contient une fraction fixe des données, donc sa taille croît avec le volume total. Trop grandes, elles rendent le rééquilibrage et la reprise sur panne coûteux ; trop petites, elles ont trop de surcoût. Il est dur d'atteindre la taille « juste » quand le volume de données varie beaucoup.

## Partitionnement dynamique

Avec le partitionnement par plage de clés, un nombre fixe de partitions aux bornes fixes serait très gênant : mal placer les bornes peut mettre toutes les données dans une partition et laisser les autres vides. Les bases par plage comme HBase et RethinkDB créent donc leurs partitions **dynamiquement**. Quand une partition dépasse une taille configurée (par défaut 10 Go sur HBase), elle est **découpée en deux** pour qu'environ la moitié des données soit de chaque côté. Inversement, si beaucoup de données sont supprimées et qu'une partition passe sous un seuil, elle est **fusionnée** avec sa voisine (comme au sommet d'un B-tree). Après un découpage, une des deux moitiés peut être transférée à un autre nœud.

**Avantage** : le nombre de partitions s'adapte au volume de données. Peu de données, peu de partitions, peu de surcoût ; énormément de données, la taille de chaque partition est bornée par un maximum configurable. **Réserve** : une base vide démarre avec **une seule partition**, faute de savoir où tracer les bornes. Tant que le jeu de données est petit (jusqu'au premier découpage), toutes les écritures passent par un seul nœud pendant que les autres sont inactifs. D'où le **pré-découpage** (HBase, MongoDB) : configurer un ensemble initial de partitions sur une base vide, ce qui exige de connaître la distribution des clés. Le partitionnement dynamique marche aussi avec le hachage (MongoDB depuis la 2.4 supporte les deux).

## Partitions proportionnelles aux nœuds

Avec un découpage dynamique, le nombre de partitions est proportionnel à la taille des données ; avec un nombre fixe, la taille de chaque partition est proportionnelle au volume. Dans les deux cas, le nombre de partitions est **indépendant** du nombre de nœuds. Troisième option, utilisée par Cassandra et Ketama : un **nombre fixe de partitions par nœud**. La taille de chaque partition croît avec le volume tant que le nombre de nœuds ne change pas ; quand on ajoute des nœuds, les partitions rapetissent. Comme un gros volume appelle plus de nœuds, la taille des partitions reste assez stable.

Quand un nouveau nœud rejoint, il **choisit au hasard** un nombre fixe de partitions existantes à découper (256 par nœud par défaut dans Cassandra) et prend en charge **une moitié de chacune**, laissant l'autre en place. Le hasard peut donner des découpages injustes, mais moyenné sur beaucoup de partitions, le nouveau nœud prend une part équitable. Choisir des bornes au hasard exige le partitionnement par hachage ; cette approche correspond au mieux à la définition originale du *consistent hashing*.

## Automatique ou manuel ?

Y a-t-il un humain dans la boucle ? Il y a un continuum entre le rééquilibrage **entièrement automatique** (le système décide seul quand déplacer des partitions) et **entièrement manuel** (l'administrateur configure l'affectation). Couchbase, Riak et Voldemort génèrent une affectation suggérée mais demandent à un administrateur de la valider.

L'automatique est pratique (moins de travail d'exploitation), mais **imprévisible**. Rééquilibrer coûte cher : il faut re-router des requêtes et déplacer beaucoup de données. Mal fait, cela peut surcharger le réseau ou les nœuds et dégrader les autres requêtes. Combiné à la **détection automatique de pannes**, c'est dangereux : un nœud surchargé répond lentement, les autres le jugent mort et rééquilibrent le cluster pour le délester. Cela ajoute de la charge au nœud surchargé, aux autres et au réseau, **aggrave** la situation et peut provoquer une **panne en cascade**. Garder un humain dans la boucle est plus lent mais évite les surprises.


## Pièges fréquents

- **Utiliser hash mod N** : un ajout de nœud rend le cluster inutilisable le temps du transfert.
- **Choisir un nombre fixe de partitions trop petit** : il plafonne le nombre de nœuds.
- **Oublier le pré-découpage** d'une base par plage : tout sur un nœud au démarrage.
- **Automatiser le rééquilibrage et la détection de panne** sans garde-fou : panne en cascade.

## À retenir

- Objectifs : équité, disponibilité pendant le déplacement, déplacer le minimum.
- hash mod N : à proscrire. Partitions fixes : le nouveau nœud vole des partitions entières. Dynamique : découpe et fusion. Proportionnelle : partitions par nœud.
- Un humain dans la boucle évite les cascades.
