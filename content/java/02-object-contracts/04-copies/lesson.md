---
id: java-ch02-l04
title: "Copier un objet : clone, et pourquoi on l'évite"
source: { chapter: 3, pages: "58-65" }
duration_min: 35
concepts:
  - id: java-cloneable-broken
    label: "Cloneable est un mixin raté : pas de méthode clone, il modifie le comportement d'une méthode protégée d'Object"
  - id: java-clone-shallow
    label: "super.clone copie champ par champ : l'état mutable (tableaux, listes chaînées) est partagé avec l'original"
  - id: java-clone-deep
    label: "Copie profonde : cloner le tableau, recopier chaque chaîne, de façon itérative pour éviter le débordement de pile"
  - id: java-copy-constructor
    label: "Constructeur de copie, fabrique de copie et constructeur de conversion (new TreeSet<>(hashSet)) : la bonne façon de copier"
  - id: java-array-clone
    label: "Les tableaux sont la seule bonne utilisation de clone : array.clone() a le bon type et copie le contenu"
glossary:
  - term: "mixin"
    definition: "Interface qu'une classe implémente en plus de son type principal pour déclarer une capacité optionnelle (Comparable, Cloneable…)."
  - term: "copie superficielle"
    definition: "Copie des champs tels quels : les références pointent vers les mêmes objets que l'original."
  - term: "copie profonde"
    definition: "Copie qui duplique aussi les objets mutables référencés, pour que la copie et l'original ne partagent aucun état modifiable."
  - term: "constructeur de conversion"
    definition: "Constructeur de copie qui accepte une interface (Collection, Map) : le client choisit l'implémentation de la copie."
visuals: [java-ch02-copy-depth]
labs: [java-ch02-l04-lab-deep-copies]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le constructeur de Ticket compte les tickets créés. Qu'affiche le programme ?"
    code: |
      public class Main {
          static int created = 0;

          static class Ticket implements Cloneable {
              final int number;
              Ticket() { created++; number = created; }
              @Override public Ticket clone() {
                  try { return (Ticket) super.clone(); } catch (CloneNotSupportedException e) { throw new AssertionError(); }
              }
          }

          public static void main(String[] args) {
              Ticket t = new Ticket();
              Ticket copy = t.clone();
              System.out.println(created + " " + copy.number + " " + (t == copy));
          }
      }
    answer: "1 1 false"
    explanation: "Object.clone recopie la mémoire de l'objet sans exécuter aucun constructeur : le compteur ne bouge pas et le numéro « unique » est dupliqué. Croire que clone passe par le constructeur est l'erreur qui casse les identifiants et les compteurs."
    concept: java-cloneable-broken
  - id: c2
    type: single
    prompt: "Tu répares le clone d'une classe dont le champ est `final List<String> slots` : `result.slots = new ArrayList<>(slots);`. Que se passe-t-il ?"
    choices:
      - "Ça marche : la copie a sa propre liste"
      - "Le code ne compile pas : on ne peut pas réaffecter un champ final, même dans clone"
      - "Ça compile, mais lève CloneNotSupportedException à l'exécution"
      - "Ça compile, mais la copie partage encore la liste de l'original"
    answer: 1
    explanation: "clone n'est pas un constructeur aux yeux du compilateur : un champ final déjà recopié par super.clone ne peut plus être réaffecté (cannot assign a value to final variable). Pour rendre la classe clonable il faudrait retirer final, alors qu'un constructeur de copie l'initialise normalement."
    concept: java-clone-shallow
  - id: c3
    type: code-output
    prompt: "Le constructeur de conversion d'ArrayList copie la liste. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          public static void main(String[] args) {
              List<StringBuilder> original = new ArrayList<>(List.of(new StringBuilder("lun"), new StringBuilder("mar")));
              List<StringBuilder> copy = new ArrayList<>(original);
              copy.get(0).append("-Ana");
              copy.add(new StringBuilder("mer"));
              System.out.println(original.size() + " " + original.get(0));
          }
      }
    answer: "2 lun-Ana"
    explanation: "new ArrayList<>(original) crée une nouvelle liste (l'ajout de mer ne touche pas l'original) mais ses cases pointent vers les mêmes StringBuilder. Un constructeur de copie de collection est superficiel sur les éléments : il est profond seulement si les éléments sont immuables ou si tu les recopies toi-même."
    concept: java-copy-constructor
---

## Pourquoi c'est important

Un planning d'équipe affiche la semaine prochaine. Pour simuler « et si Ana prenait le mardi ? », le code fait `Schedule draft = current.clone();` puis modifie `draft`. Le scénario est abandonné… et le planning **réel** a changé quand même. Aucun constructeur n'a tourné, aucune validation non plus : `clone` a fait exactement ce qu'il promet, une copie **superficielle**, et la liste des créneaux était partagée.

