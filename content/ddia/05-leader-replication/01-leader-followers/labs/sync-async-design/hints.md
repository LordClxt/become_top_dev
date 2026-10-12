## Hint 1
Le leader écrit localement d'abord : 2 ms dans tous les cas.

## Hint 2
Les confirmations partent en parallèle : on attend la plus lente des confirmations requises, pas leur somme.

## Hint 3
Tout synchrone : écriture locale (2 ms) + la plus lente des deux confirmations (80 ms).
