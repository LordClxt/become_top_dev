---
id: java-ch03-l02
title: "Des accesseurs, pas des champs publics (et les records)"
source: { chapter: 4, pages: "78-79" }
duration_min: 30
concepts:
  - id: java-accessors-not-fields
    label: "Classe publique : accesseurs plutôt que champs publics, pour garder le droit de changer de représentation et de valider"
  - id: java-public-fields-nonpublic-class
    label: "Classe package-private ou imbriquée privée : exposer les champs est acceptable, le code client est confiné"
  - id: java-record-basics
    label: "Record : classe finale, champs private final, constructeur canonique, accesseurs, equals/hashCode/toString générés"
  - id: java-record-compact-ctor
    label: "Constructeur compact : valider et normaliser les composants, faire les copies défensives"
  - id: java-record-mutable-components
    label: "Un record n'est immuable que superficiellement : listes à copier, tableaux comparés par identité"
glossary:
  - term: "accesseur"
    definition: "Méthode qui renvoie la valeur d'un champ (getX() ou x()), et qui permet à la classe de garder le contrôle de sa représentation."
  - term: "record"
    definition: "Classe (Java 16) qui déclare ses composants dans son en-tête et dont le compilateur génère champs, constructeur, accesseurs, equals, hashCode et toString."
  - term: "constructeur canonique"
    definition: "Le constructeur d'un record qui prend tous ses composants, dans l'ordre de l'en-tête."
  - term: "constructeur compact"
    definition: "Forme abrégée du constructeur canonique, sans liste de paramètres : son corps s'exécute avant l'affectation des champs."
visuals: []
labs: [java-ch03-l02-lab-shipping-record]
extra: false
xp: 30
---

## Pourquoi c'est important

En 1996, `java.awt.Dimension` expose `public int width, height`. Comme n'importe quel client peut modifier ces champs, chaque méthode qui renvoie une dimension (`getSize()` de chaque composant graphique) doit renvoyer une **nouvelle copie**, pour qu'un appelant ne puisse pas changer la taille d'un composant par accident. Des millions d'objets créés pour rien, à chaque mise en page. Changer de représentation ? Impossible : le code client lit les champs directement. C'est l'exemple que le livre cite comme un **avertissement**, pas comme un modèle.

Un champ public fige trois choses pour toujours : la représentation, l'absence de validation, et l'absence de réaction quand la valeur change.

## Le concept

### Classe publique : des accesseurs

```java
// À ne pas faire dans une classe publique
public class Point {
    public double x;
    public double y;
}

// Encapsulé
public final class Point {
    private final double x;
    private final double y;
    public Point(double x, double y) { this.x = x; this.y = y; }
    public double x() { return x; }
    public double y() { return y; }
}
```

Avec des accesseurs, demain tu peux stocker des coordonnées polaires, calculer `x` à la demande, journaliser les lectures, valider dans le constructeur. Le code client ne change pas.

Pour une classe **mutable**, la même logique vaut pour les mutateurs (`setX`) : ils te laissent valider et réagir. Mais avant d'écrire un setter, relis la leçon suivante : la plupart du temps, la classe ne devrait pas être mutable du tout.

### Classe non publique : les champs, c'est acceptable

Si la classe est **package-private** ou **imbriquée privée**, exposer ses champs ne pose pas de problème de fond, à condition qu'ils décrivent bien l'abstraction. Le code qui en dépend est confiné au paquetage (ou à la classe englobante) : un changement de représentation ne touche que du code que tu contrôles. Et c'est plus lisible, des deux côtés :

```java
// Dans Catalog : un détail d'implémentation, aucune cérémonie nécessaire
private static final class Range { int from; int to; }
```

### Les champs publics immuables : moins grave, mais discutable

```java
public final class Time {
    public final int hour;     // validé dans le constructeur, ne change jamais
    public final int minute;
}
```

Tu peux garantir les invariants (le constructeur valide). Mais tu ne peux toujours pas changer de représentation, ni agir à la lecture. À éviter dans une API publique.

### Depuis Java 16 : les records *(extra)*

Pour une classe valeur, Java écrit maintenant tout ça pour toi :

```java
public record Time(int hour, int minute) { }
```

Le compilateur génère :

- une classe **`final`** qui étend `java.lang.Record` ;
- un champ `private final` par composant ;
- le **constructeur canonique** `Time(int hour, int minute)` ;
- des **accesseurs** du nom des composants : `hour()`, `minute()` (pas de `get`) ;
- `equals`, `hashCode` et `toString` fondés sur tous les composants (module 2).

