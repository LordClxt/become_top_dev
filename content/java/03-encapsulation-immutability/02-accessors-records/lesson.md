---
id: java-ch03-l02
title: "Des accesseurs, pas des champs publics (et les records)"
source: { chapter: 4, pages: "78-79" }
duration_min: 35
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
  - term: "copie défensive"
    definition: "Copie d'un objet mutable faite à l'entrée (constructeur) ou à la sortie (accesseur), pour que personne d'autre ne garde une référence vers l'état interne."
visuals: [java-ch03-accessor-leak]
labs: [java-ch03-l02-lab-shipping-record]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: single
    prompt: "Ton API publique expose `Point` et tu décides de stocker des coordonnées polaires (`r`, `theta`) au lieu de `x`, `y`. Quelle version de Point te le permet sans casser un seul client ?"
    choices:
      - "Celle avec public double x, y : il suffit de garder les noms"
      - "Celle avec public final double x, y : final fige la valeur, pas la représentation"
      - "Celle avec private final double x, y et des méthodes x() et y()"
      - "Aucune : changer la représentation casse toujours les clients"
    answer: 2
    explanation: "Les clients des deux premières versions lisent p.x, un champ : il doit exister pour toujours. Avec x(), le client appelle une méthode, qui peut très bien calculer r * Math.cos(theta) ; final protège la valeur, jamais la liberté de changer de représentation."
    concept: java-accessors-not-fields
  - id: c2
    type: code-output
    prompt: "Ce record redéfinit son accesseur pour arrondir. Qu'affiche le programme ?"
    code: |
      public class Main {
          record Temp(double celsius) {
              public double celsius() { return Math.round(celsius * 10) / 10.0; }
          }

          public static void main(String[] args) {
              Object o = new Temp(21.456);
              if (o instanceof Temp(var c)) {
                  System.out.println(c + " " + o.equals(new Temp(21.5)));
              }
          }
      }
    answer: "21.5 false"
    explanation: "Le motif Temp(var c) appelle l'accesseur, donc il voit la valeur arrondie ; equals, lui, compare les champs, qui valent 21.456 et 21.5. Un accesseur qui ne renvoie pas le composant tel quel crée cette incohérence : pour normaliser, fais-le dans le constructeur compact."
    concept: java-record-compact-ctor
  - id: c3
    type: single
    prompt: "Trouve le bug. `record Snapshot(int[] values) { Snapshot { values = values.clone(); } }`. Un client écrit `s.values()[0] = 99;`. Que devient l'état de `s` ?"
    choices:
      - "Rien : la copie du constructeur compact protège le record"
      - "values()[0] vaut maintenant 99 : l'accesseur généré renvoie le tableau interne lui-même"
      - "Erreur de compilation : les composants d'un record sont final"
      - "UnsupportedOperationException à l'exécution"
    answer: 1
    explanation: "La copie à l'entrée coupe le lien avec le tableau de l'appelant, mais l'accesseur généré renvoie le champ tel quel, et final ne protège que la référence. Il faut aussi redéfinir values() pour renvoyer values.clone() (ou utiliser une List immuable)."
    concept: java-record-mutable-components
  - id: c4
    type: code-output
    prompt: "Qu'affiche le programme ?"
    code: |
      public class Main {
          record Reading(double value) { }

          public static void main(String[] args) {
              Reading a = new Reading(Double.NaN);
              Reading b = new Reading(Double.NaN);
              System.out.println(a.equals(b) + " " + (a.value() == b.value()));
          }
      }
    answer: "true false"
    explanation: "L'equals d'un record compare un composant double comme Double.compare, pour lequel NaN est égal à NaN ; l'opérateur ==, lui, suit IEEE 754, où NaN n'est égal à rien. Sans cette règle, un record contenant NaN ne serait pas égal à lui-même et se perdrait dans un HashSet."
    concept: java-record-basics
---

## Pourquoi c'est important

