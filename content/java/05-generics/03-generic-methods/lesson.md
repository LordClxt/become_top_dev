---
id: java-ch05-l03
title: "Des méthodes génériques"
source: { chapter: 5, pages: "135-138" }
duration_min: 30
concepts:
  - id: java-generic-method
    label: "Une méthode générique déclare ses paramètres de type avant son type de retour (static <E> Set<E> union(Set<E> s1, Set<E> s2)) ; le compilateur les déduit des arguments, sans cast chez l'appelant"
  - id: java-generic-singleton-factory
    label: "Fabrique de singleton générique : un seul objet immuable sans état (UnaryOperator<Object>) servi sous tous les types, avec un cast non vérifié prouvé sûr et supprimé"
  - id: java-recursive-type-bound
    label: "Borne de type récursive : <E extends Comparable<E>> se lit « tout type comparable à lui-même » ; elle permet d'appeler compareTo sans cast"
  - id: java-type-inference
    label: "Inférence de type : à partir des arguments et du type cible ; on peut l'imposer avec un argument explicite (Collections.<String>emptyList())"
glossary:
  - term: "méthode générique"
    definition: "Méthode qui déclare ses propres paramètres de type, indépendamment de ceux de sa classe."
  - term: "inférence de type"
    definition: "Le compilateur déduit les arguments de type d'une méthode générique à partir de ses arguments et du type attendu."
  - term: "fabrique de singleton générique"
    definition: "Méthode générique qui renvoie toujours le même objet, utilisable sous n'importe quel paramètre de type grâce à l'effacement."
  - term: "borne de type récursive"
    definition: "Borne qui mentionne le paramètre de type lui-même : <T extends Comparable<T>>."
visuals: [java-ch05-type-inference]
labs: [java-ch05-l03-lab-generic-toolkit]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Une fonction identité unique, servie sous deux types différents. Qu'affiche le programme ?"
    code: |
      import java.util.function.UnaryOperator;

      public class Main {
          private static final UnaryOperator<Object> IDENTITY = t -> t;

          // Sûr : la fonction renvoie son argument sans le modifier ; elle convient à tout T
          @SuppressWarnings("unchecked")
          static <T> UnaryOperator<T> identity() {
              return (UnaryOperator<T>) IDENTITY;
          }

          public static void main(String[] args) {
              UnaryOperator<String> forStrings = identity();
              UnaryOperator<Number> forNumbers = identity();
              System.out.println(forStrings.apply("ordo") + " " + forNumbers.apply(3.5) + " " + (forStrings == (Object) forNumbers));
          }
      }
    answer: "ordo 3.5 true"
    explanation: "C'est le même objet, servi sous deux types : grâce à l'effacement, UnaryOperator<String> et UnaryOperator<Number> sont le même type à l'exécution. Le cast est non vérifié mais sûr, puisque la fonction renvoie son argument tel quel. Un seul objet pour tout le programme : c'est ainsi que le JDK écrit Collections.emptySet()."
    concept: java-generic-singleton-factory
  - id: c2
    type: code-output
    prompt: "Une méthode `max` avec une borne de type récursive. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          record Price(long cents) implements Comparable<Price> {
              public int compareTo(Price o) { return Long.compare(cents, o.cents); }
          }

          static <E extends Comparable<E>> Optional<E> max(Collection<E> c) {
              E best = null;
              for (E e : c) if (best == null || e.compareTo(best) > 0) best = e;
              return Optional.ofNullable(best);
          }

          public static void main(String[] args) {
              System.out.println(max(List.of(new Price(1250), new Price(1310), new Price(990))).orElseThrow().cents()
                      + " " + max(List.of("pomme", "abricot", "poire")).orElseThrow()
                      + " " + max(new ArrayList<Integer>()).isPresent());
          }
      }
    answer: "1310 pomme false"
    explanation: "E extends Comparable<E> : chaque élément sait se comparer à un autre E, donc compareTo s'appelle sans cast. Price, String et Integer sont tous comparables à eux-mêmes. « pomme » est la plus grande dans l'ordre alphabétique ; la collection vide donne un Optional vide."
    concept: java-recursive-type-bound
  - id: c3
    type: single
    prompt: "`List<String> none = flag ? List.of(\"a\") : Collections.emptyList();` compile. Comment le compilateur sait-il que `emptyList()` doit renvoyer une `List<String>` ?"
    choices:
      - "Il ne le sait pas : il renvoie une List brute"
      - "Par inférence : le type cible (List<String> de la variable) fixe T à String"
      - "Parce que emptyList est surchargée pour chaque type"
      - "Grâce au cast inséré à l'exécution"
    answer: 1
    explanation: "Depuis Java 8, l'inférence tient compte du type cible, celui attendu par le contexte. Si elle échoue (contexte trop vague), on peut imposer le type : Collections.<String>emptyList()."
    concept: java-type-inference
---

## Pourquoi c'est important

La bibliothèque d'outils d'Ordo contient une classe `Collections2` écrite il y a longtemps : `union(Set, Set)`, `max(Collection)`, `identity()`. Toutes prennent et renvoient des types bruts. Chaque appelant caste le résultat, et `max` d'une collection d'objets non comparables compile très bien… puis lève une `ClassCastException` sur `compareTo` en production. Les méthodes, autant que les classes, gagnent à devenir génériques.

