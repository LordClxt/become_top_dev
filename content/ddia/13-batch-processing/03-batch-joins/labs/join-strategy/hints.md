## Hint 1
Une jointure côté map exige une propriété des entrées : petite taille (broadcast), même partitionnement (partitioned hash), même partitionnement **et** même tri (merge). Sans propriété, il reste la jointure côté reduce.

## Hint 2
Le reducer d'une clé chaude reçoit toute la clé chaude **plus** sa part équitable du reste.

## Hint 3
Avec le tri secondaire, la clé composée met le profil avant les événements, et les événements par date croissante.
