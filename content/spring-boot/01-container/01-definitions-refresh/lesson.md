---
id: spring-ch01-l01
title: "Des recettes avant les objets : BeanDefinition et refresh()"
source: { book: spring-docs, chapter: 2, pages: "#beans-factory-metadata", url: "https://docs.spring.io/spring-framework/reference/core/beans/basics.html" }
duration_min: 30
concepts:
  - id: spring-bean-definition
    label: "Une BeanDefinition est la recette d'un bean (classe ou méthode @Bean, portée, dépendances) : le conteneur lit toutes les recettes avant de créer le moindre objet"
  - id: spring-refresh
    label: "refresh() : charger les définitions, les post-traiter, enregistrer les BeanPostProcessors, puis créer tous les singletons non lazy"
  - id: spring-fail-fast
    label: "Les singletons sont créés au démarrage : une dépendance manquante ou ambiguë fait échouer le démarrage, pas la première requête"
  - id: spring-bean-naming
    label: "Nom par défaut d'un bean : le nom de la méthode @Bean, ou le nom simple de la classe en camelCase pour un composant"
glossary:
  - term: "bean"
    definition: "Un objet créé, assemblé et géré par le conteneur Spring. Rien de plus : n'importe quelle classe Java peut en être un."
  - term: "conteneur (ApplicationContext)"
    definition: "L'objet qui lit les recettes des beans, les crée dans le bon ordre, leur passe leurs dépendances et les détruit à l'arrêt."
  - term: "BeanDefinition"
    definition: "La recette d'un bean : sa classe ou la méthode qui le fabrique, sa portée, ses dépendances, s'il est lazy… Le conteneur manipule des définitions bien avant de créer des objets."
  - term: "refresh()"
    definition: "La méthode d'AbstractApplicationContext qui démarre le conteneur, de la lecture des définitions jusqu'à la création des singletons."
  - term: "@Lazy"
    definition: "Demande au conteneur de ne créer un singleton qu'à sa première utilisation, au lieu du démarrage."
visuals: [spring-ch01-refresh-phases]
labs: [spring-ch01-l01-lab-warmup-wiring]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "La méthode `service` est déclarée avant `catalog`. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;

      public class Main {
          static class Catalog { Catalog() { System.out.println("catalogue créé"); } }
          static class Service { Service(Catalog c) { System.out.println("service créé"); } }

          @Configuration
          static class Config {
              @Bean Service service(Catalog catalog) { return new Service(catalog); }
              @Bean Catalog catalog() { return new Catalog(); }
          }

          public static void main(String[] args) {
              var ctx = new AnnotationConfigApplicationContext(Config.class);
              System.out.println("prêt");
              ctx.getBean(Service.class);
              ctx.close();
          }
      }
    answer: "catalogue créé\nservice créé\nprêt"
    explanation: "Tout est créé pendant le démarrage, avant « prêt » : getBean ne fait que rendre un objet qui existe déjà. Et l'ordre ne suit pas la déclaration : pour créer service, le conteneur doit d'abord résoudre sa dépendance, donc créer catalog."
    concept: spring-refresh
  - id: c2
    type: single
    prompt: "`ReservationService` demande un `PaymentGateway` dans son constructeur, mais personne n'en déclare. Quand l'erreur apparaît-elle ?"
    choices:
      - "À la compilation"
      - "Au démarrage, dans `new AnnotationConfigApplicationContext(...)`"
      - "Au premier `getBean(ReservationService.class)`"
      - "Au premier appel d'une méthode de `ReservationService`"
    answer: 1
    explanation: "Le compilateur ne voit que des types Java, pas le contenu du conteneur. Mais le conteneur crée tous les singletons pendant refresh() : il échoue dès le démarrage, avec le nom du bean et du paramètre en cause. C'est voulu : mieux vaut un déploiement qui refuse de démarrer qu'une erreur à la première commande d'un client."
    concept: spring-fail-fast
  - id: c3
    type: code-output
    prompt: "Même programme, mais le rapport est `@Lazy`. Qu'affiche-t-il ?"
    code: |
      import org.springframework.context.annotation.*;

      public class Main {
          static class Report { Report() { System.out.println("rapport créé"); } }

          @Configuration
          static class Config {
              @Bean @Lazy Report report() { return new Report(); }
          }

          public static void main(String[] args) {
              var ctx = new AnnotationConfigApplicationContext(Config.class);
              System.out.println("prêt");
              ctx.getBean(Report.class);
              System.out.println("fin");
              ctx.close();
          }
      }
    answer: "prêt\nrapport créé\nfin"
    explanation: "@Lazy retire ce singleton de la création au démarrage : il est créé au premier getBean. On gagne du temps de démarrage, mais on perd la garantie : une erreur dans sa création n'apparaît qu'au premier usage, parfois en pleine production."
    concept: spring-fail-fast
