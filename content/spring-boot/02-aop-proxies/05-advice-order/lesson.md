---
id: spring-ch02-l05
title: "Plusieurs aspects sur une méthode : qui enveloppe qui ?"
source: { book: spring-docs, chapter: 22, pages: "#aop-ataspectj-advice-ordering", url: "https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html#aop-ataspectj-advice-ordering" }
duration_min: 35
concepts:
  - id: spring-ch02-aspect-order
    label: "Entre deux aspects, l'ordre est indéfini sans @Order ; la plus petite valeur est la plus externe (elle voit l'appel en premier et le résultat en dernier)"
  - id: spring-ch02-advice-kinds
    label: "Dans un même aspect : @Around, puis @Before, puis la méthode, puis @AfterReturning ou @AfterThrowing, puis @After (sémantique « finally »)"
  - id: spring-ch02-retry-placement
    label: "Le plus interne voit chaque tentative, le plus externe voit l'appel une seule fois : l'ordre décide de ce que mesurent un audit, une métrique, une transaction"
  - id: spring-ch02-retryable-spring7
    label: "@Retryable (Spring 7) est toujours inséré en tête de la chaîne du proxy : chaque tentative a sa propre transaction, et un audit qui doit voir l'appel une fois se pose sur l'appelant"
glossary:
  - term: "précédence"
    definition: "La priorité d'un aspect. La plus haute (la plus petite valeur de @Order) s'exécute la première à l'aller et la dernière au retour."
  - term: "@After"
    definition: "Conseil exécuté après la méthode quelle que soit l'issue, comme un bloc finally."
  - term: "@EnableResilientMethods"
    definition: "L'annotation de Spring 7 qui active @Retryable et @ConcurrencyLimit, en enregistrant leurs post-processors."
visuals: [spring-ch02-russian-dolls]
labs: [spring-ch02-l05-lab-aspect-order]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Quatre conseils dans le même aspect. Qu'affiche le programme ?"
    code: |
      import java.util.*;
      import org.aspectj.lang.ProceedingJoinPoint;
      import org.aspectj.lang.annotation.*;
      import org.springframework.context.annotation.*;

      public class Main {
          static List<String> log = new ArrayList<>();

          public static class Svc { public void run() { log.add("méthode"); } }

          @Aspect
          public static class Trace {
              @Around("execution(* Main.Svc.run())") public Object around(ProceedingJoinPoint p) throws Throwable {
                  log.add("around>"); try { return p.proceed(); } finally { log.add("<around"); } }
              @Before("execution(* Main.Svc.run())") public void before() { log.add("before"); }
              @After("execution(* Main.Svc.run())") public void after() { log.add("after"); }
              @AfterReturning("execution(* Main.Svc.run())") public void ok() { log.add("afterReturning"); }
          }

          @Configuration @EnableAspectJAutoProxy
          static class Config {
              @Bean Svc svc() { return new Svc(); }
              @Bean Trace trace() { return new Trace(); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  ctx.getBean(Svc.class).run();
                  System.out.println(log);
              }
          }
      }
    answer: "[around>, before, méthode, afterReturning, after, <around]"
    explanation: "Dans un même aspect, la précédence va de @Around à @Before, @After, @AfterReturning, @AfterThrowing. Mais @After suit la sémantique « finally » d'AspectJ : il s'exécute après @AfterReturning (ou @AfterThrowing). Et @Around, le plus prioritaire, enveloppe tout le reste."
    concept: spring-ch02-advice-kinds
  - id: c2
    type: code-output
    prompt: "Deux aspects avec `@Order`. Qu'affiche le programme ?"
    code: |
      import java.util.*;
      import org.aspectj.lang.ProceedingJoinPoint;
      import org.aspectj.lang.annotation.*;
      import org.springframework.context.annotation.*;
      import org.springframework.core.annotation.Order;

      public class Main {
          static List<String> log = new ArrayList<>();

          public static class Svc { public void run() { log.add("méthode"); } }

          @Aspect @Order(2)
          public static class Inner {
              @Around("execution(* Main.Svc.run())") public Object a(ProceedingJoinPoint p) throws Throwable {
                  log.add("inner>"); try { return p.proceed(); } finally { log.add("<inner"); } }
          }

          @Aspect @Order(1)
          public static class Outer {
              @Around("execution(* Main.Svc.run())") public Object a(ProceedingJoinPoint p) throws Throwable {
                  log.add("outer>"); try { return p.proceed(); } finally { log.add("<outer"); } }
          }

          @Configuration @EnableAspectJAutoProxy
          static class Config {
              @Bean Svc svc() { return new Svc(); }
              @Bean Inner inner() { return new Inner(); }
              @Bean Outer outer() { return new Outer(); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  ctx.getBean(Svc.class).run();
                  System.out.println(log);
              }
          }
      }
    answer: "[outer>, inner>, méthode, <inner, <outer]"
    explanation: "La plus petite valeur de @Order est la plus haute précédence : Outer entre le premier et sort le dernier, même s'il est déclaré après. Sans @Order, la documentation est claire : l'ordre entre deux aspects est indéfini."
    concept: spring-ch02-aspect-order
  - id: c3
    type: single
    prompt: "Une méthode porte `@Retryable` (Spring 7) et `@Transactional`. Elle échoue deux fois puis réussit. Combien de transactions ont été ouvertes ?"
    choices:
      - "Une seule, partagée par les trois tentatives"
      - "Trois : chaque tentative a la sienne, les deux premières sont annulées"
      - "Aucune : @Retryable désactive @Transactional"
      - "Ça dépend de l'ordre des deux annotations dans le code"
    answer: 1
    explanation: "La documentation de Spring le dit : le conseil de retry est appliqué le plus à l'extérieur, donc chaque tentative s'exécute dans sa propre transaction. C'est ce qu'on veut : une tentative ratée n'empoisonne pas la suivante. L'ordre des annotations dans le code source ne compte pas."
    concept: spring-ch02-retryable-spring7
