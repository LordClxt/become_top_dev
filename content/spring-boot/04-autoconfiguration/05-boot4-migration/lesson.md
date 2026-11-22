---
id: spring-ch04-l05
title: "De Spring Boot 3.5 à 4 : ce qui change, et pourquoi"
source: { book: spring-docs, chapter: 30, pages: "#module-dependencies", url: "https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide" }
duration_min: 30
concepts:
  - id: spring-ch04-boot4-modules
    label: "Boot 4 découpe son autoconfiguration en modules ciblés (spring-boot-jackson, spring-boot-webmvc…), chacun avec ses paquets org.springframework.boot.<module> et son fichier imports ; les starters suivent"
  - id: spring-ch04-boot4-jackson3
    label: "Boot 4 utilise Jackson 3 (paquet tools.jackson, JsonMapper, exceptions non vérifiées) ; seules les annotations restent dans com.fasterxml.jackson.annotation"
glossary:
  - term: "guide de migration"
    definition: "La page du wiki GitHub de Spring Boot qui liste, version par version, ce qui change et comment adapter son code."
  - term: "classic starters"
    definition: "Des starters de transition de Boot 4 qui apportent tous les modules d'autoconfiguration, pour migrer d'abord et découper ensuite."
  - term: "Jakarta EE 11"
    definition: "La plateforme d'API d'entreprise (Servlet 6.1, Persistence 3.2…) sur laquelle repose Spring Boot 4."
visuals: [spring-ch04-boot4-modules]
labs: [spring-ch04-l05-lab-jackson3-migration]
extra: true
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Jackson 3, tel que Spring Boot 4 l'utilise. Qu'affiche le programme ?"
    code: |
      import tools.jackson.databind.PropertyNamingStrategies;
      import tools.jackson.databind.json.JsonMapper;

      public class Main {
          public record Ticket(String eventId, int seatNumber) { }

          public static void main(String[] args) {
              JsonMapper json = JsonMapper.builder().propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE).build();
              System.out.println(json.writeValueAsString(new Ticket("jazz", 12)));
          }
      }
    answer: "{\"event_id\":\"jazz\",\"seat_number\":12}"
    explanation: "Jackson 3 vit dans tools.jackson, se configure par un builder immuable, et writeValueAsString ne déclare plus d'exception vérifiée (JacksonException est une RuntimeException). Le main n'a pas besoin de throws : c'est un des changements qui font tomber la compilation du code Jackson 2."
    concept: spring-ch04-boot4-jackson3
  - id: c2
    type: single
    prompt: "Ton application Grails 7.2 repose sur Spring Boot 3.5 et teste avec Spock. Que dit le guide de migration de Boot 4 sur Spock ?"
    choices:
      - "Rien ne change"
      - "L'intégration Spock de Spring Boot est retirée, car Spock ne prend pas encore en charge Groovy 5"
      - "Spock devient obligatoire"
      - "Spock est remplacé par JUnit 4"
    answer: 1
    explanation: "Le guide l'indique dans sa liste des retraits. C'est un exemple concret de pourquoi un framework bâti sur Spring Boot (Grails) ne suit pas immédiatement une version majeure : chaque dépendance de l'écosystème doit suivre."
    concept: spring-ch04-boot4-modules
---

## Pourquoi c'est important

Le cours Grails s'appuie sur Spring Boot 3.5 ; celui-ci sur Spring Boot 4.1. Tôt ou tard, tu migreras une vraie application de l'un à l'autre, et Grails lui-même suivra. Une montée de version majeure ne se fait pas en changeant un numéro : elle se prépare en sachant **ce qui change** et **pourquoi**, avec la même source que les équipes de Spring : le guide de migration, sur le wiki GitHub du projet.

Cette leçon n'est pas une liste exhaustive : ce sont les changements qui touchent ce que tu as vu dans les modules 01 à 04, et que le guide détaille.

## Une autoconfiguration découpée en modules

