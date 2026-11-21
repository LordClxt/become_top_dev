---
id: spring-ch01-l05
title: "@Configuration sous le capot, et les beans décidés par programme"
source: { book: spring-docs, chapter: 12, pages: "#page-title", url: "https://docs.spring.io/spring-framework/reference/core/beans/java/basic-concepts.html" }
duration_min: 35
concepts:
  - id: spring-configuration-full
    label: "Une classe @Configuration est sous-classée par CGLIB : appeler une méthode @Bean depuis une autre renvoie le bean du conteneur, pas un nouvel objet"
  - id: spring-configuration-lite
    label: "En mode lite (@Component, proxyBeanMethods = false, méthode static), un appel entre méthodes @Bean est un simple appel Java : un nouvel objet à chaque fois"
  - id: spring-bean-registrar
    label: "BeanRegistrar (Spring 7) : enregistrer des beans par programme pendant la lecture des configurations, selon l'Environment, avec un supplier"
glossary:
  - term: "mode full"
    definition: "Classe @Configuration (proxyBeanMethods = true, la valeur par défaut) : Spring la remplace par une sous-classe CGLIB qui intercepte les appels aux méthodes @Bean."
  - term: "mode lite"
    definition: "Méthodes @Bean dans une classe qui n'est pas proxifiée (@Component, @Configuration(proxyBeanMethods = false)) : ce sont des méthodes de fabrique ordinaires."
  - term: "CGLIB"
    definition: "Bibliothèque (intégrée à Spring) qui génère à l'exécution une sous-classe redéfinissant les méthodes d'une classe. Les classes générées par Spring contiennent $$SpringCGLIB$$ dans leur nom."
  - term: "BeanRegistrar"
    definition: "Interface de Spring 7 : une méthode register(registry, env) qui ajoute des définitions de beans par programme. S'importe avec @Import."
  - term: "Environment"
    definition: "L'objet de Spring qui donne accès aux propriétés (fichiers, variables d'environnement, arguments) et aux profils actifs."
visuals: [spring-ch01-config-cglib]
labs: [spring-ch01-l05-lab-notifier-registrar, spring-ch01-l05-lab-debug-empty-dashboard]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Deux beans appellent `pool()`. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;

      public class Main {
          static class Pool { static int created; Pool() { created++; } }
          record Reservations(Pool pool) { }
          record Reports(Pool pool) { }

          @Configuration
          static class Full {
              @Bean Pool pool() { return new Pool(); }
              @Bean Reservations reservations() { return new Reservations(pool()); }
              @Bean Reports reports() { return new Reports(pool()); }
          }

          @Configuration(proxyBeanMethods = false)
          static class Lite {
              @Bean Pool pool() { return new Pool(); }
              @Bean Reservations reservations() { return new Reservations(pool()); }
              @Bean Reports reports() { return new Reports(pool()); }
          }

          public static void main(String[] args) {
              new AnnotationConfigApplicationContext(Full.class).close();
              System.out.print("full " + Pool.created);
              Pool.created = 0;
              new AnnotationConfigApplicationContext(Lite.class).close();
              System.out.println(", lite " + Pool.created);
          }
      }
    answer: "full 1, lite 3"
    explanation: "En mode full, la sous-classe CGLIB intercepte pool() : le premier appel crée le bean, les suivants renvoient le singleton du conteneur. En mode lite, pool() est une méthode Java ordinaire : le conteneur crée son bean, et chaque appel en fabrique un de plus. Trois pools de connexions au lieu d'un."
    concept: spring-configuration-full
  - id: c2
    type: single
    prompt: "Une classe `@Configuration` (mode full) déclare `@Bean static Pool pool()`, et `reservations()` appelle `pool()`. Combien de `Pool` sont créés ?"
    choices:
      - "Un : la classe est proxifiée par CGLIB"
      - "Deux : celui du conteneur, et celui créé par l'appel dans reservations()"
      - "Aucun : une méthode @Bean ne peut pas être static"
      - "Le démarrage échoue"
    answer: 1
    explanation: "Une sous-classe ne peut pas redéfinir une méthode static : CGLIB ne l'intercepte pas, même en mode full. L'appel direct fabrique un objet de plus. Les méthodes @Bean static sont faites pour les post-processors (leçon 4), pas pour être appelées entre elles."
    concept: spring-configuration-lite
---

## Pourquoi c'est important

Le tableau de bord de Tixa affiche zéro vente depuis une semaine. Les confirmations sont bien dans les logs. Personne n'a touché au tableau de bord ; on a juste « rangé » la configuration, et `@Configuration` est devenu `@Component` au passage, puisque « c'est pareil, les deux déclarent des beans ».