---

## Pourquoi c'est important

Le service de verrouillage des places de Tixa porte trois comportements : un audit pour le support, une métrique de durée, et un retry quand un autre client tient le même verrou. Un jour, le support se plaint : l'audit montre **trois** tentatives de verrouillage pour une seule réservation, et les métriques comptent des échecs alors que le client a bien eu sa place.

Rien n'est faux dans aucun des trois aspects. C'est leur **emboîtement** qui ne correspond pas à ce qu'on voulait mesurer. L'ordre des aspects n'est pas un détail de configuration : il change le sens de chaque comportement.

## Les poupées russes

Plusieurs comportements sur la même méthode s'emboîtent : le plus **externe** voit l'appel en premier et le résultat en dernier ; le plus **interne** est le seul à voir chaque passage vers la cible.

- un **audit** externe voit **un** appel et son résultat final ; interne au retry, il voit chaque tentative ;
- une **métrique** externe mesure la durée totale, tentatives comprises ; interne, une durée par tentative ;
- une **transaction** interne au retry donne une transaction par tentative ; externe, une seule pour toutes.

::visual{id="spring-ch02-russian-dolls"}

## L'ordre entre aspects

La documentation est sans ambiguïté : sans précision, **l'ordre entre deux aspects est indéfini**. On le fixe avec `@Order` sur la classe de l'aspect (ou en implémentant `Ordered`). La **plus petite** valeur a la plus haute précédence : elle est la plus **externe**.

::checkpoint{id="c2"}

> **Attention :** `@Order` se pose sur la **classe** de l'aspect, pas sur ses méthodes. Pour donner deux ordres différents à deux conseils, il faut deux aspects.

## L'ordre dans un même aspect

Les conseils d'un même aspect sur la même méthode ont une précédence fixée par leur **type** : `@Around`, `@Before`, `@After`, `@AfterReturning`, `@AfterThrowing`. Avec une nuance documentée : `@After` suit la sémantique « finally » d'AspectJ, donc s'exécute **après** `@AfterReturning` ou `@AfterThrowing`.

::checkpoint{id="c1"}

En pratique : pour un audit qui doit dire « appel », puis « ok » ou « échec », trois conseils simples (`@Before`, `@AfterReturning`, `@AfterThrowing`) sont plus lisibles qu'un `@Around`, et ne risquent pas d'avaler l'exception. C'est ce que tu écris dans le lab.

## Le cas de @Retryable dans Spring 7

Spring 7 apporte son propre `@Retryable` (activé par `@EnableResilientMethods`). Il ne passe pas par le système des `@Aspect` : un post-processor dédié, `RetryAnnotationBeanPostProcessor`, ajoute un advisor au proxy existant. Et son constructeur appelle `setBeforeExistingAdvisors(true)` : l'advisor du retry est inséré **en tête** de la chaîne. Il est donc **toujours le plus externe**, quel que soit l'`@Order` de tes aspects.

::checkpoint{id="c3"}

Deux conséquences :
- **bonne** : avec `@Transactional`, chaque tentative a sa propre transaction (la documentation des transactions le dit explicitement). Une tentative ratée est annulée, la suivante repart de zéro ;
- **piège** : un audit posé sur la même méthode voit **chaque** tentative, et aucun `@Order` n'y change rien. Pour auditer une seule fois, l'audit doit être **sur l'appelant**, un autre bean, à l'extérieur du proxy qui réessaie. C'est le jalon 3 du projet.

> **Sous le capot :** l'ordre de `@EnableResilientMethods(order = …)` (par défaut `Ordered.LOWEST_PRECEDENCE - 1`) ne règle **pas** la place de l'advisor dans la chaîne : il règle l'ordre dans lequel les **post-processors** s'exécutent, par exemple par rapport à `@EnableAsync`. La documentation de la résilience montre comment l'utiliser pour que le retry s'exécute sur le thread asynchrone.

## Pièges fréquents

- **Compter sur l'ordre de déclaration** des aspects : sans `@Order`, il est indéfini.
- **Un `@Order` inversé** : la plus petite valeur est la plus externe, pas la plus interne.
- **Un audit sur une méthode `@Retryable`** : une ligne par tentative, quel que soit l'`@Order`.
- **Un retry à l'intérieur d'une transaction** (avec un aspect de retry maison mal ordonné) : les tentatives partagent une transaction déjà condamnée.

## À retenir

- Les comportements s'emboîtent : l'externe voit l'appel une fois, l'interne voit chaque tentative.
- Entre aspects : `@Order`, plus petite valeur = plus externe ; sinon, ordre indéfini.
- Dans un aspect : `@Around` enveloppe tout, `@After` s'exécute en dernier (« finally »).
- `@Retryable` de Spring 7 est toujours en tête de chaîne : une transaction par tentative, et l'audit « une fois » se pose sur l'appelant.

> **Source :** Spring Framework 7.0, [Advice Ordering](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html#aop-ataspectj-advice-ordering), [Using @Transactional](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) et [Resilience Features](https://docs.spring.io/spring-framework/reference/core/resilience.html) ; code de [`RetryAnnotationBeanPostProcessor`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/resilience/annotation/RetryAnnotationBeanPostProcessor.java) et [`AbstractAdvisingBeanPostProcessor`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-aop/src/main/java/org/springframework/aop/framework/AbstractAdvisingBeanPostProcessor.java) (v7.0.11).