On peut ajouter des méthodes, des fabriques statiques, des champs **statiques**, implémenter des interfaces. On ne peut pas ajouter de champ d'instance, ni étendre une autre classe.

### Valider et normaliser : le constructeur compact

```java
public record Time(int hour, int minute) {
    public Time {                                   // pas de liste de paramètres
        if (hour < 0 || hour >= 24) throw new IllegalArgumentException("heure : " + hour);
        if (minute < 0 || minute >= 60) throw new IllegalArgumentException("minute : " + minute);
    }
}
```

Le corps d'un constructeur compact s'exécute **avant** l'affectation automatique des champs, et peut **réaffecter les paramètres** :

```java
public record Email(String address) {
    public Email {
        address = address.strip().toLowerCase(Locale.ROOT);   // normalisation : la forme canonique est stockée
        if (!address.contains("@")) throw new IllegalArgumentException(address);
    }
}
```

### Le piège : un record n'est immuable qu'en surface

Les champs sont `final`, mais s'ils référencent un objet mutable, l'objet, lui, peut changer :

```java
public record Playlist(String name, List<String> tracks) { }

List<String> t = new ArrayList<>(List.of("A"));
Playlist p = new Playlist("Matin", t);
t.add("B");                     // p.tracks() contient maintenant B
p.tracks().clear();             // et on peut la vider de l'extérieur
```

La correction se fait dans le constructeur compact : `tracks = List.copyOf(tracks);`. La copie est non modifiable, et indépendante de la liste de l'appelant.

Les **tableaux** sont pires : l'`equals` généré compare les composants avec `Objects.equals`, donc deux tableaux de même contenu ne sont **pas égaux** (identité). Un record qui contient un tableau doit soit le remplacer par une `List`, soit redéfinir `equals`, `hashCode` et `toString` avec `Arrays.equals` & co, **et** copier le tableau à l'entrée comme à la sortie (dans l'accesseur).

## Sous le capot : ce que javac génère pour un record

Un record compile en une classe `final` qui étend `java.lang.Record`, avec un attribut `Record` dans le fichier `.class` qui décrit les composants (c'est ce que lit `Class.getRecordComponents()`). Les champs et le constructeur sont du bytecode ordinaire.

`equals`, `hashCode` et `toString`, eux, ne sont **pas** écrits en bytecode : chacun est une instruction `invokedynamic` vers `java.lang.runtime.ObjectMethods.bootstrap`. Au premier appel, cette méthode d'amorçage construit l'implémentation à partir de la liste des composants (avec des `MethodHandle` vers les champs), puis la JVM la réutilise et l'optimise comme du code écrit à la main. Trois conséquences prévisibles :

- le fichier `.class` reste petit, et l'implémentation peut s'améliorer avec le JDK sans recompiler ;
- les composants primitifs sont comparés comme par `Double.compare` / `Float.compare` (donc `NaN` égal à `NaN`), les références par `Objects.equals` : d'où l'identité pour les tableaux ;
- le format de `toString` (`Time[hour=9, minute=30]`) n'est **pas spécifié** : ne le parse jamais.

Si tu écris toi-même un accesseur (`public List<String> tracks() { … }`), il remplace celui généré. La spécification exige qu'il reste cohérent avec le composant, mais rien ne le vérifie.

## Pièges fréquents

- **Des champs publics dans une classe publique** : représentation figée, aucune validation.
- **Un setter pour chaque getter** « par habitude ».
- **Un record avec une `List` ou un tableau** sans copie défensive : immuable en apparence seulement.
- **Un tableau dans un record** comparé par `equals` : identité, pas contenu.
- **Valider dans un constructeur canonique long** au lieu du compact : redondant et source d'oublis d'affectation.
- **Parser le `toString` d'un record.**

## À retenir

- Classe publique : jamais de champ public mutable ; préfère des accesseurs, même pour des champs `final`.
- Classe package-private ou imbriquée privée : des champs exposés sont acceptables.
- Pour une classe valeur, un `record` génère champs privés finaux, accesseurs, `equals`, `hashCode`, `toString`.
- Valide et normalise dans le **constructeur compact** ; copie les collections (`List.copyOf`) ; méfie-toi des tableaux.

> **Source :** *Effective Java*, 3e éd., item 16 (pages 78 et 79). Records : JEP 395 (Java 16), `java.lang.runtime.ObjectMethods`.
