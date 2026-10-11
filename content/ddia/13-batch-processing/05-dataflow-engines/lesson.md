---
id: ddia-ch13-l05
title: "Au-delà de MapReduce : dataflow, recalcul, graphes"
source: { chapter: 10, pages: "419-436" }
duration_min: 45
concepts:
  - id: ddia-batch-materialization
    label: "Matérialiser chaque état intermédiaire dans HDFS : attente du traînard, mappers inutiles, réplication superflue"
  - id: ddia-batch-dataflow-engines
    label: "Moteurs de dataflow (Spark, Flink, Tez) : tout le workflow devient un graphe d'opérateurs, l'intermédiaire reste en mémoire ou sur disque local"
  - id: ddia-batch-recompute-lineage
    label: "Tolérance aux pannes par recalcul : on refait une partition perdue à partir de sa lignée (RDD de Spark) ou d'un point de contrôle (Flink)"
  - id: ddia-batch-determinism
    label: "Un opérateur recalculé doit redonner le même résultat : pas d'itération sur une table de hachage, d'aléatoire sans graine ni d'horloge"
  - id: ddia-batch-pregel-bsp
    label: "Pregel (BSP) : chaque sommet reçoit les messages de l'itération précédente, met à jour son état et en envoie d'autres"
  - id: ddia-batch-high-level-apis
    label: "API de haut niveau et déclaratives : l'optimiseur choisit la jointure, l'exécution vectorisée accélère le CPU"
glossary:
  - term: "matérialisation"
    definition: "Écrire entièrement un résultat intermédiaire (dans un fichier) au lieu de le transmettre en flux à l'étape suivante."
  - term: "opérateur"
    definition: "Dans un moteur de dataflow, une fonction de traitement (map, filtre, jointure…) reliée aux autres par des flux de données."
  - term: "lignée (lineage)"
    definition: "La trace des entrées et opérateurs qui ont produit une partition ; elle permet de la recalculer si elle est perdue."
  - term: "BSP (bulk synchronous parallel)"
    definition: "Modèle de calcul par itérations synchronisées ; Pregel l'applique aux graphes (Giraph, GraphX, Gelly)."
  - term: "exécution vectorisée"
    definition: "Traiter les données par lots de valeurs d'une colonne dans une boucle serrée, favorable aux caches et au SIMD."
visuals: []
labs: [ddia-ch13-l05-lab-dataflow-recovery]
xp: 40
---

## Pourquoi c'est important

MapReduce a ouvert la voie, mais presque plus personne n'écrit de MapReduce aujourd'hui. Spark, Flink et les entrepôts cloud l'ont remplacé en gardant ses idées et en corrigeant ses lourdeurs. Comprendre **ce qu'ils ont changé et pourquoi** t'aide à lire un plan d'exécution Spark, à régler une reprise sur panne, et à éviter le bug sournois d'un job non déterministe.

## Le coût de la matérialisation

Dans un workflow MapReduce, chaque job écrit sa sortie **complète** dans HDFS avant que le suivant ne la lise. Quand ce fichier sert à plusieurs équipes, c'est très bien. Mais souvent il ne sert qu'à passer au job suivant : c'est un simple **état intermédiaire**. Comparé aux pipes Unix, qui transmettent les données en flux à travers un petit tampon, ce choix coûte cher :

- **Attente du traînard.** Un job ne peut démarrer que lorsque **toutes** les tâches du précédent ont fini. Une tâche lente (une clé chaude, une machine fatiguée) bloque tout le workflow.
- **Mappers redondants.** Souvent, le mapper du job suivant ne fait que relire ce que le reducer précédent vient d'écrire et le repartitionner. On pourrait enchaîner directement les reducers.
- **Réplication superflue.** L'état intermédiaire est répliqué sur plusieurs machines (3 copies) alors qu'il est temporaire.

## Les moteurs de dataflow

**Spark**, **Tez** et **Flink** traitent **tout le workflow comme un seul job**, un graphe de flux de données. Au lieu d'alterner strictement map et reduce, on enchaîne des **opérateurs** (des fonctions, comme le mapper et le reducer, mais plus souples). Pour relier un opérateur au suivant, le moteur a plusieurs options :

- **repartitionner et trier** par clé, comme le shuffle de MapReduce (utile pour une jointure sort-merge ou un regroupement) ;
- **repartitionner sans trier**, quand un regroupement par hachage suffit ;
- **diffuser** (*broadcast*) la même sortie à toutes les partitions, comme pour un broadcast hash join.

Les gains :

- un **tri** n'a lieu que là où il est nécessaire, pas systématiquement entre chaque étape ;
- plus de **tâches map inutiles** : leur travail est fusionné dans l'opérateur précédent ;
- l'ordonnanceur voit **tout le graphe** et peut placer un consommateur sur la machine du producteur (localité) ;
- l'état intermédiaire reste **en mémoire ou sur disque local**, sans réplication dans HDFS ;
- un opérateur **démarre dès que ses entrées sont prêtes**, sans attendre la fin de toute l'étape ;
- les processus (JVM) sont **réutilisés** au lieu d'être relancés pour chaque tâche.

Les mêmes fonctions de map et de reduce tournent sans changement : on passe un workflow Pig ou Hive de MapReduce à Tez ou Spark par une simple option. Tez est une bibliothèque légère qui s'appuie sur le service de shuffle de YARN ; Spark et Flink sont de vrais frameworks, avec leur propre couche réseau, leur ordonnanceur et leurs API.

### Fini la matérialisation ? Pas tout à fait

