---
id: spring-ch04-l03
title: "Céder sa place, dans le bon ordre, et le rapport des conditions"
source: { book: spring-docs, chapter: 29, pages: "#features.developing-auto-configuration.condition-annotations.bean-conditions", url: "https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations.bean-conditions" }
duration_min: 35
concepts:
  - id: spring-ch04-autoconfig-order
    label: "Les autoconfigurations sont triées par nom de classe, puis par @AutoConfigureOrder, puis par before/after ; @ConditionalOnBean ne voit que ce qui est déjà enregistré"
  - id: spring-ch04-condition-report
    label: "Le rapport des conditions (--debug, ConditionEvaluationReport, /actuator/conditions) dit pour chaque autoconfiguration et chaque bean pourquoi il a été retenu ou écarté"
glossary:
  - term: "back-off"
    definition: "Le comportement d'une autoconfiguration qui renonce à son bean parce que l'application en fournit un (@ConditionalOnMissingBean)."
  - term: "@AutoConfiguration(after = …)"
    definition: "Déclare qu'une autoconfiguration doit être évaluée après une autre ; before fait l'inverse."
  - term: "rapport des conditions"
    definition: "Le ConditionEvaluationReport : la liste des correspondances positives et négatives de chaque condition, avec leur message."
visuals: [spring-ch04-autoconfig-order]
labs: [spring-ch04-l03-lab-debug-missing-metrics]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Deux autoconfigurations, sans ordre déclaré : `Audit…` a besoin du bean de `Payment…`. Qu'affiche le programme ?"
    code: |
      import org.springframework.boot.autoconfigure.AutoConfigurations;
      import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
      import org.springframework.boot.test.context.runner.ApplicationContextRunner;
      import org.springframework.context.annotation.*;

      public class Main {
          public static class Client { }
          public static class Audit { }

          @Configuration(proxyBeanMethods = false)
          public static class PaymentAutoConfiguration { @Bean Client client() { return new Client(); } }

          @Configuration(proxyBeanMethods = false)
          public static class AuditAutoConfiguration {
              @Bean @ConditionalOnBean(Client.class) Audit audit() { return new Audit(); }
          }

          public static void main(String[] args) {
              new ApplicationContextRunner()
                      .withConfiguration(AutoConfigurations.of(PaymentAutoConfiguration.class, AuditAutoConfiguration.class))
                      .run(ctx -> System.out.println(ctx.getBeansOfType(Client.class).size() + " " + ctx.getBeansOfType(Audit.class).size()));
          }
      }
    answer: "1 0"
    explanation: "Sans ordre déclaré, Spring Boot trie les autoconfigurations par nom de classe : « Main$AuditAutoConfiguration » passe avant « Main$PaymentAutoConfiguration ». Quand la condition de l'audit est évaluée, le client n'est pas encore enregistré. L'ordre de la liste passée à AutoConfigurations.of n'y change rien : elle est triée comme dans une vraie application."
    concept: spring-ch04-autoconfig-order
  - id: c2
    type: code-output
    prompt: "On lit le rapport des conditions pour le bean écarté. Qu'affiche le programme ?"
    code: |
      import org.springframework.boot.autoconfigure.AutoConfigurations;
      import org.springframework.boot.autoconfigure.condition.*;
      import org.springframework.boot.test.context.runner.ApplicationContextRunner;
      import org.springframework.context.annotation.*;

      public class Main {
          public static class Audit { }

          @Configuration(proxyBeanMethods = false)
          public static class AuditAutoConfiguration {
              @Bean @ConditionalOnBooleanProperty("tixa.audit.enabled") Audit audit() { return new Audit(); }
          }

          public static void main(String[] args) {
              new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(AuditAutoConfiguration.class)).run(ctx -> {
                  var report = ConditionEvaluationReport.get(ctx.getBeanFactory());
                  report.getConditionAndOutcomesBySource().get(AuditAutoConfiguration.class.getName() + "#audit")
                          .forEach(o -> System.out.println(o.getOutcome().isMatch() + " " + o.getOutcome().getMessage()));
              });
          }
      }
    answer: "false @ConditionalOnBooleanProperty (tixa.audit.enabled=true) did not find property 'tixa.audit.enabled'"
    explanation: "Chaque condition de Spring Boot laisse dans le rapport son issue et un message : ici, la propriété n'a pas été trouvée. C'est ce que --debug imprime au démarrage, et ce que /actuator/conditions expose. Une condition maison qui étend SpringBootCondition y écrit aussi (l'assignment)."
    concept: spring-ch04-condition-report
---

## Pourquoi c'est important

