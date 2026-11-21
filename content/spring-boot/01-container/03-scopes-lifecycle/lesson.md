---
id: spring-ch01-l03
title: "Portées et cycle de vie"
source: { book: spring-docs, chapter: 7, pages: "#beans-factory-scopes-sing-prot-interaction", url: "https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html" }
duration_min: 35
concepts:
  - id: spring-singleton-scope
    label: "Singleton = une instance par conteneur (pas par JVM), partagée par tous ses clients et tous les threads"
  - id: spring-prototype-scope
    label: "Prototype = une nouvelle instance à chaque demande au conteneur (injection ou getBean)"
  - id: spring-scoped-dependency-trap
    label: "Un prototype injecté dans un singleton n'est créé qu'une fois : il faut le redemander (ObjectProvider, @Lookup) ou passer par un proxy de portée"
  - id: spring-lifecycle-callbacks
    label: "Ordre : constructeur, injection, Aware, @PostConstruct, afterPropertiesSet, init-method ; à l'arrêt : @PreDestroy, destroy, destroy-method"
  - id: spring-prototype-destruction
    label: "Le conteneur n'appelle jamais les callbacks de destruction d'un prototype : il l'oublie dès qu'il l'a créé"
  - id: spring-destruction-order
    label: "À l'arrêt, un bean est détruit avant les beans dont il dépend"
glossary:
  - term: "portée (scope)"
    definition: "La règle qui dit combien d'instances d'un bean existent et combien de temps elles vivent : une par conteneur (singleton), une par demande (prototype), une par requête HTTP (request)…"
  - term: "prototype"
    definition: "Portée dans laquelle le conteneur crée une nouvelle instance à chaque fois qu'on lui demande le bean, puis s'en désintéresse."
  - term: "@PostConstruct / @PreDestroy"
    definition: "Annotations Jakarta : méthode appelée une fois le bean complètement injecté, et méthode appelée à l'arrêt du conteneur."
  - term: "proxy de portée"
    definition: "Un objet de remplacement injecté à la place du vrai bean, qui va chercher la bonne instance (celle de la requête en cours, par exemple) à chaque appel."
  - term: "shutdown hook"
    definition: "Code que la JVM exécute à son arrêt normal (Ctrl+C, SIGTERM). Spring Boot en enregistre un qui ferme le contexte, donc appelle les @PreDestroy."
visuals: [spring-ch01-bean-lifecycle]
labs: [spring-ch01-l03-lab-seat-hold]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "`Cart` est un prototype, `Desk` un singleton. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.beans.factory.config.ConfigurableBeanFactory;

      public class Main {
          static class Cart { }
          record Desk(Cart cart) { }

          @Configuration
          static class Config {
              @Bean @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE) Cart cart() { return new Cart(); }
              @Bean Desk desk(Cart cart) { return new Desk(cart); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  Desk desk = ctx.getBean(Desk.class);
                  boolean sameCart = desk.cart() == ctx.getBean(Desk.class).cart();
                  boolean twoCarts = ctx.getBean(Cart.class) != ctx.getBean(Cart.class);
                  System.out.println(sameCart + " " + twoCarts);
              }
          }
      }
    answer: "true true"
    explanation: "Chaque getBean(Cart.class) crée bien un nouveau panier : le prototype fonctionne. Mais Desk n'a été créé qu'une fois, et il a reçu un panier à ce moment-là : il garde ce même panier pour toujours, et tous les clients du guichet le partagent."
    concept: spring-scoped-dependency-trap
  - id: c2
    type: code-output
    prompt: "Qu'affiche le programme, du démarrage à l'arrêt ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.beans.factory.*;
      import org.springframework.beans.factory.annotation.Autowired;
      import jakarta.annotation.*;

      public class Main {
          static class Repo { }
          static class Life implements InitializingBean, DisposableBean {
              Life() { System.out.println("1 constructeur"); }
              @Autowired void setRepo(Repo repo) { System.out.println("2 injection"); }
              @PostConstruct void post() { System.out.println("3 @PostConstruct"); }
              public void afterPropertiesSet() { System.out.println("4 afterPropertiesSet"); }
              void init() { System.out.println("5 initMethod"); }
              @PreDestroy void pre() { System.out.println("6 @PreDestroy"); }
              public void destroy() { System.out.println("7 destroy"); }
              void bye() { System.out.println("8 destroyMethod"); }
          }

          @Configuration
          static class Config {
              @Bean Repo repo() { return new Repo(); }
              @Bean(initMethod = "init", destroyMethod = "bye") Life life() { return new Life(); }
          }

          public static void main(String[] args) {
              var ctx = new AnnotationConfigApplicationContext(Config.class);
              System.out.println("-- prêt");
              ctx.close();
          }
      }
    answer: "1 constructeur\n2 injection\n3 @PostConstruct\n4 afterPropertiesSet\n5 initMethod\n-- prêt\n6 @PreDestroy\n7 destroy\n8 destroyMethod"
    explanation: "Les trois mécanismes d'initialisation existent pour des raisons historiques ; Spring les appelle dans un ordre fixe, après toutes les injections. La destruction suit le même ordre (annotation, interface, méthode déclarée). Dans du code neuf, @PostConstruct et @PreDestroy suffisent."
    concept: spring-lifecycle-callbacks
  - id: c3
    type: code-output
    prompt: "`Journal` dépend de `Sink` ; `Hold` est un prototype. Qu'affiche le programme à l'arrêt ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.beans.factory.config.ConfigurableBeanFactory;
      import jakarta.annotation.PreDestroy;

      public class Main {
          static class Sink { @PreDestroy void close() { System.out.println("support fermé"); } }
          static class Journal { Journal(Sink sink) { } @PreDestroy void flush() { System.out.println("journal vidé"); } }
          static class Hold { @PreDestroy void release() { System.out.println("réservation libérée"); } }

          @Configuration
          static class Config {
              @Bean Sink sink() { return new Sink(); }
              @Bean Journal journal(Sink sink) { return new Journal(sink); }
              @Bean @Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE) Hold hold() { return new Hold(); }
          }

          public static void main(String[] args) {
              var ctx = new AnnotationConfigApplicationContext(Config.class);
              ctx.getBean(Hold.class);
              ctx.close();
          }
      }
    answer: "journal vidé\nsupport fermé"
    explanation: "Journal dépend de Sink : il est détruit d'abord, pendant que son support est encore ouvert. Et la réservation n'est jamais libérée : le conteneur ne garde aucune trace des prototypes qu'il crée, il ne peut donc pas les détruire."
    concept: spring-prototype-destruction
