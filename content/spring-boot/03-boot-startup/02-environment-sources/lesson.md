---
id: spring-ch03-l02
title: "L'Environment : qui gagne quand une propriété est définie deux fois ?"
source: { book: spring-docs, chapter: 26, pages: "#features.external-config.order", url: "https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html" }
duration_min: 35
concepts:
  - id: spring-ch03-property-source-order
    label: "L'Environment est une pile ordonnée de sources ; la première qui définit une propriété gagne : ligne de commande, propriétés système, variables d'environnement, fichiers de configuration, @PropertySource, valeurs par défaut"
  - id: spring-ch03-config-file-order
    label: "Parmi les fichiers : un fichier à côté de l'application (./config/, ./) l'emporte sur ceux du classpath, et un fichier de profil l'emporte sur le fichier de base au même endroit"
  - id: spring-ch03-config-import
    label: "spring.config.import ajoute un fichier qui l'emporte sur celui qui l'importe ; une @PropertySource, elle, passe après tous les fichiers application.*"
glossary:
  - term: "Environment"
    definition: "L'objet de Spring qui répond à « que vaut cette propriété ? » et « quels profils sont actifs ? », en interrogeant ses sources dans l'ordre."
  - term: "PropertySource"
    definition: "Une source de propriétés nommée : les arguments de ligne de commande, les variables d'environnement, un fichier application.yml…"
  - term: "config data"
    definition: "Le nom que Spring Boot donne aux fichiers de configuration (application.properties, application.yml, imports) qu'il charge lui-même."
visuals: [spring-ch03-source-stack]
labs: [spring-ch03-l02-lab-debug-ignored-tariff]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "La même propriété dans quatre sources. Qu'affiche le programme ?"
    code: |
      import java.util.Map;
      import org.springframework.boot.*;
      import org.springframework.context.annotation.Configuration;

      public class Main {
          @Configuration static class App { }

          public static void main(String[] args) {
              var app = new SpringApplication(App.class);
              app.setBannerMode(Banner.Mode.OFF);
              app.setWebApplicationType(WebApplicationType.NONE);
              app.setDefaultProperties(Map.of("who", "défauts", "fee", "100"));
              System.setProperty("who", "propriété système");
              System.setProperty("fee", "120");
              try (var ctx = app.run("--who=ligne de commande")) {
                  var env = ctx.getEnvironment();
                  System.out.println(env.getProperty("who") + " / " + env.getProperty("fee"));
              }
          }
      }
    answer: "ligne de commande / 120"
    explanation: "La ligne de commande est au-dessus des propriétés système, elles-mêmes au-dessus des valeurs par défaut de la SpringApplication, qui sont tout en bas. Pour fee, la ligne de commande ne dit rien : la première source qui la définit, les propriétés système, gagne."
    concept: spring-ch03-property-source-order
  - id: c2
    type: single
    prompt: "`application.yml` (dans le jar) fixe `tixa.fee-cents: 200` dans un document du profil `prod`. Sur le serveur, un vieux `./config/application.properties` contient `tixa.fee-cents=999`. Avec le profil `prod`, que vaut la propriété ?"
    choices:
      - "200 : un document de profil l'emporte toujours"
      - "999 : un fichier à côté de l'application l'emporte sur toute la configuration embarquée, profils compris"
      - "Le démarrage échoue : la propriété est définie deux fois"
      - "La première lue au démarrage"
    answer: 1
    explanation: "La documentation donne l'ordre des fichiers : propriétés embarquées, puis profils embarqués, puis propriétés externes, puis profils externes. Un fichier externe non lié à un profil passe donc au-dessus d'un profil embarqué. C'est voulu (l'exploitation doit pouvoir tout surcharger), et c'est un piège classique."
    concept: spring-ch03-config-file-order
---

## Pourquoi c'est important

La finance change le tarif dans un fichier, le support jure que l'application facture autre chose, et personne n'a tort : la propriété est définie à **plusieurs** endroits, et l'un d'eux gagne. Savoir lequel, sans tâtonner, c'est l'une des compétences qui distinguent quelqu'un qui « fait marcher » Spring Boot de quelqu'un qui le maîtrise. Le lab de débogage de cette leçon en est un cas réel.

## Une pile de sources

L'`Environment` ne contient pas une `Map` de propriétés : il contient une **liste ordonnée de sources** (`PropertySource`). Pour répondre à `getProperty("tixa.fee-cents")`, il interroge les sources **dans l'ordre**, et la première qui connaît la propriété gagne.

Voici l'ordre de Spring Boot, du plus fort au plus faible (la documentation le donne dans l'autre sens, du plus faible au plus fort) :

