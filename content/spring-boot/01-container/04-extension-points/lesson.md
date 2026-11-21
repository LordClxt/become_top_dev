---
id: spring-ch01-l04
title: "Les points d'extension : modifier les recettes, envelopper les objets"
source: { book: spring-docs, chapter: 11, pages: "#beans-factory-extension-bpp", url: "https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html" }
duration_min: 40
concepts:
  - id: spring-bean-factory-post-processor
    label: "BeanFactoryPostProcessor : lit et modifie les définitions (portée, valeurs, ajout ou retrait) avant la création du moindre bean"
  - id: spring-bean-post-processor
    label: "BeanPostProcessor : voit passer chaque bean créé, avant et après son initialisation"
  - id: spring-bpp-proxy
    label: "Un BeanPostProcessor peut renvoyer un autre objet, un proxy : c'est lui qu'on injecte partout. C'est ainsi que marchent @Transactional, @Async et l'AOP"
  - id: spring-jdk-proxy-limits
    label: "Un proxy JDK n'implémente que les interfaces du bean : le demander ou l'injecter par sa classe concrète échoue"
  - id: spring-static-bean-method
    label: "Une méthode @Bean qui renvoie un post-processor doit être static : sinon sa classe de configuration et ses dépendances sont créées trop tôt"
glossary:
  - term: "BeanFactoryPostProcessor"
    definition: "Interface d'un composant appelé au temps 1 de refresh() avec la fabrique de beans : il travaille sur les définitions, jamais sur des objets."
  - term: "BeanDefinitionRegistryPostProcessor"
    definition: "Variante qui reçoit le registre des définitions, donc peut en ajouter ou en retirer. ConfigurationClassPostProcessor en est un."
  - term: "BeanPostProcessor"
    definition: "Interface d'un composant appelé pour chaque bean créé : postProcessBeforeInitialization puis postProcessAfterInitialization. Ce qu'il renvoie remplace le bean."
  - term: "proxy JDK"
    definition: "Objet créé par java.lang.reflect.Proxy qui implémente des interfaces et envoie chaque appel à un InvocationHandler. Il n'est pas une instance de la classe du bean."
  - term: "proxy CGLIB"
    definition: "Sous-classe générée à l'exécution qui redéfinit les méthodes de la classe. Elle peut remplacer une classe sans interface, mais pas une classe ou une méthode final."
