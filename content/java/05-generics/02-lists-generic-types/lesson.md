---
id: java-ch05-l02
title: "Des listes plutôt que des tableaux, et des types génériques"
source: { chapter: 5, pages: "126-134" }
duration_min: 35
concepts:
  - id: java-arrays-vs-generics
    label: "Les tableaux sont covariants et réifiés (erreur à l'exécution : ArrayStoreException) ; les génériques sont invariants et effacés (erreur à la compilation) ; les deux se mélangent mal"
  - id: java-generic-array-creation
    label: "new List<String>[], new E[] sont interdits : un tableau générique permettrait de casser la sûreté des types ; préférer List<E>"
  - id: java-generify-type
    label: "Rendre une classe générique : paramètre de type, et pour un stockage en tableau, soit (E[]) new Object[n] prouvé sûr et caché, soit un Object[] avec un cast (E) à chaque lecture"
  - id: java-heap-pollution
    label: "Pollution du tas : une variable d'un type paramétré qui désigne un objet d'un autre type ; elle survient quand un E[] interne (en réalité un Object[]) s'échappe de la classe"
  - id: java-bounded-type-param
    label: "Paramètre de type borné : <E extends Delayed> restreint les arguments de type et donne accès aux méthodes de la borne sans cast"
glossary:
  - term: "covariant"
    definition: "Si Sub est un sous-type de Super, alors Sub[] est un sous-type de Super[]. Vrai pour les tableaux, faux pour les génériques."
  - term: "invariant"
    definition: "List<Sub> n'est ni un sous-type ni un super-type de List<Super>, quels que soient Sub et Super."
  - term: "réifié"
    definition: "Qui connaît son type d'éléments à l'exécution : un Long[] sait qu'il est un tableau de Long."
  - term: "pollution du tas (heap pollution)"
    definition: "Situation où une variable d'un type paramétré désigne un objet qui n'est pas de ce type ; elle mène à une ClassCastException plus loin."
  - term: "paramètre de type borné"
    definition: "Paramètre de type restreint à un type et ses sous-types : <E extends Number>."
visuals: [java-ch05-covariance]
labs: [java-ch05-l02-lab-generic-ring-buffer]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un `Long[]` rangé dans une variable `Object[]`. Qu'affiche le programme ?"
    code: |
      public class Main {
          public static void main(String[] args) {
              Object[] objects = new Long[1];     // permis : les tableaux sont covariants
              System.out.println(objects.getClass().getSimpleName());
              try {
                  objects[0] = "je ne suis pas un Long";
                  System.out.println("rangé");
              } catch (ArrayStoreException e) {
                  System.out.println("ArrayStoreException");
              }
          }
      }
    answer: "Long[]\nArrayStoreException"
    explanation: "Covariance : Long[] est un sous-type d'Object[], donc l'affectation compile. Réification : le tableau sait qu'il ne contient que des Long et refuse la chaîne, mais à l'exécution seulement. Avec List<Object> list = new ArrayList<Long>(), l'erreur serait à la compilation : les génériques sont invariants."
    concept: java-arrays-vs-generics
  - id: c2
    type: code-output
    prompt: "Une pile générique stocke ses éléments dans `(E[]) new Object[4]` et expose une copie de ce tableau. Qu'affiche le programme ?"
    code: |
      import java.util.Arrays;

      public class Main {
          static final class Stack<E> {
              @SuppressWarnings("unchecked")
              private E[] elements = (E[]) new Object[4];   // en vrai : un Object[]
              private int size;

              void push(E e) { elements[size++] = e; }
              E pop() { return elements[--size]; }
              E[] snapshot() { return Arrays.copyOf(elements, size); }
          }

          public static void main(String[] args) {
              Stack<String> stack = new Stack<>();
              stack.push("a");
              stack.push("b");
              System.out.println(stack.pop());
              try {
                  String[] copy = stack.snapshot();
                  System.out.println(copy.length);
              } catch (ClassCastException e) {
                  System.out.println("ClassCastException");
              }
          }
      }
    answer: "b\nClassCastException"
    explanation: "Dans la classe, E[] est effacé en Object[] : tout fonctionne. Mais snapshot renvoie un Object[] déguisé en E[], et l'appelant, qui croit recevoir un String[], subit le cast inséré par le compilateur. Le cast (E[]) n'est sûr que si le tableau ne sort jamais de la classe : renvoie une List<E> à la place."
    concept: java-heap-pollution
  - id: c3
    type: single
    prompt: "Pourquoi `List<String>[] lists = new List<String>[1];` est-il interdit ?"
    choices:
      - "Par oubli, il sera autorisé dans une future version"
      - "Parce qu'avec la covariance des tableaux, on pourrait y ranger une List<Integer> sans erreur, puis lire un Integer comme un String : la sûreté des types serait cassée"
      - "Parce que les tableaux de listes consomment trop de mémoire"
      - "Parce que List est une interface"
    answer: 1
    explanation: "Si c'était permis : Object[] objects = lists (covariance) ; objects[0] = List.of(42) (le tableau ne connaît que List, effacée : pas d'ArrayStoreException) ; String s = lists[0].get(0) lève une ClassCastException. Le compilateur interdit la création pour empêcher ce scénario."
    concept: java-generic-array-creation
