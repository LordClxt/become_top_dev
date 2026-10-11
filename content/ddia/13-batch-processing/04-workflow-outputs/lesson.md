---
id: ddia-ch13-l04
title: "La sortie des workflows et la philosophie Hadoop"
source: { chapter: 10, pages: "411-419" }
duration_min: 40
concepts:
  - id: ddia-batch-output-search-index
    label: "Construire un index de recherche par lots : chaque reducer indexe une partition, les fichiers d'index sont immuables"
  - id: ddia-batch-output-kv-files
    label: "Produire une base clé-valeur en fichiers neufs dans le job, chargés d'un bloc par les serveurs, plutôt qu'écrire enregistrement par enregistrement"
  - id: ddia-batch-immutable-rerun
    label: "Entrées immuables et sortie remplacée : on revient en arrière et on relance sans risque (tolérance aux erreurs humaines)"
  - id: ddia-batch-hadoop-vs-mpp
    label: "Hadoop vs bases MPP : diversité du stockage (données brutes, schéma à la lecture) et des modèles de traitement"
  - id: ddia-batch-task-level-recovery
    label: "Conçu pour les pannes fréquentes : on relance une tâche, pas toute la requête, car les tâches peuvent être préemptées"
glossary:
  - term: "index inversé"
    definition: "Pour chaque terme, la liste des documents qui le contiennent ; la structure d'un moteur comme Lucene."
  - term: "chargement en masse (bulk loading)"
    definition: "Charger d'un bloc des fichiers de base préparés hors ligne, au lieu d'insérer les enregistrements un par un."
  - term: "base MPP (massively parallel processing)"
    definition: "Base analytique répartie (Teradata, Gamma…) qui exécute des requêtes SQL en parallèle sur de nombreuses machines."
  - term: "principe du sushi"
    definition: "« Les données brutes, c'est meilleur » : on stocke tel quel et on interprète plus tard (schéma à la lecture)."
  - term: "préemption"
    definition: "Un ordonnanceur tue une tâche de basse priorité pour libérer des ressources au profit d'une tâche plus prioritaire."
visuals: []
labs: [ddia-ch13-l04-lab-batch-output]
xp: 40
---

## Pourquoi c'est important

Un job de lots n'est utile que si quelqu'un se sert de sa sortie. Ce n'est en général ni un rapport SQL (ça, c'est l'entrepôt de données du module 3) ni une transaction : c'est une **structure** qui alimente une application, comme un index de recherche ou une base de recommandations. La façon de publier cette sortie décide si une erreur de code se répare en 10 minutes ou corrompt la production.

## Construire un index de recherche

Google a créé MapReduce pour **reconstruire l'index** de son moteur de recherche (un workflow de 5 à 10 jobs à l'époque). Hadoop sert encore à construire des index Lucene ou Solr. Le principe :

- les mappers **partitionnent** l'ensemble des documents ;
- chaque reducer **construit l'index** (un index inversé : terme → liste de documents) de sa partition ;
- les fichiers d'index sont écrits dans le système de fichiers distribué, puis **ne bougent plus** : ils sont **immuables**.

Quand les documents changent, on peut relancer tout le workflow et remplacer l'ancien index d'un bloc. C'est coûteux si peu de documents ont changé, mais simple à raisonner : document en entrée, index en sortie. Autre option : l'indexation **incrémentale**, où Lucene écrit de nouveaux segments et les fusionne en arrière-plan (les SSTables et la compaction du module 2).

## Produire une base clé-valeur

Autre usage courant : des **classifieurs** (spam, fraude, anomalies) ou des **recommandations** (« personnes que tu pourrais connaître »). Le résultat est une base : on y cherche un `user_id` pour obtenir ses amis suggérés. Mais l'application web qui la consulte vit **hors** du cluster Hadoop. Comment la sortie du job y arrive-t-elle ?

L'idée naïve est d'**écrire directement** dans la base de production depuis le mapper ou le reducer, enregistrement par enregistrement. C'est une mauvaise idée :

- **Lent.** Une requête réseau par enregistrement, quand une tâche sait traiter des centaines de milliers d'enregistrements par seconde. Le traitement par lots devient un traitement ligne à ligne.
- **Dangereux pour la base.** Si 2 000 tâches écrivent en même temps, la base est submergée et les requêtes des utilisateurs ralentissent.
- **Pas tout-ou-rien.** MapReduce garantit qu'un job qui réussit a une sortie équivalente à une exécution sans panne ; mais une tâche relancée ou un job qui échoue à moitié laisse des **effets de bord visibles** de l'extérieur, en double ou partiels.