---

## Pourquoi c'est important

Lundi, le support de Tixa reçoit des captures d'écran inquiétantes : un client voit dans son panier les places choisies par un autre. Le code du guichet est pourtant simple : un `HoldDesk` qui reçoit une `SeatHold` (le panier temporaire) et la rend à chaque client. Quelqu'un a même pensé à marquer `SeatHold` comme **prototype**, « une instance par client ». Ça ne suffit pas.

La portée d'un bean dit **combien d'instances existent** et **combien de temps elles vivent**. Se tromper de portée ne fait jamais planter le démarrage : ça mélange les données de deux clients, ou ça laisse des ressources ouvertes à l'arrêt. Ces bugs-là se voient en production.

## Singleton : une instance par conteneur

Par défaut, un bean est **singleton** : le conteneur le crée une fois, et tous ceux qui le demandent reçoivent la même instance. Attention au mot : c'est un singleton **par conteneur**, pas le singleton du patron de conception (une instance par JVM). Deux contextes Spring dans la même JVM (deux tests, par exemple) ont chacun leur instance.

Conséquence directe : un singleton est partagé par **toutes les requêtes, donc tous les threads**. Il doit être sans état (un service qui ne fait que déléguer) ou protéger son état (structures concurrentes, `synchronized`). Un champ `private Customer currentCustomer` dans un service singleton est un bug de concurrence qui attend son heure.

## Prototype : une instance par demande

`@Scope("prototype")` (ou la constante `ConfigurableBeanFactory.SCOPE_PROTOTYPE`) : le conteneur crée une **nouvelle** instance à chaque fois qu'on lui demande le bean, par injection ou par `getBean`.

Le mot important est **« demande »**. Or un singleton ne demande ses dépendances **qu'une seule fois** : à sa création.

::checkpoint{id="c1"}

C'est exactement le bug du panier partagé. La documentation de Spring le dit en une phrase : le conteneur crée le singleton une seule fois, il n'a donc qu'une seule occasion de lui fournir le prototype.

### Les trois corrections

**1. Redemander le prototype à chaque fois** avec `ObjectProvider` (leçon 2) :

```java
public class HoldDesk {
    private final ObjectProvider<SeatHold> holds;

    public HoldDesk(ObjectProvider<SeatHold> holds) { this.holds = holds; }

    public SeatHold open() {
        return holds.getObject();   // repasse par le conteneur : un nouveau prototype
    }
}
```

C'est la solution la plus explicite : on voit dans le code qu'on crée une instance par appel.

**2. `@Lookup`** sur une méthode : Spring sous-classe le bean (CGLIB) et remplace la méthode par un `getBean`. Ça marche, mais c'est de la magie invisible, et seulement pour des composants scannés, pas pour des beans déclarés avec `@Bean`.

**3. Un proxy de portée** : `@Scope(value = "prototype", proxyMode = ScopedProxyMode.TARGET_CLASS)`. Le singleton reçoit un proxy qui va chercher une instance **à chaque appel de méthode**.

> **Attention :** avec un proxy de portée sur un prototype, *chaque appel de méthode* crée une nouvelle instance. `hold.hold("A12"); hold.seats();` travaille sur **deux** objets différents : la place ajoutée a disparu. Les proxies de portée sont faits pour les portées web (`request`, `session`), où « la bonne instance » est celle de la requête en cours, pas pour les prototypes.

## Le cycle de vie d'un bean

