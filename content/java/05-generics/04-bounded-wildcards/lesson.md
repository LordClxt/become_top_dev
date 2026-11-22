---
id: java-ch05-l04
title: "Jokers bornés : la règle PECS"
source: { chapter: 5, pages: "139-145" }
duration_min: 40
concepts:
  - id: java-pecs
    label: "PECS (Producer Extends, Consumer Super) : un paramètre qui fournit des E s'écrit <? extends E>, un paramètre qui reçoit des E s'écrit <? super E> ; s'il fait les deux, pas de joker"
  - id: java-no-wildcard-return
    label: "Pas de joker dans un type de retour : il obligerait les clients à manipuler des jokers ; les jokers sont faits pour que l'utilisateur d'une API ne les voie pas"
  - id: java-comparable-super
    label: "Comparable et Comparator sont toujours des consommateurs : <T extends Comparable<? super T>> accepte les types qui héritent leur comparaison (LocalDate, ScheduledFuture)"
  - id: java-wildcard-vs-type-param
    label: "Un paramètre de type qui n'apparaît qu'une fois dans une signature publique se remplace par un joker ; si le corps en a besoin, un helper privé générique le « capture »"
glossary:
  - term: "joker borné"
    definition: "<? extends E> (un sous-type inconnu de E) ou <? super E> (un super-type inconnu de E)."
  - term: "producteur"
    definition: "Paramètre dont la méthode lit des éléments : il les produit pour elle."
  - term: "consommateur"
    definition: "Paramètre dans lequel la méthode écrit des éléments : il les consomme."
  - term: "capture de joker"
    definition: "Mécanisme par lequel le compilateur donne un nom (une variable de type) au type inconnu d'un joker, par exemple en appelant une méthode générique."
visuals: [java-ch05-pecs]
labs: [java-ch05-l04-lab-pecs-api]
extra: false
xp: 35
checkpoints:
  - id: c1
    type: code-output
    prompt: "Une pile de `Number` reçoit des `Integer` par `pushAll`, puis se vide dans une collection d'`Object` par `popAll`. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          static final class Stack<E> {
              private final Deque<E> items = new ArrayDeque<>();
              void push(E e) { items.push(e); }
              E pop() { return items.pop(); }
              boolean isEmpty() { return items.isEmpty(); }

              // E producteur : extends
              void pushAll(Iterable<? extends E> src) { for (E e : src) push(e); }
              // E consommateur : super
              void popAll(Collection<? super E> dst) { while (!isEmpty()) dst.add(pop()); }
          }

          public static void main(String[] args) {
              Stack<Number> numbers = new Stack<>();
              List<Integer> ints = List.of(1, 2, 3);
              numbers.pushAll(ints);
              numbers.push(4.5);
              Collection<Object> sink = new ArrayList<>();
              numbers.popAll(sink);
              System.out.println(sink);
          }
      }
    answer: "[4.5, 3, 2, 1]"
    explanation: "pushAll lit des Integer, qui sont des Number : Iterable<? extends Number> accepte une List<Integer>. popAll écrit des Number dans une collection qui accepte au moins des Number : Collection<? super Number> accepte une Collection<Object>. Sans les jokers, ni l'un ni l'autre appel ne compilerait. Une pile rend le dernier entré en premier."
    concept: java-pecs
  - id: c2
    type: code-output
    prompt: "La signature complète de `max`, avec deux jokers. Qu'affiche le programme ?"
    code: |
      import java.time.LocalDate;
      import java.util.*;

      public class Main {
          static <T extends Comparable<? super T>> T max(List<? extends T> list) {
              T best = list.get(0);
              for (T t : list) if (t.compareTo(best) > 0) best = t;
              return best;
          }

          public static void main(String[] args) {
              List<LocalDate> sessions = List.of(LocalDate.of(2026, 7, 3), LocalDate.of(2026, 12, 8), LocalDate.of(2026, 8, 28));
              LocalDate last = max(sessions);
              System.out.println(last + " " + max(List.of(3, 11, 7)));
          }
      }
    answer: "2026-12-08 11"
    explanation: "LocalDate implémente Comparable<ChronoLocalDate>, un super-type : <E extends Comparable<E>> l'aurait refusé, Comparable<? super T> l'accepte. La liste, elle, ne fait que produire des T : List<? extends T>. Integer, comparable à lui-même, passe aussi."
    concept: java-comparable-super
  - id: c3
    type: single
    prompt: "Quelle signature publique choisir pour échanger deux éléments d'une liste ?"
    choices:
      - "public static <E> void swap(List<E> list, int i, int j)"
      - "public static void swap(List<?> list, int i, int j), avec un helper privé <E> swapHelper(List<E> list, …) qui fait le travail"
      - "public static void swap(List<Object> list, int i, int j)"
      - "public static void swap(List list, int i, int j)"
    answer: 1
    explanation: "E n'apparaît qu'une fois : un joker suffit et la signature est plus simple pour l'appelant. Mais list.set(i, list.get(j)) ne compile pas sur une List<?>. Le helper générique privé capture le type inconnu sous le nom E : dans son corps, get renvoie un E et set accepte un E. List<Object> refuserait une List<String>, et le type brut est exclu."
    concept: java-wildcard-vs-type-param
---

## Pourquoi c'est important

La bibliothèque de collections d'Ordo a une `Stack<E>` avec `pushAll(Iterable<E> src)`. Le moteur de prix a une `Stack<Number>` et veut y verser une `List<Integer>` : refus du compilateur. Le développeur tente une `List<Number>` à la place, recopie la liste, et finit par écrire `pushAll(Iterable src)` en type brut « pour que ça passe ». La sûreté des types s'en va, pour un problème qu'un seul caractère aurait réglé : `?`.

