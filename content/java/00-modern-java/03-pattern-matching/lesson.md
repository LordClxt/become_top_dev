---
id: java-ch00-l03
title: "Pattern matching : switch exhaustif, motifs de records et gardes"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/441" }
duration_min: 40
concepts:
  - id: java-switch-expr
    label: "Switch-expression : flèches sans fall-through, une valeur produite, yield pour un bloc"
  - id: java-instanceof-pattern
    label: "Motif instanceof : tester, convertir et nommer en une fois, avec une portée qui suit le flot"
  - id: java-switch-pattern
    label: "Motifs de type dans un switch, évalués de haut en bas, avec la règle de dominance"
  - id: java-record-pattern
    label: "Motif de record : déconstruire un record (et ses composants, récursivement) dans un case"
  - id: java-guard
    label: "Garde when : une condition supplémentaire sur un motif"
  - id: java-exhaustive-switch
    label: "Exhaustivité : un switch sur un type scellé couvre toutes les variantes sans default, et casse à la compilation quand on en ajoute une"
  - id: java-switch-null
    label: "case null : sans lui, un switch sur une référence nulle lève NullPointerException"
  - id: java-unnamed
    label: "Variables et motifs anonymes _ : ignorer explicitement ce dont on n'a pas besoin"
  - id: java-match-exception
    label: "MatchException : la protection à l'exécution quand une variante apparaît après la compilation"
glossary:
  - term: "motif"
    definition: "Test structurel qui, s'il réussit, lie des variables : `Circle c`, `Point(var x, var y)`."
  - term: "garde"
    definition: "Condition `when …` attachée à un case : le case ne s'applique que si le motif ET la condition réussissent."
  - term: "dominance"
    definition: "Un case qui accepte tout ce qu'accepte un case suivant le rend inatteignable : javac le refuse."
  - term: "exhaustivité"
    definition: "Propriété d'un switch qui couvre toutes les valeurs possibles de son sélecteur ; obligatoire pour une switch-expression."
visuals: [java-ch00-switch-dispatch]
labs: [java-ch00-l03-lab-expr-simplifier, java-ch00-l03-lab-silent-default]
extra: true
xp: 35
---

## Pourquoi c'est important

Le rapport comptable du soir, écrit en 2019 :

```java
long balance = 0;
for (Event e : events) {
    if (e instanceof Sale) {
        balance += ((Sale) e).cents();
    } else if (e instanceof Refund) {
        balance -= ((Refund) e).cents();
    }
    // les autres événements ne changent pas le solde… n'est-ce pas ?
}
```

En 2024, quelqu'un ajoute les rétrofacturations (`Chargeback`). Le code compile, les tests passent, et pendant un mois le solde est faux. Ce n'est pas un problème de rigueur : c'est un problème d'**outil**. Un `if/else` ne peut pas savoir qu'il a oublié un cas. Un `switch` sur un type scellé, si.

## Le concept

### La switch-expression (Java 14)

```java
int days = switch (month) {
    case FEBRUARY -> leap ? 29 : 28;
    case APRIL, JUNE, SEPTEMBER, NOVEMBER -> 30;
    default -> 31;
};
```

Avec les flèches : **pas de fall-through** (chaque case est indépendant), plusieurs étiquettes par case, et le switch **produit une valeur**. Un bloc qui doit produire une valeur utilise `yield` :

```java
case FEBRUARY -> {
    log.debug("février");
    yield leap ? 29 : 28;
}
```

Une switch-expression doit être **exhaustive** : pour un enum, soit tous les cas, soit `default`. L'ancien `switch` à deux-points existe toujours, avec son fall-through : c'est la source de bugs que le TP de débogage te fera chasser.

### Le motif `instanceof` (Java 16)

```java
if (obj instanceof String s && !s.isBlank()) {
    use(s.strip());          // s est déjà un String, sans cast
}
```

La variable `s` n'existe que là où le test est **sûr** d'avoir réussi. La portée suit le flot : après `if (!(obj instanceof String s)) return;`, `s` est utilisable dans la suite de la méthode.

### Des motifs dans le switch (Java 21)

```java
String describe(Object o) {
    return switch (o) {
        case null -> "rien";
        case Integer i when i > 1_000 -> "grand entier " + i;
        case Integer i -> "entier " + i;
        case String s -> "texte de " + s.length() + " caractères";
        default -> "autre : " + o.getClass().getSimpleName();
    };
}
```

Les cases sont essayés **de haut en bas**, et le premier qui correspond gagne. D'où la règle de **dominance** : si `case Integer i` venait avant `case Integer i when i > 1_000`, le second ne pourrait jamais s'appliquer, et javac refuse de compiler. Mets toujours le cas particulier (gardé) avant le cas général.

Sans `case null`, un switch sur une référence nulle lève `NullPointerException`, comme l'ancien switch. Avec `case null`, c'est une valeur comme une autre.

### Motifs de records : déconstruire (Java 21)

```java
sealed interface Shape permits Circle, Rect { }
record Point(double x, double y) { }
record Circle(Point center, double r) implements Shape { }
record Rect(Point topLeft, Point bottomRight) implements Shape { }

double area(Shape s) {
    return switch (s) {
        case Circle(Point _, double r) -> Math.PI * r * r;
        case Rect(Point(var x1, var y1), Point(var x2, var y2)) -> Math.abs((x2 - x1) * (y2 - y1));
    };
}
```

