---
id: java-ch06-l02
title: "Ni ordinal, ni bits, ni tableaux : EnumSet et EnumMap"
source: { chapter: 6, pages: "168-176" }
duration_min: 35
concepts:
  - id: java-no-ordinal
    label: "Ne jamais dériver une valeur de ordinal() : réordonner ou insérer une constante la change en silence ; ranger la valeur dans un champ"
  - id: java-enumset
    label: "EnumSet remplace les champs de bits (int STYLE_BOLD = 1 << 0) : sûr, lisible, et aussi rapide (un long en interne jusqu'à 64 constantes)"
  - id: java-enummap
    label: "EnumMap remplace les tableaux indexés par ordinal : clés typées, ordre de déclaration, rapide (un tableau en interne), sans index à calculer"
  - id: java-nested-enummap
    label: "Une table à deux dimensions sur des enums (transitions entre phases) : EnumMap<From, EnumMap<To, Transition>>, construite à partir des constantes ; ajouter une constante ne demande que de lister ses transitions"
glossary:
  - term: "ordinal()"
    definition: "Position d'une constante dans la déclaration de son enum, à partir de 0. Conçu pour EnumSet et EnumMap, pas pour les programmeurs."
  - term: "champ de bits"
    definition: "Un int où chaque bit représente un élément d'un ensemble : STYLE_BOLD = 1 << 0, STYLE_ITALIC = 1 << 1…"
  - term: "EnumSet"
    definition: "Implémentation de Set réservée aux enums, représentée par un vecteur de bits."
  - term: "EnumMap"
    definition: "Implémentation de Map dont les clés sont les constantes d'un enum, représentée par un tableau indexé par ordinal."
visuals: [java-ch06-enummap-array]
labs: [java-ch06-l02-lab-session-transitions]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Des styles de texte dans un `EnumSet`. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          enum Style { BOLD, ITALIC, UNDERLINE, STRIKETHROUGH }

          public static void main(String[] args) {
              Set<Style> styles = EnumSet.of(Style.STRIKETHROUGH, Style.BOLD);
              System.out.println(styles);
              System.out.println(EnumSet.complementOf(EnumSet.copyOf(styles)));
              System.out.println(EnumSet.range(Style.ITALIC, Style.STRIKETHROUGH).size() + " " + styles.contains(Style.BOLD));
          }
      }
    answer: "[BOLD, STRIKETHROUGH]\n[ITALIC, UNDERLINE]\n3 true"
    explanation: "Un EnumSet est toujours parcouru dans l'ordre de déclaration, quel que soit l'ordre d'ajout. complementOf donne les constantes absentes, range les constantes d'ITALIC à STRIKETHROUGH incluses. Les opérations d'ensemble se lisent comme du texte, là où un champ de bits demanderait des masques."
    concept: java-enumset
  - id: c2
    type: code-output
    prompt: "Des plantes regroupées par cycle de vie dans une `EnumMap`. Qu'affiche le programme ?"
    code: |
      import java.util.*;
      import static java.util.stream.Collectors.*;

      public class Main {
          enum LifeCycle { ANNUAL, PERENNIAL, BIENNIAL }
          record Plant(String name, LifeCycle lifeCycle) { @Override public String toString() { return name; } }

          public static void main(String[] args) {
              List<Plant> garden = List.of(new Plant("basilic", LifeCycle.ANNUAL), new Plant("thym", LifeCycle.PERENNIAL),
                      new Plant("persil", LifeCycle.BIENNIAL), new Plant("aneth", LifeCycle.ANNUAL));
              Map<LifeCycle, List<Plant>> byCycle = garden.stream()
                      .collect(groupingBy(Plant::lifeCycle, () -> new EnumMap<>(LifeCycle.class), toList()));
              System.out.println(byCycle);
              Map<LifeCycle, List<Plant>> perennials = garden.stream().filter(p -> p.lifeCycle() == LifeCycle.PERENNIAL)
                      .collect(groupingBy(Plant::lifeCycle, () -> new EnumMap<>(LifeCycle.class), toList()));
              System.out.println(perennials.size() + " " + perennials.containsKey(LifeCycle.ANNUAL));
          }
      }
    answer: "{ANNUAL=[basilic, aneth], PERENNIAL=[thym], BIENNIAL=[persil]}\n1 false"
    explanation: "La fabrique de map de groupingBy produit une EnumMap : les clés sortent dans l'ordre de déclaration de l'enum. groupingBy ne crée une entrée que pour les clés rencontrées : seul PERENNIAL apparaît dans la seconde map. La version à tableau indexé par ordinal aurait trois cases, dont deux vides."
    concept: java-enummap
  - id: c3
    type: single
    prompt: "`int numberOfMusicians() { return ordinal() + 1; }` dans `enum Ensemble { SOLO, DUET, TRIO, QUARTET }`. Que se passe-t-il si on ajoute un double quatuor (8 musiciens) ?"
    choices:
      - "Rien de grave, ordinal() s'adapte"
      - "Impossible de l'exprimer sans constantes factices pour 5, 6 et 7 musiciens, et réordonner les constantes changerait toutes les valeurs en silence"
      - "Le compilateur détecte le problème"
      - "ordinal() renvoie 8 automatiquement"
    answer: 1
    explanation: "La valeur dépend de la position de la constante, pas de sa nature. Deux constantes ne peuvent pas avoir la même valeur, et toute réorganisation casse tout. Range la valeur dans un champ : DOUBLE_QUARTET(8)."
    concept: java-no-ordinal