Pour chaque bean, le conteneur suit la même séquence (méthode `doCreateBean` de `AbstractAutowireCapableBeanFactory`) :

1. **Instancier** : appeler le constructeur (ou la méthode `@Bean`).
2. **Peupler** : injecter les dépendances restantes (champs et setters `@Autowired`).
3. **Initialiser** : les interfaces `*Aware` (le bean reçoit son nom, le contexte…), puis les `BeanPostProcessor` « avant », puis les méthodes d'initialisation, puis les `BeanPostProcessor` « après » (leçon 4).
4. **Enregistrer** les callbacks de destruction, pour l'arrêt.

::visual{id="spring-ch01-bean-lifecycle"}

Trois façons de déclarer une méthode d'initialisation coexistent, pour des raisons historiques, et Spring les appelle dans un ordre fixe :

::checkpoint{id="c2"}

**Dans du code neuf, utilise `@PostConstruct` et `@PreDestroy`** : ce sont des annotations standard (Jakarta), elles ne lient pas ta classe à une interface Spring. `initMethod` / `destroyMethod` servent pour une classe que tu ne peux pas modifier (une bibliothèque).

> **Sous le capot :** `@PostConstruct` n'est pas une fonctionnalité du cœur du conteneur. C'est `CommonAnnotationBeanPostProcessor`, un `BeanPostProcessor` enregistré automatiquement par `AnnotationConfigApplicationContext`, qui cherche les méthodes annotées et les appelle dans sa méthode « avant initialisation ». Les interfaces `InitializingBean` et `init-method`, elles, sont appelées directement par la fabrique de beans, juste après. D'où l'ordre.

Avec l'injection par constructeur, le constructeur a déjà tout reçu : il peut faire lui-même une bonne partie de l'initialisation. `@PostConstruct` reste utile quand l'initialisation dépend d'un `BeanPostProcessor` ou d'une injection par setter, ou quand elle est trop lourde pour un constructeur (charger un cache, ouvrir une connexion).

## L'arrêt : qui est détruit, et dans quel ordre

À `ctx.close()`, le conteneur détruit ses singletons. Deux règles à connaître.

**Un bean est détruit avant les beans dont il dépend.** Le journal qui écrit dans un support est détruit **avant** le support : il peut encore vider son tampon. Cette garantie ne marche que si la dépendance est **déclarée** (constructeur, paramètre `@Bean`). Un bean qui va chercher sa dépendance tout seul (un `getBean` dans une méthode) n'a pas déclaré de lien : l'ordre n'est plus garanti.

**Les prototypes ne sont jamais détruits.** Le conteneur crée un prototype, le rend, et l'oublie. Il ne peut donc pas appeler son `@PreDestroy`.

::checkpoint{id="c3"}

Si un prototype tient une ressource (des places bloquées, une connexion), **c'est à celui qui l'a demandé de la libérer**. Dans le lab, le guichet garde la liste des réservations ouvertes et les libère dans son propre `@PreDestroy`.

> **En production :** dans une application Spring Boot, `SpringApplication` enregistre un *shutdown hook* : quand la JVM s'arrête normalement (SIGTERM d'un redéploiement, Ctrl+C), le contexte est fermé et les `@PreDestroy` sont appelés. Avec un `kill -9` ou un conteneur tué pour dépassement de mémoire, rien n'est appelé : un `@PreDestroy` est une politesse, pas une garantie. Ce qui ne doit jamais être perdu doit être écrit avant (module 10).

## Pièges fréquents

- **Marquer un bean prototype et l'injecter dans un singleton** : une seule instance, partagée.
- **Un proxy de portée sur un prototype** : une nouvelle instance à chaque appel de méthode.
- **Compter sur le `@PreDestroy` d'un prototype** : il n'est jamais appelé.
- **Un état par client dans un singleton** (`currentCustomer`) : partagé entre tous les threads.
- **Une dépendance cachée (`getBean`) dans un bean qui libère des ressources** : l'ordre de destruction n'est plus garanti.

## À retenir

- Singleton = **une instance par conteneur**, partagée par tous les threads : sans état, ou protégée.
- Prototype = une instance **par demande** ; un singleton ne demande qu'une fois. Redemande avec `ObjectProvider`.
- Initialisation : constructeur → injection → `@PostConstruct` → `afterPropertiesSet` → `initMethod`. Préfère `@PostConstruct` / `@PreDestroy`.
- À l'arrêt : un bean est détruit avant ses dépendances ; les prototypes ne sont jamais détruits.

> **Source :** Spring Framework 7.0, [Bean Scopes](https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html), [Method Injection](https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-method-injection.html) et [Customizing the Nature of a Bean](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html) ; code de [`AbstractAutowireCapableBeanFactory.doCreateBean`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/support/AbstractAutowireCapableBeanFactory.java) (v7.0.11) ; Spring Boot 4.1, [Application Exit](https://docs.spring.io/spring-boot/4.1/reference/features/spring-application.html#features.spring-application.application-exit).