Ce n'est pas pareil. Une classe `@Configuration` n'est **pas** exécutée telle que tu l'as écrite : Spring la remplace par une sous-classe qui change le sens de `pool()`. Savoir quand ce remplacement a lieu, c'est prédire si ton application a un pool de connexions ou trois, un registre de ventes ou deux. C'est l'objet du lab de débogage de cette leçon.

## Ce que Spring fait de ta classe @Configuration

Regarde ce code comme du Java ordinaire : `reservations()` et `reports()` appellent chacune `pool()`, qui fait `new Pool()`. Deux appels, deux pools, plus celui du conteneur.

```java
@Configuration
public class StoreConfig {
    @Bean Pool pool() { return new Pool(); }
    @Bean Reservations reservations() { return new Reservations(pool()); }
    @Bean Reports reports() { return new Reports(pool()); }
}
```

Pourtant, avec `@Configuration`, il n'y a qu'**un** pool. Au temps 1 de `refresh()`, `ConfigurationClassPostProcessor` remplace la classe de la définition `storeConfig` par une **sous-classe générée par CGLIB** (son nom contient `$$SpringCGLIB$$`). Cette sous-classe redéfinit chaque méthode `@Bean` :

- quand **le conteneur** appelle `pool()` pour créer le bean, l'appel passe à ta méthode, qui fait `new Pool()` ;
- quand **ton code** appelle `pool()` (depuis `reservations()`), la sous-classe ne t'appelle pas : elle demande le bean `pool` au conteneur et renvoie le singleton.

::checkpoint{id="c1"}

::visual{id="spring-ch01-config-cglib"}

> **Sous le capot :** c'est `ConfigurationClassEnhancer.BeanMethodInterceptor` qui fait le tri. Si la méthode interceptée est celle que le conteneur est en train d'appeler (`isCurrentlyInvokedFactoryMethod`), il appelle ta méthode (`invokeSuper`) ; sinon, il appelle `resolveBeanReference`, qui fait un `beanFactory.getBean(...)`. C'est aussi là que Spring écrit le message (niveau INFO) sur les méthodes `@Bean` non statiques qui renvoient un `BeanFactoryPostProcessor`.

Ce mécanisme a des conséquences que Spring vérifie au démarrage : une classe `@Configuration` ne peut pas être `final`, et une méthode `@Bean` ne peut être ni `private` ni `final` (une sous-classe ne pourrait pas la redéfinir). Le démarrage échoue avec un message explicite : `@Configuration class 'StoreConfig' may not be final`.

## Le mode lite : quand rien n'est intercepté

Les méthodes `@Bean` fonctionnent aussi dans une classe **non proxifiée**. Spring appelle ça le mode *lite* :

- une classe `@Component` (ou sans annotation, enregistrée directement) qui contient des méthodes `@Bean` ;
- une classe `@Configuration(proxyBeanMethods = false)` ;
- une méthode `@Bean` **`static`**, même dans une `@Configuration` : une méthode statique ne se redéfinit pas.

En mode lite, une méthode `@Bean` est une **méthode de fabrique ordinaire**. Le conteneur l'appelle pour créer le bean ; si ton code l'appelle aussi, c'est un appel Java comme un autre, qui fabrique un nouvel objet.

::checkpoint{id="c2"}

### Pourquoi le mode lite existe

Spring Boot l'utilise **partout** : l'annotation `@AutoConfiguration` de ses centaines de classes d'autoconfiguration est méta-annotée `@Configuration(proxyBeanMethods = false)`. Ne pas générer de sous-classe accélère le démarrage, consomme moins de mémoire et simplifie la compilation native (module 14). Le prix : les dépendances entre beans doivent passer par les **paramètres** des méthodes `@Bean`, jamais par des appels.

:::compare
--- bad: Dépendance par appel de méthode
```java
@Bean Reservations reservations() {
    return new Reservations(pool());   // juste seulement en mode full
}
```
Le code n'est correct que tant que la classe reste proxifiée. Un `@Component` ou un `proxyBeanMethods = false` ajouté plus tard, et l'application a trois pools, sans erreur ni avertissement.
--- good: Dépendance par paramètre
```java
@Bean Reservations reservations(Pool pool) {
    return new Reservations(pool);     // juste dans tous les modes
}
```
Le conteneur résout le paramètre comme n'importe quelle injection (leçon 2). Le code est juste en mode full comme en mode lite, et la dépendance est visible dans la signature.
:::