Go n'a pas de variance sur ses paramètres de type : un `[]int` ne passe pas pour un `[]any`, et on écrit une fonction de conversion. Java a une réponse plus fine, les **jokers bornés**, avec une règle mnémotechnique de deux mots.

## L'invariance gêne les API

Les génériques sont invariants (leçon 2) : `Iterable<Integer>` n'est pas un `Iterable<Number>`. C'est indispensable pour la sûreté (sinon on pourrait ajouter un `Double` à une liste d'`Integer`), mais trop strict pour une API.

```java
public void pushAll(Iterable<E> src) { for (E e : src) push(e); }   // Stack<Number> refuse une List<Integer>
```

Ce que `pushAll` veut vraiment dire, c'est « un `Iterable` de **quelque chose qui est un `E`** ». Java l'écrit `Iterable<? extends E>`, un **joker borné**.

```java
public void pushAll(Iterable<? extends E> src) { for (E e : src) push(e); }
```

Symétriquement, `popAll` vide la pile dans une collection. `Collection<E>` refuse une `Collection<Object>`, alors que verser des `Number` dans une collection d'`Object` est parfaitement sûr. Ce qu'il faut, c'est « une collection de **quelque chose dont `E` est un sous-type** » : `Collection<? super E>`.

::checkpoint{id="c1"}

## PECS : Producer Extends, Consumer Super

La règle de Bloch tient en quatre lettres :
- un paramètre qui **produit** des `E` pour la méthode (elle les lit) : `<? extends E>` ;
- un paramètre qui **consomme** des `E` de la méthode (elle les écrit) : `<? super E>` ;
- un paramètre qui fait **les deux** : pas de joker, le type exact.

::visual{id="java-ch05-pecs"}

La règle s'applique partout : `Collections.copy(List<? super T> dest, List<? extends T> src)` ; `union(Set<? extends E> s1, Set<? extends E> s2)` ; un `Comparator<? super T>` passé à une méthode de tri (il consomme des `T` pour les comparer).

**Jamais de joker dans un type de retour.** Ce serait obliger les clients à manipuler des jokers. La règle de Bloch : si l'utilisateur d'une API doit penser aux jokers, l'API est mal conçue. Les jokers servent justement à ce que les appels « évidents » compilent sans qu'il y pense.

## Comparable et Comparator : toujours super

Un `Comparable<T>` **consomme** des `T` (il les reçoit dans `compareTo`). La borne de `max` (leçon 3) devient donc, en appliquant PECS deux fois :

```java
public static <T extends Comparable<? super T>> T max(List<? extends T> list)
```

C'est indispensable pour les types qui **héritent** leur comparaison d'un super-type : `LocalDate` implémente `Comparable<ChronoLocalDate>`, `ScheduledFuture` hérite `Comparable<Delayed>`. Avec `E extends Comparable<E>`, aucun ne passerait.

::checkpoint{id="c2"}

> **Sous le capot :** `? extends E` et `? super E` ne sont pas des types, mais des **familles** de types. Pour chaque expression, javac remplace un joker par une variable de type fraîche (on la voit dans les messages d'erreur : `capture#1 of ? extends Number`). C'est la **capture de joker**. Sur une `List<? extends Number>`, `get` renvoie un `capture#1`, que javac sait convertir en `Number` : lecture permise. `add` attend un `capture#1`, dont javac ignore le type exact : écriture refusée (sauf `null`). D'où PECS : on lit d'un `extends`, on écrit dans un `super`.

## Joker ou paramètre de type ?

Beaucoup de méthodes peuvent s'écrire des deux façons. Règle de Bloch : **si un paramètre de type n'apparaît qu'une fois dans la signature d'une méthode publique, remplace-le par un joker**. `swap(List<?> list, int i, int j)` est plus simple pour l'appelant que `<E> swap(List<E> list, …)`.

Mais le corps ne compile plus : on ne peut rien écrire dans une `List<?>`. La solution est un **helper privé générique**, qui capture le type inconnu et lui donne un nom :

```java
public static void swap(List<?> list, int i, int j) {
    swapHelper(list, i, j);
}

private static <E> void swapHelper(List<E> list, int i, int j) {
    list.set(i, list.set(j, list.get(i)));
}
```

::checkpoint{id="c3"}

Le helper a la signature qu'on avait écartée de l'API publique ; c'est voulu : les clients voient la version simple, le corps travaille avec la version nommée.

## Pièges fréquents

- **Un paramètre producteur sans `? extends`** : `pushAll(Iterable<E>)` refuse un `Iterable` d'un sous-type.
- **Un paramètre consommateur sans `? super`** : `popAll(Collection<E>)` refuse une collection plus générale.
- **`Comparable<T>` au lieu de `Comparable<? super T>`** : `LocalDate`, `java.sql.Timestamp` et les types qui héritent leur comparaison sont refusés.
- **Un joker dans un type de retour** : les clients doivent l'écrire et le subir.
- **Un joker sur un paramètre qui produit et consomme** : on ne peut plus ni lire un `E` ni écrire un `E` sans cast.

## À retenir

- PECS : producteur `<? extends E>`, consommateur `<? super E>`, les deux : type exact.
- Pas de joker dans un type de retour : les jokers doivent rester invisibles pour l'utilisateur de l'API.
- `Comparable` et `Comparator` consomment : `<T extends Comparable<? super T>>`, `Comparator<? super T>`.
- Paramètre de type présent une seule fois → joker ; si le corps doit écrire, un helper privé générique capture le type.

> **Source :** *Effective Java*, 3e éd., item 31 (pages 139 à 145).