Cette leçon t'explique comment `clone` fonctionne vraiment, comment l'écrire correctement quand tu n'as pas le choix, et surtout comment t'en passer.

## Le concept

**Le modèle mental :** un objet Java ne contient pas ses listes ni ses tableaux, il contient des **flèches** (des références) vers eux. Copier un objet, c'est d'abord copier ses flèches. La vraie question est donc toujours : *qu'est-ce qui pointe encore vers la même chose ?*

- **Copie superficielle** : on recopie les champs tels quels, les flèches visent les mêmes objets que l'original.
- **Copie profonde** : on duplique aussi chaque objet mutable visé, pour que copie et original ne partagent plus rien de modifiable.

Manipule-le avant de lire le code : clone, puis modifie l'original et regarde quelles copies bougent.

::visual{id="java-ch02-copy-depth"}

### Cloneable : une interface qui ne fait pas ce qu'elle dit

Un **mixin** est une interface qu'une classe ajoute à son type principal pour annoncer une capacité optionnelle (`Comparable` annonce « je sais me comparer »). On s'attendrait donc à ce que `Cloneable` apporte une méthode `clone()` publique. Raté :

- `Cloneable` est **vide** ;
- `clone()` est une méthode **protégée** d'`Object` ;
- implémenter `Cloneable` ne fait qu'une chose : `Object.clone()` renvoie alors une copie champ par champ au lieu de lever `CloneNotSupportedException`.

