---
id: spring-ch02-l03
title: "@Aspect : des advisors écrits comme des méthodes"
source: { book: spring-docs, chapter: 22, pages: "#aop-ataspectj-around-advice", url: "https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html" }
duration_min: 35
concepts:
  - id: spring-ch02-aspect-annotations
    label: "Un @Aspect décrit des advisors avec des méthodes : l'annotation de conseil (@Around, @Before…) dit quoi, son expression de pointcut dit où"
  - id: spring-ch02-annotation-binding
    label: "Une expression comme @annotation(timed) vise les méthodes annotées et lie l'annotation trouvée à un paramètre du conseil"
  - id: spring-ch02-auto-proxy-creator
    label: "@EnableAspectJAutoProxy enregistre AnnotationAwareAspectJAutoProxyCreator, un BeanPostProcessor qui transforme les @Aspect en advisors et proxifie les beans visés"
glossary:
  - term: "aspect"
    definition: "Une classe qui regroupe des comportements transverses (mesure, audit, sécurité) et les règles qui disent où les appliquer."
  - term: "expression de pointcut"
    definition: "Le langage d'AspectJ pour viser des méthodes : execution(* app..*Service.*(..)), @annotation(app.Timed), within(app.web..*), bean(*Service)…"
  - term: "join point"
    definition: "Un point du programme où un aspect peut agir. Avec Spring AOP, ce n'est jamais que l'exécution d'une méthode d'un bean."
  - term: "ProceedingJoinPoint"
    definition: "Ce que reçoit un conseil @Around : l'appel en cours, avec proceed() pour le continuer, getArgs() et getSignature()."
visuals: [spring-ch02-aspect-to-advisor]
labs: [spring-ch02-l03-lab-timed-aspect]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un `@Aspect` déclaré en bean, et l'auto-proxy activé. Qu'affiche le programme ?"
    code: |
      import org.aspectj.lang.ProceedingJoinPoint;
      import org.aspectj.lang.annotation.*;
      import org.springframework.aop.support.AopUtils;
      import org.springframework.context.annotation.*;

      public class Main {
          public static class Catalog { public String find(String id) { return "événement " + id; } }

          @Aspect
          public static class Shout {
              @Around("execution(* Main.Catalog.*(..))")
              public Object loud(ProceedingJoinPoint call) throws Throwable { return call.proceed().toString().toUpperCase(); }
          }

          @Configuration @EnableAspectJAutoProxy
          static class Config {
              @Bean Catalog catalog() { return new Catalog(); }
              @Bean Shout shout() { return new Shout(); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  Catalog catalog = ctx.getBean(Catalog.class);
                  System.out.println(catalog.find("jazz") + " " + AopUtils.isAopProxy(catalog) + " " + AopUtils.isAopProxy(ctx.getBean(Shout.class)));
              }
          }
      }
    answer: "ÉVÉNEMENT JAZZ true false"
    explanation: "Le post-processor d'auto-proxy a lu l'aspect, vu que son pointcut vise Catalog, et remplacé le bean par un proxy. L'aspect lui-même n'est jamais proxifié : la documentation le dit, un @Aspect est exclu de l'auto-proxy."
    concept: spring-ch02-auto-proxy-creator
  - id: c2
    type: single
    prompt: "Ton `@Aspect` porte l'annotation `@Aspect` seulement, et la configuration fait `@ComponentScan`. Le comportement ne s'applique jamais. Pourquoi ?"
    choices:
      - "Il manque @EnableAspectJAutoProxy, rien d'autre"
      - "@Aspect ne suffit pas pour la détection par scan : il faut aussi @Component (ou une méthode @Bean)"
      - "Les aspects doivent être dans le paquet org.aspectj"
      - "Les aspects ne fonctionnent qu'avec Spring Boot"
    answer: 1
    explanation: "@Aspect n'est pas une annotation de composant : le scan ne le voit pas. La documentation est explicite : il faut une annotation @Component séparée, ou déclarer l'aspect en @Bean. Et bien sûr activer l'auto-proxy."
    concept: spring-ch02-aspect-annotations
---

## Pourquoi c'est important

Écrire un advisor à la main (leçon 2) marche, mais personne ne le fait en production. Les équipes écrivent des **aspects** : une classe, des méthodes, et des annotations qui disent où agir. `@Transactional` et `@Cacheable` ont leurs propres mécanismes, mais tout ce qui est maison (audit, mesure, multi-tenant, verrou métier) passe par `@Aspect`.

Bien écrit, un aspect retire des centaines de lignes répétées. Mal compris, c'est la pire des dettes : du comportement invisible dans le code qu'il touche. Il faut savoir précisément ce que Spring en fait.

## Un aspect, ce sont des advisors

```java
@Aspect
public class TimedAspect {
    private final Metrics metrics;
    private final Ticker ticker;

    public TimedAspect(Metrics metrics, Ticker ticker) { this.metrics = metrics; this.ticker = ticker; }

    @Around("@annotation(timed)")
    public Object measure(ProceedingJoinPoint call, Timed timed) throws Throwable {
        long start = ticker.millis();
        try {
            return call.proceed();
        } finally {
            metrics.record(timed.value(), ticker.millis() - start);
        }
    }
}
```