Un motif de record teste le type **et** extrait les composants, en appelant les accesseurs. Les motifs s'imbriquent : `Rect(Point(var x1, var y1), …)` va chercher les coordonnées en une ligne. `var` laisse le compilateur inférer le type du composant.

Le `_` (Java 22) dit « je ne veux pas de cette valeur » : dans un motif (`Point _`), une variable de boucle (`for (var _ : items)`), un `catch (NumberFormatException _)`, un paramètre de lambda (`(k, _) -> k`). C'est mieux qu'un nom inutilisé : le lecteur sait que l'oubli est volontaire.

### L'exhaustivité : la raison d'être de tout ça

Regarde bien `area` : **pas de `default`**. Le compilateur sait que `Shape` n'a que deux variantes, et que les deux sont traitées. Ajoute `record Triangle(…) implements Shape` à la liste `permits` : **chaque** switch sur `Shape` qui l'oublie devient une erreur de compilation. C'est exactement le filet qui manquait au rapport comptable.

Ce filet, un `default` le supprime. `default -> 0` « au cas où » transforme une erreur de compilation future en bug silencieux. Règle de pratique : sur un type scellé, **pas de `default`** ; s'il le faut vraiment, liste les cas restants explicitement.

::visual{id="java-ch00-switch-dispatch"}

## Sous le capot

**Un switch à motifs compile en `invokedynamic`.** javac ne génère pas une cascade d'`instanceof` : il émet un appel `invokedynamic` vers `java.lang.runtime.SwitchBootstraps.typeSwitch`, avec la liste des types des cases. Au premier passage, la méthode d'amorçage construit le code de répartition ; ensuite, la JVM le traite comme du code ordinaire et l'optimise selon les types réellement rencontrés. Le switch reçoit un indice de départ : quand une garde échoue, le code relance la recherche à partir du case suivant. Tu peux le voir avec `javap -c` : une ligne `InvokeDynamic #0:typeSwitch`.

**Pourquoi il y a quand même une protection à l'exécution.** L'exhaustivité est vérifiée **à la compilation**, avec la liste des variantes connue à ce moment-là. Si quelqu'un recompile seulement l'interface scellée avec une variante de plus, sans recompiler la classe qui contient le switch, celle-ci reçoit une valeur qu'elle n'a jamais prévue. Plutôt que de choisir un case au hasard, le code inséré par javac lève `MatchException`. C'est une erreur de **déploiement** (des classes compilées à des moments différents), pas une erreur de logique : en pratique, tu ne la croises que dans un système de plugins ou un classpath incohérent.

**Bientôt : les types primitifs dans les motifs.** Les JDK 26 et 27 continuent de préparer (en *preview*, avec `--enable-preview`) des motifs de types primitifs : `case int i when i > 0`, ou `instanceof byte b` qui ne réussit que si la valeur tient sans perte. Ce n'est pas encore du Java standard : pas dans ce cours.

## Pièges fréquents

- **`default` sur un type scellé** : il éteint l'exhaustivité. Le jour où une variante arrive, plus rien ne te prévient.
- **L'ancien switch à deux-points** : un `break` oublié et l'exécution « tombe » dans le case suivant. Préfère les flèches partout.
- **Le cas général avant le cas gardé** : erreur de dominance à la compilation (au moins, c'est visible).
- **Oublier `case null`** quand la valeur peut être nulle : `NullPointerException` au switch, pas dans le case.
- **Une garde qui a des effets de bord** : elle peut être évaluée pour des valeurs qui finiront dans un autre case. Une garde doit être une condition pure.
- **Une garde qui lit une variable modifiée dans une boucle** : comme une lambda, une garde ne peut lire que des variables locales *effectivement finales*. Copie la valeur dans une locale (`var here = current;`) avant le switch.
- **Déconstruire pour tout** : `case Circle c -> c.r()` est parfois plus lisible qu'un motif imbriqué de cinq composants. Déconstruis ce dont tu te sers.

## À retenir

- Flèches : pas de fall-through, une valeur produite, `yield` dans un bloc.
- `instanceof` et `switch` acceptent des motifs qui testent, convertissent et nomment ; les motifs de records déconstruisent, récursivement.
- Cases évalués de haut en bas : cas gardés (`when`) avant le cas général ; `case null` si nécessaire.
- Sur un type scellé : pas de `default`, et le compilateur signale chaque switch à mettre à jour quand une variante apparaît.
- `_` pour ignorer volontairement ; `MatchException` si des classes compilées séparément ne s'accordent plus.

> **Sources :** JEP 361 (switch-expressions, Java 14), JEP 394 (motif instanceof, Java 16), JEP 440 et 441 (motifs de records et switch à motifs, Java 21), JEP 456 (variables et motifs anonymes, Java 22), JEP 530 et 532 (motifs primitifs, preview JDK 26 et 27). Détecter les erreurs au plus tôt, idéalement à la compilation : *Effective Java*, 3e éd., introduction (page 2).
