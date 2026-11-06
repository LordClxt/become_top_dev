---
id: java-ch02-l04
title: "Copier un objet : clone, et pourquoi on l'évite"
source: { chapter: 3, pages: "58-65" }
duration_min: 30
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
visuals: []
labs: [java-ch02-l04-lab-deep-copies]
extra: false
xp: 30
---

## Pourquoi c'est important

Un planning d'équipe affiche la semaine prochaine. Pour proposer un scénario « et si Ana prenait le mardi ? », le code fait `Schedule draft = current.clone();` puis modifie `draft`. Le scénario est abandonné… et le planning **réel** a changé quand même : la copie partageait la liste des créneaux avec l'original. Aucun constructeur n'a été appelé, aucune validation n'a tourné, et `clone` a fait exactement ce qu'il promet : une copie **superficielle**.

Cette leçon t'explique comment `clone` fonctionne vraiment, comment l'écrire correctement quand tu n'as pas le choix, et surtout comment t'en passer.

## Le concept

### Cloneable : une interface qui ne fait pas ce qu'elle dit

On s'attendrait à ce qu'une classe qui implémente `Cloneable` ait une méthode `clone()` publique. Ce n'est pas le cas : `Cloneable` est **vide**, et `clone()` est une méthode **protégée** d'`Object`. Implémenter `Cloneable` ne fait qu'une chose : changer le comportement de `Object.clone()`, qui renvoie alors une copie champ par champ au lieu de lever `CloneNotSupportedException`.

C'est un usage des interfaces qu'il ne faut jamais imiter. Et le reste du mécanisme repose sur des conventions que rien ne vérifie : appeler `super.clone()` (sinon les sous-classes reçoivent un objet du mauvais type), réparer l'état mutable, ne pas appeler de méthode redéfinissable… Le tout en créant un objet **sans passer par un constructeur**.

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

La `Stack` du module 1 a un champ `Object[] elements`. Avec seulement `super.clone()`, la copie a son propre `size`… mais **le même tableau**. Un `push` sur la copie écrase une case de l'original. La règle : **`clone` est un constructeur caché**. Il ne doit rien abîmer dans l'original et doit établir les invariants de la copie.

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

Deux remarques :

- `elements.clone()` sur un tableau renvoie un `Object[]`, sans cast : c'est **la** bonne utilisation de `clone`. Pour copier un tableau, `array.clone()` est l'idiome.
- Si `elements` était `final`, cette ligne ne compilerait pas. `clone` est **incompatible avec les champs `final`** qui référencent un état mutable : pour rendre une classe clonable, il faudrait affaiblir son design.

### Plus profond : les structures chaînées

Une table de hachage maison : un tableau de compartiments, chacun en tête d'une liste chaînée d'`Entry`. Cloner le tableau ne suffit pas : la copie a son propre tableau, mais il pointe vers **les mêmes** entrées. Il faut copier chaque chaîne :

```java
// Copie itérative d'une chaîne : une seule frame de pile, quelle que soit la longueur.
Entry deepCopy() {
    Entry result = new Entry(key, value, next);
    for (Entry p = result; p.next != null; p = p.next)
        p.next = new Entry(p.next.key, p.next.value, p.next.next);
    return result;
}
```

La version **récursive** (`new Entry(key, value, next == null ? null : next.deepCopy())`) est plus jolie, mais consomme une frame de pile par élément : avec une chaîne de 100 000 entrées, `StackOverflowError`. En production, une chaîne longue arrive justement quand le hash est mauvais (leçon 2).

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