---

## Pourquoi c'est important

Le moteur de prix d'Ordo garde les derniers prix de chaque titre dans un tampon circulaire. La première version, écrite avant que l'équipe passe à Java moderne, stockait des `Object` : chaque appelant castait ce qu'il lisait. Quelqu'un a « modernisé » la classe en `RingBuffer<E>`, avec un `E[]` interne et une méthode qui renvoie ce tableau. Tout compilait. Le premier appelant qui a écrit `Price[] last = buffer.snapshot();` a reçu une `ClassCastException`… à la ligne de l'affectation, dans un code qui n'avait aucun cast.

En Go, les tranches (*slices*) génériques `[]T` savent leur type à l'exécution, et une `[]int` n'est jamais une `[]any`. Java a des tableaux qui se comportent d'une façon, et des génériques qui se comportent de la façon opposée. Les mélanger produit exactement ce bug.

## Tableaux et génériques : deux règles opposées

**1. Covariance contre invariance.** Si `Long` est un sous-type d'`Object`, alors `Long[]` est un sous-type d'`Object[]` : les tableaux sont **covariants**. Mais `List<Long>` n'est **pas** un sous-type de `List<Object>` : les génériques sont **invariants**.

**2. Réification contre effacement.** Un tableau connaît son type d'éléments à l'exécution (il est **réifié**) et refuse un mauvais élément, mais seulement à ce moment-là. Les génériques n'existent qu'à la compilation (**effacement**, leçon 1) : le compilateur refuse le mauvais élément avant l'exécution.

::checkpoint{id="c1"}

Les deux permettent de détecter l'erreur. Le tableau la détecte à l'exécution, en production ; la liste, à la compilation, sur ton poste. C'est le premier argument de Bloch pour **préférer les listes aux tableaux**.

::visual{id="java-ch05-covariance"}

## Pourquoi `new E[]` est interdit

Parce qu'ils suivent des règles opposées, tableaux et génériques se combinent mal. Créer un tableau d'un type générique (`new List<E>[]`, `new List<String>[]`, `new E[]`) est **interdit**. Sinon, la covariance des tableaux permettrait de contourner la vérification des génériques :

::checkpoint{id="c3"}

Conséquences pratiques : pas de `new E[n]` dans une classe générique, et un avertissement quand on appelle une méthode à paramètre variable générique (leçon 5), qui crée un tableau générique en cachette.

Quand un tableau et une liste sont en concurrence, Bloch conseille la liste. Exemple : une classe `Chooser<T>` qui tire un élément au hasard. Avec un `Object[]` interne, chaque lecture demande un cast et lève un avertissement ; avec une `List<T>` (`new ArrayList<>(choices)`), il n'y a ni cast ni avertissement, au prix d'un peu de performance, rarement mesurable.

