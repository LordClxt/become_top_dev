---
id: java-ch06-l05
title: "@Override toujours, et des interfaces marqueurs pour définir des types"
source: { chapter: 6, pages: "188-192" }
duration_min: 25
concepts:
  - id: java-override-annotation
    label: "@Override sur chaque méthode qui en redéfinit une : le compilateur refuse une surcharge prise pour une redéfinition (equals(Bigram) au lieu d'equals(Object)), une faute de nom ou une signature qui a dérivé"
  - id: java-overload-vs-override
    label: "Surcharge (même nom, autres paramètres, choisie à la compilation) contre redéfinition (même signature, choisie à l'exécution) : une surcharge d'equals n'est jamais appelée par les collections"
  - id: java-marker-interface
    label: "Une interface marqueur (sans méthode) définit un type : une méthode peut l'exiger en paramètre, et l'erreur arrive à la compilation ; une annotation marqueur ne le peut pas"
  - id: java-marker-choice
    label: "Interface marqueur si on veut un type (et donc écrire des méthodes qui n'acceptent que ses instances) ; annotation marqueur pour autre chose qu'une classe ou une interface, ou dans un cadre déjà fondé sur les annotations"
glossary:
  - term: "surcharge (overloading)"
    definition: "Plusieurs méthodes de même nom avec des paramètres différents ; le compilateur choisit selon les types statiques des arguments."
  - term: "redéfinition (overriding)"
    definition: "Une sous-classe fournit sa version d'une méthode héritée, de même signature ; la JVM choisit selon le type réel de l'objet."
  - term: "interface marqueur"
    definition: "Interface sans méthode, qui signale une propriété de la classe qui l'implémente (Serializable, RandomAccess, Cloneable)."
visuals: [java-ch06-overload-vs-override]
labs: [java-ch06-l05-lab-debug-overrides]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un ensemble de bigrammes : chaque lettre de l'alphabet, doublée, ajoutée dix fois. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          static class Bigram {
              private final char first, second;
              Bigram(char first, char second) { this.first = first; this.second = second; }

              public boolean equals(Bigram b) { return b.first == first && b.second == second; }

              public int hashCode() { return 31 * first + second; }
          }

          public static void main(String[] args) {
              Set<Bigram> s = new HashSet<>();
              for (int i = 0; i < 10; i++)
                  for (char ch = 'a'; ch <= 'z'; ch++)
                      s.add(new Bigram(ch, ch));
              System.out.println(s.size());
          }
      }
    answer: "260"
    explanation: "equals(Bigram) ne redéfinit pas Object.equals(Object) : c'est une surcharge, une autre méthode. HashSet appelle equals(Object), hérité d'Object, qui compare les identités : chaque new Bigram est différent. Avec @Override sur equals(Bigram), le compilateur aurait refusé le code ; avec equals(Object), on obtient 26."
    concept: java-overload-vs-override
  - id: c2
    type: code-output
    prompt: "`ObjectOutputStream.writeObject` accepte n'importe quel `Object`. Qu'affiche le programme ?"
    code: |
      import java.io.*;

      public class Main {
          record Trade(String id, long cents) { }                       // pas Serializable
          record Quote(String symbol, long cents) implements Serializable { }

          static String write(Object o) {
              try (var out = new ObjectOutputStream(new ByteArrayOutputStream())) {
                  out.writeObject(o);                                     // accepte n'importe quel Object
                  return "écrit";
              } catch (IOException e) {
                  return e.getClass().getSimpleName() + ": " + e.getMessage();
              }
          }

          public static void main(String[] args) {
              System.out.println(write(new Quote("ACME", 12_500)));
              System.out.println(write(new Trade("t-1", 12_500)));
          }
      }
    answer: "écrit\nNotSerializableException: Main$Trade"
    explanation: "Serializable est une interface marqueur : elle définit un type. Mais writeObject prend un Object, et ne vérifie qu'à l'exécution. Si sa signature avait été writeObject(Serializable o), passer un Trade aurait été une erreur de compilation. C'est l'avantage du marqueur interface, gâché ici par l'API."
    concept: java-marker-interface
  - id: c3
    type: single
    prompt: "Tu veux que seules les classes « auditables » puissent être passées à `AuditLog.record(...)`. Marqueur interface ou annotation ?"
    choices:
      - "Annotation @Auditable, vérifiée par réflexion dans record"
      - "Interface marqueur Auditable, et record(Auditable a) : le compilateur refuse tout le reste"
      - "Un champ boolean auditable"
      - "Une convention de nommage"
    answer: 1
    explanation: "Dès qu'on veut écrire une méthode qui n'accepte que les instances marquées, il faut un type : une interface marqueur. L'annotation ne permet qu'une vérification à l'exécution. Elle reste le bon choix pour marquer des méthodes, des champs ou des paramètres, ou dans un cadre qui repose déjà sur les annotations (Spring, JPA)."
    concept: java-marker-choice
---

## Pourquoi c'est important

Le service de dédoublonnage d'Ordo garde un `Set<SymbolKey>` des titres déjà traités. Il traite pourtant chaque titre plusieurs fois, et la mémoire grimpe. `SymbolKey` a bien une méthode `equals` et un `hashCode`… sauf que `equals` prend un `SymbolKey` en paramètre, et non un `Object`. Ce n'est pas une redéfinition : c'est une autre méthode, que `HashSet` n'appelle jamais. Le compilateur aurait pu le dire, si quelqu'un avait écrit `@Override`.