Boot 3 livrait presque toute son autoconfiguration dans un gros jar, `spring-boot-autoconfigure`. Boot 4 la découpe en **modules ciblés** : `spring-boot-jackson`, `spring-boot-webmvc`, `spring-boot-jdbc`, `spring-boot-restclient`… Chacun a :
- ses paquets, sous `org.springframework.boot.<module>` (par exemple `org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration`) ;
- son propre fichier `AutoConfiguration.imports` (leçon 2) ;
- son starter, et souvent un starter de test (`spring-boot-starter-webmvc-test`).

::visual{id="spring-ch04-boot4-modules"}

Conséquences pour une migration :
- des **imports Java** changent (un customizer, une classe d'autoconfiguration à exclure) ;
- certains **starters sont renommés** : `spring-boot-starter-web` devient `spring-boot-starter-webmvc`, `spring-boot-starter-aop` devient `spring-boot-starter-aspectj` (le guide demande de vérifier si on en a vraiment besoin) ;
- une fonctionnalité qui ne dépendait que d'une bibliothèque tierce peut maintenant demander **un starter de plus**.

Pour migrer vite puis nettoyer, Boot 4 propose des *classic starters* qui apportent tous les modules, comme avant.

## Jackson 3

Spring Boot 4 utilise Jackson 3 par défaut. Ses classes passent de `com.fasterxml.jackson` à **`tools.jackson`**, sauf les annotations (`@JsonProperty`…), qui restent dans `com.fasterxml.jackson.annotation`. Le mapper JSON est un `JsonMapper` immuable, construit par un builder, et `JacksonException` est une exception **non vérifiée**.

::checkpoint{id="c1"}

Côté Spring Boot, le customizer du mapper devient `JsonMapperBuilderCustomizer`, dans le module `spring-boot-jackson`. Le lab de cette leçon fait exactement cette migration, et le lab de débogage de la leçon 3 montre son piège le plus sournois : une `@ConditionalOnClass(name = "com.fasterxml.jackson…")` qui ne casse rien, mais ne s'active plus jamais.

## La plateforme

- **Java 17 minimum** (Java 25 recommandé, celui de ce cours), **Jakarta EE 11**, **Servlet 6.1**.
- **Undertow n'est plus pris en charge** (pas encore compatible Servlet 6.1) : Tomcat ou Jetty.
- **Spring Framework 7** : `BeanRegistrar` (module 01), résilience intégrée (`@Retryable`, module 02), annotations de nullité JSpecify.

## Les tests

- `@MockBean` et `@SpyBean` de Spring Boot sont **supprimés**, au profit de `@MockitoBean` et `@MockitoSpyBean` de Spring Framework (module 11).
- **L'intégration Spock de Spring Boot est retirée**, Spock ne prenant pas encore en charge Groovy 5.

::checkpoint{id="c2"}

> **En production :** migre par étapes. D'abord la dernière version 3.5 sans aucun avertissement de dépréciation (les API retirées en 4 sont dépréciées en 3.x), puis Boot 4 avec les *classic starters*, puis le découpage en starters ciblés. À chaque étape, la suite de tests doit rester verte ; c'est elle qui rend la migration possible.

## Pièges fréquents

- **Remplacer les imports Jackson à l'aveugle** : les annotations, elles, ne changent pas de paquet.
- **Une condition de classe en texte** qui vise une classe de Jackson 2 : rien ne casse, la fonctionnalité disparaît.
- **Migrer sans lire le guide** : chaque version majeure a ses retraits, et le guide est la seule liste fiable.
- **Sauter l'étape « 3.5 sans dépréciations »** : les erreurs de compilation de Boot 4 sont alors mêlées à de vrais changements de comportement.

## À retenir

- Boot 4 : autoconfiguration en modules (`org.springframework.boot.<module>`), starters renommés ou découpés.
- Jackson 3 : `tools.jackson`, `JsonMapper`, exceptions non vérifiées ; annotations inchangées.
- Java 17+, Jakarta EE 11, Servlet 6.1, plus d'Undertow ; `@MockitoBean` remplace `@MockBean` ; plus d'intégration Spock.
- Migrer par étapes, guide de migration en main.

> **Source :** wiki GitHub de Spring Boot, [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide) (modules, starters, Jackson 3, retraits) ; Spring Boot 4.1, [System Requirements](https://docs.spring.io/spring-boot/4.1/system-requirements.html).