visuals: [spring-ch01-bpp-proxy]
labs: [spring-ch01-l04-lab-audit-proxy]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un `BeanFactoryPostProcessor` change la portée d'une définition. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.beans.factory.config.*;

      public class Main {
          static class Clock { }

          static class ToPrototype implements BeanFactoryPostProcessor {
              public void postProcessBeanFactory(ConfigurableListableBeanFactory factory) {
                  factory.getBeanDefinition("clock").setScope(BeanDefinition.SCOPE_PROTOTYPE);
              }
          }

          @Configuration
          static class Config {
              @Bean static ToPrototype toPrototype() { return new ToPrototype(); }
              @Bean Clock clock() { return new Clock(); }
          }

          public static void main(String[] args) {
              try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
                  System.out.println(ctx.getBean("clock") == ctx.getBean("clock"));
              }
          }
      }
    answer: "false"
    explanation: "Le post-processor a modifié la recette avant que le moindre bean existe : clock est devenu un prototype, deux demandes donnent deux objets. Rien dans Config ne le laisse deviner, d'où l'intérêt (et le danger) de ces composants."
    concept: spring-bean-factory-post-processor
  - id: c2
    type: code-output
    prompt: "Un `BeanPostProcessor` affiche chaque `Greeter` qu'il voit passer. Il reçoit lui-même un `Greeter` dans son constructeur. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.beans.factory.annotation.Qualifier;
      import org.springframework.beans.factory.config.BeanPostProcessor;

      public class Main {
          record Greeter(String name) { }

          static class Shout implements BeanPostProcessor {
              Shout(Greeter helper) { }
              public Object postProcessAfterInitialization(Object bean, String beanName) {
                  if (bean instanceof Greeter g) System.out.println("traité : " + g.name());
                  return bean;
              }
          }

          @Configuration
          static class Config {
              @Bean static Shout shout(@Qualifier("helper") Greeter helper) { return new Shout(helper); }
              @Bean Greeter helper() { return new Greeter("helper"); }
              @Bean Greeter hello() { return new Greeter("hello"); }
          }

          public static void main(String[] args) {
              new AnnotationConfigApplicationContext(Config.class).close();
          }
      }
    answer: "traité : hello"
    explanation: "Pour créer Shout, le conteneur doit créer helper d'abord, pendant l'enregistrement des post-processors : Shout n'existe pas encore, il ne peut pas voir passer helper. Spring le signale dans ses logs (« not eligible for getting processed by all BeanPostProcessors »). Un bean dont dépend un post-processor échappe aux post-processors, y compris à l'AOP et à @Transactional."
    concept: spring-static-bean-method
  - id: c3
    type: single
    prompt: "Après ton lab, `orderService` est remplacé par un proxy JDK qui implémente `Orders`. Que donne `ctx.getBean(OrderService.class)` ?"
    choices:
      - "Le proxy, puisqu'il enveloppe un OrderService"
      - "Le vrai OrderService, sans passer par le proxy"
      - "NoSuchBeanDefinitionException : le bean enregistré est un proxy qui n'est pas un OrderService"
      - "Un nouvel OrderService créé pour l'occasion"
    answer: 2
    explanation: "Un proxy JDK implémente les interfaces, il n'hérite pas de la classe. Pour le conteneur, le bean orderService est désormais de type Orders : aucun bean n'est un OrderService. Injecter par la classe concrète échouerait de la même façon au démarrage. D'où la règle : dépendre des interfaces, ou utiliser un proxy CGLIB."
    concept: spring-jdk-proxy-limits
---

## Pourquoi c'est important

Ajoute `@Transactional` sur une méthode, et elle s'exécute dans une transaction. `@Async`, et elle part sur un autre thread. `@Cacheable`, et son résultat est mis en cache. Aucune de ces annotations ne contient de code : **quelqu'un** lit l'annotation et change le comportement du bean. Ce quelqu'un, c'est un point d'extension du conteneur.

Il y en a deux, qui correspondent aux deux temps de `refresh()` (leçon 1) :

- au temps des **recettes**, le `BeanFactoryPostProcessor` modifie les définitions ;
- au temps des **objets**, le `BeanPostProcessor` voit passer chaque bean et peut le **remplacer**.

Les connaître, c'est pouvoir expliquer pourquoi `@Transactional` ne marche pas sur un appel interne, pourquoi un bean « n'est pas éligible à l'auto-proxy », et écrire ses propres extensions au lieu de copier du code dans cinquante classes.

## Temps 1 : le BeanFactoryPostProcessor modifie les recettes

```java
public interface BeanFactoryPostProcessor {
    void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory);
}
```

Il est appelé **une fois**, après le chargement de toutes les définitions et **avant la création de tout bean applicatif**. Il peut lire n'importe quelle définition et la modifier : sa portée, ses valeurs, son caractère lazy.

::checkpoint{id="c1"}

Sa variante `BeanDefinitionRegistryPostProcessor` reçoit en plus le **registre** : elle peut **ajouter** ou **retirer** des définitions. Tu l'utiliseras dans l'assignment pour couper une fonctionnalité sans jamais instancier ses beans.

Deux exemples que tu utilises sans le savoir :

- `ConfigurationClassPostProcessor` (leçon 1) : un `BeanDefinitionRegistryPostProcessor` prioritaire qui transforme `@Configuration`, `@Bean`, `@ComponentScan` et `@Import` en définitions ;
- `PropertySourcesPlaceholderConfigurer` : il remplace les `${tixa.fee}` des définitions par leur valeur. Spring Boot l'enregistre pour toi.

