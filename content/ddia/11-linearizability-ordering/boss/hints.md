## Hint 1
Une seule source d'ordre : le séquenceur, lui seul écrit dans le log ; les répliques le suivent par réplication. Son droit d'être leader vient d'un bail pris dans le service de coordination.

## Hint 2
L'e-mail est prévenu par la file, mais le compte est écrit par un autre chemin : deux canaux. Le worker doit lire là où l'écriture terminée est forcément visible.

## Hint 3
Aucun bloc qui départage par horloge (murale ou « dernière écriture gagne ») et aucun leader par région : ils donnent des numéros uniques ou des écritures disponibles, jamais un seul propriétaire.
