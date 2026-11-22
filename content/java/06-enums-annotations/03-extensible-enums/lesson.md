---
id: java-ch06-l03
title: "Des enums extensibles grâce aux interfaces"
source: { chapter: 6, pages: "176-179" }
duration_min: 25
concepts:
  - id: java-enum-implements-interface
    label: "Un enum ne peut pas être étendu, mais il peut implémenter une interface : l'interface devient le type, et d'autres enums peuvent l'implémenter à leur tour (opcodes, règles, opérations)"
  - id: java-enum-type-token
    label: "<T extends Enum<T> & Operation> Class<T> : une borne d'intersection pour recevoir un enum entier qui implémente l'interface, et parcourir ses constantes avec getEnumConstants()"
  - id: java-enum-collection-param
    label: "Collection<? extends Operation> : plus souple, mélange des constantes de plusieurs enums, mais renonce à EnumSet et EnumMap pour ce type"
  - id: java-enum-no-impl-inheritance
    label: "Limite : pas d'héritage d'implémentation entre enums ; le code commun va dans une méthode par défaut de l'interface ou une classe d'aide statique"
glossary:
  - term: "borne d'intersection"
    definition: "Borne qui combine plusieurs types : <T extends Enum<T> & Operation>, un type qui est à la fois un enum et une Operation."
  - term: "getEnumConstants()"
    definition: "Méthode de Class qui renvoie les constantes d'un enum, ou null si la classe n'est pas un enum."
  - term: "opcode"
    definition: "Code d'opération d'un langage ou d'une machine : exemple type d'ensemble qu'on veut pouvoir étendre."
visuals: [java-ch06-extensible-enum]
labs: [java-ch06-l03-lab-extensible-rules]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Deux enums d'opérations, une interface commune, et deux façons de les parcourir. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          interface Operation { double apply(double x, double y); }

          enum BasicOperation implements Operation {
              PLUS("+") { public double apply(double x, double y) { return x + y; } },
              TIMES("*") { public double apply(double x, double y) { return x * y; } };
              private final String symbol;
              BasicOperation(String symbol) { this.symbol = symbol; }
              @Override public String toString() { return symbol; }
          }

          enum ExtendedOperation implements Operation {
              EXP("^") { public double apply(double x, double y) { return Math.pow(x, y); } },
              REMAINDER("%") { public double apply(double x, double y) { return x % y; } };
              private final String symbol;
              ExtendedOperation(String symbol) { this.symbol = symbol; }
              @Override public String toString() { return symbol; }
          }

          static <T extends Enum<T> & Operation> String all(Class<T> type, double x, double y) {
              StringJoiner out = new StringJoiner(" ");
              for (T op : type.getEnumConstants()) out.add(x + "" + op + y + "=" + op.apply(x, y));
              return out.toString();
          }

          static String mixed(Collection<? extends Operation> ops, double x, double y) {
              StringJoiner out = new StringJoiner(" ");
              for (Operation op : ops) out.add(op + "=" + op.apply(x, y));
              return out.toString();
          }

          public static void main(String[] args) {
              System.out.println(all(ExtendedOperation.class, 4, 2));
              System.out.println(mixed(List.of(BasicOperation.PLUS, ExtendedOperation.REMAINDER), 7, 3));
          }
      }
    answer: "4.0^2.0=16.0 4.0%2.0=0.0\n+=10.0 %=1.0"
    explanation: "all reçoit un enum entier par son jeton de type : la borne Enum<T> & Operation garantit à la fois des constantes à parcourir (getEnumConstants) et une méthode apply. mixed reçoit une collection quelconque d'Operation, ici prises dans deux enums différents."
    concept: java-enum-type-token
  - id: c2
    type: single
    prompt: "On veut que les clients d'Ordo puissent ajouter leurs propres règles de validation à celles de la bibliothèque, qui sont un enum `StandardRule`. Que faire ?"
    choices:
      - "Leur demander d'étendre StandardRule"
      - "Définir une interface OrderRule, que StandardRule implémente ; les clients écrivent leur propre enum qui implémente OrderRule ; l'API accepte des OrderRule"
      - "Ajouter une constante CUSTOM à StandardRule"
      - "Utiliser des constantes int"
    answer: 1
    explanation: "Un enum est final : on ne peut pas l'étendre. L'interface joue le rôle de type extensible, et chaque enum (celui de la bibliothèque comme ceux des clients) l'implémente. Les méthodes de l'API prennent l'interface, jamais l'enum de base."
    concept: java-enum-implements-interface
  - id: c3
    type: single
    prompt: "`BasicOperation` et `ExtendedOperation` ont toutes deux un champ `symbol` et le même `toString`. Comment partager ce code ?"
    choices:
      - "ExtendedOperation extends BasicOperation"
      - "Une classe abstraite commune aux deux enums"
      - "Il ne peut pas être hérité entre enums : une méthode par défaut de l'interface (si elle ne dépend pas d'un état) ou une classe d'aide statique ; sinon, le dupliquer s'il est court"
      - "Une constante partagée"
    answer: 2
    explanation: "Un enum hérite déjà d'Enum et ne peut rien étendre d'autre. Le code sans état peut aller dans une méthode par défaut de l'interface ; un état (symbol) doit vivre dans chaque enum. Bloch admet la duplication quand elle est minime."
    concept: java-enum-no-impl-inheritance
