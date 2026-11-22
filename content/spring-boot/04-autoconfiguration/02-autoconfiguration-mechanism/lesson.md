---
id: spring-ch04-l02
title: "Le mécanisme : de @SpringBootApplication au fichier imports"
source: { book: spring-docs, chapter: 29, pages: "#features.developing-auto-configuration.locating-auto-configuration-candidates", url: "https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.locating-auto-configuration-candidates" }
duration_min: 35
concepts:
  - id: spring-ch04-imports-file
    label: "Une autoconfiguration est déclarée dans META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports, jamais trouvée par le scan"
  - id: spring-ch04-deferred-import
    label: "@EnableAutoConfiguration importe AutoConfigurationImportSelector, un DeferredImportSelector : les autoconfigurations sont traitées après toute la configuration de l'application"
  - id: spring-ch04-exclusion
    label: "Exclure une autoconfiguration : exclude sur @SpringBootApplication, ou spring.autoconfigure.exclude"
glossary:
  - term: "@SpringBootApplication"
    definition: "Raccourci pour @SpringBootConfiguration (une @Configuration), @EnableAutoConfiguration et @ComponentScan avec deux filtres d'exclusion."
  - term: "DeferredImportSelector"
    definition: "Un sélecteur d'imports de Spring traité après toutes les autres classes de configuration. C'est ce qui place les autoconfigurations en dernier."
  - term: "fichier imports"
    definition: "META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports : une classe d'autoconfiguration par ligne, dans chaque jar qui en fournit."
visuals: [spring-ch04-deferred-import]
labs: [spring-ch04-l02-lab-client-autoconfig]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: single
    prompt: "Pourquoi un `@ConditionalOnMissingBean` d'une autoconfiguration voit-il **toujours** le bean déclaré par l'application ?"
    choices:
      - "Parce que Spring Boot crée les beans de l'application en premier"
      - "Parce que les autoconfigurations sont importées par un DeferredImportSelector, traité après toute la configuration de l'application"
      - "Parce que les autoconfigurations sont dans un contexte parent"
      - "Il ne le voit pas toujours : c'est une question de chance"
    answer: 1
    explanation: "AutoConfigurationImportSelector est un DeferredImportSelector : le conteneur lit d'abord toutes les classes de configuration de l'application, enregistre leurs définitions, puis seulement traite les autoconfigurations. Elles voient donc les définitions de l'application, pas forcément les objets (aucun n'existe encore)."
    concept: spring-ch04-deferred-import
  - id: c2
    type: code-output
    prompt: "Une autoconfiguration testée avec ApplicationContextRunner : on lui oppose un bean de l'application, puis on tente de l'exclure par propriété. Qu'affiche le programme ?"
    code: |
      import org.springframework.boot.autoconfigure.AutoConfigurations;
      import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
      import org.springframework.boot.test.context.runner.ApplicationContextRunner;
      import org.springframework.context.annotation.*;

      public class Main {
          public record Client(String who) { }

          @Configuration(proxyBeanMethods = false)
          public static class ClientAuto {
              @Bean @ConditionalOnMissingBean Client client() { return new Client("auto"); }
          }

          @Configuration(proxyBeanMethods = false)
          public static class Team {
              @Bean Client teamClient() { return new Client("équipe"); }
          }

          public static void main(String[] args) {
              var runner = new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(ClientAuto.class));
              runner.withUserConfiguration(Team.class).run(ctx -> System.out.print(ctx.getBean(Client.class).who() + " "));
              runner.withPropertyValues("spring.autoconfigure.exclude=" + ClientAuto.class.getName())
                      .run(ctx -> System.out.println(ctx.getBeansOfType(Client.class).size()));
          }
      }
    answer: "équipe 1"
    explanation: "La configuration de l'application passe avant : l'autoconfiguration cède sa place (« back-off »). Mais l'exclusion par propriété n'a aucun effet ici : spring.autoconfigure.exclude est appliqué par AutoConfigurationImportSelector, et ApplicationContextRunner enregistre ses AutoConfigurations sans passer par lui. Dans une vraie application, la même propriété retire bien l'autoconfiguration (le lab le vérifie avec SpringApplication)."
    concept: spring-ch04-exclusion
---

## Pourquoi c'est important

Un starter ajouté au build, et des dizaines de beans apparaissent. D'où viennent-ils ? Qui les a choisis, dans quel ordre, et comment s'assurer qu'ils cèdent leur place aux tiens ? La réponse tient en trois éléments : une annotation, un fichier, et une particularité du conteneur qu'on appelle l'import **différé**.

