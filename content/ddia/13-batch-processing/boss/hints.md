## Hint 1
Rien dans le workflow ne parle à la base de production ou à un service en direct : il ne lit que des fichiers immuables dans HDFS (logs, instantané exporté, petite table).

## Hint 2
La petite table des catégories est lue par chaque tâche map (broadcast). Les comptes et les événements, eux, passent par le shuffle : les mappers écrivent des sorties triées locales, les reducers viennent les lire.

## Hint 3
Les reducers écrivent des fichiers neufs, jamais dans un serveur ni un cache. Les serveurs clé-valeur chargent ces fichiers et gardent la version d'hier ; l'application ne lit que les serveurs.
