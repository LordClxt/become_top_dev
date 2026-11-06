## Contexte

Le moteur de règles tarifaires laisse les commerciaux écrire des formules (`prix * quantité + frais`). Elles sont stockées comme des arbres, définis dans `Expr.java` (ne pas modifier) :

```java
sealed interface Expr permits Num, Var, Add, Mul, Neg { }
record Num(long value) implements Expr { }
record Var(String name) implements Expr { }
record Add(Expr left, Expr right) implements Expr { }
record Mul(Expr left, Expr right) implements Expr { }
record Neg(Expr operand) implements Expr { }
```

L'ancien code de `Algebra.java` est une cascade d'`instanceof` et de casts, incomplète. Réécris-la avec des `switch` à motifs.

## Ta mission

1. `long eval(Expr e, Map<String, Long> env)` : calcule la valeur. Une variable absente de `env` lève `IllegalArgumentException` (message avec son nom) ; un dépassement de capacité lève `ArithmeticException` (`Math.addExact`, `multiplyExact`, `negateExact`).
2. `String show(Expr e)` : `Num` et `Var` tels quels, `Add` → `(a + b)`, `Mul` → `(a * b)`, `Neg` → `-a`.
   Exemple : `show(new Neg(new Add(new Var("x"), new Num(2))))` vaut `-(x + 2)`.
3. `Expr simplify(Expr e)` : simplifie d'abord les sous-expressions, puis applique au nœud la **première** règle qui s'applique :

| forme (après simplification des enfants) | résultat |
|---|---|
| `Add(Num a, Num b)` / `Mul(Num a, Num b)` | `Num(a + b)` / `Num(a * b)` |
| `Add(x, Num 0)` ou `Add(Num 0, x)` | `x` |
| `Mul(x, Num 1)` ou `Mul(Num 1, x)` | `x` |
| `Mul(x, Num 0)` ou `Mul(Num 0, x)` | `Num 0` |
| `Add(x, Neg(y))` ou `Add(Neg(y), x)` avec `x.equals(y)` | `Num 0` |
| `Neg(Num n)` | `Num(-n)` |
| `Neg(Neg(x))` | `x` |
| tout le reste | inchangé |

## Contraintes

- Aucun `instanceof`, aucun cast, aucun `default` dans `Algebra.java` : chaque `switch` doit être exhaustif sur `Expr`, pour que l'ajout d'un nœud (`Div`, demain) casse la compilation au lieu de casser la production.
