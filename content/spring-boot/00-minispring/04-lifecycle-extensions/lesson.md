---
id: spring-ch00-l04
title: "Cycle de vie et points d'extension"
source: { book: spring-docs, chapter: 11, pages: "#beans-factory-extension-bpp", url: "https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html" }
duration_min: 35
concepts:
  - id: spring-ch00-lifecycle-reflection
    label: "Après l'injection, le conteneur appelle les méthodes @PostConstruct par réflexion (même privées) ; à l'arrêt, les @PreDestroy"
  - id: spring-ch00-post-processor-chain
    label: "Chaque bean traverse la chaîne des post-processors ; chacun reçoit le résultat du précédent, et le dernier résultat devient le bean"
  - id: spring-ch00-reverse-destruction
    label: "Détruire dans l'ordre inverse de création garantit qu'un bean est détruit avant les beans dont il dépend"
  - id: spring-ch00-failed-start
    label: "Si le démarrage échoue, les singletons déjà créés sont détruits avant que l'erreur remonte : aucune ressource ne fuit"
  - id: spring-ch00-early-bean
    label: "Les post-processors sont créés en premier ; un bean dont l'un d'eux dépend est créé trop tôt et échappe à ceux qui n'existent pas encore"
glossary:
  - term: "post-processor"
    definition: "Un composant appelé pour chaque bean créé, qui peut le remplacer (par un proxy, par exemple). Dans Spring : BeanPostProcessor."
  - term: "processeur de définitions"
    definition: "Un composant appelé avant toute création, qui modifie les recettes. Dans Spring : BeanFactoryPostProcessor."
  - term: "suppressed"
    definition: "Exceptions « supprimées » attachées à une autre avec addSuppressed : on garde la première erreur et on n'en perd aucune."
visuals: [spring-ch00-two-phase-refresh]
labs: [spring-ch00-l04-lab-post-processors]
extra: true
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le vrai Spring : `Journal` dépend de `Sink`, lui-même créé après `Clock`. Qu'affiche le programme à l'arrêt ?"
    code: |
      import org.springframework.context.annotation.*;
      import jakarta.annotation.PreDestroy;

      public class Main {
          static class Clock { @PreDestroy void stop() { System.out.println("clock"); } }
          static class Sink { Sink(Clock c) { } @PreDestroy void stop() { System.out.println("sink"); } }
          static class Journal { Journal(Sink s) { } @PreDestroy void stop() { System.out.println("journal"); } }

          @Configuration
          static class Config {
              @Bean Journal journal(Sink sink) { return new Journal(sink); }
              @Bean Sink sink(Clock clock) { return new Sink(clock); }
              @Bean Clock clock() { return new Clock(); }
          }

          public static void main(String[] args) {
              new AnnotationConfigApplicationContext(Config.class).close();
          }
      }
    answer: "journal\nsink\nclock"
    explanation: "La création suit les dépendances (clock, sink, journal), la destruction remonte : journal, puis sink, puis clock. Chaque bean est arrêté pendant que ce dont il dépend fonctionne encore : le journal peut vider son tampon dans un support ouvert."
    concept: spring-ch00-reverse-destruction
  - id: c2
    type: single
    prompt: "Un post-processor remplace `catalog` par un proxy dans `before`. Sur quel objet faut-il chercher et appeler `@PostConstruct` ?"
    choices:
      - "Sur le proxy, puisque c'est lui le bean désormais"
      - "Sur l'objet d'origine : le proxy n'a pas ses méthodes annotées, et c'est l'objet d'origine qu'il faut initialiser"
      - "Sur les deux"
      - "Sur aucun : un bean remplacé n'est plus initialisé"
    answer: 1
    explanation: "Le proxy est une enveloppe : ses méthodes délèguent, mais il ne porte pas les annotations de la classe d'origine. Initialiser l'objet d'origine, puis laisser le proxy le servir, c'est aussi pourquoi Spring pose ses proxies dans « after », une fois l'objet prêt."
    concept: spring-ch00-lifecycle-reflection
---

## Pourquoi c'est important

À chaque redéploiement de Tixa, quelques réservations disparaissent. Le journal les gardait en mémoire et les écrivait par lots. À l'arrêt, il devait vider son tampon dans le support, mais le support était déjà fermé. Rien n'était faux dans le journal ni dans le support : c'est **l'ordre** des arrêts qui l'était.

Un conteneur ne fait pas qu'assembler des objets : il les **initialise**, laisse des extensions les **transformer**, puis les **arrête** dans le bon ordre, y compris quand le démarrage échoue à mi-chemin. C'est la dernière brique de Minispring, et le cœur de ce que fait `refresh()` dans Spring.

## Initialiser : @PostConstruct

Une fois le bean construit et toutes ses dépendances injectées, le conteneur cherche ses méthodes annotées `@PostConstruct` (sans paramètre) et les appelle par réflexion, même `private` grâce à `setAccessible(true)`. C'est le bon moment pour charger un cache ou ouvrir une connexion : toutes les dépendances sont là.

Une méthode annotée **avec** un paramètre est une erreur de configuration : le conteneur ne saurait pas quoi lui passer, il refuse au démarrage.

