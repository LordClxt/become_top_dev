---
id: java-ch01-l01
title: "Fabriques statiques plutôt que constructeurs"
source: { chapter: 2, pages: "5-9, 19" }
duration_min: 30
concepts:
  - id: java-static-factory
    label: "Une fabrique statique est une méthode qui renvoie une instance : elle a un nom, peut réutiliser, peut renvoyer un sous-type"
  - id: java-instance-control
    label: "Classe à instances contrôlées : la classe décide quelles instances existent (a.equals(b) ⇔ a == b)"
  - id: java-factory-naming
    label: "Les noms conventionnels : from, of, valueOf, getInstance, newInstance, getType, newType"
  - id: java-noninstantiable
    label: "Classe utilitaire non instanciable : constructeur privé qui lève AssertionError"
glossary:
  - term: "fabrique statique"
    definition: "Méthode static qui renvoie une instance de sa classe (ou d'un sous-type), comme Boolean.valueOf ou List.of. Rien à voir avec le patron Factory Method du GoF."
  - term: "classe à instances contrôlées"
    definition: "Classe qui décide seule quelles instances existent à chaque instant : singleton, valeurs mises en cache, enums."
  - term: "service provider framework"
    definition: "Système où des fournisseurs enregistrent des implémentations d'un service et où les clients les obtiennent par une fabrique, sans dépendre des classes concrètes (JDBC, ServiceLoader)."
  - term: "classe compagnon"
    definition: "Classe non instanciable qui regroupe les fabriques d'une interface (Collections pour Collection). Depuis Java 8, ces méthodes peuvent vivre dans l'interface elle-même."
visuals: [java-ch01-new-vs-valueof]
labs: [java-ch01-l01-lab-warmup-temperature, java-ch01-l01-lab-http-status]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Color a un cache derrière sa fabrique of, mais son constructeur est resté accessible dans le fichier. Qu'affiche le programme ?"
    code: |
      import java.util.HashMap;
      import java.util.Map;

      public class Main {
          static final class Color {
              private static final Map<String, Color> CACHE = new HashMap<>();
              final String name;
              private Color(String name) { this.name = name; }
              static Color of(String name) { return CACHE.computeIfAbsent(name, Color::new); }
          }

          public static void main(String[] args) {
              Color a = Color.of("red");
              Color b = Color.of("red");
              Color c = new Color("red");
              System.out.println((a == b) + " " + (a == c) + " " + a.name.equals(c.name));
          }
      }
    answer: "true false true"
    explanation: "La fabrique consulte son cache et rend deux fois le même objet, mais new alloue toujours un objet neuf, qui ne passe jamais par le cache. Croire que le cache protège la classe est une erreur : le contrôle d'instances ne tient que si le constructeur est fermé à tout le monde."
    concept: java-instance-control
  - id: c2
    type: single
    prompt: "Un collègue écrit `ArrayList<Integer> ids = (ArrayList<Integer>) List.of(1, 2);` pour pouvoir appeler `ensureCapacity`. Que se passe-t-il ?"
    choices:
      - "Le compilateur refuse le cast"
      - "Ça compile, puis ClassCastException à l'exécution : la classe réelle n'est pas une ArrayList"
      - "Ça marche : List.of renvoie une ArrayList non modifiable"
      - "Ça marche, mais ids.add(3) lèvera UnsupportedOperationException"
    answer: 1
    explanation: "Le compilateur accepte un cast d'interface vers une classe non finale, mais List.of renvoie une classe interne du JDK (ImmutableCollections.List12 ici). Le type de retour déclaré est le seul contrat : supposer une classe concrète, c'est dépendre d'un détail que la fabrique a le droit de changer."
    concept: java-static-factory
  - id: c3
    type: single
    prompt: "La classe `public final class Strings { public static boolean isBlank(String s) { ... } }` n'a écrit aucun constructeur. Un appelant écrit `new Strings()`. Que se passe-t-il ?"
    choices:
      - "Erreur de compilation : la classe n'a pas de constructeur"
      - "Erreur de compilation : on n'instancie pas une classe final"
      - "Ça compile et crée une instance inutile, grâce au constructeur public ajouté par le compilateur"
      - "AssertionError à l'exécution"
    answer: 2
    explanation: "Sans constructeur explicite, le compilateur ajoute un constructeur public sans paramètre ; final interdit seulement l'héritage, pas l'instanciation. L'AssertionError n'existe que si tu écris toi-même le constructeur privé qui la lève."
    concept: java-noninstantiable
