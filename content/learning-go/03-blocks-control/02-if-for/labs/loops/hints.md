## Hint 1
`FizzBuzz` : une boucle sur `i`, et dedans une boucle sur les règles qui construit le mot. Si le mot reste vide à la fin, utilise `strconv.Itoa(i)`.

## Hint 2
`Collatz` : `for n != 1 { … }` avec un compteur. Traite `n <= 0` avant la boucle, sinon elle ne s'arrête jamais. Pour `ReadUntil`, garde un indice et teste d'abord s'il est au bout de la slice, ensuite s'il est sur la sentinelle.

## Hint 3
`SumEveryNth` : `for i := start; i < len(xs); i += step`. Protège d'abord `step <= 0` (boucle infinie) et `start < 0` (panic). Si `start >= len(xs)` la boucle ne s'exécute pas, ce qui renvoie bien 0. Pour `ReadUntil`, `tokens[:i]` donne les jetons avant la sentinelle ; quand `i` vaut 0 le résultat est une slice vide.