---

## Pourquoi c'est important

Vendredi, 18 h, déploiement de Tixa. L'application démarre, les contrôles de santé sont verts. À 20 h, premier client qui paie par PayPal : `NoSuchBeanDefinitionException`. Le bean de paiement avait été marqué `@Lazy` « pour démarrer plus vite », et sa configuration était fausse depuis le début.

Spring est construit autour d'une idée simple : **découvrir les erreurs de câblage au démarrage**, avant le premier client. Pour cela, le conteneur ne crée pas les objets au fil de l'eau. Il lit d'abord **toutes les recettes**, les vérifie, les transforme, puis crée tous les singletons d'un coup. Comprendre ces deux temps (les recettes, puis les objets), c'est comprendre presque tout le reste du module : l'injection, les portées, les post-processors et même les proxies de `@Transactional`.

## Un bean, c'est une recette et un objet

Dans le module 1 de *Java efficace*, tu as appris à **injecter** les dépendances par le constructeur au lieu de les créer en dur. Assembler une application à la main ressemble à ceci :

```java
var catalog = new EventCatalog();
var prices = new PriceCalculator(150);
var service = new ReservationService(catalog, prices);
```

Spring fait la même chose, mais à partir d'une **description**. On lui donne des recettes, il en déduit l'ordre de création :

```java title="TixaConfig.java"
@Configuration
public class TixaConfig {
    @Bean EventCatalog eventCatalog() { return new EventCatalog(); }
    @Bean PriceCalculator priceCalculator() { return new PriceCalculator(150); }

    @Bean
    ReservationService reservationService(EventCatalog catalog, PriceCalculator prices) {
        return new ReservationService(catalog, prices);
    }
}
```

Chaque méthode `@Bean` devient une **`BeanDefinition`** : un objet qui décrit *comment* fabriquer le bean (quelle méthode appeler, avec quels paramètres), sa **portée** (une instance partagée ou une par demande), s'il est **lazy**, ses méthodes d'initialisation… Une définition n'est pas le bean : c'est sa fiche.

Deux autres façons de produire des définitions, que tu verras partout :

- `@Component` (et ses variantes `@Service`, `@Repository`, `@Controller`) sur une classe, trouvée par `@ComponentScan` : la recette est « appelle son constructeur » ;
- l'enregistrement par programme : `registerBean(...)`, ou le `BeanRegistrar` de Spring 7 (leçon 5).

**Le nom d'un bean**, par défaut : le nom de la méthode `@Bean` (`eventCatalog`), ou, pour un composant scanné, le nom simple de la classe avec une minuscule (`ReservationService` → `reservationService`). Ce nom compte : c'est la clé du bean dans le conteneur, et tu t'en serviras pour départager deux candidats (leçon 2).

:::reveal Avant de lire la suite : pourquoi séparer la recette de l'objet ? Qu'est-ce que ça permet ?
Ça permet de **raisonner sur toute l'application avant de créer quoi que ce soit** : vérifier qu'il ne manque aucune dépendance, calculer l'ordre de création, modifier une recette (remplacer `${tixa.fee}` par sa valeur, changer une portée), voire en retirer une. Une fois les objets créés, c'est trop tard : on ne peut plus que les envelopper.
:::

## Les deux temps du démarrage

`new AnnotationConfigApplicationContext(TixaConfig.class)` déclenche `refresh()`. Ses étapes, dans l'ordre, se regroupent en deux temps.

**Temps 1 : les recettes.**

