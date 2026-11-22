---
id: java-ch06-l01
title: "Des enums plutôt que des constantes int"
source: { chapter: 6, pages: "157-167" }
duration_min: 35
concepts:
  - id: java-int-enum-pattern
    label: "Le motif « int enum » (static final int) : aucune sûreté de type, aucun espace de noms, valeurs compilées dans les clients, pas de nom à l'affichage"
  - id: java-enum-class
    label: "Un enum est une classe à nombre fixe d'instances, sûre et sérialisable : il peut porter des champs (final), des constructeurs et des méthodes, et implémenter des interfaces"
  - id: java-constant-specific-methods
    label: "Méthodes propres à chaque constante : une méthode abstraite redéfinie dans le corps de chaque constante, plutôt qu'un switch sur this ; enum stratégie quand plusieurs constantes partagent un comportement"
  - id: java-enum-static-init
    label: "Un constructeur d'enum ne peut pas utiliser les champs static de l'enum (ils ne sont pas encore initialisés) : on remplit une table de recherche (fromString) dans un bloc static ou une initialisation après les constantes"
  - id: java-enum-switch-exhaustive
    label: "Java 14+ : un switch expression sur un enum couvre toutes les constantes sans default ; une constante ajoutée sans branche devient une erreur de compilation"
glossary:
  - term: "motif int enum"
    definition: "Groupe de constantes static final int qui imite un type énuméré, sans aucune vérification de type."
  - term: "type énuméré (enum)"
    definition: "Type dont les valeurs sont un ensemble fixe de constantes, chacune étant une instance unique de la classe."
  - term: "méthode propre à une constante"
    definition: "Implémentation d'une méthode donnée dans le corps d'une constante d'enum, qui remplace celle de l'enum pour cette constante."
  - term: "enum stratégie"
    definition: "Enum imbriqué privé passé au constructeur d'un autre enum pour factoriser un comportement partagé par plusieurs constantes."
visuals: [java-ch06-enum-anatomy]
labs: [java-ch06-l01-lab-warmup-order-status]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Des pommes et des oranges en constantes `int`. Qu'affiche le programme ?"
    code: |
      public class Main {
          // Le motif « int enum » : des constantes entières
          static final int APPLE_FUJI = 0, APPLE_PIPPIN = 1, APPLE_GRANNY_SMITH = 2;
          static final int ORANGE_NAVEL = 0, ORANGE_TEMPLE = 1, ORANGE_BLOOD = 2;

          static String describe(int apple) {
              return switch (apple) {
                  case APPLE_FUJI -> "Fuji";
                  case APPLE_PIPPIN -> "Pippin";
                  case APPLE_GRANNY_SMITH -> "Granny Smith";
                  default -> "inconnue";
              };
          }

          public static void main(String[] args) {
              System.out.println(APPLE_FUJI == ORANGE_NAVEL);
              System.out.println(describe(ORANGE_BLOOD));
              int juice = (APPLE_PIPPIN - ORANGE_TEMPLE) / APPLE_PIPPIN;
              System.out.println(juice);
          }
      }
    answer: "true\nGranny Smith\n0"
    explanation: "Pour le compilateur, ce ne sont que des int : une pomme égale une orange, une orange sanguine passe pour une Granny Smith, et on peut même soustraire des fruits. Rien n'est refusé. Avec deux enums, chacune de ces trois lignes serait une erreur de compilation."
    concept: java-int-enum-pattern
  - id: c2
    type: code-output
    prompt: "Une calculatrice dont chaque opération apporte sa propre implémentation. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          enum Operation {
              PLUS("+") { double apply(double x, double y) { return x + y; } },
              MINUS("-") { double apply(double x, double y) { return x - y; } },
              TIMES("*") { double apply(double x, double y) { return x * y; } },
              DIVIDE("/") { double apply(double x, double y) { return x / y; } };

              private final String symbol;
              Operation(String symbol) { this.symbol = symbol; }
              abstract double apply(double x, double y);
              @Override public String toString() { return symbol; }
          }

          public static void main(String[] args) {
              StringJoiner out = new StringJoiner(" | ");
              for (Operation op : Operation.values()) out.add("6 " + op + " 4 = " + op.apply(6, 4));
              System.out.println(out);
              System.out.println(Operation.valueOf("TIMES").ordinal() + " " + Operation.TIMES.getClass().isAnonymousClass());
          }
      }
    answer: "6 + 4 = 10.0 | 6 - 4 = 2.0 | 6 * 4 = 24.0 | 6 / 4 = 1.5\n2 true"
    explanation: "values() renvoie les constantes dans l'ordre de déclaration. Chaque constante avec un corps est une sous-classe anonyme de l'enum : TIMES.getClass() est cette classe anonyme (TIMES.getDeclaringClass() rendrait Operation). valueOf retrouve la constante par son nom ; ordinal() vaut sa position, 2."
    concept: java-constant-specific-methods
  - id: c3
    type: code-output
    prompt: "Chaque devise s'enregistre dans une table de recherche depuis son constructeur, en passant par une méthode `static`. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          enum Currency {
              EUR("€"), USD("$"), JPY("¥");

              private static final Map<String, Currency> BY_SYMBOL = new HashMap<>();
              private final String symbol;

              Currency(String symbol) {
                  this.symbol = symbol;
                  register(this);   // passe par une méthode static : le compilateur ne voit rien
              }

              private static void register(Currency c) { BY_SYMBOL.put(c.symbol, c); }

              static Optional<Currency> fromSymbol(String s) { return Optional.ofNullable(BY_SYMBOL.get(s)); }
          }

          public static void main(String[] args) {
              try {
                  System.out.println(Currency.fromSymbol("€"));
              } catch (Throwable t) {
                  System.out.println(t.getClass().getSimpleName() + " / " + t.getCause().getClass().getSimpleName());
              }
          }
      }
    answer: "ExceptionInInitializerError / NullPointerException"
    explanation: "Les constantes sont créées en premier, avant les autres champs static : quand le constructeur d'EUR appelle register, BY_SYMBOL vaut encore null. NullPointerException pendant l'initialisation de la classe, emballée dans une ExceptionInInitializerError. Écrire BY_SYMBOL.put directement dans le constructeur serait refusé par le compilateur ; la méthode static le contourne. La correction : remplir la table après les constantes, dans un bloc static."
    concept: java-enum-static-init