---

## Pourquoi c'est important

Le moteur d'Ordo gère les phases d'une séance de bourse : pré-ouverture, enchère, séance continue, clôture. Les transitions autorisées étaient rangées dans un tableau `Transition[][]` indexé par `ordinal()`, et les indicateurs d'un ordre dans un `int` de bits (`FLAG_IOC = 1`, `FLAG_HIDDEN = 2`…). Puis l'échange a introduit une phase de suspension, `HALTED`, insérée au milieu de l'enum. Toutes les cases du tableau ont glissé d'un cran : une demande « enchère → séance » a été lue comme « enchère → suspension ». Aucun test n'a échoué à la compilation.

En Go, on aurait une `map[Phase]map[Phase]Transition`, sûre mais lente, ou un tableau indexé par `iota`, rapide mais fragile. Java offre les deux à la fois : `EnumSet` et `EnumMap` ont la vitesse d'un tableau de bits et la sûreté d'une collection typée.

## ordinal() n'est pas pour toi

Chaque constante d'enum a une position, `ordinal()`. Il est tentant d'en dériver une valeur :

```java
public enum Ensemble {
    SOLO, DUET, TRIO, QUARTET;
    public int numberOfMusicians() { return ordinal() + 1; }   // fragile
}
```

::checkpoint{id="c3"}

La valeur dépend de **l'ordre** des constantes. Réordonner casse tout ; deux constantes ne peuvent pas partager une valeur ; une valeur « avec un trou » demande des constantes factices. La documentation d'`Enum.ordinal()` est claire : *la plupart des programmeurs n'en auront aucun usage ; elle est conçue pour EnumSet et EnumMap*. **Range la valeur dans un champ** : `QUARTET(4), DOUBLE_QUARTET(8)`.

## EnumSet plutôt que des champs de bits

Avant les enums, un ensemble de drapeaux s'écrivait en bits : `text.applyStyles(STYLE_BOLD | STYLE_ITALIC)`. Un `int` brut à l'affichage, aucune sûreté, une taille maximale choisie d'avance, et pas d'itération possible sur les bits.

`EnumSet` fait la même chose, en sûr :

::checkpoint{id="c1"}

Le prix est nul : un `EnumSet` d'au plus 64 constantes est représenté par **un seul `long`** (`RegularEnumSet`), et `addAll`, `removeAll` ou `contains` sont des opérations bit à bit. Au-delà, `JumboEnumSet` utilise un tableau de `long`. On a la vitesse du champ de bits et la lisibilité d'un `Set`.

