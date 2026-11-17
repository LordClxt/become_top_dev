---
id: java-ch02-l05
title: "Comparable et Comparator : un ordre qui ne ment pas"
source: { chapter: 3, pages: "66-72" }
duration_min: 35
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
visuals: [java-ch02-compare-consistency]
labs: [java-ch02-l05-lab-ranking]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Trois scores, triés avec un comparateur par soustraction. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          public static void main(String[] args) {
              List<Integer> scores = new ArrayList<>(List.of(0, 2_000_000_000, -2_000_000_000));
              scores.sort((a, b) -> a - b);
              System.out.println(scores);
          }
      }
    answer: "[0, 2000000000, -2000000000]"
    explanation: "2 000 000 000 - (-2 000 000 000) déborde et devient négatif : le comparateur affirme que le plus grand score est plus petit que le plus bas, et le tri le croit sans broncher. Le piège est de penser qu'un tri faux plante forcément : ici aucune exception, juste un résultat faux."
    concept: java-comparator-difference-bug
  - id: c2
    type: code-output
    prompt: "Un TreeSet de noms qui ignore la casse. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          public static void main(String[] args) {
              Set<String> names = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
              names.add("Ana");
              names.add("ana");
              System.out.println(names.size() + " " + names + " " + names.contains("ANA"));
          }
      }
    answer: "1 [Ana] true"
    explanation: "Le TreeSet ne consulte jamais equals : \"ana\" se compare à 0 avec \"Ana\", il est donc considéré déjà présent et le premier inséré reste. contains(\"ANA\") répond true alors que \"ANA\".equals(\"Ana\") est false : c'est l'ordre, pas equals, qui définit l'égalité d'une collection triée."
    concept: java-comparable-consistent-equals
  - id: c3
    type: single
    prompt: "Trouve le bug : `Comparator<Double> byPrice = (x, y) -> (int) (x - y);` sert à ranger des prix dans un TreeSet. On ajoute 0.3 puis 0.2. Que se passe-t-il ?"
    choices:
      - "Le TreeSet contient [0.2, 0.3], tout va bien"
      - "Le TreeSet contient [0.3, 0.2] : l'ordre est inversé"
      - "Le TreeSet ne contient que 0.3 : (int) 0.1 vaut 0, les deux prix sont jugés égaux"
      - "ClassCastException au moment du cast"
    answer: 2
    explanation: "Le cast tronque vers zéro, donc toute différence de moins de 1 devient 0 et le TreeSet jette le second prix comme doublon. Croire que le cast arrondit « au signe près » est l'erreur : seul Double.compare garde le signe (et gère NaN)."
    concept: java-compare-methods
---

## Pourquoi c'est important

Le classement d'un tournoi en ligne trie les joueurs par score décroissant :

```java
players.sort((a, b) -> b.score() - a.score());
```

Testé avec des scores entre 0 et 10 000 : parfait. En production, un mode « handicap » introduit des scores négatifs très bas, et une triche donne un score proche d'`Integer.MAX_VALUE`. Le classement affiche alors le tricheur **dernier**, et certains tris lèvent même `IllegalArgumentException: Comparison method violates its general contract!` La soustraction a **débordé** : `2_000_000_000 - (-2_000_000_000)` ne tient pas dans un `int` et devient négatif.

Garde en tête la règle à répéter : **un comparateur ne calcule pas une distance, il répond à une question à trois réponses** (avant, pareil, après). Dès que tu fais de l'arithmétique pour y répondre, tu risques de mentir.

Comparer, comme `equals`, est un contrat dont dépendent `Collections.sort`, `Arrays.sort`, `TreeSet`, `TreeMap`, `PriorityQueue`, `Collections.max`… Le casser ne plante pas ta classe : il rend fausses toutes celles qui la trient.

## Le concept

### Comparable : un ordre naturel

```java
public interface Comparable<T> {
    int compareTo(T o);   // négatif, zéro ou positif : this < o, this == o, this > o
}
```

Un **ordre naturel** est l'ordre « par défaut » d'un type : alphabétique pour `String`, chronologique pour `LocalDate`. Implémenter `Comparable` le donne à ta classe, et du même coup l'accès à tout l'outillage : `Arrays.sort(a)`, un `TreeSet` trié automatiquement, `Collections.max`, la recherche dichotomique. Si ta classe valeur a un ordre évident (alphabétique, numérique, chronologique), implémente-le. Presque toutes les classes valeur du JDK le font, et tous les enums.

### Le contrat

Dans ce qui suit, `sgn` est la fonction signe : elle vaut -1, 0 ou 1 selon que son argument est négatif, nul ou positif. Seul le signe de `compareTo` compte, jamais sa valeur exacte. Pour tous `x`, `y`, `z` :

