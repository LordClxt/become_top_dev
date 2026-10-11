## Hint 1
Aucun utilisateur ne parle directement à un réplica ou au leader : tout passe par le routeur.

## Hint 2
Alice a pour hachage 0, Bob 1. Le routeur lit sur le réplica correspondant à chacun.

## Hint 3
Les réplicas reçoivent les changements du leader (flèches de réplication) ; le routeur envoie au leader les écritures (et les lectures qui doivent voir une écriture toute fraîche).