C'est ce mécanisme que tu utilises dans le lab pour publier le client Tixa sous forme de bibliothèque, comme le fait Spring Boot pour ses propres modules.

## Ce que contient @SpringBootApplication

`@SpringBootApplication` rassemble trois annotations :
- `@SpringBootConfiguration` : une `@Configuration` (celle que les tests de Spring Boot recherchent) ;
- `@ComponentScan` : le scan du paquet de la classe et de ses sous-paquets, avec deux filtres d'exclusion (`TypeExcludeFilter`, et `AutoConfigurationExcludeFilter`, qui écarte les autoconfigurations rencontrées par hasard pendant le scan) ;
- **`@EnableAutoConfiguration`**, qui importe `AutoConfigurationImportSelector`.

## Où Spring Boot trouve les autoconfigurations

`AutoConfigurationImportSelector` lit, dans **tous les jars** du classpath, le fichier :

```
META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

Une ligne par classe d'autoconfiguration. Le jar `spring-boot-autoconfigure` en liste quelques centaines, et chaque module de Boot 4 a le sien (leçon 5). Ta bibliothèque fait pareil.

La documentation est formelle : une autoconfiguration doit être chargée **uniquement** par ce fichier, dans un paquet à part, et ne jamais être la cible d'un scan. Elle ne doit pas non plus lancer elle-même un `@ComponentScan`.

Chaque candidate est ensuite filtrée (exclusions, puis conditions de classe lues dans les métadonnées), **triée** (leçon 3), puis traitée comme une configuration.

> **Sous le capot :** `@AutoConfiguration` est elle-même méta-annotée `@Configuration(proxyBeanMethods = false)` (module 01, leçon 5 : mode *lite*). Pas de sous-classe CGLIB : c'est plus rapide, et les dépendances entre beans d'une autoconfiguration passent par les paramètres des méthodes `@Bean`.

## L'import différé

Un import ordinaire (`@Import`) est traité au moment où sa classe est lue. `AutoConfigurationImportSelector` est un **`DeferredImportSelector`** : le conteneur attend d'avoir lu **toute** la configuration de l'application (scan, `@Import`, méthodes `@Bean`) avant de le traiter.

::visual{id="spring-ch04-deferred-import"}

::checkpoint{id="c1"}

C'est la propriété qui rend Spring Boot utilisable : une autoconfiguration qui demande `@ConditionalOnMissingBean` voit toujours les beans de l'application, et **cède sa place**. La documentation appelle cela *back off*.

## Exclure une autoconfiguration

Quand une autoconfiguration fait quelque chose de non voulu, et qu'un bean de remplacement ne suffit pas :
- `@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)` (ou `excludeName` en texte) ;
- la propriété `spring.autoconfigure.exclude`, modifiable sans recompiler.

::checkpoint{id="c2"}

> **En production :** exclure est rarement la bonne réponse. Une autoconfiguration bien écrite cède sa place dès que tu déclares ton propre bean, et se règle par ses propriétés. Une liste d'exclusions qui grandit est le signe qu'on lutte contre le framework au lieu de le configurer.

## Pièges fréquents

- **Mettre une autoconfiguration dans un paquet scanné** et compter sur le scan pour la trouver : son ordre de traitement par rapport à la configuration de l'application n'est plus garanti.
- **Oublier le fichier `imports`** : l'autoconfiguration n'existe pas pour Spring Boot.
- **Un nom de classe imbriquée avec un point** dans le fichier `imports` : il faut le `$` (`tixa.notify.NotifyAutoConfiguration$Fallback`).
- **Exclure pour remplacer** un bean : déclarer le sien suffit, si l'autoconfiguration utilise `@ConditionalOnMissingBean`.

## À retenir

- `@SpringBootApplication` = configuration + scan (avec exclusions) + `@EnableAutoConfiguration`.
- Les autoconfigurations sont déclarées dans le fichier `imports` de chaque jar, jamais trouvées par le scan.
- `AutoConfigurationImportSelector` est un `DeferredImportSelector` : il passe après toute la configuration de l'application.
- Exclusion : `exclude` ou `spring.autoconfigure.exclude`, en dernier recours.

> **Source :** Spring Boot 4.1, [Creating Your Own Auto-configuration](https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html) (localisation des candidates, fichier imports, recommandations) et [Auto-configuration](https://docs.spring.io/spring-boot/4.1/reference/using/auto-configuration.html) (exclusion) ; code de `AutoConfigurationImportSelector` (spring-boot-autoconfigure 4.1.3).
