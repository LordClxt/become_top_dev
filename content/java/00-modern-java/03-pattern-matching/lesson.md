---
id: java-ch00-l03
title: "Pattern matching : switch exhaustif, motifs de records et gardes"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/441" }
duration_min: 45
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
checkpoints:
  - id: c1
    type: single
    prompt: "Une collègue écrit `if (o instanceof String s || s.isEmpty()) { ... }`. Que se passe-t-il ?"
    choices:
      - "Ça compile : s vaut null quand o n'est pas un String"
      - "Ça compile, mais s.isEmpty() lève une NullPointerException quand o n'est pas un String"
      - "Ça ne compile pas : à droite du ||, le test a forcément échoué, donc s n'existe pas"
      - "Ça ne compile pas : on ne peut pas combiner un motif avec ||"
    answer: 2
    explanation: "La droite d'un || n'est évaluée que si la gauche est fausse, c'est-à-dire quand o n'est PAS un String : javac refuse donc d'y rendre s visible (cannot find symbol). Une variable de motif n'est jamais null ni « vide » : elle existe seulement là où le test a réussi, d'où && et non ||."
    concept: java-instanceof-pattern
  - id: c2
    type: code-output
    prompt: "Prédis la sortie de ce programme."
    code: |
      String label(CharSequence cs) {
          return switch (cs) {
              case String s when s.length() > 3 -> "long " + s;
              case String s -> "court " + s;
              case StringBuilder sb -> "builder " + sb.length();
              default -> "autre";
          };
      }

      void main() {
          IO.println(label("hi") + ", " + label("hello") + ", " + label(new StringBuilder("abc")));
      }
    answer: "court hi, long hello, builder 3"
    explanation: "Pour chaque case, de haut en bas, Java teste d'abord le type puis la garde : \"hi\" a le bon type mais échoue la garde, donc la recherche continue au case suivant. Une garde qui échoue ne fait pas « sortir » du switch, elle passe la main."
    concept: java-guard
  - id: c3
    type: code-output
    prompt: "La garde appelle une méthode qui compte ses appels. Qu'affiche le programme ?"
    code: |
      static int checks = 0;
      static boolean big(int i) { checks++; return i > 10; }

      String size(Object o) {
          return switch (o) {
              case Integer i when big(i) -> "grand";
              case Integer i -> "petit";
              default -> "autre";
          };
      }

      void main() {
          IO.println(size(5) + " " + size(50) + " " + size("x") + " " + checks);
      }
    answer: "petit grand autre 2"
    explanation: "La garde est évaluée pour chaque Integer, y compris 5 qui finit dans le case « petit » : son effet de bord a eu lieu quand même. \"x\" n'est pas un Integer, donc la garde n'est même pas appelée ; c'est pourquoi une garde doit rester une condition pure."
    concept: java-guard
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

**Le modèle mental.** Un switch à motifs est un aiguillage : chaque `case` est un guichet qui pose une question (« es-tu un `Sale` ? as-tu plus de 100 centimes ? »). La valeur passe devant les guichets **de haut en bas**, et le premier qui répond oui la prend. Si le type est scellé, le compilateur connaît la liste complète des voyageurs possibles et vérifie qu'aucun ne reste sans guichet.

Trois mots à poser avant le code : un **motif** est un test de forme qui, s'il réussit, nomme des variables (`Sale s`) ; une **garde** est une condition `when` ajoutée à un motif ; un switch est **exhaustif** quand toute valeur possible trouve un case.

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

::checkpoint{id="c1"}

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

Les cases sont essayés **de haut en bas**, et le premier qui correspond gagne. Pour chaque case, Java teste le type, puis la garde. Si la garde échoue, la recherche continue au case suivant.

:::reveal Avant de lire la suite : que se passerait-il si `case Integer i` venait avant `case Integer i when i > 1_000` ?
Le case général accepterait tous les entiers, y compris les grands : le case gardé ne pourrait jamais s'appliquer. C'est la règle de **dominance** (un case qui accepte tout ce qu'accepte un case suivant le rend inatteignable), et javac refuse de compiler plutôt que de te laisser du code mort. Mets toujours le cas particulier (gardé) avant le cas général.
:::

Sans `case null`, un switch sur une référence nulle lève `NullPointerException`, comme l'ancien switch. Avec `case null`, c'est une valeur comme une autre.

::checkpoint{id="c2"}

Une garde est évaluée **pendant la recherche**, donc aussi pour des valeurs qui finiront dans un autre case. Si elle a un effet de bord (un compteur, un log, un appel réseau), il se produit quand même :

::checkpoint{id="c3"}

### Motifs de records : déconstruire (Java 21)

:::steps
```java title="Shapes.java"
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
--- 1: `sealed ... permits` fige la liste des variantes : `Shape` ne peut être qu'un `Circle` ou un `Rect`. C'est ce qui rendra le switch vérifiable.
--- 2-4: Des records : leurs composants (`center`, `r`…) ont des accesseurs générés, que les motifs vont appeler.
--- 8: Un **motif de record** teste le type **et** extrait les composants. `Point _` dit « il y a un centre, je n'en veux pas » ; `double r` récupère le rayon.
--- 9: Les motifs s'**imbriquent** : `Point(var x1, var y1)` déconstruit le coin à l'intérieur du rectangle, en une ligne. `var` laisse le compilateur inférer le type du composant.
--- 7-10: Aucun `default` : les deux variantes sont couvertes, le compilateur le sait. Ajoute une variante à `permits` et cette méthode cesse de compiler.
:::

Le `_` (Java 22) dit « je ne veux pas de cette valeur » : dans un motif (`Point _`), une variable de boucle (`for (var _ : items)`), un `catch (NumberFormatException _)`, un paramètre de lambda (`(k, _) -> k`). C'est mieux qu'un nom inutilisé : le lecteur sait que l'oubli est volontaire.

### L'exhaustivité : la raison d'être de tout ça

Regarde bien `area` : **pas de `default`**. Le compilateur sait que `Shape` n'a que deux variantes, et que les deux sont traitées. Ajoute `record Triangle(…) implements Shape` à la liste `permits` : **chaque** switch sur `Shape` qui l'oublie devient une erreur de compilation. C'est exactement le filet qui manquait au rapport comptable.

Ce filet, un `default` le supprime. Reprends le rapport comptable, cette fois avec un `Event` scellé :

:::compare
--- bad: Un default « au cas où »
```java
balance += switch (e) {
    case Sale s -> s.cents();
    case Refund r -> -r.cents();
    default -> 0;          // Chargeback arrive ici, en silence
};
```
Ajouter `Chargeback` compile sans un mot : le solde est faux pendant un mois.
--- good: Les cas listés, sans default
```java
balance += switch (e) {
    case Sale s -> s.cents();
    case Refund r -> -r.cents();
    case Fee _, Transfer _ -> 0;   // neutres, et c'est écrit
};
```
Ajouter `Chargeback` casse la compilation ici : le compilateur te montre la ligne à écrire.
:::

Règle de pratique : sur un type scellé, **pas de `default`** ; s'il le faut vraiment, liste les cas restants explicitement.

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