**La règle à retenir : déclare les dépendances en paramètres des méthodes `@Bean`.** Le mode full devient alors un filet de sécurité, plus une condition de correction.

## Des beans décidés par programme : BeanRegistrar

Les méthodes `@Bean` décrivent un nombre **fixe** de beans. Parfois ce nombre dépend de la configuration : un bean `Notifier` par canal listé dans `tixa.notifiers=email,sms`. Avant Spring 7, il fallait un `ImportBeanDefinitionRegistrar` ou un `BeanDefinitionRegistryPostProcessor` (leçon 4), et construire des `BeanDefinition` à la main. Spring 7 ajoute **`BeanRegistrar`** :

:::steps
```java
public class NotifierRegistrar implements BeanRegistrar {
    @Override
    public void register(BeanRegistry registry, Environment env) {
        for (String channel : env.getProperty("tixa.notifiers", "").split(",")) {
            registry.registerBean(channel + "Notifier", Notifier.class, spec -> spec
                    .supplier(ctx -> create(channel, ctx)));
        }
    }
}

@Configuration
@Import(NotifierRegistrar.class)
class NotifyConfig { }
```
--- 3: Appelé pendant la lecture des classes de configuration, au temps 1 : on reçoit le registre et l'`Environment` (donc les propriétés et les profils).
--- 4: La décision se prend sur la configuration, pas sur des objets : aucun bean n'existe encore.
--- 5-6: On enregistre une **recette** : un nom, un type, et un `supplier` qui sera appelé plus tard, à la création du bean.
--- 6: Le `ctx` du supplier sait fournir d'autres beans (`ctx.bean(SmsQuota.class)`) : les dépendances restent gérées par le conteneur.
--- 12: Un `BeanRegistrar` s'active avec `@Import`, comme une classe de configuration.
:::

Le `spec` permet le reste de ce que tu as vu dans le module : `primary()`, `fallback()`, `prototype()`, `lazyInit()`, `order(…)`. Et puisque `register` s'exécute au démarrage, une configuration invalide (un canal inconnu) peut **faire échouer le démarrage** avec un message clair, au lieu d'un bean manquant découvert plus tard.

> **Spring 7 :** d'après la documentation, les `BeanRegistrar` sont pris en charge par les optimisations AOT (compilation anticipée), sur la JVM comme en image native GraalVM, y compris avec des suppliers (module 14). On peut aussi n'importer un registrar que sous condition, avec `@Conditional` et ses variantes (module 4). En Kotlin, Spring fournit une variante sous forme de DSL (`BeanRegistrarDsl`).

## Pièges fréquents

- **Remplacer `@Configuration` par `@Component`** dans une classe qui appelle ses méthodes `@Bean` entre elles : plusieurs instances, sans erreur.
- **Appeler une méthode `@Bean` `static`** depuis une autre : jamais interceptée, même en mode full.
- **Une `@Configuration` `final`, ou une méthode `@Bean` `private`** : le démarrage échoue, CGLIB ne peut pas les redéfinir.
- **Mettre de la logique dans un `@PostConstruct` pour « charger une fois »** des données qui changent : le lab de débogage en contient un exemple.
- **Appeler `getBean` dans un `BeanRegistrar`** : aucun bean n'existe encore ; passe par le `supplier` et son `ctx`.

## À retenir

- `@Configuration` (mode full) = une sous-classe CGLIB qui transforme les appels entre méthodes `@Bean` en `getBean`.
- `@Component`, `proxyBeanMethods = false` ou `static` = mode lite : des méthodes de fabrique ordinaires. Spring Boot l'utilise pour toutes ses autoconfigurations.
- Dépendances **en paramètres** des méthodes `@Bean` : juste dans tous les modes.
- `BeanRegistrar` (Spring 7) enregistre un nombre de beans décidé par la configuration, avec des suppliers, et peut refuser une configuration invalide au démarrage.

> **Source :** Spring Framework 7.0, [Basic Concepts: @Bean and @Configuration](https://docs.spring.io/spring-framework/reference/core/beans/java/basic-concepts.html), [Using the @Configuration annotation](https://docs.spring.io/spring-framework/reference/core/beans/java/configuration-annotation.html) et [Programmatic Bean Registration](https://docs.spring.io/spring-framework/reference/core/beans/java/programmatic-bean-registration.html) ; code de [`ConfigurationClassEnhancer`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/context/annotation/ConfigurationClassEnhancer.java) et [`BeanRegistrar`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-beans/src/main/java/org/springframework/beans/factory/BeanRegistrar.java) (v7.0.11).
