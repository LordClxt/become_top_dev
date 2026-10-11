## Hint 1
Un verrou sur l'entrée `7` de l'index `room_id` couvre toutes les réservations de la salle 7, quelle que soit l'heure. Un verrou sur la plage 14 h–15 h de l'index `start_time` couvre toutes les salles sur ce créneau.

## Hint 2
Une modification est comparée par son ancienne **et** sa nouvelle valeur. Un « faux conflit » est une écriture bloquée alors qu'elle ne change pas le résultat de la recherche de A.

## Hint 3
Coût du prédicat exact : nombre de prédicats × coût d'une comparaison. Faux conflits : parmi les réservations de la salle 7, quelle part tombe hors du créneau protégé ?
