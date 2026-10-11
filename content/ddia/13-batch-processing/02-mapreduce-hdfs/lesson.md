---
id: ddia-ch13-l02
title: "MapReduce et HDFS : Unix réparti sur mille machines"
source: { chapter: 10, pages: "397-403" }
duration_min: 40
concepts:
  - id: ddia-batch-hdfs
    label: "HDFS : un système de fichiers distribué sans partage, des blocs répliqués (ou à code d'effacement) suivis par un NameNode"
  - id: ddia-batch-mr-job-execution
    label: "Un job MapReduce : lire et découper les entrées, map, trier par clé, reduce"
  - id: ddia-batch-mr-shuffle
    label: "Partition par hachage de la clé, fichiers triés sur le disque des mappers, téléchargement et fusion par les reducers : le shuffle"
  - id: ddia-batch-data-locality
    label: "Amener le calcul près des données : lancer chaque tâche map sur une machine qui détient une réplique de son bloc"
  - id: ddia-batch-mr-workflows
    label: "Enchaîner des jobs via des répertoires : un job ne démarre que si le précédent a réussi ; ordonnanceurs et outils de haut niveau"
glossary:
  - term: "HDFS (Hadoop Distributed File System)"
    definition: "Réimplémentation open source du Google File System : chaque machine expose ses disques, un NameNode central sait quel bloc est où."
  - term: "mapper"
    definition: "Fonction appelée une fois par enregistrement d'entrée, sans état, qui émet zéro, une ou plusieurs paires clé-valeur."
  - term: "reducer"
    definition: "Fonction appelée une fois par clé, avec un itérateur sur toutes les valeurs émises pour cette clé."
  - term: "shuffle"
    definition: "Le transfert des paires des mappers vers les reducers, partitionnées par clé et triées ; malgré son nom, rien n'y est aléatoire."
  - term: "codage d'effacement (erasure coding)"
    definition: "Alternative à la réplication complète (Reed-Solomon) : on reconstruit un bloc perdu avec moins de surcoût de stockage que trois copies."
visuals: []
labs: [ddia-ch13-l02-lab-mapreduce-job]
xp: 40
---

## Pourquoi c'est important

MapReduce (Google, 2004) est un modèle assez rustre comparé aux bases parallèles des années 1980. Mais il a changé l'échelle du traitement de données : un même job tourne sur 1 ou 10 000 machines. Comprendre ses étapes (map, partition, tri, shuffle, reduce) te donne le vocabulaire de tous ses successeurs, de Spark à Flink et aux entrepôts cloud. Et c'est exactement ce que tu reconstruis dans le projet Tinybase de ce module.

## HDFS : le « fichier » de MapReduce

Un job MapReduce ressemble à un outil Unix : il ne modifie pas ses entrées, il produit des sorties, et il communique par des **fichiers**, cette fois sur un **système de fichiers distribué**. Dans Hadoop, c'est **HDFS**, réimplémentation du Google File System (d'autres existent : GlusterFS, QFS ; les stockages objet comme S3 jouent un rôle proche).

HDFS suit l'approche **sans partage** (*shared-nothing*) du module sur le partitionnement : pas de baie de disques coûteuse, juste des machines ordinaires reliées par un réseau de datacenter. Un démon tourne sur chaque machine et expose ses disques ; un serveur central, le **NameNode**, sait quel **bloc** de quel fichier se trouve sur quelle machine. Pour survivre aux pannes, chaque bloc est **répliqué** sur plusieurs machines (souvent 3), ou protégé par un **code d'effacement** (Reed-Solomon) qui coûte moins d'espace. C'est le principe du RAID, mais à travers le réseau. Les plus gros déploiements comptent des dizaines de milliers de machines et des centaines de pétaoctets.

## Les quatre étapes d'un job

Reprends l'analyse de logs de la leçon précédente. Un job MapReduce fait la même chose :

1. **Lire** les fichiers d'entrée et les **découper en enregistrements** (ici, une ligne de log). C'est le rôle du parseur d'entrée.
2. **Map** : extraire une clé et une valeur de chaque enregistrement (clé = URL, valeur = vide ou 1). C'est l'équivalent de `awk '{print $7}'`.
3. **Trier** toutes les paires par clé. C'est le `sort`, fait implicitement par le framework.
4. **Reduce** : parcourir les paires triées ; toutes les valeurs d'une même clé sont adjacentes, il suffit de les combiner (compter). C'est `uniq -c`.