## Rendre une classe générique

Une classe qui stocke des `Object` et oblige ses clients à caster gagne à devenir générique : les erreurs passent de l'exécution à la compilation, et les casts disparaissent du code client. La difficulté arrive quand la classe stocke ses éléments dans un **tableau**, puisque `new E[n]` est interdit. Deux techniques :

```java
// Technique 1 : créer un Object[] et le caster une fois en E[]
@SuppressWarnings("unchecked")   // sûr : le tableau est privé, ne sort jamais, et ne reçoit que des E (via push)
private E[] elements = (E[]) new Object[DEFAULT_CAPACITY];

// Technique 2 : garder un Object[], et caster chaque élément lu
private Object[] elements = new Object[DEFAULT_CAPACITY];
public E pop() {
    @SuppressWarnings("unchecked") E result = (E) elements[--size];   // sûr : seul push écrit, avec des E
    …
}
```

La première est plus lisible (le champ dit `E[]`, un seul cast) ; la seconde ne ment jamais sur le type du tableau. Les deux sont correctes **tant que le tableau ne sort pas de la classe**. Dès qu'un `E[]` interne, en réalité un `Object[]`, est renvoyé à un appelant, c'est de la **pollution du tas** : une variable de type `String[]` désigne un `Object[]`, et le cast inséré par le compilateur échoue chez l'appelant.

::checkpoint{id="c2"}

> **Sous le capot :** `(E[]) new Object[n]` ne fait rien à l'exécution : après effacement, `E` devient `Object` (ou sa borne), et le cast vers `Object[]` disparaît. Le champ `elements` est un `Object[]` dans le bytecode. Le cast qui échoue est celui que javac ajoute **chez l'appelant**, là où il connaît `E = String` : `checkcast [Ljava/lang/String;`. C'est pour ça que l'erreur apparaît dans un code « sans cast ». Le JDK lui-même utilise la seconde technique : `ArrayList` stocke un `Object[] elementData` et caste à la lecture (`elementData(index)`).

## Les paramètres de type bornés

Un paramètre de type peut être **borné** : `class DelayQueue<E extends Delayed>` n'accepte que des types qui implémentent `Delayed`. Deux bénéfices : le compilateur refuse `DelayQueue<String>`, et la classe peut appeler les méthodes de `Delayed` sur ses éléments sans cast. La borne est aussi ce que devient `E` après effacement : un `(E[]) new Object[n]` y serait donc faux, il faudrait `new Delayed[n]`.

## Pièges fréquents

- **Renvoyer le tableau interne `E[]`** d'une classe générique : pollution du tas, `ClassCastException` chez l'appelant. Renvoie une `List<E>` (ou `Arrays.copyOf(elements, size, type)` avec un `Class<E>` reçu).
- **`Object[]` partout, cast chez chaque client** : les erreurs restent à l'exécution. Rends la classe générique.
- **Supprimer l'avertissement du cast `(E[])` sans prouver** que le tableau ne sort pas et ne reçoit que des `E`.
- **Préférer les tableaux pour la performance** sans l'avoir mesuré : la liste coûte rarement plus qu'une indirection.
- **Croire que `List<Long>` est une `List<Number>`** : invariance. Pour accepter les deux, il faut un joker (leçon 4).

## À retenir

- Tableaux : covariants et réifiés (erreur à l'exécution). Génériques : invariants et effacés (erreur à la compilation). Préfère les listes.
- `new E[]` et `new List<String>[]` sont interdits, pour protéger la sûreté des types.
- Une classe générique sur un tableau : `(E[]) new Object[n]` ou `Object[]` + cast à la lecture, prouvé sûr et supprimé au plus près, **et le tableau ne sort jamais**.
- `<E extends Borne>` restreint les types acceptés et donne accès aux méthodes de la borne.

> **Source :** *Effective Java*, 3e éd., items 28 et 29 (pages 126 à 134).