Chaque méthode annotée par un **conseil** (`@Around`, `@Before`, `@AfterReturning`, `@AfterThrowing`, `@After`) devient un **advisor** : l'annotation dit *quoi*, son expression dit *où*. `@Around` est le plus général : il reçoit un `ProceedingJoinPoint` et décide s'il appelle `proceed()`, combien de fois, avec quels arguments.

La syntaxe vient d'**AspectJ**, un vrai compilateur d'aspects. Spring n'utilise de lui que l'analyseur d'expressions (la bibliothèque `aspectjweaver`, apportée dans Spring Boot 4 par `spring-boot-starter-aspectj`). Le reste, ce sont les proxies de la leçon 1. Conséquence directe, rappelée par la documentation : Spring AOP ne connaît que **l'exécution de méthodes de beans**. Pas les constructeurs, pas les champs, pas les objets créés avec `new`.

## Viser les bonnes méthodes

| Expression | Vise |
|---|---|
| `execution(* app..*Service.*(..))` | toute méthode d'une classe dont le nom finit par `Service`, dans `app` et ses sous-paquets |
| `@annotation(app.Timed)` | les méthodes annotées `@Timed` |
| `@within(org.springframework.stereotype.Service)` | toutes les méthodes des classes annotées `@Service` |
| `within(app.web..*)` | tout ce qui est dans le paquet `app.web` |
| `bean(*Repository)` | les beans dont le **nom** finit par `Repository` (propre à Spring) |

Un nom de paramètre à la place d'un type **lie** la valeur : `@annotation(timed)` vise les méthodes annotées et passe l'annotation au paramètre `timed`. De même `args(eventId, ..)` lie le premier argument. Plus besoin de réflexion à la main.

> **Astuce :** préfère viser une **annotation** que tu poses explicitement (`@Timed`, `@Audited`) plutôt qu'un motif de nom (`*Service.*(..)`). Le code visé dit alors lui-même qu'un comportement s'y ajoute, et renommer une classe ne change pas silencieusement ce qui est audité.

## Qui transforme l'aspect en proxy

`@EnableAspectJAutoProxy` n'ajoute presque rien : il enregistre un bean, `AnnotationAwareAspectJAutoProxyCreator`. C'est un **`BeanPostProcessor`** (module 01, leçon 4) qui :

1. trouve tous les beans annotés `@Aspect`, et transforme chacune de leurs méthodes de conseil en advisor ;
2. pour chaque bean créé ensuite, cherche les advisors dont le pointcut accepte au moins une de ses méthodes ;
3. s'il en trouve, renvoie un **proxy** (dans `postProcessAfterInitialization`), avec ces advisors dans l'ordre.

::checkpoint{id="c1"}

::visual{id="spring-ch02-aspect-to-advisor"}

Deux conséquences de ce mécanisme :
- un aspect doit être un **bean**. `@Aspect` n'est pas `@Component` : le scan ne le trouve pas, il faut l'annoter aussi `@Component` ou le déclarer avec `@Bean` ;
- un aspect n'est jamais lui-même proxifié : un aspect ne peut pas en conseiller un autre.

::checkpoint{id="c2"}

> **Sous le capot :** dans une application Spring Boot, tu n'écris pas `@EnableAspectJAutoProxy` : l'autoconfiguration `AopAutoConfiguration` (dans `spring-boot-autoconfigure`) l'applique pour toi dès qu'`aspectjweaver` est sur le classpath, avec `proxyTargetClass = true` tant que `spring.aop.proxy-target-class` ne vaut pas `false` (module 4). C'est pourquoi un aspect « marche tout seul » dans une application Boot, et pourquoi ses proxies sont des sous-classes CGLIB.

## Pièges fréquents

- **Un `@Aspect` sans `@Component` ni `@Bean`** : il n'existe pas pour le conteneur.
- **Un pointcut par motif de nom** trop large : il vise aussi des méthodes que personne n'imaginait.
- **Attendre un conseil sur un objet créé avec `new`**, un constructeur ou un champ : Spring AOP ne voit que les méthodes des beans.
- **Oublier de relancer l'exception** dans un `@Around` qui l'attrape : l'appelant reçoit `null` et croit que tout a réussi.

## À retenir

- Un `@Aspect` est une façon d'écrire des advisors : la méthode de conseil dit quoi, l'expression dit où.
- `@annotation(x)`, `args(x, ..)` lient des valeurs aux paramètres du conseil.
- `@EnableAspectJAutoProxy` = un `BeanPostProcessor` qui proxifie les beans visés ; l'aspect doit être un bean.
- Spring AOP ne voit que l'exécution de méthodes de beans.

> **Source :** Spring Framework 7.0, [Declaring an Aspect](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/at-aspectj.html), [Declaring a Pointcut](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/pointcuts.html) et [Declaring Advice](https://docs.spring.io/spring-framework/reference/core/aop/ataspectj/advice.html) ; code de [`AnnotationAwareAspectJAutoProxyCreator`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-aop/src/main/java/org/springframework/aop/aspectj/annotation/AnnotationAwareAspectJAutoProxyCreator.java) (v7.0.11).
