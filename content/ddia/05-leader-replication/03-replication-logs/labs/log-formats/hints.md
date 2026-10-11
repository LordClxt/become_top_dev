## Hint 1
Une heure ou un nombre aléatoire différents selon le réplica : c'est une instruction réexécutée. Une incompatibilité de version entre leader et followers : c'est un log trop proche du disque.

## Hint 2
Le log logique écrit un enregistrement par ligne modifiée, plus un enregistrement de commit par transaction.

## Hint 3
Taille = nombre d'enregistrements × taille d'un enregistrement. Convertis les octets en Mo en divisant par 1 000 000.
