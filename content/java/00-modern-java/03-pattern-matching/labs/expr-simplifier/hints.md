## Hint 1
`return switch (e) { case Num(long v) -> …; case Var(String name) -> …; case Add(Expr l, Expr r) -> …; … };` : cinq cases, un par variante, et le compilateur vérifie qu'il n'en manque aucun.

## Hint 2
Pour `simplify`, simplifie d'abord les enfants (`var l = simplify(a.left())`), reconstruis le nœud, puis passe-le à une seconde méthode `rewrite(Expr)` dont le switch essaie les règles dans l'ordre. Les motifs imbriqués s'écrivent directement : `case Add(Num(long a), Num(long b)) -> new Num(a + b);`.

## Hint 3
Une constante dans un motif n'existe pas : `case Add(var x, Num(long z)) when z == 0 -> x;`. Pour l'annulation, `case Add(var x, Neg(var y)) when x.equals(y) -> new Num(0);` (les records ont un `equals` structurel). Ignore ce qui ne sert pas avec `_` : `case Mul(_, Num(long z)) when z == 0 -> new Num(0);`. Termine par un case par variante qui renvoie le nœud tel quel (`case Add _ -> e;` …), jamais par `default`.