« J'ai ajouté le starter de métriques, mais aucune métrique n'apparaît. » « J'ai déclaré mon propre client, et pourtant celui de la bibliothèque est utilisé. » Ces deux phrases reviennent dans toutes les équipes qui utilisent Spring Boot. Elles ont presque toujours la même cause : une condition de bean évaluée **trop tôt**, ou dans un ordre que personne n'a fixé.

Et elles ont le même outil de diagnostic : le **rapport des conditions**, que Spring Boot remplit pour chaque décision.

## Céder sa place

`@ConditionalOnMissingBean` sur une méthode `@Bean` d'autoconfiguration : le bean n'est créé que si aucun bean de ce type (par défaut, le type de retour de la méthode) n'est **déjà enregistré**. Grâce à l'import différé (leçon 2), les définitions de l'application sont toujours là avant : l'autoconfiguration cède sa place à celles-ci.

Le mot important est **déjà**. La documentation de Spring Boot le dit : ces conditions sont évaluées *en fonction de ce qui a été traité jusque-là*, et c'est pourquoi elle recommande de ne les utiliser que dans des autoconfigurations, qui passent après les définitions de l'application. Entre autoconfigurations, en revanche, rien n'est garanti sans ordre explicite.

> **Astuce :** donne le type de retour le plus précis possible à une méthode `@Bean` d'autoconfiguration. `@ConditionalOnMissingBean` regarde ce type **avant** de créer le bean : une méthode qui renvoie `Object` ou une interface trop générale ne protège pas ce qu'on croit.

## L'ordre des autoconfigurations

Spring Boot trie les candidates en trois passes (`AutoConfigurationSorter`) :
1. **par nom de classe**, ordre alphabétique ;
2. par **`@AutoConfigureOrder`** (une valeur numérique, rarement utile) ;
3. par les contraintes **`before` / `after`** de `@AutoConfiguration` (ou `@AutoConfigureBefore` / `@AutoConfigureAfter`).

::visual{id="spring-ch04-autoconfig-order"}

::checkpoint{id="c1"}

La première passe est un piège : sans contrainte, l'ordre dépend du **nom** des classes. Renommer `MetricsAutoConfiguration` en `ClientMetricsAutoConfiguration` peut casser une application. La règle : dès qu'une autoconfiguration utilise `@ConditionalOnBean` (ou `OnMissingBean`) sur un bean fourni par **une autre**, elle déclare `after` cette autre.

> **Sous le capot :** le tri s'appuie sur les métadonnées, pas sur les classes chargées. Spring Boot génère au build un fichier `META-INF/spring-autoconfigure-metadata.properties` avec les conditions de classe et les ordres de chaque autoconfiguration, pour filtrer et trier des centaines de candidates sans les charger. Sans ce fichier (comme dans le bac à sable), il lit les annotations, plus lentement.

## Le rapport des conditions

Chaque condition de Spring Boot enregistre son issue dans le `ConditionEvaluationReport` du contexte : *positive matches*, *negative matches*, avec un message qui dit pourquoi.

Trois façons de le lire :
- `--debug` (ou `debug=true`) au démarrage : Spring Boot imprime le rapport complet ;
- `/actuator/conditions`, sur une application qui tourne (module 13) ;
- dans un test, `ConditionEvaluationReport.get(ctx.getBeanFactory())`.

::checkpoint{id="c2"}

Le rapport aussi accompagne les échecs : quand le démarrage échoue, Spring Boot rappelle qu'on peut relancer avec `debug` pour voir le rapport.

## Pièges fréquents

- **`@ConditionalOnBean` sur un bean d'une autre autoconfiguration, sans `after`** : tout dépend de l'ordre alphabétique des noms.
- **`@ConditionalOnMissingBean` dans une configuration de l'application** : le résultat dépend de l'ordre de lecture des classes ; c'est une condition d'autoconfiguration.
- **Un type de retour trop général** : la condition ne voit pas le bean qu'elle devrait protéger.
- **Chercher l'erreur dans le code** au lieu de lire le rapport : il dit, ligne par ligne, quelle condition a échoué.

## À retenir

- `@ConditionalOnMissingBean` cède la place à ce qui est **déjà** enregistré : toujours vrai pour l'application, pas entre autoconfigurations.
- Tri : nom de classe, puis `@AutoConfigureOrder`, puis `before`/`after`. Déclare `after` dès qu'un bean d'une autre autoconfiguration compte.
- Le rapport des conditions explique chaque décision : `--debug`, `/actuator/conditions`, `ConditionEvaluationReport`.

> **Source :** Spring Boot 4.1, [Creating Your Own Auto-configuration — Bean Conditions](https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.condition-annotations.bean-conditions) ; code de [`AutoConfigurationSorter`](https://github.com/spring-projects/spring-boot/blob/v4.1.3/core/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/AutoConfigurationSorter.java) (v4.1.3).