1. Le conteneur enregistre les classes qu'on lui a données (ici `TixaConfig`) et quelques beans d'infrastructure, dont **`ConfigurationClassPostProcessor`**.
2. Il exécute les **`BeanFactoryPostProcessor`** : des objets qui modifient les définitions. Le premier est `ConfigurationClassPostProcessor` lui-même : c'est lui qui lit `@Configuration`, `@Bean`, `@ComponentScan` et `@Import`, et qui transforme chaque méthode `@Bean` en définition. Spring utilise donc ses propres points d'extension pour fonctionner.
3. Il enregistre les **`BeanPostProcessor`**, qui interviendront sur chaque bean créé (c'est ainsi que marchent `@Autowired`, `@PostConstruct` et les proxies, leçon 4).

**Temps 2 : les objets.**

4. Il crée **tous les singletons non lazy**. Pour chacun : résoudre ses dépendances (en les créant d'abord si besoin), l'instancier, l'initialiser. C'est ici qu'une dépendance manquante fait tout échouer.
5. Il publie `ContextRefreshedEvent` : l'application est prête.

::visual{id="spring-ch01-refresh-phases"}

::checkpoint{id="c1"}

> **Sous le capot :** ouvre `AbstractApplicationContext.refresh()` dans le code de Spring Framework 7. La méthode tient en une vingtaine d'appels, chacun commenté. Les étapes ci-dessus correspondent à `invokeBeanFactoryPostProcessors(beanFactory)`, `registerBeanPostProcessors(beanFactory)` puis `finishBeanFactoryInitialization(beanFactory)`, dont le commentaire dit simplement : *Instantiate all remaining (non-lazy-init) singletons.* Et si une étape lève une exception, le bloc `catch` détruit les beans déjà créés (`destroyBeans()`) avant de la propager : un démarrage raté ne laisse pas de connexions ouvertes.

:::steps
```java
public void refresh() throws BeansException, IllegalStateException {
    prepareRefresh();
    ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
    prepareBeanFactory(beanFactory);
    try {
        postProcessBeanFactory(beanFactory);
        invokeBeanFactoryPostProcessors(beanFactory);
        registerBeanPostProcessors(beanFactory);
        initMessageSource();
        initApplicationEventMulticaster();
        onRefresh();
        registerListeners();
        finishBeanFactoryInitialization(beanFactory);
        finishRefresh();
    } catch (RuntimeException | Error ex) {
        destroyBeans();
        cancelRefresh(ex);
        throw ex;
    }
}
```
--- 2-4: Préparation : la fabrique de beans (`DefaultListableBeanFactory`) et ses beans d'infrastructure.
--- 7: Temps 1 : les `BeanFactoryPostProcessor` lisent et modifient les **définitions**. Aucun bean applicatif n'existe encore.
--- 8: Les `BeanPostProcessor` sont créés et rangés : ils verront passer chaque bean.
--- 11: `onRefresh()` : une sous-classe peut ajouter une étape. Le contexte web de Spring Boot y crée le serveur web embarqué (module 3).
--- 13: Temps 2 : création de tous les singletons non lazy.
--- 16-18: En cas d'échec, tout ce qui a été créé est détruit, puis l'exception remonte.
:::

(Version simplifiée : le vrai code ajoute un verrou de démarrage et des mesures de temps de chaque étape.)

## Échouer tôt, et le prix de @Lazy

Puisque tous les singletons sont créés au démarrage, toute erreur de câblage apparaît **à ce moment-là**, avec un message précis : le bean en cause, le paramètre, la raison.

::checkpoint{id="c2"}

`@Lazy` retire un singleton de cette création collective : il ne sera créé qu'à la première demande. C'est utile pour un bean coûteux et rarement utilisé, mais c'est un **pari** : tu repousses la détection de ses erreurs jusqu'à son premier usage.

::checkpoint{id="c3"}

> **En production :** Spring Boot propose `spring.main.lazy-initialization=true`, qui rend **tous** les beans lazy pour démarrer plus vite. La documentation de Boot prévient elle-même : un bean mal configuré n'échoue plus au démarrage mais à sa première création, et la JVM doit avoir assez de mémoire pour des beans créés plus tard. C'est pour ces raisons que l'option est désactivée par défaut.

## Et getBean ?

`ctx.getBean(ReservationService.class)` existe, et les tests s'en servent. Dans le code applicatif, presque jamais : un objet qui va chercher ses dépendances dans le conteneur retombe dans le défaut qu'on voulait éviter (des dépendances cachées, impossibles à remplacer en test). On déclare les dépendances, et le conteneur les fournit.

## Pièges fréquents

- **Croire que l'ordre des méthodes `@Bean` compte** : le conteneur calcule l'ordre à partir des dépendances, pas de la déclaration.
- **Mettre `@Lazy` pour « accélérer le démarrage »** sans mesurer : tu perds la détection précoce des erreurs.
- **Appeler `getBean` dans le code métier** : dépendance cachée, et le bean n'est plus testable sans conteneur.
- **Penser qu'un bean doit connaître Spring** : `EventCatalog` n'importe rien de Spring, et c'est très bien.

## À retenir

- Un bean = une **définition** (la recette) + un **objet** créé à partir d'elle.
- `refresh()` fait les choses en deux temps : **recettes** (lues, post-traitées) puis **objets** (tous les singletons non lazy, au démarrage).
- Spring utilise ses propres points d'extension : `@Configuration` et `@Bean` sont lus par un `BeanFactoryPostProcessor`.
- Une dépendance manquante fait échouer le **démarrage**. `@Lazy` repousse cette garantie.

> **Source :** Spring Framework 7.0, [Container Overview](https://docs.spring.io/spring-framework/reference/core/beans/basics.html) et [Bean Overview](https://docs.spring.io/spring-framework/reference/core/beans/definition.html) ; code de [`AbstractApplicationContext.refresh()`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-context/src/main/java/org/springframework/context/support/AbstractApplicationContext.java) (v7.0.11) ; Spring Boot 4.1, [Lazy Initialization](https://docs.spring.io/spring-boot/4.1/reference/features/spring-application.html#features.spring-application.lazy-initialization).
