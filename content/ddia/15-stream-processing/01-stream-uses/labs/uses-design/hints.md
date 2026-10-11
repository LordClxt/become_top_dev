## Hint 1
Demande-toi à chaque fois ce qui est persistant : la requête, l'agrégat, ou une copie des données.

## Hint 2
Ensemble exact : nombre d'identifiants × taille d'un identifiant. Un HyperLogLog a une taille fixe, quel que soit le nombre de visiteurs.

## Hint 3
Une vue qui doit refléter un état (un profil, un solde, un catalogue) a besoin de tous les changements, pas seulement des dernières minutes.
