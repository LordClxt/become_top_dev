## Hint 1
L'API est le seul écrivain de la base. Tout le reste est dérivé : la base sort ses changements vers le connecteur CDC, qui publie dans le sujet.

## Hint 2
Les indexeurs (au moins deux) sont dans la zone du groupe « indexation » ; le cache a son propre consommateur ; l'entrepôt est lui aussi alimenté depuis le sujet.

## Hint 3
La reconstruction et la supervision **lisent** le sujet (`read`) sans rien y écrire ; la reconstruction écrit dans la nouvelle vue.
