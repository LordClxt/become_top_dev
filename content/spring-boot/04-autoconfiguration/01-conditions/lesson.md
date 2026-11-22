---
id: spring-ch04-l01
title: "@Conditional : des recettes qui décident d'exister"
source: { book: spring-docs, chapter: 29, pages: "#features.developing-auto-configuration.condition-annotations", url: "https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations" }
duration_min: 30
concepts:
  - id: spring-ch04-conditional
    label: "@Conditional(X.class) : la définition (classe de configuration ou méthode @Bean) n'est enregistrée que si la Condition X répond vrai, au temps des recettes"
  - id: spring-ch04-boot-conditions
    label: "Les conditions de Spring Boot : OnClass/OnMissingClass (classpath), OnBean/OnMissingBean (beans déjà enregistrés), OnProperty/OnBooleanProperty, OnWebApplication, OnResource"
  - id: spring-ch04-context-runner
    label: "ApplicationContextRunner teste une autoconfiguration en quelques millisecondes : propriétés, configuration de l'application, classpath filtré"
glossary:
  - term: "Condition"
    definition: "Interface de Spring : une méthode matches(context, metadata) qui dit si une définition doit être enregistrée."
  - term: "@ConditionalOnClass"
    definition: "Condition de Spring Boot : vraie si une classe est sur le classpath. Lue dans les métadonnées, sans charger la classe annotée."
  - term: "ApplicationContextRunner"
    definition: "Outil de test de Spring Boot qui crée un petit contexte avec la configuration, les propriétés et le classpath voulus, puis vérifie son contenu."
  - term: "FilteredClassLoader"
    definition: "Un class loader de test qui cache des classes ou des paquets, pour simuler l'absence d'une bibliothèque."
visuals: [spring-ch04-condition-phases]
labs: [spring-ch04-l01-lab-warmup-conditions]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Une autoconfiguration testée avec `ApplicationContextRunner`. Qu'affiche le programme ?"
    code: |
      import org.springframework.boot.autoconfigure.AutoConfigurations;
      import org.springframework.boot.autoconfigure.condition.*;
      import org.springframework.boot.test.context.FilteredClassLoader;
      import org.springframework.boot.test.context.runner.ApplicationContextRunner;
      import org.springframework.context.annotation.*;

      public class Main {
          public record Client(String who) { }

          @Configuration(proxyBeanMethods = false)
          @ConditionalOnClass(name = "tools.jackson.databind.json.JsonMapper")
          @ConditionalOnBooleanProperty(name = "tixa.client.enabled", matchIfMissing = true)
          public static class ClientAuto {
              @Bean @ConditionalOnMissingBean Client client() { return new Client("auto"); }
          }

          public static void main(String[] args) {
              var runner = new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(ClientAuto.class));
              runner.run(ctx -> System.out.print(ctx.getBeansOfType(Client.class).size() + " "));
              runner.withPropertyValues("tixa.client.enabled=false").run(ctx -> System.out.print(ctx.getBeansOfType(Client.class).size() + " "));
              runner.withClassLoader(new FilteredClassLoader("tools.jackson")).run(ctx -> System.out.println(ctx.getBeansOfType(Client.class).size()));
          }
      }
    answer: "1 0 0"
    explanation: "Par défaut, Jackson 3 est là et la propriété absente vaut vrai (matchIfMissing) : un client. Avec enabled=false, la condition de propriété échoue. Avec un classpath où tools.jackson est caché, la condition de classe échoue. Trois contextes, trois issues, en une fraction de seconde."
    concept: spring-ch04-context-runner
  - id: c2
    type: single
    prompt: "Pourquoi écrit-on `@ConditionalOnClass(name = \"sdk.lydia.LydiaSdk\")` sur une classe imbriquée, plutôt qu'une méthode `@Bean` dont le type de retour est `LydiaSdk` ?"
    choices:
      - "Par convention de style uniquement"
      - "Parce que lire une classe dont une signature mentionne une classe absente peut échouer ; la condition de classe sur une configuration à part est évaluée avant de charger quoi que ce soit"
      - "Parce que @ConditionalOnClass ne fonctionne pas sur les méthodes"
      - "Parce qu'une classe imbriquée est plus rapide"
    answer: 1
    explanation: "Spring lit les conditions de classe dans les métadonnées du fichier .class, sans charger la classe. Mais analyser les méthodes @Bean d'une configuration demande de charger ses signatures : si l'une mentionne LydiaSdk absente, on obtient une erreur de chargement. Une configuration imbriquée, conditionnée en entier, évite de la charger."
    concept: spring-ch04-boot-conditions
---

## Pourquoi c'est important

Ajoute `spring-boot-starter-data-jpa` à un projet, et un `DataSource`, un `EntityManagerFactory` et un gestionnaire de transactions apparaissent. Déclare ton propre `DataSource`, et celui de Spring Boot s'efface. Retire le pilote H2 du classpath, et la base en mémoire disparaît. Aucune de ces décisions n'est magique : chacune est une **condition**, évaluée sur une recette avant qu'elle devienne un bean.