En 1996, `java.awt.Dimension` expose `public int width, height`. Comme n'importe quel client peut écrire dans ces champs, chaque `getSize()` de chaque composant graphique doit renvoyer une **nouvelle copie**, pour qu'un appelant ne change pas la taille d'un composant par accident. Des millions d'objets créés pour rien, à chaque mise en page. Et changer de représentation est impossible : le code client lit les champs directement. Le livre cite cet exemple comme un **avertissement**, pas comme un modèle.

Un champ public fige trois choses pour toujours : la représentation, l'absence de validation, et l'absence de réaction quand la valeur change.

> **Le modèle mental :** un **accesseur** (une méthode `x()` ou `getX()` qui renvoie une valeur) est un guichet. Le client demande, la classe décide quoi répondre et d'où sort la réponse. Un champ public, c'est la réserve ouverte au public.

## Le concept

### Classe publique : des accesseurs

:::compare
--- bad: Champs publics
```java
public class Point {
    public double x;
    public double y;
}
```
Les clients écrivent `p.x = -1` : aucune validation possible, et `x` doit exister à vie.
--- good: Accesseurs
```java
public final class Point {
    private final double x;
    private final double y;
    public Point(double x, double y) { this.x = x; this.y = y; }
    public double x() { return x; }
    public double y() { return y; }
}
```
Les clients appellent `p.x()` : ce que la méthode fait derrière ne regarde que toi.
:::

Avec des accesseurs, demain tu peux stocker des coordonnées polaires et calculer `x` à la demande, journaliser les lectures, valider dans le constructeur. Le code client ne change pas.

::checkpoint{id="c1"}

Pour une classe **mutable**, la même logique vaut pour les mutateurs (`setX`) : ils te laissent valider et réagir. Mais avant d'écrire un setter, relis la leçon suivante : la plupart du temps, la classe ne devrait pas être mutable du tout.

### Classe non publique : les champs, c'est acceptable

Si la classe est **package-private** ou **imbriquée privée**, exposer ses champs ne pose pas de problème de fond, à condition qu'ils décrivent bien l'abstraction.

La raison : le code qui en dépend est confiné au paquetage (ou à la classe englobante). Un changement de représentation ne touche que du code que tu contrôles, et tu le modifies dans le même commit. Et c'est plus lisible, des deux côtés :

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

Un **record** est une classe valeur dont tu déclares les **composants** dans l'en-tête ; le compilateur écrit tout le reste :

```java
public record Time(int hour, int minute) { }
```

Le compilateur génère :

- une classe **`final`** qui étend `java.lang.Record` ;
- un champ `private final` par composant ;
- le **constructeur canonique** (celui qui prend tous les composants, dans l'ordre de l'en-tête) : `Time(int hour, int minute)` ;
- des **accesseurs** du nom des composants : `hour()`, `minute()` (pas de `get`) ;
- `equals`, `hashCode` et `toString` fondés sur tous les composants (module 2).

On peut ajouter des méthodes, des fabriques statiques, des champs **statiques**, implémenter des interfaces. On ne peut pas ajouter de champ d'instance, ni étendre une autre classe.

Et un record se **déconstruit** dans un `switch` ou un `instanceof` : `case Time(var h, var m) when h < 12 -> "matin"` (module 0, leçon 3). Les accesseurs sont appelés pour extraire chaque composant : si tu en redéfinis un, c'est ta version que le motif utilise.

::checkpoint{id="c2"}

### Valider et normaliser : le constructeur compact

Le **constructeur compact** est une forme abrégée du constructeur canonique : pas de liste de paramètres, pas d'affectation `this.x = x` à écrire.