Tu n'écris que deux fonctions :

- le **mapper**, appelé **une fois par enregistrement**, **sans état** d'un enregistrement à l'autre : il peut émettre zéro, une ou plusieurs paires ;
- le **reducer**, appelé **une fois par clé** avec toutes les valeurs de cette clé.

Pour un second tri (classer les URL par nombre de visites), il faut un **second job** : la sortie du premier devient l'entrée du second.

## Exécution répartie

La différence avec Unix : le parallélisme est automatique. Ton code ne sait rien du réseau.

- **Côté map.** L'entrée est en général un répertoire HDFS ; chaque fichier, ou chaque bloc de fichier, devient une **tâche map**. L'ordonnanceur essaie de lancer chaque tâche **sur une machine qui détient une réplique** du bloc : c'est **amener le calcul près des données**. Le code de l'application (un JAR, pour Hadoop) est copié sur ces machines. Exemple : 1 To d'entrée en blocs de 128 Mo, soit environ 8 000 tâches map.
- **Côté reduce.** Le nombre de tâches reduce est choisi par l'**auteur du job** (il peut différer du nombre de tâches map). Pour que toutes les paires d'une même clé arrivent au même reducer, le framework choisit le reducer avec un **hachage de la clé** (comme le partitionnement par hachage du module 7).
- **Le tri.** Le jeu de données est trop gros pour un tri sur une seule machine. Chaque tâche map **partitionne** sa sortie par reducer, puis écrit chaque partition dans un **fichier trié sur son disque local** (la technique des SSTables).
- **Le shuffle.** Quand un mapper a fini, les reducers se connectent à lui et **téléchargent** leur partition. Chaque reducer **fusionne** les fichiers triés reçus de tous les mappers, en gardant l'ordre : les valeurs d'une même clé deviennent adjacentes, même si elles viennent de mappers différents. Malgré son nom, le *shuffle* n'a rien d'aléatoire.
- **La sortie.** Le reducer écrit ses résultats dans un fichier du système de fichiers distribué, en général une partie par reducer, répliqué comme le reste.

## Les workflows

Un seul job MapReduce répond à peu de questions. On les **enchaîne** en **workflows** : le job 2 lit le répertoire que le job 1 a écrit. Contrairement à un pipe Unix, il n'y a pas de flux direct : la sortie intermédiaire est **matérialisée** dans des fichiers (la dernière leçon revient sur ce choix).

Règle importante : la sortie d'un job n'est **valide que s'il s'est terminé avec succès**. Un job ne démarre donc que lorsque tous ceux dont il dépend ont réussi. Des **ordonnanceurs** gèrent ces dépendances : Oozie, Azkaban, Luigi, Airflow, Pinball. Les workflows de 50 à 100 jobs sont courants pour un système de recommandation, et dans une grande organisation plusieurs équipes lisent les sorties des autres.

Écrire du MapReduce brut est laborieux : des outils de plus haut niveau (Pig, Hive, Cascading, Crunch, FlumeJava) génèrent automatiquement les étapes et leur enchaînement.

## Pièges fréquents

- **Garder un état dans le mapper** (un compteur global, un cache qui grossit) : le mapper doit traiter chaque enregistrement indépendamment, sinon le résultat dépend du découpage en tâches.
- **Croire qu'il y a autant de reducers que de mappers** : le nombre de tâches map suit les blocs d'entrée, celui des reducers est un paramètre du job.
- **Lire la sortie d'un job encore en cours** : elle n'est valide qu'à son succès ; un workflow attend la fin.
- **Oublier le coût du shuffle** : toutes les paires émises traversent le réseau ; un mapper qui émet 10 paires par ligne multiplie le volume transféré par 10.

## À retenir

- HDFS : sans partage, blocs répliqués (ou code d'effacement), un NameNode qui sait où est chaque bloc.
- Job = lire et découper → map → trier par clé → reduce. Tu n'écris que le mapper et le reducer.
- Partition par hachage de la clé, fichiers triés sur le disque des mappers, shuffle puis fusion chez les reducers.
- On lance le calcul là où sont les données ; on enchaîne les jobs via des répertoires, et un job n'attend que des entrées complètes.
