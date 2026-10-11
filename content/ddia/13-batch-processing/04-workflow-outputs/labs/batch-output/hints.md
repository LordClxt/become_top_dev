## Hint 1
Le workflow ne lit jamais la base de production : il lit un instantané dans HDFS, que la base a exporté.

## Hint 2
Le workflow n'écrit dans aucun serveur : il écrit des fichiers neufs dans HDFS. Ce sont les serveurs clé-valeur qui viennent les charger.

## Hint 3
Pour pouvoir rebasculer, les serveurs gardent aussi l'accès aux fichiers de la version précédente. L'application web ne lit que les serveurs clé-valeur.