:::steps
```java title="Email.java"
public record Email(String address) {
    public Email {
        Objects.requireNonNull(address, "address");
        address = address.strip().toLowerCase(Locale.ROOT);
        if (!address.contains("@"))
            throw new IllegalArgumentException("pas un e-mail : " + address);
    }
}
```
--- 1: Le composant `address` déclare à la fois le champ, le paramètre du constructeur et l'accesseur `address()`.
--- 2: Pas de parenthèses après `Email` : c'est le constructeur compact. Ses paramètres sont implicites, ce sont les composants.
--- 3: On refuse `null` d'abord, sinon la ligne suivante lèverait une `NullPointerException` sans message utile.
--- 4: On **réaffecte le paramètre**, pas le champ (affecter `this.address` ici ne compile pas). C'est la forme normalisée qui sera stockée : `" Ana@X.com"` et `"ana@x.com"` deviennent égaux.
--- 5-6: La validation porte sur la valeur normalisée, celle qui sera réellement gardée.
--- 7: À la fin du corps seulement, le compilateur affecte les champs avec les valeurs **actuelles** des paramètres.
:::

### Le piège : un record n'est immuable qu'en surface

Les champs sont `final`, mais s'ils référencent un objet mutable, l'objet, lui, peut changer :

```java
public record Playlist(String name, List<String> tracks) { }

List<String> t = new ArrayList<>(List.of("A"));
Playlist p = new Playlist("Matin", t);
t.add("B");                     // p.tracks() contient maintenant B
p.tracks().clear();             // et on peut la vider de l'extérieur
```

:::reveal Avant de lire la suite : par combien de portes l'état de `p` a-t-il fui ?
Deux. **À l'entrée** : le record a gardé la référence vers la liste `t` de l'appelant, qui peut continuer à la modifier. **À la sortie** : l'accesseur renvoie cette même liste, que n'importe quel lecteur peut vider. Une correction doit fermer les deux portes.
:::

La correction se fait dans le constructeur compact : `tracks = List.copyOf(tracks);`. C'est une **copie défensive** : la copie est indépendante de la liste de l'appelant (porte d'entrée) et non modifiable, donc l'accesseur peut la renvoyer sans risque (porte de sortie).

Les **tableaux** sont pires. D'abord, l'`equals` généré compare les composants avec `Objects.equals`, donc deux tableaux de même contenu ne sont **pas égaux** (identité). Ensuite, aucun tableau n'est non modifiable : copier à l'entrée ne suffit pas. Un record qui contient un tableau doit soit le remplacer par une `List`, soit redéfinir `equals`, `hashCode` et `toString` avec `Arrays.equals` & co, **et** copier le tableau à l'entrée comme à la sortie (dans l'accesseur).

Joue l'attaquant : active ou non chaque copie, puis essaie de modifier l'état du record.

::visual{id="java-ch03-accessor-leak"}

::checkpoint{id="c3"}

## Sous le capot : ce que javac génère pour un record

Un record compile en une classe `final` qui étend `java.lang.Record`, avec un attribut `Record` dans le fichier `.class` qui décrit les composants (c'est ce que lit `Class.getRecordComponents()`). Les champs et le constructeur sont du bytecode ordinaire.

`equals`, `hashCode` et `toString`, eux, ne sont **pas** écrits en bytecode : chacun est une instruction `invokedynamic` vers `java.lang.runtime.ObjectMethods.bootstrap`. Au premier appel, cette méthode d'amorçage construit l'implémentation à partir de la liste des composants (avec des `MethodHandle` vers les champs), puis la JVM la réutilise et l'optimise comme du code écrit à la main. Trois conséquences prévisibles :

- le fichier `.class` reste petit, et l'implémentation peut s'améliorer avec le JDK sans recompiler ;
- les composants primitifs sont comparés comme par `Double.compare` / `Float.compare` (donc `NaN` égal à `NaN`), les références par `Objects.equals` : d'où l'identité pour les tableaux ;
- le format de `toString` (`Time[hour=9, minute=30]`) n'est **pas spécifié** : ne le parse jamais.

::checkpoint{id="c4"}

Si tu écris toi-même un accesseur (`public List<String> tracks() { … }`), il remplace celui généré. La spécification exige qu'il reste cohérent avec le composant, mais rien ne le vérifie (c'est exactement le piège du checkpoint c2).

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