En Go 1.18+, tu écris `func Max[T cmp.Ordered](xs []T) T` : une fonction avec ses propres paramètres de type et une contrainte. Java a la même chose depuis 2004, avec une syntaxe un peu différente, et une contrainte plus fine : la borne récursive.

## Une méthode générique

Les paramètres de type d'une méthode se déclarent **entre les modificateurs et le type de retour** :

```java
public static <E> Set<E> union(Set<E> s1, Set<E> s2) {
    Set<E> result = new HashSet<>(s1);
    result.addAll(s2);
    return result;
}
```

Pas d'avertissement, pas de cast chez l'appelant : `Set<String> all = union(guys, stooges);`. Le compilateur **déduit** `E = String` des arguments : c'est l'**inférence de type**. Depuis Java 8, il tient compte aussi du **type cible**, celui que le contexte attend.

::checkpoint{id="c3"}

Une méthode générique a ses paramètres propres, indépendants de ceux de sa classe : une méthode `static` d'une classe non générique peut l'être, et une méthode d'instance de `Box<T>` peut introduire un `<R>` en plus (`<R> Box<R> map(Function<? super T, ? extends R> f)`).

## La fabrique de singleton générique

Parfois, il faut un objet **immuable et sans état** qui convient à **tous** les types : une fonction identité, un comparateur « ordre naturel », un ensemble vide. Créer un objet par type serait du gaspillage. Grâce à l'effacement, un seul objet peut servir sous tous les paramètres de type, distribué par une méthode générique qui le caste :

::checkpoint{id="c1"}

Le cast `(UnaryOperator<T>) IDENTITY` produit un avertissement unchecked : à la compilation, un `UnaryOperator<Object>` n'est pas un `UnaryOperator<T>`. Mais ici, c'est sûr : la fonction renvoie son argument sans le modifier, donc un `T` reste un `T`. On supprime l'avertissement, au plus près, avec la preuve en commentaire (leçon 1). Le JDK fait exactement cela pour `Collections.emptySet()` ou `Collections.reverseOrder()` : un champ statique unique, casté à la demande.

## La borne de type récursive

Comment écrire `max` d'une collection ? Il faut que les éléments sachent se comparer **entre eux**. La borne s'écrit :

```java
public static <E extends Comparable<E>> Optional<E> max(Collection<E> c)
```

Elle se lit « pour tout type `E` comparable à lui-même ». C'est une **borne récursive** : `E` apparaît dans sa propre borne. Dans le corps, `e.compareTo(best)` est typé, sans cast. Et `max` d'une collection d'objets non comparables ne compile plus.

::checkpoint{id="c2"}

::visual{id="java-ch05-type-inference"}

Les bornes récursives apparaissent aussi dans les builders hiérarchiques (module 1, `Builder<T extends Builder<T>>`) et dans `Enum<E extends Enum<E>>`. Elles sont rares, et presque toujours liées à `Comparable` ou à l'idiome du self-type simulé.

> **Sous le capot :** après effacement, `<E extends Comparable<E>>` devient `Comparable` : la signature dans le bytecode est `max(Collection) : Optional`, et `compareTo` est appelé par `invokeinterface Comparable.compareTo(Object)`. Toute la sûreté est vérifiée par javac, avant. C'est aussi pourquoi la signature générique reste lisible par réflexion (`Method.getGenericReturnType()`) : javac la conserve dans l'attribut `Signature` du fichier `.class`, pour les autres compilateurs et pour les frameworks.

**Attention à `Comparable<E>` trop strict.** `LocalDate` implémente `Comparable<ChronoLocalDate>`, pas `Comparable<LocalDate>` : il ne satisfait pas `E extends Comparable<E>`. La version complète de `max`, avec un joker (`<T extends Comparable<? super T>>`), est le sujet de la leçon 4.

## Pièges fréquents

- **Des méthodes utilitaires en types bruts** qui obligent chaque appelant à caster : rends-les génériques.
- **Créer un objet par type** pour une fonction ou une valeur immuable et sans état : une fabrique de singleton générique suffit.
- **Une fabrique de singleton générique sur un objet à état** (un cache, une liste modifiable) : le cast n'est plus sûr, des types différents partageraient le même état.
- **`max` sans borne, avec un cast vers `Comparable`** : l'erreur se découvre à l'exécution.
- **Forcer les arguments de type partout** (`Util.<String>f(x)`) : l'inférence s'en charge ; réserve la forme explicite aux cas où elle échoue.

## À retenir

- Une méthode générique déclare `<E>` avant son type de retour ; l'inférence déduit `E` des arguments et du type cible.
- Fabrique de singleton générique : un objet immuable sans état, un cast prouvé sûr, supprimé au plus près.
- `<E extends Comparable<E>>` : « comparable à lui-même », compareTo sans cast.
- Les méthodes, comme les types, gagnent à être génériques : erreurs à la compilation, plus de casts chez les clients.

> **Source :** *Effective Java*, 3e éd., item 30 (pages 135 à 138).