En Go, il n'y a ni surcharge ni héritage de classes : une méthode a un nom unique sur son type, et une interface est satisfaite si les signatures correspondent exactement. Java, lui, a la surcharge **et** la redéfinition, deux mécanismes qui se ressemblent au point de se confondre.

## Surcharge ou redéfinition

- **Redéfinir** (*override*) : même nom, **même signature** que la méthode héritée. À l'exécution, la JVM choisit la version de la classe réelle de l'objet.
- **Surcharger** (*overload*) : même nom, **paramètres différents**. À la compilation, javac choisit selon les types **statiques** des arguments. C'est une autre méthode.

`boolean equals(Bigram b)` ne redéfinit pas `boolean equals(Object o)` : elle le surcharge. Une collection, qui ne connaît que `Object`, appelle toujours la version héritée d'`Object`, qui compare les identités.

::checkpoint{id="c1"}

::visual{id="java-ch06-overload-vs-override"}

## @Override sur chaque redéfinition

La règle de Bloch : **annote `@Override` chaque méthode qui redéfinit une méthode d'une super-classe** (ou implémente une méthode d'interface). Si la méthode ne redéfinit rien, le compilateur refuse :

```
error: method does not override or implement a method from a supertype
    @Override public boolean equals(Bigram b) {
```

L'annotation attrape trois familles d'erreurs :
- la **surcharge prise pour une redéfinition** (`equals(Bigram)`, `compareTo(Object)` au lieu de `compareTo(T)`) ;
- la **faute de nom** (`hashcode()`, `tostring()`) : une nouvelle méthode, que personne n'appelle ;
- la **signature qui a dérivé** : la super-classe change un type de paramètre, et la sous-classe ne redéfinit plus rien, sans un mot.

Une exception : dans une classe **concrète** qui implémente une méthode **abstraite**, l'annotation n'est pas indispensable (le compilateur signale déjà la méthode manquante), mais elle ne coûte rien. Dans une interface ou une classe abstraite, elle reste nécessaire. Les IDE et les analyseurs peuvent aussi signaler une redéfinition sans `@Override`.

> **Sous le capot :** `@Override` a une rétention `SOURCE` : elle n'existe que pour javac, qui l'efface et n'en garde aucune trace dans le `.class`. Elle ne coûte donc rien à l'exécution. Le contrôle est fait pendant l'analyse des types : javac cherche, dans les super-types, une méthode de même nom dont la signature, après effacement des génériques, correspond. Avec les génériques, une redéfinition peut d'ailleurs exiger que javac génère une **méthode pont** (*bridge method*) : `compareTo(Object)` qui appelle ton `compareTo(Price)`. C'est elle que `TreeSet` appelle.

## Interfaces marqueurs et annotations marqueurs

Une **interface marqueur** n'a aucune méthode : elle signale une propriété de la classe qui l'implémente. `Serializable` dit « mes instances peuvent être écrites par `ObjectOutputStream` », `RandomAccess` dit « mon accès par index est rapide ».

Depuis Java 5, on pourrait croire les annotations marqueurs (leçon 4) supérieures. Bloch montre qu'une interface marqueur a deux avantages :

1. **Elle définit un type.** Une méthode peut exiger ce type en paramètre, et l'erreur arrive à la **compilation**. Une annotation ne permet qu'une vérification à l'exécution.
2. **Elle peut être ciblée précisément.** Une interface marqueur peut étendre une autre interface, pour ne s'appliquer qu'à ses implémentations (`Set` est une sorte de marqueur restreint de `Collection`).

::checkpoint{id="c2"}

L'ironie de `Serializable` : c'est une interface marqueur, mais `writeObject` prend un `Object`, et l'avantage est perdu. L'erreur arrive à l'exécution.

Les annotations marqueurs gardent deux avantages : elles s'appliquent à **autre chose** qu'une classe ou une interface (méthodes, champs, paramètres), et elles s'intègrent aux **cadres fondés sur les annotations** (Spring, JPA, les tests).

**Choisir :** si tu veux écrire une ou plusieurs méthodes qui n'acceptent que les objets marqués, c'est un **type** : une interface marqueur. Sinon, ou pour marquer des éléments qui ne sont pas des classes, une annotation.

::checkpoint{id="c3"}

## Pièges fréquents

- **`equals(MonType)`** au lieu d'`equals(Object)` : une surcharge que les collections n'appellent jamais.
- **Une faute de casse** : `hashcode()`, `tostring()`, `equal()`.
- **Oublier `@Override`** : toutes les erreurs ci-dessus passent la compilation.
- **Une annotation marqueur vérifiée par réflexion** là où un paramètre typé aurait suffi.
- **Une API qui prend `Object`** alors qu'un type marqueur existe : l'erreur repasse à l'exécution.

## À retenir

- Surcharge (autres paramètres, choisie à la compilation) et redéfinition (même signature, choisie à l'exécution) sont deux mécanismes différents.
- `@Override` sur chaque redéfinition : le compilateur refuse la surcharge déguisée, la faute de nom et la signature qui a dérivé.
- Une interface marqueur définit un type : on peut l'exiger en paramètre, et l'erreur arrive à la compilation.
- Annotation marqueur pour les méthodes, champs et paramètres, ou dans un cadre à base d'annotations.

> **Source :** *Effective Java*, 3e éd., items 40 et 41 (pages 188 à 192).