1. **Antisymétrie** : `sgn(x.compareTo(y)) == -sgn(y.compareTo(x))`. Si `x < y`, alors `y > x` (et si l'un lève une exception, l'autre aussi).
2. **Transitivité** : `x > y` et `y > z` ⇒ `x > z`.
3. **Égaux interchangeables** : si `x.compareTo(y) == 0`, alors `x` et `y` se comparent de la même façon à tout `z`.
4. **Fortement recommandé** : `x.compareTo(y) == 0` ⇔ `x.equals(y)`. L'ordre est alors **cohérent avec `equals`**.

:::reveal Avant de lire la suite : pourquoi la clause 3 est-elle nécessaire, si l'on a déjà les deux premières ?
Sans elle, deux éléments « égaux » pour l'ordre pourraient être rangés différemment par rapport à un troisième : un `TreeSet` qui en garde un seul ne saurait plus où chercher l'autre. La clause 3 garantit que « se comparer à 0 » se comporte comme une vraie égalité.
:::

Les trois premières clauses font de « `compareTo` renvoie 0 » une relation d'équivalence : les mêmes pièges qu'avec `equals` s'appliquent. En particulier, **on ne peut pas étendre une classe comparable en ajoutant une composante de valeur** sans casser le contrat. Même remède : la composition et une vue.

Contrairement à `equals`, `compareTo` n'a pas à gérer les autres types : c'est le système de types qui les refuse (`Comparable<Version>`). Et `x.compareTo(null)` doit lever `NullPointerException`, ce qui arrive tout seul au premier accès à un champ.

### La clause 4 et le piège BigDecimal

`new BigDecimal("1.0")` et `new BigDecimal("1.00")` ne sont **pas égaux** pour `equals` (l'échelle, le nombre de chiffres après la virgule, diffère) mais **se comparent à 0**. Résultat :

```java
new HashSet<>(List.of(new BigDecimal("1.0"), new BigDecimal("1.00"))).size();   // 2
new TreeSet<>(List.of(new BigDecimal("1.0"), new BigDecimal("1.00"))).size();   // 1
```

Les contrats de `Set` et `Map` sont écrits en termes d'`equals`, mais les collections **triées** utilisent `compareTo` à la place. Manipule-le : insère les valeurs dans les deux ensembles et regarde quelle question chacun pose.

::visual{id="java-ch02-compare-consistency"}

Si ton ordre est incohérent avec `equals`, ce n'est pas une catastrophe, mais documente-le : *« Note : cette classe a un ordre naturel incohérent avec equals. »*

::checkpoint{id="c2"}

### Écrire compareTo

Champ par champ, du **plus significatif** au moins significatif, en s'arrêtant au premier qui diffère :

:::steps
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
--- 1: `Comparable<PhoneNumber>` : le paramètre est déjà du bon type, pas de `instanceof` ni de cast.
--- 2: Le champ le plus significatif d'abord, avec `Short.compare` : aucun calcul, donc aucun débordement.
--- 3: On ne regarde le critère suivant **que** si le précédent est à égalité : c'est l'ordre lexicographique.
--- 4-5: Même schéma pour le préfixe puis le numéro de ligne, du plus au moins significatif.
--- 7: On renvoie le premier résultat non nul ; 0 seulement si tous les champs sont égaux, donc cohérent avec `equals`.
:::

- Primitifs : `Integer.compare`, `Long.compare`, `Double.compare`… (présents dans toutes les classes enveloppes depuis Java 7). **Jamais** de `<` / `>` à la main, et jamais de soustraction.
- Références : `compareTo` récursif, ou un `Comparator` si le champ n'est pas comparable ou si tu veux un autre ordre (`String.CASE_INSENSITIVE_ORDER`).

### Les méthodes de construction de Comparator

Depuis Java 8, on compose un comparateur comme une phrase, en **ordre lexicographique** (premier critère, puis le suivant seulement en cas d'égalité) :

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

:::compare
--- bad: Soustraction
```java
// CASSÉ : déborde et viole la transitivité
Comparator<Player> byScore =
        (a, b) -> a.score() - b.score();
```
`2_000_000_000 - (-2_000_000_000)` sort de l'`int` et devient négatif.
--- good: Comparer, sans calculer
```java
Comparator<Player> byScore =
        (a, b) -> Integer.compare(a.score(), b.score());
// ou, plus lisible :
Comparator<Player> byScore2 =
        Comparator.comparingInt(Player::score);
```
Seul le signe est produit, à partir de `<` et `==`.
:::

::checkpoint{id="c1"}

La soustraction n'est même pas plus rapide de façon mesurable. Avec des `double`, elle est fausse aussi : `(int) (0.3 - 0.2)` vaut 0, et `NaN` casse tout.

::checkpoint{id="c3"}

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

> **Source :** *Effective Java*, 3e éd., item 14 (pages 66 à 72). Détails de TimSort : OpenJDK 25, `java.util.TimSort`.
