## Hint 1
Facturation et e-mail sont deux groupes distincts : chaque groupe reçoit toutes les commandes.

## Hint 2
600 commandes/s à 2 ms chacune, c'est 1,2 seconde de travail par seconde : place au moins deux workers dans la zone « facturation ».

## Hint 3
Chaque worker est livré par le broker (`async`) et lui renvoie un accusé (`sync`). Le service commandes ne parle qu'au broker.
