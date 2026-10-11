## Hint 1
Place la table et l'index dans la même zone « Nœud PostgreSQL ». Le service **lit** le créneau par l'index et **écrit** dans la table.

## Hint 2
Redis exécute un script Lua d'un bloc, sur un seul thread : c'est de l'exécution en série. Pense à son rôle : il est ici la source de vérité des quotas, pas un cache.

## Hint 3
Sous SSI, une longue lecture seule ne prend aucun verrou : les rapports peuvent lire la table directement. Les quatre derniers blocs de la palette sont des pièges.
