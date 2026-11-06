## Contexte

Ton équipe veut un outil, dans la veine des bibliothèques de tests de contrats, qui attrape les `equals`, `hashCode` et comparateurs faux **avant** qu'ils ne cassent une `HashMap` en production. On lui donne des échantillons ; il rend un rapport des clauses violées.

Pas d'indices pour ce combat : tu dois connaître les contrats au mot près. `Kind` est fourni.

## L'API

```java
Report r = Contracts.checkEquals(List.of(cis("Paris"), "paris"));
r.kinds();               // [SYMMETRY]  (Set<Kind> non modifiable, dans l'ordre de l'enum)
r.isClean();             // false
r.explain(Kind.SYMMETRY) // un message qui cite les deux objets (via String.valueOf)
r.explain(Kind.HASH_CODE) // null : pas de violation de ce type

Contracts.checkComparator(List.of(Integer.MAX_VALUE, -1, Integer.MIN_VALUE), (a, b) -> a - b);
Contracts.checkComparable(List.of(new BigDecimal("1.0"), new BigDecimal("1.00")));  // [INCONSISTENT_WITH_EQUALS]
```

Les échantillons ne contiennent pas `null` (sinon `NullPointerException` immédiate). Une liste vide donne un rapport propre.

## Les règles exactes

Notation : `x`, `y`, `z` parcourent **tous** les échantillons, répétitions comprises (`x` peut être `y`).

**`checkEquals(samples)`**
- `REFLEXIVITY` : `x.equals(x)` est faux.
- `NON_NULLITY` : `x.equals(null)` renvoie vrai **ou lève** une exception.
- `SYMMETRY` : `x.equals(y) != y.equals(x)`.
- `TRANSITIVITY` : `x.equals(y)` et `y.equals(z)` mais pas `x.equals(z)`.
- `HASH_CODE` : `x.equals(y)` mais leurs hash diffèrent. Le hash d'un échantillon est la valeur de son **premier** appel à `hashCode`.
- `CONSISTENCY` : appelé une seconde fois, `x.equals(y)` ou `x.hashCode()` ne donne pas le même résultat. Chaque paire est donc évaluée deux fois.
- `EXCEPTION` : `equals` (avec un argument non nul) ou `hashCode` lève une exception. Le vérificateur ne s'arrête pas : un `equals` qui lève compte comme `false` pour les autres règles.

**`checkComparator(samples, comparator)`** (et `checkComparable(samples)`, qui utilise l'ordre naturel)
- `SIGN` : `sgn(compare(x, y)) != -sgn(compare(y, x))`.
- `COMPARE_TRANSITIVITY` : `compare(x, y) > 0` et `compare(y, z) > 0` mais pas `compare(x, z) > 0`.
- `COMPARE_SUBSTITUTION` : `compare(x, y) == 0` mais `sgn(compare(x, z)) != sgn(compare(y, z))`.
- `INCONSISTENT_WITH_EQUALS` : `(compare(x, y) == 0) != x.equals(y)`.
- `EXCEPTION` : `compare` ou `equals` lève. Les règles qui auraient besoin de ce résultat ignorent simplement ce cas.

## Le rapport

`Report` est un objet valeur : `kinds()`, `isClean()`, `explain(Kind)` (le **premier** exemple trouvé pour ce type, `null` sinon), et un `toString` utile qui liste les types trouvés (`Report[SYMMETRY, TRANSITIVITY]`, ou `Report[propre]`).

Les tests lancent ton vérificateur sur les classes cassées de ce module (et sur des classes correctes, qui doivent donner un rapport propre) et comparent l'ensemble **exact** des types trouvés.
