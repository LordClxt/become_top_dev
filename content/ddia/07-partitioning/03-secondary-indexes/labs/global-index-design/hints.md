## Hint 1
L'index global est partitionné **par terme**, pas par identifiant : il lui faut ses propres partitions, distinctes de celles des données.

## Hint 2
Le service annonces n'écrit que dans les données ; ce sont les partitions de données qui mettent l'index à jour, en flèches asynchrones.

## Hint 3
La recherche fait deux lectures : la partition d'index (qui donne des identifiants), puis les partitions de données qui contiennent ces annonces.