> **Attention :** un `BeanFactoryPostProcessor` ne doit **jamais** appeler `getBean` : il forcerait la création d'un bean au temps 1, avant que les `BeanPostProcessor` soient en place. Ce bean échapperait à `@Autowired`, `@PostConstruct` et à tous les proxies. Il travaille sur des **recettes**, pas sur des objets.

## Temps 2 : le BeanPostProcessor enveloppe les objets

```java
public interface BeanPostProcessor {
    default Object postProcessBeforeInitialization(Object bean, String beanName) { return bean; }
    default Object postProcessAfterInitialization(Object bean, String beanName) { return bean; }
}
```

Pour **chaque** bean créé, le conteneur appelle tous les `BeanPostProcessor` deux fois, autour des callbacks d'initialisation (leçon 3) : « avant », puis `@PostConstruct` et les autres, puis « après ». Et surtout : **ce que la méthode renvoie remplace le bean**. Renvoie un autre objet, et c'est lui que recevront `getBean` et toutes les injections.

C'est le mécanisme derrière une bonne partie de Spring :

| Fonctionnalité | `BeanPostProcessor` | Ce qu'il fait |
|---|---|---|
| `@Autowired` sur champs et setters | `AutowiredAnnotationBeanPostProcessor` | injecte avant l'initialisation |
| `@PostConstruct`, `@PreDestroy` | `CommonAnnotationBeanPostProcessor` | appelle les méthodes annotées |
| AOP, `@Transactional`, `@Async`, `@Cacheable` | les *auto-proxy creators* (`AbstractAutoProxyCreator`) | renvoient un **proxy** après l'initialisation |

::visual{id="spring-ch01-bpp-proxy"}

Pourquoi **après** l'initialisation ? Parce que le vrai objet doit être prêt (injecté, `@PostConstruct` exécuté) avant qu'on l'enveloppe. Le proxy reçoit les appels, ajoute son comportement (ouvrir une transaction, journaliser), puis délègue au vrai bean.

### Un proxy à la main

Dans le lab, tu fais exactement ce que fait Spring pour `@Transactional`, avec un proxy JDK :

:::steps
```java
public Object postProcessAfterInitialization(Object bean, String beanName) {
    Class<?> type = bean.getClass();
    if (!type.isAnnotationPresent(Audited.class)) return bean;
    return Proxy.newProxyInstance(type.getClassLoader(), type.getInterfaces(),
            (proxy, method, args) -> {
                audit.record(type.getSimpleName() + "." + method.getName());
                try {
                    return method.invoke(bean, args);
                } catch (InvocationTargetException e) {
                    throw e.getCause();
                }
            });
}
```
--- 3: Les beans non concernés sont rendus **tels quels** : un post-processor voit passer tous les beans de l'application.
--- 4: Le proxy implémente les **interfaces** du bean, pas sa classe.
--- 6: Le comportement ajouté, avant de déléguer.
--- 8: L'appel au vrai bean, par réflexion.
--- 9-11: La réflexion enveloppe toute exception du bean dans une `InvocationTargetException` : on rend à l'appelant l'exception d'origine.
:::

### Les limites d'un proxy JDK

Un proxy JDK **implémente des interfaces**, il n'**hérite** pas de la classe du bean. Pour le conteneur, le bean change donc de type :

::checkpoint{id="c3"}

