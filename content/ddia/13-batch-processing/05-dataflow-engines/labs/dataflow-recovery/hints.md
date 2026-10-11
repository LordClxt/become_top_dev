## Hint 1
Dans un workflow de N jobs, il y a N − 1 sorties intermédiaires ; HDFS les écrit chacune en 3 copies.

## Hint 2
Un tri n'est nécessaire que pour une jointure sort-merge ; une somme par clé se contente d'un repartitionnement par hachage ; une petite table se diffuse.

## Hint 3
Tout ce qui peut changer entre deux exécutions sur la même entrée rend l'opérateur non déterministe : ordre d'une map, horloge, aléatoire sans graine, source externe.