## Transformer : la chaîne des post-processors

Un post-processor est appelé pour **chaque** bean créé. Ce qu'il renvoie **remplace** le bean, et le suivant de la chaîne reçoit ce résultat :

```java
Object current = bean;
for (BeanPostProcessor p : processors) current = p.before(name, current);
invokePostConstruct(bean);                   // sur l'objet d'origine
for (BeanPostProcessor p : processors) current = p.after(name, current);
return current;                              // c'est lui qu'on range et qu'on injecte
```

::checkpoint{id="c2"}

C'est le mécanisme qu'utilise Spring pour `@Transactional`, `@Async` ou l'AOP : un post-processor renvoie un **proxy** dans `after`, une fois l'objet initialisé. Le module 01 en écrit un sur le vrai Spring.

### Le problème de la poule et de l'œuf

Pour traiter **tous** les beans, les post-processors doivent exister **avant** eux. Le conteneur les crée donc en premier. Mais si un post-processor a lui-même une dépendance (un `Pool`), ce `Pool` est créé pendant ce temps, alors que tous les post-processors ne sont pas encore prêts : il échappe à ceux qui manquent. Spring le signale par un avertissement (*Bean 'pool' … is not eligible for getting processed by all BeanPostProcessors*), que ton boss reproduit.

## Les deux temps de refresh()

On peut maintenant écrire le démarrage complet, dans l'ordre de Spring :

1. **les recettes** : les processeurs de définitions (comme `BeanFactoryPostProcessor`) lisent et modifient les définitions, avant qu'aucun bean applicatif n'existe. Ils ne doivent avoir **aucune dépendance**, sinon ils forceraient des créations trop tôt ;
2. **les post-processors**, créés avant tous les autres beans ;
3. **les singletons restants**, chacun passant par la chaîne des post-processors.

::visual{id="spring-ch00-two-phase-refresh"}

## Arrêter : dans l'ordre inverse

Le conteneur empile les singletons **au moment de leur création**. Puisqu'un bean est toujours créé après ses dépendances, dépiler donne un ordre où chaque bean est arrêté **avant** ce dont il dépend :

::checkpoint{id="c1"}

Deux règles de plus :
- **les prototypes ne sont jamais détruits** : le conteneur ne les a pas gardés (leçon 2) ;
- **une erreur dans un `@PreDestroy` n'arrête pas les autres** : on continue, puis on lève la première erreur avec les suivantes en exceptions supprimées (`addSuppressed`). Un pool qui refuse de se fermer ne doit pas empêcher le journal de vider son tampon.

> **Sous le capot :** Spring enregistre pour chaque singleton qui a quelque chose à arrêter un `DisposableBeanAdapter`, dans la table `disposableBeans` de `DefaultSingletonBeanRegistry`, puis les détruit en ordre inverse d'enregistrement. Il garde aussi les dépendances déclarées entre beans (`dependentBeanMap`) : avant de détruire un bean, il détruit ceux qui dépendent de lui.

## Quand le démarrage échoue

Si le dixième bean lève une exception, les neuf premiers existent : un pool ouvert, un fichier verrouillé. Laisser l'exception remonter telle quelle fait fuir ces ressources. Le conteneur doit donc **détruire ce qui a été créé**, puis relancer :

```java
public Container start() {
    try {
        for (BeanDefinition def : definitions.values()) if (!def.prototype()) obtain(def);
    } catch (RuntimeException e) {
        close();     // les @PreDestroy des singletons déjà créés, en ordre inverse
        throw e;
    }
    return this;
}
```

C'est exactement le `catch` de `AbstractApplicationContext.refresh()` (`destroyBeans()` puis `cancelRefresh(ex)`), que le module 01 lit ligne à ligne.

## Pièges fréquents

- **Appeler `@PostConstruct` sur le proxy** : il n'a pas les méthodes annotées.
- **Arrêter dans l'ordre de création** : le support se ferme avant le journal.
- **S'arrêter à la première erreur de destruction** : les beans suivants ne sont jamais arrêtés.
- **Laisser une exception de démarrage remonter sans rien détruire** : ressources ouvertes, ports occupés.
- **Donner des dépendances à un post-processor** : elles sont créées trop tôt et échappent aux autres.

## À retenir

- Initialisation : injection, puis `@PostConstruct` sur l'objet d'origine, encadrés par la chaîne des post-processors.
- Ce que renvoie un post-processor **remplace** le bean : c'est ainsi que naissent les proxies.
- `refresh()` : recettes (processeurs de définitions), puis post-processors, puis singletons.
- Arrêt en ordre **inverse** de création, sans s'arrêter à la première erreur ; un démarrage raté détruit ce qu'il a créé.

> **Source :** Spring Framework 7.0, [Container Extension Points](https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html) et [Customizing the Nature of a Bean](https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html) ; code de [`DefaultSingletonBeanRegistry`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/support/DefaultSingletonBeanRegistry.java) et [`AbstractApplicationContext.refresh()`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/context/support/AbstractApplicationContext.java) (v7.0.11).
