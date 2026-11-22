---
id: java-ch06-l04
title: "Des annotations plutôt que des conventions de nommage"
source: { chapter: 6, pages: "180-187" }
duration_min: 35
concepts:
  - id: java-naming-patterns
    label: "Une convention de nommage (méthodes qui commencent par test) est fragile : une faute de frappe passe en silence, rien ne limite où elle s'applique, et elle ne porte aucun paramètre"
  - id: java-annotation-declaration
    label: "Déclarer une annotation : @interface, avec des méta-annotations @Retention(RUNTIME) pour la lire par réflexion et @Target pour limiter où elle se pose ; une annotation sans paramètre est un marqueur"
  - id: java-annotation-processing-reflection
    label: "Traiter une annotation par réflexion : isAnnotationPresent, getAnnotation, invoke ; une exception levée par la méthode appelée arrive enveloppée dans InvocationTargetException"
  - id: java-annotation-parameters
    label: "Des paramètres typés : Class<? extends Throwable>, tableaux, valeurs par défaut ; @Repeatable pour poser plusieurs fois la même annotation, avec une annotation conteneur"
  - id: java-repeatable-pitfall
    label: "Piège de @Repeatable : posée plusieurs fois, c'est le conteneur qui est présent (isAnnotationPresent renvoie faux) ; getAnnotationsByType voit les deux cas"
glossary:
  - term: "convention de nommage"
    definition: "Règle qui donne un sens à un nom (préfixe test, suffixe Impl) : seul l'humain la vérifie."
  - term: "annotation"
    definition: "Métadonnée posée sur un élément du code (@Test) ; elle ne change pas son comportement, mais des outils peuvent la lire."
  - term: "méta-annotation"
    definition: "Annotation posée sur une déclaration d'annotation : @Retention, @Target, @Repeatable, @Documented."
  - term: "annotation marqueur"
    definition: "Annotation sans paramètre, dont la seule présence a un sens."
  - term: "InvocationTargetException"
    definition: "Exception de la réflexion qui enveloppe celle levée par la méthode appelée avec Method.invoke ; getCause() la rend."
visuals: [java-ch06-annotation-pipeline]
labs: [java-ch06-l04-lab-mini-test-runner]
extra: false
xp: 35
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un lanceur de tests minimal, en quelques lignes de réflexion. Qu'affiche le programme ?"
    code: |
      import java.lang.annotation.*;
      import java.lang.reflect.*;
      import java.util.*;

      public class Main {
          @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
          @interface Test { }

          static class Sample {
              @Test public static void ok() { }
              @Test public static void broken() { throw new IllegalStateException("cassé"); }
              public static void notATest() { throw new AssertionError("jamais appelée"); }
              @Test public void instanceMethod() { }   // invalide : pas static
          }

          public static void main(String[] args) {
              int passed = 0;
              List<String> problems = new ArrayList<>();
              Method[] methods = Sample.class.getDeclaredMethods();
              Arrays.sort(methods, Comparator.comparing(Method::getName));
              for (Method m : methods) {
                  if (!m.isAnnotationPresent(Test.class)) continue;
                  try {
                      m.invoke(null);
                      passed++;
                  } catch (InvocationTargetException e) {
                      problems.add(m.getName() + " a échoué : " + e.getCause().getMessage());
                  } catch (Exception e) {
                      problems.add(m.getName() + " invalide : " + e.getClass().getSimpleName());
                  }
              }
              System.out.println(passed + " réussi(s)");
              problems.forEach(System.out::println);
          }
      }
    answer: "1 réussi(s)\nbroken a échoué : cassé\ninstanceMethod invalide : NullPointerException"
    explanation: "Seules les méthodes annotées sont lancées : notATest est ignorée, même si elle lèverait une erreur. L'exception de broken arrive enveloppée dans une InvocationTargetException, d'où getCause(). Pour instanceMethod, invoke(null) sur une méthode d'instance lève une NullPointerException directement : ce n'est pas un échec du test, c'est un mauvais usage de l'annotation."
    concept: java-annotation-processing-reflection
  - id: c2
    type: code-output
    prompt: "Une annotation `@Repeatable`, posée une fois sur une méthode et deux fois sur l'autre. Qu'affiche le programme ?"
    code: |
      import java.lang.annotation.*;

      public class Main {
          @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
          @Repeatable(ExpectsContainer.class)
          @interface Expects { Class<? extends Throwable> value(); }

          @Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
          @interface ExpectsContainer { Expects[] value(); }

          @Expects(ArithmeticException.class)
          static void once() { }

          @Expects(ArithmeticException.class)
          @Expects(IllegalArgumentException.class)
          static void twice() { }

          public static void main(String[] args) throws Exception {
              for (String name : new String[] { "once", "twice" }) {
                  var m = Main.class.getDeclaredMethod(name);
                  System.out.println(name + " present=" + m.isAnnotationPresent(Expects.class)
                          + " container=" + m.isAnnotationPresent(ExpectsContainer.class)
                          + " byType=" + m.getAnnotationsByType(Expects.class).length);
              }
          }
      }
    answer: "once present=true container=false byType=1\ntwice present=false container=true byType=2"
    explanation: "Posée une fois, l'annotation est là telle quelle. Posée deux fois, le compilateur la range dans le conteneur : isAnnotationPresent(Expects.class) devient faux. getAnnotationsByType regarde aussi dans le conteneur : c'est la méthode à utiliser, ou bien il faut tester les deux annotations."
    concept: java-repeatable-pitfall
  - id: c3
    type: single
    prompt: "Une annotation déclarée sans `@Retention` est posée sur des méthodes. Le lanceur cherche `m.isAnnotationPresent(Check.class)` et ne trouve rien. Pourquoi ?"
    choices:
      - "Parce que l'annotation n'a pas de paramètre"
      - "Parce que la rétention par défaut est CLASS : l'annotation est gardée dans le fichier .class mais pas chargée par la JVM, la réflexion ne la voit pas"
      - "Parce que getDeclaredMethods ne voit pas les méthodes static"
      - "Parce qu'il faut aussi @Target"
    answer: 1
    explanation: "Trois rétentions : SOURCE (oubliée à la compilation, comme @Override), CLASS (par défaut : dans le .class, invisible à la réflexion) et RUNTIME (lisible par réflexion). Une annotation destinée à un outil d'exécution doit déclarer @Retention(RetentionPolicy.RUNTIME)."
    concept: java-annotation-declaration