1. propriétés des tests (`@TestPropertySource`, `@DynamicPropertySource`, `properties` de `@SpringBootTest`) ;
2. **arguments de ligne de commande** (`--tixa.fee-cents=50`) ;
3. `SPRING_APPLICATION_JSON` ;
4. **propriétés système Java** (`-Dtixa.fee-cents=50`) ;
5. **variables d'environnement** (`TIXA_FEECENTS=50`) ;
6. `random.*` ;
7. **les fichiers de configuration** (config data : `application.properties`, `application.yml`, profils, imports) ;
8. les **`@PropertySource`** de tes classes `@Configuration` ;
9. les valeurs par défaut (`SpringApplication.setDefaultProperties`).

::visual{id="spring-ch03-source-stack"}

::checkpoint{id="c1"}

La logique : ce qui est **le plus proche du lancement** (une option en ligne de commande, une variable du serveur) l'emporte sur ce qui est **embarqué** dans l'application. L'exploitation peut toujours dépanner sans recompiler.

> **Astuce :** pour savoir d'où vient une valeur, parcours `environment.getPropertySources()` et demande la propriété à chacune. Avec Actuator (module 13), l'endpoint `/actuator/env/tixa.fee-cents` affiche exactement cela, source par source.

## L'ordre parmi les fichiers

Les fichiers de configuration forment eux-mêmes plusieurs sources. La documentation donne leur ordre, du plus faible au plus fort :

1. `application.*` **embarqué** (dans le jar, le classpath) ;
2. `application-{profil}.*` **embarqué** (et les documents de profil d'un même fichier) ;
3. `application.*` **externe** (à côté de l'application : `./config/`, puis `./`) ;
4. `application-{profil}.*` **externe**.

Conséquence peu intuitive : un `./config/application.properties` oublié sur un serveur l'emporte sur un document de profil embarqué.

::checkpoint{id="c2"}

> **En production :** les emplacements par défaut sont `classpath:/`, `classpath:/config/`, `file:./`, `file:./config/` et `file:./config/*/`. Une image Docker qui copie un dossier `config/` dans son répertoire de travail change donc la configuration sans que personne ne relise l'application. Préfère des variables d'environnement ou des secrets montés (leçon 5), visibles dans la description du déploiement.

## Ajouter un fichier : import ou @PropertySource

Deux façons d'ajouter un fichier, qui n'ont **pas** la même priorité :

:::compare
--- bad: @PropertySource
```java
@Configuration
@PropertySource("classpath:fees.properties")
class PricingConfig { }
```
Ajouté au moment du `refresh()`, **après** tous les fichiers `application.*` : la moindre valeur de `application.yml` le masque. Et trop tard pour `logging.*` ou `spring.main.*`, lus avant (la documentation le précise).
--- good: spring.config.import
```yaml
spring:
  config:
    import: classpath:fees.properties
```
Chargé avec les fichiers de configuration : le fichier importé l'emporte sur le document qui l'importe, et un document de profil l'emporte encore sur l'import. Avec `optional:`, son absence n'est pas une erreur.
:::

`@PropertySource` reste utile pour une bibliothèque qui apporte ses propres valeurs par défaut, justement **parce qu'**elle est faible.

## Noms souples

Une même propriété s'écrit de plusieurs façons selon la source : `tixa.fee-cents` (forme canonique, en kebab-case), `tixa.feeCents`, ou `TIXA_FEECENTS` dans une variable d'environnement (points remplacés par des `_`, tirets supprimés, en majuscules). C'est la *liaison souple* (*relaxed binding*), détaillée dans la leçon suivante.

## Pièges fréquents

- **Un fichier `./config/application.properties` oublié** : il l'emporte sur toute la configuration embarquée.
- **Une `@PropertySource` pour une valeur qu'on veut voir gagner** : elle perd contre `application.yml`.
- **Chercher une valeur dans le seul fichier qu'on connaît** au lieu de parcourir les sources.
- **Une variable d'environnement mal nommée** (`TIXA_FEE_CENTS` au lieu de `TIXA_FEECENTS` pour `tixa.fee-cents`) : elle ne correspond à rien, et la valeur du fichier reste en place.

## À retenir

- L'`Environment` est une **pile** : la première source qui définit une propriété gagne.
- Ligne de commande > propriétés système > variables d'environnement > fichiers > `@PropertySource` > défauts.
- Parmi les fichiers : externe > embarqué, et profil > base au même endroit.
- `spring.config.import` donne la priorité au fichier importé ; `@PropertySource` passe après tous les fichiers.

> **Source :** Spring Boot 4.1, [Externalized Configuration](https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html) (ordre des sources, emplacements, `spring.config.import`, liaison souple).