Comprendre les conditions, c'est pouvoir répondre à la question qui revient sans cesse avec Spring Boot : « pourquoi ce bean existe-t-il, et pourquoi celui-là n'existe-t-il pas ? ».

## Une condition, c'est une question posée à une recette

Le module 01 l'a montré : le conteneur lit toutes les recettes avant de créer le moindre objet. `@Conditional` ajoute une question à une recette :

```java
public interface Condition {
    boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata);
}
```

Posée sur une classe `@Configuration` ou une méthode `@Bean`, `@Conditional(MaCondition.class)` fait évaluer `matches` **au moment de lire la recette**. Si elle répond faux, la définition n'est jamais enregistrée : pas de bean, pas de constructeur appelé. `ConditionContext` donne accès à l'`Environment` (les propriétés, les profils), au registre des définitions et au class loader.

Le module 03 en a déjà montré une : `@Profile` est un `@Conditional(ProfileCondition.class)`.

::visual{id="spring-ch04-condition-phases"}

## La boîte à outils de Spring Boot

Spring Boot fournit une famille d'annotations prêtes à l'emploi, toutes bâties sur `@Conditional` :

| Annotation | Vraie si… |
|---|---|
| `@ConditionalOnClass` / `@ConditionalOnMissingClass` | une classe est (ou n'est pas) sur le classpath |
| `@ConditionalOnBean` / `@ConditionalOnMissingBean` | un bean de ce type (ou de ce nom) est déjà enregistré, ou pas |
| `@ConditionalOnProperty` | une propriété existe (et ne vaut pas `false`), ou a la valeur `havingValue` |
| `@ConditionalOnBooleanProperty` | une propriété booléenne vaut vrai (`matchIfMissing` pour le cas absent) |
| `@ConditionalOnWebApplication` | l'application est une application web |
| `@ConditionalOnResource` | une ressource existe (`classpath:schema.sql`) |

::checkpoint{id="c1"}

### Les conditions de classe

`@ConditionalOnClass` est la condition des bibliothèques optionnelles : « si Jackson est là, configure Jackson ». Elle est lue dans les **métadonnées** de la classe annotée, sans charger les classes qu'elle nomme : `@ConditionalOnClass(JsonMapper.class)` est sûr sur une classe, même si `JsonMapper` manque. Mais les **méthodes** d'une configuration, elles, ont des signatures que Spring doit charger pour les analyser.

::checkpoint{id="c2"}

D'où l'idiome de Spring Boot partout dans son code : une configuration **imbriquée** par bibliothèque optionnelle, conditionnée en entier.

> **Sous le capot :** une condition déclare sa **phase**. `ConfigurationCondition.ConfigurationPhase.PARSE_CONFIGURATION` est évaluée quand la classe est lue ; `REGISTER_BEAN` quand ses beans sont enregistrés. Les conditions de beans (`OnBeanCondition`) sont en phase `REGISTER_BEAN` : elles regardent le registre au dernier moment possible. C'est ce qui rend l'ordre si important (leçon 3).

## Tester une autoconfiguration

Démarrer une `SpringApplication` pour chaque combinaison est lent. `ApplicationContextRunner` crée un petit contexte par cas, en quelques millisecondes :

```java
new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(PaymentAutoConfiguration.class))
        .withPropertyValues("tixa.audit.enabled=true")
        .withUserConfiguration(TeamGateway.class)
        .withClassLoader(new FilteredClassLoader("sdk.lydia"))
        .run(ctx -> assertThat(ctx).hasSingleBean(AuditLog.class));
```

`AutoConfigurations.of(...)` traite les classes comme de vraies autoconfigurations (même tri, même phase), `withUserConfiguration` comme la configuration de l'application, et `FilteredClassLoader` simule l'absence d'une bibliothèque. C'est ainsi que Spring Boot teste ses propres autoconfigurations, et ce qu'utilisent tous les labs du module.

## Pièges fréquents

- **Une méthode `@Bean` dont le type de retour est une classe optionnelle**, dans une configuration non conditionnée : erreur de chargement quand la bibliothèque manque.
- **Deux beans du même type sans condition** dans une autoconfiguration : le démarrage échoue dès qu'on en injecte un.
- **`@ConditionalOnProperty("x")` pour un booléen** : elle est vraie pour toute valeur sauf `false`, y compris `non` ou `0`. Pour un booléen, `@ConditionalOnBooleanProperty`.
- **Tester une autoconfiguration avec `@SpringBootTest`** seulement : lent, et une seule combinaison par contexte.

## À retenir

- `@Conditional` pose une question à une recette ; si la réponse est non, le bean n'existe jamais.
- Spring Boot fournit les conditions de classe, de bean, de propriété, de type d'application, de ressource.
- Condition de classe sur une configuration imbriquée pour chaque bibliothèque optionnelle.
- `ApplicationContextRunner` teste chaque combinaison en quelques millisecondes.

> **Source :** Spring Boot 4.1, [Creating Your Own Auto-configuration — Condition Annotations](https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations) et [Testing your Auto-configuration](https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html) ; Spring Framework 7.0, [`@Conditional`](https://docs.spring.io/spring-framework/reference/core/beans/java/composing-configuration-classes.html).