---

## Pourquoi c'est important

Revue de code, un lundi : ta classe `Money` a un constructeur public, et un service en crée 40 000 par seconde avec `new Money(0, "EUR")`, toujours la même valeur. Tu voudrais rendre une seule instance partagée de « zéro euro », ou renvoyer une sous-classe optimisée pour l'euro. Impossible : des centaines d'appelants écrivent `new Money(...)`, et `new` les a figés.

En Go, tu écris déjà des fonctions `NewServer(...)`, et Java te propose la même chose. Car `new` promet trois choses que tu ne veux pas toujours promettre : **un objet neuf**, **de cette classe exacte**, **à chaque appel**. Une fabrique statique ne promet rien de tout ça, et c'est ce qui te laisse libre de changer d'avis plus tard.

Ouvre le JDK : `List.of`, `Optional.empty`, `Integer.valueOf`, `Path.of`, `Duration.ofSeconds`, `EnumSet.noneOf`… La bibliothèque standard moderne n'expose presque plus de constructeurs publics.

## Le concept

L'image à garder : `new`, c'est commander un objet sur mesure à l'usine, à chaque fois. La fabrique statique, c'est un guichet : tu demandes « un 404 », et le guichetier décide s'il te tend un objet déjà en stock, un neuf, ou un modèle différent qui fait le même travail.

