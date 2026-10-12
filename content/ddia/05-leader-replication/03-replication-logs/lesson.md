---
id: ddia-ch05-l03
title: Ce que contient le log de réplication
source:
  chapter: 5
  pages: 158-161
duration_min: 35
concepts:
- id: ddia-statement-replication
  label: 'Réplication par instructions : compacte mais cassée par les fonctions non déterministes, l''ordre et les effets de bord'
- id: ddia-wal-shipping
  label: 'Expédition du WAL : réplique exactement les octets, mais couple la réplication au moteur de stockage'
- id: ddia-logical-log
  label: 'Log logique (par ligne) : découplé du moteur, compatible entre versions, facile à lire par d''autres systèmes'
- id: ddia-trigger-replication
  label: 'Réplication par triggers : flexible, mais plus coûteuse et plus fragile'
- id: ddia-zero-downtime-upgrade
  label: Un log découplé du moteur permet de mettre à jour followers puis leader sans interruption
glossary:
- term: réplication par instructions
  definition: Le leader envoie chaque INSERT/UPDATE/DELETE aux followers, qui les rejouent.
- term: WAL shipping
  definition: Envoi du journal d'écriture anticipée du moteur de stockage aux followers.
- term: log logique (row-based)
  definition: Un log décrivant les changements au niveau de la ligne, indépendant du format physique.
- term: change data capture (CDC)
  definition: Exporter les changements d'une base vers un système externe en lisant son log.
visuals: []
labs:
- ddia-ch05-l03-lab-log-formats-design
extra: false
xp: 35
---

## Pourquoi c'est important

« Le leader envoie un log aux followers » : mais que contient ce log ? La réponse a des conséquences très concrètes : peut-on faire tourner des versions différentes de la base sur le leader et les followers ? Peut-on brancher un entrepôt de données ou un index de recherche sur le flux ? Quels bugs sournois vont apparaître ? Il y a quatre grandes approches.

## 1. La réplication par instructions

Le plus simple : le leader enregistre chaque requête qu'il exécute (`INSERT`, `UPDATE`, `DELETE`) et envoie ce journal d'instructions aux followers. Chacun l'analyse et l'exécute comme si elle venait d'un client. Cela paraît raisonnable, mais plusieurs choses cassent :

- toute instruction qui appelle une fonction **non déterministe** (`NOW()`, `RAND()`) donne une valeur différente sur chaque réplica ;
- si les instructions utilisent un **auto-incrément** ou dépendent des données existantes (`UPDATE … WHERE …`), elles doivent s'exécuter **exactement dans le même ordre** partout, ce qui limite les transactions concurrentes ;
- les instructions à **effets de bord** (triggers, procédures stockées, fonctions utilisateur) peuvent produire des effets différents sur chaque réplica, à moins d'être parfaitement déterministes.

On peut contourner (remplacer `NOW()` par une valeur fixe dans le log), mais les cas limites sont si nombreux qu'on préfère aujourd'hui d'autres méthodes. MySQL l'utilisait avant la version 5.1 et bascule automatiquement sur le mode par lignes dès qu'une instruction est non déterministe. VoltDB l'emploie, mais impose des transactions déterministes.

## 2. L'expédition du WAL

Au module 02, on a vu que presque tout moteur écrit d'abord dans un **log en ajout seul** : c'est le stockage principal d'un LSM-tree, et le journal de reprise (WAL) d'un B-tree. On peut utiliser **ce même log** pour construire un réplica : en plus de l'écrire sur disque, le leader l'envoie par le réseau. Le follower qui le rejoue obtient **exactement les mêmes structures de données**. C'est le cas dans PostgreSQL et Oracle.

L'inconvénient : le WAL décrit les données à un niveau très bas (quels octets ont changé dans quels blocs du disque). La réplication devient **étroitement couplée au moteur de stockage**. Si le format de stockage change d'une version à l'autre, on ne peut pas faire tourner des versions différentes sur le leader et les followers. Cela a un impact opérationnel important : si le follower peut avoir une version plus récente, on peut faire une **mise à jour sans interruption** (on met à jour les followers, puis on fait un failover vers l'un d'eux). Avec le WAL, c'est souvent impossible : il faut arrêter le service.

## 3. Le log logique (par lignes)

Troisième approche : un format de log **différent** du format de stockage, qu'on appelle log **logique** (par opposition au log physique du moteur). Pour une base relationnelle, c'est une suite d'enregistrements au niveau de la **ligne** :

- ligne insérée : les nouvelles valeurs de toutes les colonnes ;
- ligne supprimée : de quoi l'identifier (la clé primaire, sinon les anciennes valeurs de toutes les colonnes) ;
- ligne modifiée : de quoi l'identifier et les nouvelles valeurs (au moins des colonnes changées).

Une transaction qui modifie plusieurs lignes produit plusieurs enregistrements, suivis d'un enregistrement de validation (*commit*). C'est le `binlog` de MySQL en mode ligne. Comme il est **découplé du moteur**, il reste plus facilement rétrocompatible : leader et followers peuvent avoir des versions différentes, voire des moteurs différents. Il est aussi facile à lire par des programmes externes : un entrepôt de données, des index personnalisés, des caches. Cette technique s'appelle le **change data capture** (CDC), qu'on étudie au module 14.

## 4. La réplication par triggers

Les trois premières approches sont réalisées par le système de base de données, sans code applicatif. Parfois on veut plus de souplesse : ne répliquer qu'un sous-ensemble, répliquer vers un autre type de base, appliquer une logique de résolution de conflits. Il faut alors remonter la réplication **dans l'application**. Un **trigger** enregistre du code qui s'exécute à chaque changement et peut écrire le changement dans une table séparée, lue par un processus externe qui applique la logique voulue puis réplique (Databus pour Oracle, Bucardo pour Postgres). C'est plus coûteux, plus sujet aux bugs que la réplication native, mais flexible.


## Pièges fréquents

- **Croire que l'instruction SQL est un bon format de log.** Une seule fonction aléatoire suffit à faire diverger les réplicas.
- **Ignorer le couplage du WAL au moteur.** Une mise à jour de version mineure peut exiger un arrêt.
- **Oublier de loguer l'identifiant de la ligne supprimée** : sans clé primaire, il faut toutes les anciennes valeurs.
- **Utiliser des triggers par habitude** : ils ajoutent du code et du coût à chaque écriture.

## À retenir

- Par instructions : compact mais fragile (non-déterminisme, ordre, effets de bord).
- WAL : octets identiques, mais couplé au moteur, donc mises à jour souvent avec interruption.
- Log logique : par ligne, découplé, rétrocompatible, lisible de l'extérieur (CDC).
- Triggers : flexibilité applicative au prix du coût et des bugs.
