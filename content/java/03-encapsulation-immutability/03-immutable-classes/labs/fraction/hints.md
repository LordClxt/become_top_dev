## Hint 1
Rends le constructeur `private` et fais tout passer par `valueOf`, qui normalise (signe, PGCD) puis renvoie `ZERO`, `ONE` ou une nouvelle instance.

## Hint 2
Le PGCD : `static long gcd(long a, long b) { return b == 0 ? Math.abs(a) : gcd(b, a % b); }`. Si le dénominateur est négatif, change le signe des deux termes.

## Hint 3
`plus` : `valueOf(num * o.den + o.num * den, den * o.den)`. Attention à l'ordre de déclaration : `ZERO` et `ONE` doivent être créés avec le constructeur privé (pas avec `valueOf`, qui les lit).