C'est pour ça que Spring choisit entre deux techniques : un **proxy JDK** quand le bean a des interfaces et qu'on ne demande que celles-ci, un **proxy CGLIB** (une sous-classe générée à l'exécution) sinon. Spring Boot utilise CGLIB par défaut pour l'AOP (`spring.aop.proxy-target-class=true`), justement pour que l'injection par classe concrète continue de marcher. CGLIB a ses propres limites : une classe ou une méthode `final` ne peut pas être redéfinie. Tout cela est le sujet du module 2.

> **Sous le capot :** le proxy n'intercepte que les appels qui **passent par lui**. Quand une méthode du vrai bean en appelle une autre (`this.place()`), l'appel va directement à l'objet, sans traverser le proxy : pas d'audit, et pas de transaction si c'était `@Transactional`. C'est le piège de l'auto-invocation, la question Spring la plus posée en entretien. Tu sais maintenant pourquoi : le proxy enveloppe l'objet, il ne le modifie pas.

## L'ordre et le moment d'enregistrement

Les post-processors sont eux-mêmes des beans, mais **créés à part**, avant tous les autres : un `BeanPostProcessor` doit exister avant les beans qu'il doit traiter. Deux conséquences.

**Leurs dépendances sont créées trop tôt.** Tout ce dont un post-processor dépend est créé pendant son enregistrement, donc **sans passer par les post-processors** qui ne sont pas encore prêts :

::checkpoint{id="c2"}

D'où l'idiome du lab : le post-processor reçoit un `ObjectProvider<AuditLog>` et ne demande le journal qu'au premier appel audité.

**Leur méthode `@Bean` doit être `static`.** Une méthode `@Bean` d'instance a besoin de sa classe `@Configuration` pour être appelée : Spring devrait créer `TixaConfig` (et tout ce qu'elle injecte) au moment d'enregistrer le post-processor. Une méthode `static` s'appelle sans instance. Spring l'écrit dans ses logs quand il voit une méthode `@Bean` non statique qui renvoie un `BeanFactoryPostProcessor`.

**L'ordre entre post-processors** : d'abord ceux qui implémentent `PriorityOrdered`, puis `Ordered`, puis les autres. Pour les `BeanFactoryPostProcessor`, `ConfigurationClassPostProcessor` est `PriorityOrdered` : les tiens passent après lui, sur des définitions déjà complètes. Pour les `BeanPostProcessor`, il y a une subtilité : à la fin de l'enregistrement, Spring **déplace en queue de chaîne** ses post-processors « internes » (ceux qui préparent aussi les définitions, comme `AutowiredAnnotationBeanPostProcessor` et `CommonAnnotationBeanPostProcessor`). Résultat : la méthode « avant » de ton post-processor s'exécute **avant** les `@PostConstruct`.

> **Sous le capot :** c'est la fin de `PostProcessorRegistrationDelegate.registerBeanPostProcessors` : le commentaire *Finally, re-register all internal BeanPostProcessors* précède la ligne qui les réenregistre, donc les replace en dernier.

## Pièges fréquents

- **Appeler `getBean` dans un `BeanFactoryPostProcessor`** : le bean est créé trop tôt et échappe à tous les post-processors.
- **Injecter des beans applicatifs dans un `BeanPostProcessor`** : ils sont créés trop tôt, sans AOP ni `@Transactional`. Passe par `ObjectProvider`.
- **Une méthode `@Bean` non statique pour un post-processor** : la classe de configuration est créée en avance.
- **Envelopper dans `postProcessBeforeInitialization`** : le proxy existe avant que l'objet soit initialisé.
- **Injecter un bean proxifié par sa classe concrète** avec un proxy JDK : il n'est plus de ce type.

## À retenir

- Deux points d'extension, deux temps : `BeanFactoryPostProcessor` sur les **recettes** (avant toute création), `BeanPostProcessor` sur les **objets** (chaque bean, avant et après son initialisation).
- Ce que renvoie un `BeanPostProcessor` **remplace** le bean : c'est ainsi que naissent les proxies de `@Transactional`, `@Async` et de l'AOP.
- Un proxy n'intercepte que les appels qui passent par lui ; un proxy JDK n'a que les interfaces du bean.
- Les post-processors sont créés à part : méthode `@Bean` **static**, et dépendances via `ObjectProvider`.

> **Source :** Spring Framework 7.0, [Container Extension Points](https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html) ; code de [`PostProcessorRegistrationDelegate`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/context/support/PostProcessorRegistrationDelegate.java) et de [`ConfigurationClassEnhancer`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/context/annotation/ConfigurationClassEnhancer.java) (v7.0.11) ; Spring Boot 4.1, propriété `spring.aop.proxy-target-class`.
