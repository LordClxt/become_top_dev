## Hint 1
Pour placer les tâches près des données, l'ordonnanceur doit d'abord savoir où sont les blocs : il interroge le NameNode.

## Hint 2
Un mapper n'envoie rien directement à un reducer : il écrit sa sortie triée sur son disque local, et ce sont les reducers qui viennent la lire (le shuffle).

## Hint 3
Chaque reducer lit la sortie triée de **chaque** mapper (une partition par reducer), puis écrit dans le répertoire de sortie. Aucune base de production, aucun stockage central : HDFS est sans partage.
