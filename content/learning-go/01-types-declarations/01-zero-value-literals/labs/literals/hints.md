## Hint 1
Deux étapes : d'abord décider de la **base** en regardant le début de la chaîne (`0b`, `0o`, `0x`, ou un `0` suivi d'autre chose), ensuite lire les chiffres restants un par un.

## Hint 2
Pour chaque caractère : si c'est `_`, vérifie qu'il a un chiffre de chaque côté ; sinon convertis-le en nombre (`'7'` → 7, `'f'` → 15) et refuse-le s'il est trop grand pour la base. Accumule avec `value = value*base + digit`.

## Hint 3
Le piège du dépassement : avant de calculer `value*base + digit`, vérifie que `value <= (math.MaxInt64 - digit) / base`. Pour le zéro initial sans lettre, garde la chaîne entière comme suite de chiffres octaux : le `0` est lui-même un chiffre valide, ce qui rend `0_7` correct et `08` invalide.
