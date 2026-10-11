## Hint 1
Une seule écriture applicative : le service commandes vers la base de référence. Tout le reste est dérivé du log.

## Hint 2
Pendant la migration, les deux dérivations (v1 et v2) consomment le même log ; c'est la nouvelle vue qu'on pousse aux clients.

## Hint 3
Le taux de change n'est pas demandé à chaque commande : le service commandes s'abonne au flux des taux et écrit le dernier dans sa table locale.
