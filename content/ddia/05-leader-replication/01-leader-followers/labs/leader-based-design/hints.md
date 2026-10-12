## Hint 1
Deux flux distincts : les écritures qui remontent vers le leader, et le log qui descend du leader vers chaque follower.

## Hint 2
Les flèches de réplication ne partent que du leader. Un follower ne reçoit rien d'autre.

## Hint 3
Les intrus : un second leader change d'architecture (multi-leader, voir module 06) ; un cache n'est pas un réplica.