---

## Pourquoi c'est important

Le statut d'un ordre, chez Ordo, était longtemps une constante entière : `NEW = 0`, `PARTIAL = 1`, `FILLED = 2`, `CANCELLED = 3`. Un jour, un module a envoyé `status = 4` (un code de rejet d'une API partenaire) ; un autre l'a comparé à `FILLED` avec `>=` et a considéré l'ordre comme exécuté. Les journaux affichaient « statut 4 » sans dire ce que c'était. Et quand l'équipe a renuméroté les constantes, les modules qui n'avaient pas été recompilés ont continué avec les anciennes valeurs.

En Go, on écrit `type Status int` avec un bloc `const` et `iota` : c'est le motif « int enum » avec un nom de type, un peu mieux, mais `Status(42)` reste permis. Java a de vrais types énumérés depuis Java 5 : des classes à nombre fixe d'instances, que le compilateur vérifie.

## Les défauts du motif « int enum »

```java
public static final int APPLE_FUJI = 0, APPLE_PIPPIN = 1, APPLE_GRANNY_SMITH = 2;
public static final int ORANGE_NAVEL = 0, ORANGE_TEMPLE = 1, ORANGE_BLOOD = 2;
```

::checkpoint{id="c1"}

- **Aucune sûreté de type** : une orange passe pour une pomme, on compare et on soustrait des fruits.
- **Aucun espace de noms** : les préfixes `APPLE_` et `ORANGE_` font le travail du compilateur.
- **Des valeurs compilées dans les clients** : une constante `static final` est recopiée dans le code de chaque client. La changer sans recompiler les clients ne change rien chez eux.
- **Rien à afficher** : un journal montre `2`, pas `GRANNY_SMITH`. Impossible aussi de parcourir les valeurs ou de connaître leur nombre de façon fiable.

La variante en `String` est pire : une faute de frappe compile, et la comparaison se fait sur des chaînes.

## Un enum est une classe

```java
public enum Apple { FUJI, PIPPIN, GRANNY_SMITH }
```