Certains opérateurs doivent tout de même **consommer toute leur entrée** avant de produire : un **tri**, par exemple, ne peut pas sortir le premier élément avant d'avoir vu le dernier. Et la **sortie finale** du workflow est toujours écrite, durablement, dans HDFS : c'est ce que les utilisateurs liront.

## Tolérance aux pannes : recalculer

Sans état intermédiaire durable, que faire quand une machine tombe ? On **recalcule** la partie perdue à partir de ce qui existe encore : un état intermédiaire antérieur, ou les entrées d'origine, qui sont dans HDFS.

- **Spark** garde la **lignée** (*lineage*) de chaque donnée : ses RDD (*resilient distributed datasets*) savent de quelles partitions d'entrée et de quels opérateurs elles viennent.
- **Flink** prend des **points de contrôle** (*checkpoints*) de l'état de ses opérateurs, et repart du dernier.

Le piège : le **déterminisme**. Si un opérateur recalculé produit un résultat **différent** de celui qui a été perdu, et que des opérateurs en aval ont déjà consommé l'ancienne version, les deux versions se contredisent. Il faut alors tuer et relancer aussi l'aval. Pour l'éviter, un opérateur doit être déterministe : même entrée, même sortie. Sources classiques de non-déterminisme :

- **itérer sur une table de hachage** : en Go, l'ordre d'une `map` change d'une exécution à l'autre (exprès) ; en Java ou Python, il dépend aussi des réglages ;
- des nombres **aléatoires** sans graine fixe ;
- l'**horloge système** (`time.Now()` dans un calcul) ;
- une **source externe** lue pendant le calcul.

Si recalculer coûte trop cher (des données intermédiaires bien plus petites que l'entrée, ou un calcul très gourmand en CPU), mieux vaut **matérialiser** l'état intermédiaire.

## Graphes et traitement itératif

Le module 1 présentait les modèles en graphe pour les requêtes (OLTP). Le traitement par lots s'intéresse à des algorithmes sur **tout** le graphe : **PageRank**, propagation d'étiquettes, plus courts chemins. Ils sont **itératifs** : on répète une étape « jusqu'à ce que ce soit fini ». MapReduce le fait mal : chaque itération relit **tout** le jeu de données, même si seule une petite partie a changé.

D'où le modèle **Pregel** de Google, ou **BSP** (*bulk synchronous parallel*), implémenté par Apache Giraph, GraphX de Spark et Gelly de Flink :

- à chaque **itération**, une fonction est appelée **pour chaque sommet**, avec **tous les messages** qu'on lui a envoyés à l'itération précédente ;
- le sommet met à jour son **état**, qu'il garde **en mémoire** d'une itération à l'autre ;
- il **envoie des messages** à d'autres sommets, le long des arêtes en général ;
- les messages d'une itération ne sont livrés qu'à la suivante, et **exactement une fois** (le framework réessaie et déduplique).

C'est l'idée du mapper qui « envoie un message » au reducer, mais avec un état qui persiste. La tolérance aux pannes passe par des **points de contrôle** de l'état de tous les sommets à la fin d'une itération. Limite : on partitionne le graphe par identifiant de sommet arbitraire, sans regrouper les sommets voisins ; beaucoup de messages traversent le réseau. Si le graphe tient sur **une seule machine**, un algorithme mono-machine (GraphChi, par exemple) va souvent **plus vite** qu'un cluster.

## API de haut niveau

Écrire des jobs à la main est laborieux : Hive, Pig, Cascading et Crunch sont devenus populaires, et Spark et Flink offrent leurs propres API de dataflow, inspirées de FlumeJava. Elles se prêtent à l'usage **interactif** : on écrit un peu de code dans un shell, on regarde le résultat, on ajuste, comme avec Unix.

Le mouvement de fond va vers le **déclaratif** :

- si l'on exprime une jointure sous forme relationnelle (« joins ces deux entrées sur `user_id` ») plutôt que codée à la main, un **optimiseur fondé sur les coûts** choisit l'algorithme : broadcast si une entrée est petite, sort-merge sinon. Il peut même réordonner les jointures ;
- les filtres et projections simples permettent de lire **seulement les colonnes utiles** d'un format en colonnes (Parquet, module 3) ;
- l'**exécution vectorisée** (Hive, Spark DataFrames, Impala) parcourt les colonnes dans des boucles serrées, favorables aux caches du CPU ; Impala génère même du code machine à la volée (LLVM).

Les moteurs de lots se rapprochent ainsi des bases MPP en performance, tout en gardant la souplesse du code arbitraire. Et des bibliothèques spécialisées se développent dessus : apprentissage automatique (Mahout, MADlib), recherche de plus proches voisins, analyse génomique.

## Pièges fréquents

- **Produire la sortie en itérant sur une `map` Go** : le résultat change d'une exécution à l'autre, et un recalcul après panne contredit la version déjà consommée.
- **Utiliser `time.Now()` ou un aléatoire sans graine dans un opérateur** : même problème. Passe l'heure de référence et la graine en paramètres du job.
- **Croire que Spark ne touche jamais le disque** : les shuffles, les tris et la sortie finale y passent.
- **Lancer un cluster Pregel pour un graphe de 5 Go** : une seule machine fera souvent mieux.

## À retenir

- Matérialiser chaque étape coûte : traînards, mappers inutiles, réplication superflue.
- Spark, Flink, Tez : un graphe d'opérateurs, tri seulement si nécessaire, intermédiaire en mémoire ou sur disque local.
- Reprise par recalcul (lignée, points de contrôle) : exige des opérateurs déterministes.
- Pregel : itérations, état par sommet, messages livrés à l'itération suivante.
- API déclaratives : l'optimiseur choisit la jointure, l'exécution vectorisée accélère le CPU.
