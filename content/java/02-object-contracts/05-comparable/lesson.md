---
id: java-ch02-l05
title: "Comparable et Comparator : un ordre qui ne ment pas"
source: { chapter: 3, pages: "66-72" }
duration_min: 30
concepts:
  - id: java-comparable-contract
    label: "Le contrat de compareTo : sgn antisymétrique, transitif, et des éléments égaux se comparent pareil à tous les autres"
  - id: java-comparable-consistent-equals
    label: "Cohérent avec equals (fortement recommandé) : sinon TreeSet et HashSet ne s'accordent pas (BigDecimal 1.0 et 1.00)"
  - id: java-compare-methods
    label: "Comparer avec Integer.compare, Double.compare… jamais avec < et > à la main"
  - id: java-comparator-construction
    label: "Comparator.comparing / comparingInt / thenComparing / reversed : comparaisons multi-champs lisibles"
  - id: java-comparator-difference-bug
    label: "Le comparateur par différence (a - b) déborde et viole la transitivité"
glossary:
  - term: "ordre naturel"
    definition: "L'ordre défini par compareTo d'une classe qui implémente Comparable (alphabétique pour String, chronologique pour LocalDate)."
  - term: "sgn"
    definition: "Fonction signe : -1, 0 ou 1 selon que l'expression est négative, nulle ou positive."
  - term: "cohérent avec equals"
    definition: "Se dit d'un ordre où compareTo renvoie 0 exactement quand equals renvoie true."
  - term: "ordre lexicographique"
    definition: "On compare le premier critère ; en cas d'égalité seulement, le deuxième ; et ainsi de suite."
visuals: []
labs: [java-ch02-l05-lab-ranking]
extra: false
xp: 30
---

## Pourquoi c'est important

Le classement d'un tournoi en ligne trie les joueurs par score décroissant :

```java
players.sort((a, b) -> b.score() - a.score());
```

Testé avec des scores entre 0 et 10 000 : parfait. En production, un mode « handicap » introduit des scores négatifs très bas, et une triche donne un score proche d'`Integer.MAX_VALUE`. Le classement affiche alors le tricheur **dernier**, et certains tris lèvent même `IllegalArgumentException: Comparison method violates its general contract!` La soustraction a **débordé** : `2_000_000_000 - (-2_000_000_000)` ne tient pas dans un `int` et devient négatif.

Comparer, comme `equals`, est un contrat dont dépendent `Collections.sort`, `Arrays.sort`, `TreeSet`, `TreeMap`, `PriorityQueue`, `Collections.max`… Le casser ne plante pas ta classe : il rend fausses toutes celles qui la trient.

## Le concept

### Comparable : un ordre naturel

```java
public interface Comparable<T> {
    int compareTo(T o);   // négatif, zéro ou positif : this < o, this == o, this > o
}
```

Implémenter `Comparable` donne à ta classe un **ordre naturel**, et du même coup l'accès à tout l'outillage : `Arrays.sort(a)`, un `TreeSet` trié automatiquement, `Collections.max`, la recherche dichotomique. Si ta classe valeur a un ordre évident (alphabétique, numérique, chronologique), implémente-le. Presque toutes les classes valeur du JDK le font, et tous les enums.

### Le contrat

Pour tous `x`, `y`, `z` :

1. **Antisymétrie** : `sgn(x.compareTo(y)) == -sgn(y.compareTo(x))`. Si `x < y`, alors `y > x` (et si l'un lève une exception, l'autre aussi).
2. **Transitivité** : `x > y` et `y > z` ⇒ `x > z`.
3. **Égaux interchangeables** : si `x.compareTo(y) == 0`, alors `x` et `y` se comparent de la même façon à tout `z`.
4. **Fortement recommandé** : `x.compareTo(y) == 0` ⇔ `x.equals(y)`. L'ordre est alors **cohérent avec `equals`**.

Les trois premières clauses font de « `compareTo` renvoie 0 » une relation d'équivalence : les mêmes pièges qu'avec `equals` s'appliquent. En particulier, **on ne peut pas étendre une classe comparable en ajoutant une composante de valeur** sans casser le contrat. Même remède : la composition et une vue.

Contrairement à `equals`, `compareTo` n'a pas à gérer les autres types : c'est le système de types qui les refuse (`Comparable<Version>`). Et `x.compareTo(null)` doit lever `NullPointerException`, ce qui arrive tout seul au premier accès à un champ.

### La clause 4 et le piège BigDecimal