Chaque constante est une instance **unique**, créée une fois, exportée par un champ `public static final`. Il n'existe pas d'autre instance, et on ne peut pas en créer : un enum est un singleton généralisé (module 1). Les enums sont sûrs (un `Apple` n'est jamais une `Orange`), ont leur propre espace de noms, savent s'afficher (`toString` renvoie le nom), se parcourir (`values()`), se retrouver par nom (`valueOf`), et implémentent `Comparable` et `Serializable`.

Mais surtout, un enum est une **classe** : il peut avoir des **champs**, un **constructeur** et des **méthodes**. L'exemple de Bloch, les planètes : chacune avec sa masse et son rayon, et une méthode qui calcule la gravité de surface.

```java
public enum Planet {
    MERCURY(3.302e+23, 2.439e6), VENUS(4.869e+24, 6.052e6), EARTH(5.975e+24, 6.378e6);   // …

    private final double mass, radius, surfaceGravity;   // final : les enums sont immuables

    Planet(double mass, double radius) {
        this.mass = mass;
        this.radius = radius;
        this.surfaceGravity = G * mass / (radius * radius);
    }
    public double surfaceWeight(double mass) { return mass * surfaceGravity; }   // F = ma
}
```

::visual{id="java-ch06-enum-anatomy"}

## Un comportement par constante

Quand le comportement **change** d'une constante à l'autre, l'instinct pousse à écrire un `switch (this)` dans l'enum. C'est fragile : ajouter une constante sans ajouter de branche compile, et échoue à l'exécution. La bonne forme : une méthode **abstraite** dans l'enum, implémentée par **chaque** constante dans son propre corps.

::checkpoint{id="c2"}

Ajouter une constante sans implémenter `apply` ne compile plus. Quand plusieurs constantes **partagent** un comportement (les jours de semaine et de week-end d'une paie, chez Bloch), on évite de le dupliquer avec un **enum stratégie** : un enum privé imbriqué (`PayType.WEEKDAY`, `PayType.WEEKEND`) passé au constructeur de chaque constante, qui lui délègue le calcul.

> **Au-delà du livre (Java 14 et 21) :** le `switch` *expression* sur un enum est **exhaustif** : il doit couvrir toutes les constantes, sans `default`, sinon le code ne compile pas. Il devient donc sûr de faire un `switch` sur un enum **qu'on ne contrôle pas**, pour lui ajouter un comportement qu'il n'a pas (l'inverse d'une opération, le libellé d'un statut). Garde les méthodes propres à chaque constante pour le comportement qui **appartient** à l'enum.

## Retrouver une constante : fromString

`valueOf(String)` retrouve une constante par son **nom**. Pour la retrouver par une autre clé (un symbole, un code d'API), on construit une table. Piège : un constructeur d'enum **ne peut pas** utiliser les champs `static` de l'enum (sauf les constantes de compilation). Les constantes sont créées **avant** les autres champs `static` : la table n'existe pas encore.

::checkpoint{id="c3"}

La forme correcte remplit la table **après** les constantes :

```java
private static final Map<String, Currency> BY_SYMBOL =
        Stream.of(values()).collect(toMap(Currency::symbol, c -> c));

public static Optional<Currency> fromSymbol(String symbol) {
    return Optional.ofNullable(BY_SYMBOL.get(symbol));   // Optional : un symbole inconnu n'est pas une exception
}
```

> **Sous le capot :** `enum Currency { EUR, … }` compile en `final class Currency extends java.lang.Enum<Currency>`, avec un champ `public static final Currency EUR` par constante et un tableau privé `$VALUES`. L'initialiseur statique de la classe crée les constantes **dans l'ordre de déclaration**, puis exécute les autres initialisations `static` dans l'ordre du texte. Une constante avec un corps est une sous-classe anonyme (`Currency$1`), d'où une classe `final` qui a tout de même des sous-classes : c'est la seule exception que le compilateur autorise. Et `values()` renvoie à chaque appel une **copie** de `$VALUES` : à garder dans une variable dans une boucle chaude.

## Pièges fréquents

- **Des constantes `int` ou `String`** pour un ensemble fixe de valeurs : utilise un enum.
- **Un `switch (this)` dans l'enum** pour un comportement qui lui appartient : une constante oubliée passe. Méthode abstraite par constante.
- **Remplir une table `static` depuis le constructeur** (directement : refusé ; par une méthode : `ExceptionInInitializerError`).
- **`valueOf` sur une entrée utilisateur** : il lève `IllegalArgumentException` pour un nom inconnu ; une méthode `fromX` qui renvoie un `Optional` est plus honnête.
- **Des champs mutables dans un enum** : ses instances sont partagées par tout le programme. Champs `final`.

## À retenir

- Un enum est une classe à instances fixes : sûr, avec espace de noms, affichable, parcourable, sérialisable.
- Il peut porter des champs `final`, un constructeur, des méthodes, et implémenter des interfaces.
- Comportement propre à chaque constante : une méthode abstraite redéfinie dans chaque constante ; enum stratégie pour un comportement partagé.
- Table de recherche : remplie après les constantes, jamais depuis le constructeur.
- Java 14+ : `switch` expression exhaustif sur un enum, sans `default`.

> **Source :** *Effective Java*, 3e éd., item 34 (pages 157 à 167).