---

## Pourquoi c'est important

Le petit outil de vérification nocturne d'Ordo lance toutes les méthodes dont le nom commence par `check`. Pendant trois mois, la vérification `chekSettlementTotals` (une lettre manquante) n'a jamais tourné, sans aucun message. Un collègue a voulu qu'une vérification attende une exception précise : il a inventé la convention `check_expect_ArithmeticException_divisionByZero`, et l'outil découpe désormais les noms de méthodes. C'est le moment de passer aux **annotations**.

En Go, les tests reposent aussi sur une convention (`func TestXxx(t *testing.T)`), vérifiée par l'outil `go vet` et par le compilateur de tests ; les métadonnées passent par des commentaires (`//go:generate`) ou des étiquettes de structure. Java a un mécanisme du langage pour ces métadonnées : les annotations.

## Les défauts des conventions de nommage

Avant JUnit 4, une méthode de test devait commencer par `test`. Bloch liste trois défauts :
1. **Une faute de frappe passe en silence** : `tsetSafetyOverride` n'est pas lancée, et rien ne le signale. Le test « réussit » parce qu'il ne tourne pas.
2. **Rien ne limite où la convention s'applique** : une **classe** nommée `TestSafetyMechanisms` ne fait pas tourner ses méthodes, sans erreur.
3. **Aucun paramètre** : exprimer « ce test doit lever `ArithmeticException` » oblige à coder le type dans le nom, et à le relire par des chaînes de caractères.

## Une annotation marqueur

```java
/** Marque une méthode de test : méthode static sans paramètre. */
@Retention(RetentionPolicy.RUNTIME)   // visible par réflexion, à l'exécution
@Target(ElementType.METHOD)           // seulement sur une méthode
public @interface Test { }
```

Deux **méta-annotations** font tout le travail :
- `@Retention(RUNTIME)` : l'annotation est chargée avec la classe et lisible par réflexion. Sans elle, la rétention par défaut est `CLASS`, et la réflexion ne voit rien.
- `@Target(METHOD)` : posée sur une classe ou un champ, l'annotation ne compile pas. Le défaut n° 2 disparaît.

Et une faute de frappe dans `@Tset` ne compile pas : défaut n° 1 réglé. Une annotation sans paramètre s'appelle une **annotation marqueur**. Elle ne change en rien le comportement de la méthode : elle **informe** un outil qui la lit.

::checkpoint{id="c3"}

## Lire les annotations : le lanceur