`new BigDecimal("1.0")` et `new BigDecimal("1.00")` ne sont **pas égaux** pour `equals` (l'échelle diffère) mais **se comparent à 0**. Résultat :

```java
new HashSet<>(List.of(new BigDecimal("1.0"), new BigDecimal("1.00"))).size();   // 2
new TreeSet<>(List.of(new BigDecimal("1.0"), new BigDecimal("1.00"))).size();   // 1
```

Les contrats de `Set` et `Map` sont écrits en termes d'`equals`, mais les collections **triées** utilisent `compareTo` à la place. Si ton ordre est incohérent avec `equals`, ce n'est pas une catastrophe, mais documente-le : *« Note : cette classe a un ordre naturel incohérent avec equals. »*

### Écrire compareTo

Champ par champ, du **plus significatif** au moins significatif, en s'arrêtant au premier qui diffère :

```java
public int compareTo(PhoneNumber pn) {
    int result = Short.compare(areaCode, pn.areaCode);
    if (result == 0) {
        result = Short.compare(prefix, pn.prefix);
        if (result == 0) result = Short.compare(lineNum, pn.lineNum);
    }
    return result;
}
```

- Primitifs : `Integer.compare`, `Long.compare`, `Double.compare`… (présents dans toutes les classes enveloppes depuis Java 7). **Jamais** de `<` / `>` à la main, et jamais de soustraction.
- Références : `compareTo` récursif, ou un `Comparator` si le champ n'est pas comparable ou si tu veux un autre ordre (`String.CASE_INSENSITIVE_ORDER`).

### Les méthodes de construction de Comparator

Depuis Java 8, on compose un comparateur comme une phrase :

```java
private static final Comparator<PhoneNumber> ORDER =
        Comparator.comparingInt((PhoneNumber pn) -> pn.areaCode)
                  .thenComparingInt(pn -> pn.prefix)
                  .thenComparingInt(pn -> pn.lineNum);

public int compareTo(PhoneNumber pn) { return ORDER.compare(this, pn); }
```

- `comparing(f)` / `comparingInt` / `comparingLong` / `comparingDouble` : ordonne selon une clé extraite ;
- `thenComparing…` : départage les égalités, autant de fois que nécessaire ;
- `reversed()` : inverse l'ordre **de tout ce qui précède** dans la chaîne ;
- `Comparator.naturalOrder()`, `reverseOrder()`, `nullsFirst(…)`, `nullsLast(…)`.

Le type du premier lambda doit souvent être écrit (`(PhoneNumber pn) -> …`) : l'inférence ne remonte pas depuis la variable à travers l'appel chaîné. C'est un peu plus lent que la version écrite à la main (l'auteur mesure environ 10 % sur un tri), presque toujours négligeable. Garde le comparateur dans un champ `static final` pour ne pas le reconstruire à chaque appel.

### Jamais de différence

```java
// CASSÉ : déborde et viole la transitivité
Comparator<Player> byScore = (a, b) -> a.score() - b.score();

// Correct
Comparator<Player> byScore = (a, b) -> Integer.compare(a.score(), b.score());
Comparator<Player> byScore = Comparator.comparingInt(Player::score);
```

La soustraction n'est même pas plus rapide de façon mesurable. Avec des `double`, elle est fausse aussi : `(int) (0.3 - 0.2)` vaut 0, et `NaN` casse tout.

## Sous le capot : comment le tri détecte un comparateur faux

`Arrays.sort` sur des objets et `List.sort` utilisent **TimSort** (depuis Java 7). TimSort repère des séquences déjà triées (*runs*) puis les fusionne, avec un mode « galop » qui saute des blocs entiers en **supposant** que le comparateur est transitif. Quand le comparateur se contredit (`a < b`, `b < c` mais `c < a`, typique du débordement), TimSort peut se retrouver dans un état impossible pendant une fusion. Il le détecte et lève `IllegalArgumentException: Comparison method violates its general contract!`

Trois conséquences :

- l'erreur n'apparaît qu'avec **assez d'éléments** (en dessous de 32, TimSort fait un simple tri par insertion, qui ne vérifie rien) et un ordre d'entrée défavorable : elle est intermittente ;
- quand elle n'apparaît pas, le tri **réussit en silence** avec un résultat faux ;
- `TreeMap` et `TreeSet` ne vérifient rien du tout : un comparateur incohérent y crée des doublons ou rend des éléments introuvables.

`Integer.compare(x, y)` est simplement `(x < y) ? -1 : ((x == y) ? 0 : 1)`. Il n'effectue aucune soustraction et ne peut donc pas déborder. Le JIT le compile en quelques instructions sans branchement.

## Pièges fréquents

- **Comparateur par soustraction** sur des `int`, des `long` convertis ou des `double` : débordement, transitivité cassée.
- **Ordre incohérent avec `equals` sans le documenter** : `TreeSet` et `HashSet` ne contiennent pas les mêmes éléments.
- **Oublier un critère de départage** : deux éléments différents se comparent à 0, et un `TreeSet` en jette un.
- **`reversed()` mal placé** : `comparing(a).thenComparing(b).reversed()` inverse les **deux** critères.
- **Reconstruire le comparateur à chaque appel** : garde-le en `static final`.
- **Étendre une classe comparable** en ajoutant un champ significatif : composition + vue.

## À retenir

- Une classe valeur avec un ordre évident implémente `Comparable<SonType>`.
- Contrat : antisymétrique, transitif, égaux interchangeables, et idéalement cohérent avec `equals`.
- Compare avec `Integer.compare` & co, ou compose avec `Comparator.comparing…().thenComparing…()`.
- **Jamais** `a - b` dans un comparateur.
- Un comparateur faux ne plante pas toujours : il trie faux, en silence, ou lève une exception intermittente dans TimSort.

> **Source :** *Effective Java*, 3e éd., item 14 (pages 66 à 72). Détails de TimSort : OpenJDK 21, `java.util.TimSort`.
