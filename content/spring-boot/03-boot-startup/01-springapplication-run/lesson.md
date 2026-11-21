---
id: spring-ch03-l01
title: "SpringApplication.run() pas à pas"
source: { book: spring-docs, chapter: 25, pages: "#features.spring-application.application-events-and-listeners", url: "https://docs.spring.io/spring-boot/4.1/reference/features/spring-application.html#features.spring-application.application-events-and-listeners" }
duration_min: 35
concepts:
  - id: spring-ch03-run-steps
    label: "run() : préparer l'environnement, créer le contexte, le préparer, refresh(), appeler les runners ; le contexte n'existe qu'à partir de la troisième étape"
  - id: spring-ch03-startup-events
    label: "Chaque étape publie un événement (Starting, EnvironmentPrepared, ContextInitialized, Prepared, Started, Ready) ; les premiers ne peuvent être écoutés que par un écouteur donné à la SpringApplication"
  - id: spring-ch03-runners
    label: "Les ApplicationRunner et CommandLineRunner tournent après ApplicationStartedEvent et avant ApplicationReadyEvent ; une exception y fait échouer le démarrage"
  - id: spring-ch03-failure-analyzer
    label: "Quand le démarrage échoue, les FailureAnalyzer déclarés dans spring.factories transforment l'exception en rapport Description / Action"
glossary:
  - term: "SpringApplication"
    definition: "La classe de Spring Boot qui démarre une application : elle prépare l'environnement, choisit et crée le contexte, puis appelle son refresh()."
  - term: "ApplicationRunner"
    definition: "Un bean dont la méthode run(ApplicationArguments) est appelée une fois le contexte démarré, avant que l'application soit déclarée prête."
  - term: "ApplicationContextInitializer"
    definition: "Un rappel qui reçoit le contexte juste après sa création, avant le chargement des définitions de beans."
  - term: "FailureAnalyzer"
    definition: "Un composant qui transforme une exception de démarrage en un rapport lisible (description de la cause, action à mener)."
visuals: [spring-ch03-run-timeline]
labs: [spring-ch03-l01-lab-warmup-timeline]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un écouteur donné à la SpringApplication, un runner déclaré comme bean. Qu'affiche le programme ?"
    code: |
      import java.util.*;
      import org.springframework.boot.*;
      import org.springframework.boot.context.event.*;
      import org.springframework.context.ApplicationListener;
      import org.springframework.context.annotation.*;

      public class Main {
          static List<String> log = new ArrayList<>();

          @Configuration
          static class App {
              @Bean ApplicationRunner warmUp() { return args -> log.add("runner"); }
          }

          public static void main(String[] args) {
              var app = new SpringApplication(App.class);
              app.setBannerMode(Banner.Mode.OFF);
              app.setWebApplicationType(WebApplicationType.NONE);
              app.addListeners((ApplicationListener<SpringApplicationEvent>) e ->
                      log.add(e.getClass().getSimpleName().replace("Application", "").replace("Event", "")));
              app.run().close();
              System.out.println(log);
          }
      }
    answer: "[Starting, EnvironmentPrepared, ContextInitialized, Prepared, Started, runner, Ready]"
    explanation: "Les événements de démarrage de Spring Boot arrivent dans cet ordre, et les runners s'exécutent entre Started et Ready. ContextRefreshedEvent n'apparaît pas : ce n'est pas un SpringApplicationEvent, mais l'événement du conteneur Spring (module 01)."
    concept: spring-ch03-startup-events
  - id: c2
    type: single
    prompt: "Un `@Component` implémente `ApplicationListener<ApplicationEnvironmentPreparedEvent>` pour lire la configuration le plus tôt possible. Combien de fois est-il appelé ?"
    choices:
      - "Une fois, au début du démarrage"
      - "Jamais : quand l'environnement est préparé, le contexte (et donc le bean) n'existe pas encore"
      - "Deux fois : une pour l'environnement, une pour le contexte"
      - "À chaque refresh"
    answer: 1
    explanation: "Un bean naît pendant refresh(), bien après ApplicationEnvironmentPreparedEvent. Pour écouter les premiers événements, il faut donner l'écouteur à la SpringApplication (addListeners) ou le déclarer dans META-INF/spring.factories. La documentation de Spring Boot le précise pour ces événements."
    concept: spring-ch03-startup-events
---

## Pourquoi c'est important

Ton `main` tient en une ligne : `SpringApplication.run(TixaApp.class, args)`. Entre cette ligne et le moment où Tixa accepte sa première requête, il se passe une dizaine d'étapes, et chacune répond à une question que tu te poseras en production : à partir de quand puis-je lire la configuration ? Où lancer le préchauffage d'un cache ? Pourquoi mon écouteur ne reçoit-il jamais l'événement ? Que voit la personne de garde quand le démarrage échoue ?

Le module 01 a ouvert `refresh()`, le cœur du conteneur. Spring Boot l'enveloppe dans une méthode plus large : `SpringApplication.run()`.

## Les étapes de run()

Le code de `SpringApplication.run(String... args)` dans Spring Boot 4.1 tient en une trentaine de lignes. Dans l'ordre :