Une interface qui modifie en douce le comportement d'une méthode de la classe mère : c'est un usage à ne jamais imiter. Le reste repose sur des conventions que rien ne vérifie (appeler `super.clone()`, réparer l'état mutable, ne pas appeler de méthode redéfinissable), et l'objet est créé **sans passer par un constructeur**.

::checkpoint{id="c1"}

### Le clone correct d'une classe simple

Si tous les champs sont des primitifs ou des références vers des objets immuables, `super.clone()` suffit :

```java
@Override public PhoneNumber clone() {      // type de retour covariant : pas de cast chez le client
    try {
        return (PhoneNumber) super.clone();
    } catch (CloneNotSupportedException e) {
        throw new AssertionError();          // impossible : la classe implémente Cloneable
    }
}
```

(Remarque : une classe **immuable** ne devrait jamais offrir `clone`, qui ne ferait qu'encourager des copies inutiles. On partage un objet immuable, on ne le copie pas.)

### Le piège : l'état mutable partagé

La `Stack` du module 1 a un champ `Object[] elements`. Avec seulement `super.clone()`, la copie a son propre `size`… mais **le même tableau**. Un `push` sur la copie écrase une case de l'original.

La règle à retenir : **`clone` est un constructeur caché**. Il ne doit rien abîmer dans l'original et doit établir les invariants de la copie.

:::compare
--- bad: super.clone() seul
```java
@Override public Stack clone() {
    try {
        return (Stack) super.clone();   // size copié, elements PARTAGÉ
    } catch (CloneNotSupportedException e) {
        throw new AssertionError();
    }
}
```
Un `push` sur la copie écrit dans le tableau de l'original.
--- good: réparer l'état mutable
```java
@Override public Stack clone() {
    try {
        Stack result = (Stack) super.clone();
        result.elements = elements.clone();   // nouveau tableau, mêmes éléments
        return result;
    } catch (CloneNotSupportedException e) {
        throw new AssertionError();
    }
}
```
Chaque pile a son tableau ; les éléments eux-mêmes restent partagés.
:::

Deux remarques :

- `elements.clone()` sur un tableau renvoie un `Object[]`, sans cast : c'est **la** bonne utilisation de `clone`. Pour copier un tableau, `array.clone()` est l'idiome.
- Si `elements` était `final`, cette ligne ne compilerait pas. `clone` est **incompatible avec les champs `final`** qui référencent un état mutable : pour rendre une classe clonable, il faudrait affaiblir son design.

::checkpoint{id="c2"}

### Plus profond : les structures chaînées

Une table de hachage maison : un tableau de compartiments, chacun en tête d'une liste chaînée d'`Entry`. Cloner le tableau ne suffit pas : la copie a son propre tableau, mais il pointe vers **les mêmes** entrées. Il faut copier chaque chaîne.

:::reveal Avant de lire la suite : pourquoi pas une jolie récursion `next.deepCopy()` ?
La version récursive (`new Entry(key, value, next == null ? null : next.deepCopy())`) consomme une frame de pile par élément : avec une chaîne de 100 000 entrées, `StackOverflowError`. Et une chaîne longue arrive justement en production quand le hash est mauvais (leçon 2). D'où la boucle ci-dessous.
:::

:::steps
```java
// Copie itérative d'une chaîne : une seule frame de pile, quelle que soit la longueur.
Entry deepCopy() {
    Entry result = new Entry(key, value, next);
    for (Entry p = result; p.next != null; p = p.next)
        p.next = new Entry(p.next.key, p.next.value, p.next.next);
    return result;
}
```
--- 3: On copie la tête. Son `next` vise encore la chaîne **originale**, provisoirement.
--- 4: `p` avance sur la **copie** : tant que le maillon suivant est un original, il reste du travail.
--- 5: On remplace ce maillon original par une copie neuve, qui vise à son tour le reste de l'original.
--- 4-5: À chaque tour, la frontière copie / original recule d'un maillon : à la fin, plus aucune flèche ne revient vers l'original.
--- 6: Une boucle, pas de récursion : la profondeur de pile reste constante pour 10 ou 100 000 entrées.
:::

### La bonne réponse : le constructeur de copie

```java
public Schedule(Schedule other) { ... }                 // constructeur de copie
public static Schedule copyOf(Schedule other) { ... }   // fabrique de copie
```

Comparé à `clone`, c'est un constructeur normal :

- il passe par la validation et établit les invariants comme n'importe quel constructeur ;
- il est compatible avec les champs `final` ;
- pas d'exception vérifiée, pas de cast, pas de convention invisible.

Mieux encore, il peut accepter une **interface** : c'est un **constructeur de conversion**. Toutes les collections du JDK en ont un : `new TreeSet<>(hashSet)` copie un `HashSet` **en** `TreeSet`. `clone` ne pourrait jamais faire ça, puisqu'il renvoie toujours la classe de l'original.

> **Attention :** un constructeur de copie ne copie que ce que tu lui demandes. Ceux des collections créent une nouvelle structure, mais ses cases visent **les mêmes éléments**. C'est sans danger avec des éléments immuables (`String`, records de valeurs), pas avec des `StringBuilder` ou des objets à setters.

::checkpoint{id="c3"}

### Quand clone reste justifié

- Pour **copier un tableau** : `array.clone()`.
- Quand tu étends une classe qui implémente déjà `Cloneable` : tu dois alors écrire un `clone` correct (`super.clone()`, puis réparer l'état mutable).
- Une classe **conçue pour l'héritage** ne doit pas implémenter `Cloneable`. Soit elle imite `Object` (un `clone` protégé qui lève `CloneNotSupportedException`), soit elle l'interdit avec un `protected final Object clone() throws CloneNotSupportedException { throw new CloneNotSupportedException(); }`.

## Sous le capot : comment la JVM clone

`Object.clone()` est une méthode **native**. HotSpot vérifie d'abord que la classe implémente `Cloneable` (sinon `CloneNotSupportedException`), puis **alloue un objet de la même classe d'exécution** et y recopie la mémoire de l'original, mot par mot. Aucun constructeur n'est exécuté, aucun initialiseur de champ non plus. Trois conséquences prévisibles :

- c'est pour ça que `super.clone()` renvoie le bon type même appelé depuis la classe mère : la JVM regarde la classe réelle de `this`, pas celle qui contient l'appel ;
- les champs `final` sont recopiés tels quels et ne peuvent plus être réaffectés : impossible de « réparer » un `final List` partagé ;
- un compteur d'instances incrémenté dans le constructeur ne voit pas les clones, et un identifiant unique est dupliqué.

Pour les tableaux, `clone()` est **publique** et sans exception vérifiée : la spécification du langage déclare que chaque type tableau implémente `Cloneable` et redéfinit `clone()` avec son propre type de retour. D'où `int[] copy = original.clone();` sans cast ni `try`. Attention : un tableau de références est copié **superficiellement** (`Point[]` copié pointe vers les mêmes `Point`), et un tableau de tableaux ne copie que le premier niveau.

## Pièges fréquents

- **`super.clone()` seul sur une classe qui contient un tableau ou une collection** : état partagé.
- **Cloner un tableau mais pas les chaînes qu'il référence** : copie à moitié profonde.
- **Copie récursive d'une structure chaînée** : débordement de pile sur une longue chaîne.
- **`clone` qui appelle une méthode redéfinissable** : la sous-classe s'exécute avant d'avoir réparé son état.
- **Offrir `clone` sur une classe immuable** : partage plutôt que copie.
- **Croire qu'`int[][].clone()` est une copie profonde** : seul le premier niveau est copié.

## À retenir

- `Cloneable` est cassé par conception : n'implémente pas, n'étends pas, sauf pour étendre une classe qui l'implémente déjà.
- Si tu écris `clone` : `super.clone()`, type de retour covariant, pas de `throws`, puis copie profonde de l'état mutable (itérative pour les chaînes).
- Préfère un **constructeur ou une fabrique de copie**, idéalement **de conversion** (paramètre de type interface).
- Exception : les tableaux se copient avec `clone()`.

> **Source :** *Effective Java*, 3e éd., item 13 (pages 58 à 65).