```java
for (Method m : testClass.getDeclaredMethods()) {
    if (m.isAnnotationPresent(Test.class)) {
        try {
            m.invoke(null);   // méthode static : pas d'objet cible
            passed++;
        } catch (InvocationTargetException wrapped) {
            System.out.println(m + " a échoué : " + wrapped.getCause());   // l'exception du test
        } catch (Exception exc) {
            System.out.println("@Test invalide : " + m);                    // annotation mal posée
        }
    }
}
```

::checkpoint{id="c1"}

Deux familles d'erreurs, à ne pas confondre : **le test a échoué** (son exception arrive enveloppée dans une `InvocationTargetException`), et **l'annotation est mal utilisée** (méthode d'instance, méthode avec paramètres : `invoke` lève directement une autre exception).

::visual{id="java-ch06-annotation-pipeline"}

## Des paramètres typés

Une annotation peut porter des paramètres, déclarés comme des méthodes. Pour « ce test doit lever telle exception » :

```java
@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.METHOD)
public @interface ExceptionTest {
    Class<? extends Throwable> value();   // n'importe quelle exception, et rien d'autre
}

@ExceptionTest(ArithmeticException.class)
public static void divideByZero() { int i = 0; i = i / i; }
```

Le lanceur lit le paramètre (`m.getAnnotation(ExceptionTest.class).value()`) et vérifie que la cause de l'`InvocationTargetException` en est une instance (`excType.isInstance(cause)`). Le type de paramètre `Class<? extends Throwable>` est un joker borné (module 5) : `@ExceptionTest(String.class)` ne compile pas.

Les types permis pour un paramètre : primitifs, `String`, `Class`, enums, annotations, et **tableaux** de ces types. Avec un tableau (`Class<? extends Throwable>[] value()`), on accepte plusieurs exceptions : `@ExceptionTest({ IndexOutOfBoundsException.class, NullPointerException.class })`. Une valeur par défaut s'écrit `int timeoutMillis() default 1000;`.

## @Repeatable : plusieurs fois la même annotation

Depuis Java 8, une annotation peut être posée plusieurs fois, si elle est `@Repeatable`, avec une annotation **conteneur** qui la regroupe. Le piège : posée **plusieurs** fois, c'est le conteneur qui est présent, pas l'annotation.

::checkpoint{id="c2"}

Pour lire une annotation répétable, utilise `getAnnotationsByType`, qui regarde aussi dans le conteneur, ou teste explicitement l'annotation **et** son conteneur.

> **Sous le capot :** une annotation est une interface spéciale (`@interface` compile en `interface Test extends java.lang.annotation.Annotation`). javac écrit les annotations `RUNTIME` dans l'attribut `RuntimeVisibleAnnotations` du fichier `.class`, et les `CLASS` dans `RuntimeInvisibleAnnotations`, que la JVM ignore. À la première lecture par réflexion, la JVM crée pour chaque annotation un **proxy dynamique** (`$Proxy…`) qui implémente l'interface et renvoie les valeurs stockées : c'est pour ça que `getAnnotation(...).value()` est un simple appel de méthode. Pour un traitement à la **compilation** (générer du code, vérifier des règles), Java a les *processeurs d'annotations* (`javax.annotation.processing`), sur lesquels reposent Lombok, MapStruct ou Dagger.

## Pièges fréquents

- **Oublier `@Retention(RUNTIME)`** : la réflexion ne voit rien, et l'outil ne lance rien, sans erreur.
- **Oublier `@Target`** : l'annotation se pose n'importe où, y compris là où elle n'a pas de sens.
- **Confondre l'échec du test et l'erreur d'usage** : `InvocationTargetException` (le test a échoué) contre `IllegalArgumentException` ou `NullPointerException` d'`invoke` (mauvaise méthode annotée).
- **`isAnnotationPresent` sur une annotation répétable** : faux dès qu'elle est posée deux fois.
- **Réinventer une convention de nommage** quand une annotation existe : un outil de plus à écrire, et des fautes qui passent.

## À retenir

- Une convention de nommage laisse passer les fautes, ne limite rien et n'a pas de paramètre : préfère une annotation.
- `@interface`, avec `@Retention(RUNTIME)` pour la réflexion et `@Target` pour limiter son emplacement.
- Lanceur par réflexion : `isAnnotationPresent`, `invoke`, et `getCause()` de l'`InvocationTargetException`.
- Paramètres typés (`Class<? extends Throwable>`, tableaux, valeurs par défaut) ; `@Repeatable` se lit avec `getAnnotationsByType`.

> **Source :** *Effective Java*, 3e éd., item 39 (pages 180 à 187).