La bonne approche : **construire une base de données toute neuve dans le job**, sous forme de fichiers écrits dans le répertoire de sortie, puis **charger ces fichiers d'un bloc** dans des serveurs qui les servent en lecture seule. Voldemort, Terrapin, ElephantDB et le chargement en masse de HBase fonctionnent ainsi. Construire ces fichiers est rapide (le job trie déjà les clés, ce qui est exactement ce qu'il faut pour un index). Pendant le chargement, Voldemort continue de servir l'ancienne version, puis bascule **atomiquement** ; si la nouvelle est mauvaise, il **rebascule** sur l'ancienne, qui est toujours là.

## La philosophie de sortie des lots

On retrouve la philosophie Unix : les entrées ne sont jamais modifiées, la sortie remplace entièrement la précédente, et il n'y a pas d'autre effet de bord. Les conséquences sont puissantes :

- **Tolérance aux erreurs humaines.** Tu déploies un bug qui produit des recommandations absurdes ? Reviens au code précédent, relance le job : la sortie redevient correcte. Avec une base modifiée en place, un bug corrompt des données que rien ne répare. Le livre parle de **minimiser l'irréversibilité**, et donc d'aller plus vite : on ose déployer.
- **Relances automatiques sûres.** Une tâche qui échoue est simplement relancée sur la même entrée ; une sortie partielle est jetée.
- **Mêmes fichiers, plusieurs usages.** Un même ensemble d'entrées sert à plusieurs jobs, y compris de supervision qui comparent la sortie à la précédente.
- **Séparation de la logique et du câblage.** Une équipe écrit le job, une autre décide où et quand il tourne.

## Hadoop comparé aux bases MPP

Tout cela ressemble aux bases **MPP** (Teradata, Gamma, des années 1980) qui exécutaient déjà jointures et regroupements en parallèle. La différence : une base MPP est un système intégré centré sur les requêtes SQL analytiques, alors que MapReduce plus HDFS ressemblent plutôt à un **système d'exploitation** généraliste sur lequel on lance n'importe quel programme.

- **Diversité du stockage.** Une base exige de modéliser les données avant de les charger. HDFS accepte n'importe quels octets : on **déverse** les données brutes, et on décide plus tard comment les interpréter (le schéma à la lecture du module 1). C'est le **principe du sushi** : *raw data is better*. Collecter vite devient possible, l'interprétation est l'affaire du consommateur : c'est l'idée du *data lake*. On peut toujours ensuite transformer vers un format relationnel ou en colonnes (Parquet).
- **Diversité des modèles de traitement.** SQL ne suffit pas à tout : apprentissage automatique, construction d'index, analyse d'images exigent du code arbitraire. Sur le même cluster cohabitent Hive (SQL sur MapReduce), Impala (SQL MPP lisant HDFS), HBase (accès aléatoire OLTP) et du code sur mesure. Pas besoin de déplacer les données entre systèmes spécialisés.
- **Conception pour les pannes fréquentes.** Une base MPP qui perd une machine en pleine requête **annule toute la requête** et la relance : raisonnable pour des requêtes de quelques secondes ou minutes. MapReduce tolère la perte d'une **tâche** en ne relançant **que cette tâche**, et écrit volontiers sur disque pour cela. Pourquoi ? Pas parce que le matériel tombe souvent en panne, mais parce que chez Google les tâches de lots tournent en **basse priorité** sur des machines partagées avec des services en ligne, et peuvent être **préemptées** à tout moment. Une tâche d'une heure y avait environ 5 % de risque d'être tuée. Dans un cluster sans préemption, ce choix de conception se justifie beaucoup moins.

## Pièges fréquents

- **Écrire dans la base de production depuis un reducer** : lent, risqué, et une relance de tâche produit des doublons visibles.
- **Écraser l'ancienne sortie avant d'avoir validé la nouvelle** : tu perds la possibilité de rebasculer.
- **Croire que MapReduce écrit tant sur disque parce que le matériel est fragile** : c'est la préemption qui justifie ce choix, pas les pannes de disques.
- **Déverser des données brutes sans jamais documenter leur sens** : le schéma à la lecture déplace le travail, il ne le supprime pas.

## À retenir

- Sorties typiques : index de recherche, bases clé-valeur de classifieurs et de recommandations.
- Construire des fichiers neufs et immuables dans le job, puis les charger d'un bloc ; jamais d'écritures enregistrement par enregistrement vers la production.
- Entrées immuables + sortie remplacée = on revient en arrière en relançant : tolérance aux erreurs humaines.
- Hadoop vs MPP : stockage brut, traitements variés, reprise au niveau de la tâche (motivée par la préemption).