---

## Pourquoi c'est important

La bibliothèque de validation d'Ordo livre un enum `StandardRule` : quantité positive, prix dans les limites, symbole connu. Chaque client veut ajouter les siennes : un plafond de risque pour la salle des marchés, une liste de titres interdits pour la conformité. Ils ne peuvent pas modifier `StandardRule`, et Java interdit de l'étendre. La première version de l'API prenait un `StandardRule` en paramètre : impossible d'y faire entrer quoi que ce soit d'autre.

En Go, une interface et plusieurs types qui l'implémentent suffisent : c'est exactement la solution de Java, appliquée aux enums.

## Un enum ne s'étend pas, il implémente

Les enums sont presque toujours meilleurs que leurs alternatives, mais ils ont une limite : un enum ne peut pas en étendre un autre (il hérite déjà d'`Enum`). La plupart du temps, c'est une bonne chose : une constante d'un enum dérivé ne serait pas une constante de l'enum de base, ce qui serait déroutant.

Il existe pourtant un besoin légitime : les **opcodes**, les règles, les opérations, que des utilisateurs veulent compléter. La réponse : **une interface**. L'enum de base l'implémente, d'autres enums l'implémentent aussi, et l'API ne parle que de l'interface.

```java
public interface Operation { double apply(double x, double y); }

public enum BasicOperation implements Operation { PLUS("+") { … }, MINUS("-") { … }, … }

public enum ExtendedOperation implements Operation { EXP("^") { … }, REMAINDER("%") { … } }
```

Partout où l'API accepte une `Operation`, une constante d'`ExtendedOperation` convient.

::visual{id="java-ch06-extensible-enum"}

## Recevoir un enum entier, ou une collection

Parfois, l'API veut recevoir **toutes** les constantes d'un enum d'opérations, pour les tester toutes ou les proposer dans un menu. Deux façons, avec deux compromis :

**1. Un jeton de type et une borne d'intersection.**

```java
static <T extends Enum<T> & Operation> void test(Class<T> opEnumType, double x, double y)
```

La borne `T extends Enum<T> & Operation` garantit que le `Class` reçu est à la fois un **enum** (on peut parcourir ses constantes avec `getEnumConstants()`, et utiliser `EnumSet` ou `EnumMap`) et une **`Operation`** (on peut appeler `apply`). Passer un `Class` qui ne coche pas les deux cases ne compile pas.

**2. Une collection bornée.**

```java
static void test(Collection<? extends Operation> opSet, double x, double y)
```

Plus souple : on peut mélanger des constantes de plusieurs enums, ou ne passer qu'un sous-ensemble. Mais on perd la garantie « enum », donc `EnumSet` et `EnumMap` pour ce paramètre.

::checkpoint{id="c1"}

> **Sous le capot :** `Class.getEnumConstants()` renvoie, à chaque appel, une **copie** du tableau des constantes, obtenue par réflexion sur la méthode `values()` de l'enum (mise en cache par la classe `Class`), ou `null` si la classe n'est pas un enum. C'est pourquoi la borne `Enum<T>` est précieuse : sans elle, il faudrait tester ce `null`. Et une constante d'enum avec un corps est une sous-classe anonyme : `op.getClass()` peut donc être différent de `opEnumType`, mais `op.getDeclaringClass()` rend toujours l'enum.

## Ce que l'interface ne donne pas

L'héritage d'**implémentation** reste impossible entre enums. Si `BasicOperation` et `ExtendedOperation` partagent du code (un champ `symbol`, un `toString`), trois options :
- une **méthode par défaut** de l'interface, si le code ne dépend d'aucun état ;
- une **classe d'aide** statique (ou une méthode `static` de l'interface) ;
- la **duplication**, quand le code partagé est minime (Bloch l'admet pour `symbol`).

::checkpoint{id="c2"}

::checkpoint{id="c3"}

Le JDK utilise ce motif : `java.nio.file.LinkOption` est un enum qui implémente `CopyOption` et `OpenOption`, deux interfaces que d'autres enums (`StandardCopyOption`, `StandardOpenOption`) implémentent aussi. Les méthodes comme `Files.copy(Path, Path, CopyOption...)` acceptent un mélange.

## Pièges fréquents

- **Une API qui prend l'enum de base** au lieu de l'interface : personne ne peut l'étendre.
- **Un `Class<T>` sans la borne `Enum<T>`** : `getEnumConstants()` peut renvoyer `null`.
- **Mettre de l'état dans l'interface** (constantes déguisées) pour partager du code : l'interface définit un type (module 4).
- **Vouloir un enum qui en étend un autre** : utilise une interface, ou repense le modèle.

## À retenir

- Un enum ne s'étend pas, mais il implémente une interface : l'interface devient le type extensible.
- Recevoir un enum entier : `<T extends Enum<T> & Interface> Class<T>`, puis `getEnumConstants()`.
- Recevoir des constantes de plusieurs enums : `Collection<? extends Interface>`.
- Pas d'héritage d'implémentation entre enums : méthode par défaut, aide statique, ou petite duplication.

> **Source :** *Effective Java*, 3e éd., item 38 (pages 176 à 179).