Une **fabrique statique** est simplement une méthode `static` qui renvoie une instance de sa classe (ou d'un sous-type) :

```java
public static Boolean valueOf(boolean b) {
    return b ? Boolean.TRUE : Boolean.FALSE;   // ne crée jamais d'objet
}
```

> Ne confonds pas avec le patron *Factory Method* du GoF (une méthode redéfinie par des sous-classes). Ici, il n'y a ni héritage ni polymorphisme : juste une méthode statique.

### 1. Elle a un nom

Un constructeur s'appelle comme la classe. Si deux façons de construire prennent les mêmes types de paramètres, tu es coincé : certains en sont réduits à inverser l'ordre des paramètres pour avoir deux signatures, ce que personne ne retiendra.

```java
Duration.ofSeconds(90);   // lisible
Duration.ofMinutes(90);   // impossible avec deux constructeurs Duration(long)
```

### 2. Elle n'est pas obligée de créer un objet

Une classe immuable (dont l'état ne change plus après construction) peut **réutiliser** des instances : constantes précalculées ou cache. C'est l'idée du patron *Flyweight* : partager les objets identiques au lieu de les dupliquer.

Plus fort : la classe peut garantir qu'il n'existe **qu'une instance par valeur**. On dit qu'elle est **à instances contrôlées** : c'est elle, et non l'appelant, qui décide quels objets existent. Pour elle, `a.equals(b)` équivaut à `a == b`. Les enums sont l'exemple parfait.

:::steps
```java
public final class HttpStatus {
    private static final Map<Integer, HttpStatus> CACHE = new HashMap<>();
    private final int code;

    private HttpStatus(int code) { this.code = code; }

    public static HttpStatus of(int code) {
        return CACHE.computeIfAbsent(code, HttpStatus::new);
    }
}
```
--- 1: `final` : personne ne peut créer une sous-classe qui contournerait le cache.
--- 2: Le cache associe chaque code à **son** unique instance. Il est déclaré en premier, donc initialisé avant toute constante qui l'utiliserait.
--- 5: Le constructeur est `private` : la seule porte d'entrée est `of`. Sans cette ligne, le contrôle d'instances ne vaut rien.
--- 7-9: `computeIfAbsent` rend l'instance en stock, ou la crée au premier appel puis la range. Deux `of(404)` rendent donc le même objet, et `==` répond `true`.
:::

Essaie toi-même : appelle `new` et `of` avec les valeurs de ton choix, et regarde ce qui apparaît dans le tas.

::visual{id="java-ch01-new-vs-valueof"}

Tu peux le constater sur les entiers : `Integer.valueOf` garde en cache les valeurs de -128 à 127.

```java
Integer.valueOf(127) == Integer.valueOf(127)   // true : même objet en cache
Integer.valueOf(128) == Integer.valueOf(128)   // false : deux objets distincts
```

Ce comportement est un détail d'implémentation de la fabrique : un constructeur public ne pourrait jamais l'offrir, et compter dessus avec `==` est un bug (on y reviendra au module 9).

::checkpoint{id="c1"}

### 3. Elle peut renvoyer un sous-type, même caché

Le type de retour est un contrat ; la classe réelle est un choix d'implémentation. `List.of(1, 2)` te renvoie une `List`, et tu n'as jamais besoin de savoir que c'est une classe interne `ImmutableCollections.List12`.

Conséquence : l'API reste minuscule. Le framework des collections expose des dizaines d'implémentations (non modifiables, synchronisées…) **sans une seule classe publique de plus**, toutes derrière des fabriques de `Collections`.

::checkpoint{id="c2"}

### 4. La classe renvoyée peut changer selon les paramètres…

:::reveal Avant de lire la suite : comment un EnumSet pourrait-il être plus rapide pour une petite enum que pour une grande ?
Une petite enum tient dans un seul `long` de 64 bits : un bit par constante, et `contains` devient un simple ET binaire. Au-delà de 64 constantes, il faut un tableau de `long`. La fabrique choisit pour toi.
:::

`EnumSet.noneOf(Couleur.class)` renvoie une `RegularEnumSet` (un seul `long` comme masque de bits) si l'enum a 64 constantes ou moins, et une `JumboEnumSet` (un tableau de `long`) au-delà. Le client ne le voit jamais ; le JDK pourrait ajouter une troisième implémentation demain sans casser personne.

### 5. … et même ne pas exister quand tu écris la fabrique

C'est la base des **service provider frameworks** : JDBC te rend une `Connection` par `DriverManager.getConnection(url)`, et la classe concrète vient d'un pilote que le JDK ne connaît pas. Depuis Java 6, `java.util.ServiceLoader` fournit ce mécanisme générique : ne réécris pas le tien.

### Les inconvénients

- **Pas de sous-classe** : une classe sans constructeur public ni protégé ne peut pas être étendue. Souvent, c'est un avantage déguisé : ça pousse vers la composition (module 4) et c'est indispensable pour l'immutabilité (module 3).
- **Moins visibles dans la Javadoc** : un constructeur saute aux yeux, une méthode statique se perd. D'où l'importance des noms conventionnels.

### Les noms conventionnels

| Nom | Sens | Exemple |
|---|---|---|
| `from` | conversion depuis **un** paramètre | `Instant.from(temporal)` |
| `of` | agrégation de **plusieurs** paramètres | `Set.of(a, b, c)` |
| `valueOf` | variante plus verbeuse de `from`/`of` | `BigInteger.valueOf(42)` |
| `getInstance` / `instance` | une instance décrite par les paramètres, pas forcément neuve | `StackWalker.getInstance(...)` |
| `newInstance` / `create` | garantit une **nouvelle** instance à chaque appel | `Array.newInstance(...)` |
| `getType` / `newType` | idem, mais la fabrique est dans une autre classe | `Files.newBufferedReader(path)` |
| `type` | forme courte | `Collections.list(enumeration)` |

## Les classes utilitaires non instanciables

Parfois tu veux juste regrouper des méthodes statiques : `Math`, `Arrays`, `Collections`. Une instance n'aurait aucun sens. Problème : sans constructeur explicite, **le compilateur ajoute un constructeur public sans paramètre**, et `new Math()` deviendrait possible.

::checkpoint{id="c3"}

Rendre la classe `abstract` ne marche pas : on peut l'étendre puis instancier la sous-classe, et ça fait croire qu'elle est conçue pour l'héritage.

:::compare
--- bad: Abstraite, donc « protégée » ?
```java
public abstract class Strings {
    public static boolean isBlank(String s) { ... }
}

class Oops extends Strings { }   // compile
var s = new Oops();              // une instance quand même
```
--- good: Constructeur privé qui lève
```java
public final class Strings {
    // Supprime le constructeur par défaut : pas d'instance, jamais.
    private Strings() {
        throw new AssertionError();
    }

    public static boolean isBlank(String s) { ... }
}
```
`private` empêche les autres classes de l'appeler ; `AssertionError` protège contre un appel depuis la classe elle-même (ou par réflexion). Effet de bord : plus d'héritage possible, puisqu'un constructeur de sous-classe doit appeler celui de la classe mère.
:::

Le commentaire n'est pas décoratif : un constructeur écrit **pour ne jamais être appelé** surprend le lecteur.

> **Depuis Java 8**, une interface peut contenir des méthodes statiques. Plus besoin d'une classe compagnon `Types` à côté de l'interface `Type` : `List.of` vit dans `List`. Attention, les membres statiques d'une interface sont forcément publics (Java 9 autorise seulement les méthodes statiques privées) : le gros du code peut encore vivre dans une classe package-private.

## Sous le capot : le cache d'`Integer`

Quand tu écris `Integer n = 127;`, il n'y a pas de magie : le compilateur traduit l'**autoboxing** en un appel à la fabrique. `javap -c` sur la classe compilée le montre :

```text
bipush        127
invokestatic  java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
```

Et `valueOf` ressemble à ceci dans le JDK 25 (simplifié) :

```java
public static Integer valueOf(int i) {
    if (i >= IntegerCache.low && i <= IntegerCache.high)
        return IntegerCache.cache[i + (-IntegerCache.low)];
    return new Integer(i);
}
```

`IntegerCache` est une **classe imbriquée statique privée** : la JVM ne l'initialise qu'au premier accès, et son initialiseur statique remplit une fois pour toutes un tableau de 256 `Integer`. C'est l'idiome du *holder* d'initialisation paresseuse, qu'on reverra au module 11. Trois conséquences qu'on peut maintenant **prédire** au lieu de les apprendre par cœur :

- la borne haute se règle au lancement (`-XX:AutoBoxCacheMax=1000`) : un `==` qui « marchait » jusqu'à 127 peut marcher jusqu'à 1000 sur un autre serveur, et casser sur le tien ;
- `Long`, `Short`, `Byte` et `Character` ont le même genre de cache (de 0 à 127 pour `Character`), `Float` et `Double` **aucun** : il y a trop de valeurs entre 0 et 1 pour en choisir 256 ;
- le constructeur `new Integer(5)` est déprécié depuis Java 9, et marqué pour suppression depuis Java 16 : il empêchait précisément ce contrôle d'instances. Le JDK a fait, des années plus tard, le choix que cette leçon te demande de faire dès le départ.

## Pièges fréquents

- **Comparer avec `==` parce que « la fabrique met en cache ».** Ce n'est vrai que si la classe le **garantit** dans sa documentation (enums, `Boolean.TRUE`). Pour `Integer.valueOf`, le cache s'arrête à 127.
- **Initialisation statique dans le mauvais ordre.** Si une constante `OK = of(200)` est déclarée avant le cache utilisé par `of`, le cache vaut encore `null` à ce moment-là : les champs statiques s'initialisent dans l'ordre du fichier.
- **Oublier le constructeur privé** d'une classe utilitaire : le compilateur en fabrique un public sans rien dire.
- **Ne garder que des fabriques sans les documenter.** Elles ne se voient pas dans la Javadoc : nomme-les selon les conventions et cite-les dans la doc de la classe.

## À retenir

- Avant d'écrire un constructeur public, demande-toi si une fabrique statique ne serait pas meilleure.
- Elle a un **nom**, peut **réutiliser** des instances (contrôle d'instances), peut renvoyer **n'importe quel sous-type**, éventuellement caché ou choisi à l'exécution.
- Conventions : `from` (1 paramètre), `of` (plusieurs), `valueOf`, `getInstance`, `newInstance`, `getType`, `newType`.
- Classe utilitaire : constructeur `private` qui lève `AssertionError`, avec un commentaire.

> **Source :** *Effective Java*, 3e éd., items 1 et 4 (pages 5 à 9 et 19).