1. **Démarrage** : un `BootstrapContext` minimal est créé, les écouteurs de démarrage sont chargés, et `ApplicationStartingEvent` est publié. Rien n'est encore configuré, pas même la journalisation.
2. **L'environnement** (`prepareEnvironment`) : toutes les sources de configuration (ligne de commande, variables d'environnement, fichiers `application.*`, profils) sont rassemblées. `ApplicationEnvironmentPreparedEvent` est publié : c'est là que les `EnvironmentPostProcessor` travaillent (leçon 5).
3. **La bannière**, puis **la création du contexte** : Spring Boot choisit sa classe selon le type d'application (servlet, réactif, aucun).
4. **La préparation** (`prepareContext`) : les `ApplicationContextInitializer` reçoivent le contexte (`ApplicationContextInitializedEvent`), puis les sources (ta classe `@SpringBootApplication`) sont enregistrées (`ApplicationPreparedEvent`).
5. **`refresh()`** : tout le module 01. Le serveur web embarqué est créé dans `onRefresh()`.
6. **`ApplicationStartedEvent`**, puis les **runners** (`ApplicationRunner`, `CommandLineRunner`).
7. **`ApplicationReadyEvent`** : l'application accepte du trafic.

::visual{id="spring-ch03-run-timeline"}

::checkpoint{id="c1"}

> **Sous le capot :** chaque étape appelle un `SpringApplicationRunListener` (`listeners.starting(...)`, `environmentPrepared`, `contextPrepared`, `contextLoaded`, `started`, `ready`). L'implémentation par défaut, `EventPublishingRunListener`, transforme ces appels en événements. Avant `refresh()`, elle les envoie elle-même à ses écouteurs ; après, elle passe par le contexte. C'est pourquoi il existe deux familles d'écouteurs.

## Qui peut écouter quoi

Un bean n'existe qu'après le `refresh()` (étape 5). Un `@Component` qui écoute `ApplicationStartingEvent` ou `ApplicationEnvironmentPreparedEvent` ne les recevra donc **jamais**.

::checkpoint{id="c2"}

Pour les premiers événements, l'écouteur doit être connu **avant** le contexte :
- `springApplication.addListeners(...)` dans ton `main` ;
- ou une ligne dans `META-INF/spring.factories` (clé `org.springframework.context.ApplicationListener`), pour une bibliothèque.

À partir de `ApplicationStartedEvent`, un simple `@EventListener` sur un bean suffit.

## Le bon endroit pour le travail de démarrage

| Besoin | Où |
|---|---|
| Ajuster la configuration avant tout bean | un `EnvironmentPostProcessor` (leçon 5) |
| Préparer un bean à sa création | le constructeur, ou `@PostConstruct` (module 01) |
| Une tâche **qui doit réussir** avant d'accepter du trafic (vérifier une dépendance, préchauffer un cache) | un `ApplicationRunner` |
| Réagir à « l'application est prête » | `@EventListener(ApplicationReadyEvent.class)` |

Un runner a deux propriétés utiles : il voit le contexte **complet** (tous les beans sont créés), et une exception qu'il lève **fait échouer le démarrage**, avant que l'application soit déclarée prête. C'est le jalon 3 du projet.

> **En production :** derrière un orchestrateur (Kubernetes), « prête » a un sens précis. Spring Boot publie aussi des `AvailabilityChangeEvent` : l'état de vivacité passe à `CORRECT` après `ApplicationStartedEvent`, et l'état de disponibilité passe à `ACCEPTING_TRAFFIC` après `ApplicationReadyEvent`. Les sondes de santé d'Actuator s'appuient dessus (module 13). Un préchauffage long dans un runner retarde donc l'arrivée du trafic, ce qui est voulu.

## Quand le démarrage échoue

Si une étape lève une exception, `run()` appelle `handleRunFailure` : il publie `ApplicationFailedEvent`, ferme le contexte (les beans déjà créés sont détruits, module 01), puis cherche une explication. Spring Boot charge ses **analyseurs d'échec** (`FailureAnalyzer`, déclarés dans `META-INF/spring.factories`) et, si l'un reconnaît l'exception, affiche :

```
***************************
APPLICATION FAILED TO START
***************************

Description:
...
Action:
...
```

Un bean manquant, un port occupé, une propriété invalide ont déjà leur analyseur. Tu écris le tien dans l'assignment.

## Pièges fréquents

- **Écouter `ApplicationStartingEvent` depuis un `@Component`** : jamais reçu.
- **Lancer un long travail dans un `@PostConstruct`** : il bloque la création des autres beans, et une erreur y donne une pile illisible. Un runner est fait pour ça.
- **Avaler l'exception dans un runner** : l'application se déclare prête alors qu'elle ne l'est pas.
- **`@SpringBootApplication` dans le paquet par défaut** : le scan des composants parcourt tout le classpath et le démarrage échoue (Spring Boot l'écrit dans un avertissement).

## À retenir

- `run()` : environnement → création du contexte → préparation → `refresh()` → runners → prêt.
- Le contexte n'existe qu'à partir de l'étape 3 : les premiers événements s'écoutent sur la `SpringApplication`, pas sur un bean.
- Les runners tournent entre `ApplicationStartedEvent` et `ApplicationReadyEvent`, et peuvent faire échouer le démarrage.
- Un démarrage raté passe par les `FailureAnalyzer` pour produire un rapport lisible.

> **Source :** Spring Boot 4.1, [SpringApplication](https://docs.spring.io/spring-boot/4.1/reference/features/spring-application.html) (événements, runners, échec de démarrage) ; code de [`SpringApplication.run`](https://github.com/spring-projects/spring-boot/blob/v4.1.3/core/spring-boot/src/main/java/org/springframework/boot/SpringApplication.java) (v4.1.3).