Bloch conseille d'accepter un `Set<Style>` en paramètre (l'interface), et d'y passer un `EnumSet`. Seul défaut : il n'existe pas d'`EnumSet` immuable ; `Collections.unmodifiableSet(EnumSet.of(…))` ou `Set.copyOf(…)` comble ce manque.

## EnumMap plutôt qu'un tableau indexé par ordinal

Pour associer des données à chaque constante, le réflexe est un tableau de taille `values().length` indexé par `ordinal()`. Il cumule les défauts : tableaux et génériques ne se mélangent pas (cast non vérifié, module 5), les index ne disent pas ce qu'ils désignent, et rien n'empêche de lire la case d'une autre constante.

`EnumMap` est une `Map` dont les clés sont les constantes d'un enum, et qui est **représentée par un tableau** indexé par ordinal. On a donc la vitesse du tableau, mais l'ordinal est calculé par la bibliothèque, pas par toi.

::checkpoint{id="c2"}

> **Sous le capot :** `new EnumMap<>(LifeCycle.class)` alloue un `Object[]` de la taille de l'enum ; `put(k, v)` fait `vals[k.ordinal()] = v`. Le jeton de type `LifeCycle.class` (module 5) sert à connaître la taille et les constantes, malgré l'effacement. `EnumMap` remplace aussi `null` par un objet sentinelle interne, pour distinguer « clé absente » de « valeur null ». Résultat : une recherche coûte un accès de tableau, sans calcul de hachage.

## Deux dimensions : la table de transitions

Le cas le plus traître du tableau indexé par ordinal est la table à deux dimensions : les transitions entre phases, avec `TRANSITIONS[from.ordinal()][to.ordinal()]`. Insérer une phase décale toutes les cases, et le tableau doit grandir de façon cohérente dans les deux dimensions.

La solution de Bloch : chaque transition **dit elle-même** d'où elle part et où elle va, et une `EnumMap` imbriquée est **construite** à partir des constantes.

```java
public enum Transition {
    MELT(SOLID, LIQUID), FREEZE(LIQUID, SOLID), BOIL(LIQUID, GAS);   // …

    private final Phase from, to;
    Transition(Phase from, Phase to) { this.from = from; this.to = to; }

    private static final Map<Phase, Map<Phase, Transition>> TABLE = Stream.of(values())
            .collect(groupingBy(t -> t.from, () -> new EnumMap<>(Phase.class),
                     toMap(t -> t.to, t -> t, (x, y) -> y, () -> new EnumMap<>(Phase.class))));

    public static Transition from(Phase from, Phase to) { return TABLE.get(from).get(to); }
}
```

::visual{id="java-ch06-enummap-array"}

Ajouter une phase `PLASMA` ne demande plus que deux lignes : la constante, et ses transitions (`IONIZE(GAS, PLASMA)`, `DEIONIZE(PLASMA, GAS)`). Rien à recompter, rien qui glisse.

## Pièges fréquents

- **Dériver une valeur de `ordinal()`** : un champ explicite à la place.
- **Un `int` de bits pour un ensemble de drapeaux** : `EnumSet`, aussi rapide.
- **Un tableau indexé par `ordinal()`**, surtout à deux dimensions : `EnumMap`, éventuellement imbriquée.
- **Oublier la fabrique `EnumMap` dans `groupingBy`** : on obtient une `HashMap`, plus lente et sans ordre de déclaration.
- **Exposer un `EnumSet` modifiable** depuis un objet immuable : enveloppe-le ou copie-le.

## À retenir

- `ordinal()` est réservé à `EnumSet` et `EnumMap` ; une valeur se range dans un champ.
- `EnumSet` : un ensemble de constantes, en bits, sûr et lisible ; parcouru dans l'ordre de déclaration.
- `EnumMap` : des données par constante, en tableau, sans index à calculer.
- Une table à deux dimensions sur des enums : `EnumMap` imbriquée, construite à partir de constantes qui disent leurs extrémités.

> **Source :** *Effective Java*, 3e éd., items 35, 36 et 37 (pages 168 à 176).
