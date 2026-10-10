## Contexte

Chaque boucle de Go se règle sur un besoin : parcourir à pas variable, répéter tant qu'une condition tient, lire jusqu'à une sentinelle. Dans ce TP tu écris quatre petites fonctions, une par forme de `for`.

## Ta mission

Dans `loops.go`, implémente :

### `FizzBuzz(n int, rules []Rule) []string`
Pour `i` de 1 à `n`, produit le mot formé en collant, **dans l'ordre des règles**, le `Word` de chaque règle dont le `Divisor` divise `i`. Si aucune règle ne s'applique, produit `i` en décimal.

```
règles : {3, "Fizz"}, {5, "Buzz"}
1 → "1"   3 → "Fizz"   5 → "Buzz"   15 → "FizzBuzz"
```

- Les règles de diviseur `≤ 0` sont ignorées (un `i % 0` ferait paniquer).
- `n ≤ 0` renvoie une slice vide.

### `Collatz(n int) int`
Nombre d'étapes pour atteindre 1 : `n` pair → `n/2`, impair → `3n+1`. `Collatz(1)` vaut 0, `Collatz(27)` vaut 111. Renvoie `-1` si `n ≤ 0`. *(Une boucle « condition seule ».)*

### `ReadUntil(tokens []string, stop string) (taken []string, found bool)`
Renvoie les jetons qui précèdent la première `stop` (exclue) et `found = true`. Si `stop` n'apparaît pas, renvoie tous les jetons et `found = false`. *(Une boucle infinie qui se termine par `break` ou `return`.)*

### `SumEveryNth(xs []int, start, step int) int`
Additionne `xs[start]`, `xs[start+step]`, `xs[start+2*step]`… tant que l'indice est dans `xs`. Renvoie `0` si `step ≤ 0`, si `start < 0` ou si `start` est hors de `xs`. *(Une boucle `for` complète avec incrément personnalisé : pas besoin de `range`.)*

## Contrainte

Choisis la forme de `for` qui correspond à chaque fonction, comme indiqué. Pas de récursion.
