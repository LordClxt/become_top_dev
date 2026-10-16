---
id: java-ch01-l01
title: "Fabriques statiques plutôt que constructeurs"
source: { chapter: 2, pages: "5-9, 19" }
duration_min: 25
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
visuals: []
labs: [java-ch01-l01-lab-http-status]
extra: false
xp: 25
---

## Pourquoi c'est important

En Go, tu fabriques tes valeurs avec des fonctions `NewServer(...)` : le langage n'a pas de constructeurs, donc la question ne se pose pas. En Java, le réflexe est `new`. Or `new` promet trois choses que tu ne veux pas toujours promettre : **un objet neuf**, **de cette classe exacte**, **à chaque appel**. Une fabrique statique ne promet rien de tout ça, et c'est précisément ce qui la rend précieuse quand ta classe sera utilisée par d'autres.

Ouvre le JDK : `List.of`, `Optional.empty`, `Integer.valueOf`, `Path.of`, `Duration.ofSeconds`, `EnumSet.noneOf`… La bibliothèque standard moderne n'expose presque plus de constructeurs publics.

## Le concept

Une **fabrique statique** est simplement une méthode `static` qui renvoie une instance :

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

Une classe immuable peut **réutiliser** des instances : constantes précalculées ou cache. C'est l'idée du patron *Flyweight*. Plus fort : la classe peut garantir qu'il n'existe **qu'une instance par valeur**. On dit qu'elle est **à instances contrôlées**. Pour elle, `a.equals(b)` équivaut à `a == b`. Les enums sont l'exemple parfait.

```java
var a = HttpStatus.of(404);
var b = HttpStatus.of(404);
// a == b : une seule instance de 404 dans toute la JVM
```

Tu peux le constater sur les entiers : `Integer.valueOf` garde en cache les valeurs de -128 à 127.

```java
Integer.valueOf(127) == Integer.valueOf(127)   // true : même objet en cache
Integer.valueOf(128) == Integer.valueOf(128)   // false : deux objets distincts
```

Ce comportement est un détail d'implémentation de la fabrique : un constructeur public ne pourrait jamais l'offrir, et compter dessus avec `==` est un bug (on y reviendra au module 9).

### 3. Elle peut renvoyer un sous-type, même caché

Le type de retour est un contrat ; la classe réelle est un choix d'implémentation. `List.of(1, 2)` te renvoie une `List`, et tu n'as jamais besoin de savoir que c'est une classe interne `ImmutableCollections.List12`. Conséquence : l'API reste minuscule. Le framework des collections expose des dizaines d'implémentations (non modifiables, synchronisées…) **sans une seule classe publique de plus**, toutes derrière des fabriques de `Collections`.

### 4. La classe renvoyée peut changer selon les paramètres…

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

Rendre la classe `abstract` ne marche pas : on peut l'étendre puis instancier la sous-classe, et ça fait croire qu'elle est conçue pour l'héritage. La bonne solution :

```java
public final class Strings {
    // Supprime le constructeur par défaut : pas d'instance, jamais.
    private Strings() {
        throw new AssertionError();
    }

    public static boolean isBlank(String s) { ... }
}
```

- `private` empêche les autres classes de l'appeler.
- `throw new AssertionError()` protège contre un appel depuis la classe elle-même (ou par réflexion).
- Effet de bord : la classe ne peut plus être étendue, puisqu'un constructeur de sous-classe doit appeler un constructeur de la classe mère.

Le commentaire n'est pas décoratif : un constructeur écrit **pour ne jamais être appelé** surprend le lecteur.

> **Depuis Java 8**, une interface peut contenir des méthodes statiques. Plus besoin d'une classe compagnon `Types` à côté de l'interface `Type` : `List.of` vit dans `List`. Attention, les membres statiques d'une interface sont forcément publics (Java 9 autorise seulement les méthodes statiques privées) : le gros du code peut encore vivre dans une classe package-private.

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
