---
id: spring-ch05-l05
title: "Versionner une API sans casser ses clients, et la tester"
source: { book: spring-docs, chapter: 36, pages: "#api-versioning", url: "https://docs.spring.io/spring-framework/reference/web/webmvc-versioning.html" }
duration_min: 35
concepts:
  - id: spring-ch05-api-versioning
    label: "Spring Framework 7 : l'attribut version des @RequestMapping (\"1\", ou \"2+\" pour une version et les suivantes), une stratégie de lecture (en-tête, paramètre, segment de chemin, type de média) et la liste des versions prises en charge"
  - id: spring-ch05-version-defaults
    label: "Une fois le versionnement activé, une version est exigée sur toutes les routes, même non versionnées, sauf version par défaut ; sans version exigée ni défaut, la plus récente répond ; une version inconnue donne 400"
  - id: spring-ch05-version-deprecation
    label: "StandardApiVersionDeprecationHandler annonce la fin d'une version avec les en-têtes Deprecation, Sunset et Link (rel=\"sunset\"), sans toucher au code des contrôleurs"
  - id: spring-ch05-webmvctest
    label: "@WebMvcTest charge la seule couche web (contrôleurs, conseils, WebMvcConfigurer, filtres) et fournit MockMvcTester, aux assertions AssertJ ; les services s'importent ou se simulent ; un vrai serveur (RANDOM_PORT) pour ce que MockMvc ne simule pas"
glossary:
  - term: "versionnement d'API"
    definition: "Faire cohabiter plusieurs contrats d'une même API, pour que les anciens clients continuent de fonctionner pendant que les nouveaux adoptent la nouvelle version."
  - term: "version de base (baseline)"
    definition: "Une version notée « 2+ » : la route répond pour la version 2 et toutes les suivantes, jusqu'à ce qu'une route plus précise la remplace."
  - term: "Sunset"
    definition: "En-tête HTTP (RFC 8594) qui annonce la date à laquelle une ressource ou une version cessera de répondre."
  - term: "@WebMvcTest"
    definition: "Test de tranche de Spring Boot : un contexte réduit à la couche Spring MVC, avec une DispatcherServlet simulée, sans serveur."
  - term: "MockMvcTester"
    definition: "Client de test de Spring Framework qui envoie des requêtes à une DispatcherServlet sans réseau, avec des assertions AssertJ."
visuals: [spring-ch05-version-routing]
labs: [spring-ch05-l05-lab-version-two]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le versionnement par en-tête est activé, versions 1 à 3, **sans version par défaut**. Quatre appels : `/health` (non versionnée) sans en-tête, `/events` sans en-tête, `/events` en version 3, `/events` en version 4. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.mock.web.MockServletContext;
      import org.springframework.test.web.servlet.assertj.MockMvcTester;
      import org.springframework.web.bind.annotation.*;
      import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
      import org.springframework.web.servlet.config.annotation.*;

      public class Main {
          @RestController
          public static class Api {
              @GetMapping("/health") public String health() { return "up"; }
              @GetMapping(path = "/events", version = "1") public String v1() { return "v1"; }
              @GetMapping(path = "/events", version = "2+") public String v2() { return "v2+"; }
          }

          @Configuration @EnableWebMvc
          public static class Web implements WebMvcConfigurer {
              @Bean Api api() { return new Api(); }
              public void configureApiVersioning(ApiVersionConfigurer versions) {
                  versions.useRequestHeader("API-Version").addSupportedVersions("1", "2", "3");
              }
          }

          public static void main(String[] args) throws Exception {
              var ctx = new AnnotationConfigWebApplicationContext();
              ctx.setServletContext(new MockServletContext());
              ctx.register(Web.class);
              ctx.refresh();
              var mvc = MockMvcTester.from(ctx);
              String[][] calls = { { "/health", null }, { "/events", null }, { "/events", "3" }, { "/events", "4" } };
              StringBuilder out = new StringBuilder();
              for (String[] c : calls) {
                  var request = mvc.get().uri(c[0]);
                  if (c[1] != null) request.header("API-Version", c[1]);
                  var res = request.exchange().getResponse();
                  out.append(res.getStatus()).append(res.getStatus() == 200 ? ":" + res.getContentAsString() : "").append(" ");
              }
              System.out.println(out.toString().trim());
          }
      }
    answer: "400 400 200:v2+ 400"
    explanation: "Dès que le versionnement est activé, une version est exigée par défaut, pour toutes les requêtes : /health, pourtant sans attribut version, répond 400 (MissingApiVersionException). La version 3 n'a pas de route dédiée : « 2+ » la couvre. La version 4 n'est pas dans la liste des versions prises en charge : 400 (InvalidApiVersionException)."
    concept: spring-ch05-version-defaults
  - id: c2
    type: single
    prompt: "On passe `required` à `false`, **sans** version par défaut. Un ancien client, qui n'envoie jamais d'en-tête de version, appelle `/events`. Quelle méthode répond ?"
    choices:
      - "La version 1, la plus ancienne, pour ne pas le casser"
      - "La version la plus récente (« 2+ ») : sans version demandée ni version par défaut, Spring choisit la plus haute"
      - "Aucune : 400"
      - "Une au hasard"
    answer: 1
    explanation: "Sans version dans la requête et sans défaut, les routes versionnées sont départagées par la version la plus haute. L'ancien client bascule donc en silence sur la nouvelle représentation au premier déploiement de la version 2. Pour protéger les clients existants : setDefaultVersion(\"1\") (ou spring.mvc.apiversion.default=1)."
    concept: spring-ch05-version-defaults
  - id: c3
    type: single
    prompt: "Un test `@WebMvcTest(EventController.class)` échoue au démarrage : « No qualifying bean of type EventCatalog ». `EventCatalog` est un `@Service`. Pourquoi ?"
    choices:
      - "@WebMvcTest ne scanne pas le paquet du test"
      - "La tranche ne charge que la couche web (contrôleurs, conseils, WebMvcConfigurer, filtres…) : les @Service n'y sont pas ; on les ajoute avec @Import, ou on les simule avec @MockitoBean"
      - "Il faut annoter le service @Controller"
      - "EventCatalog doit être une interface"
    answer: 1
    explanation: "C'est voulu : un test de tranche démarre vite et isole la couche testée. Le contrôleur a besoin d'un EventCatalog : soit le vrai (@Import(EventCatalog.class), s'il est simple), soit une doublure (@MockitoBean EventCatalog catalog, puis given(...) pour lui dicter ses réponses)."
    concept: spring-ch05-webmvctest
---

## Pourquoi c'est important

Tixa veut enrichir la fiche d'un événement : le titre devient `title`, la date devient un horodatage complet `startsAt`, et le lieu devient un objet `venue`. Le développeur web est ravi. L'application mobile, elle, est installée sur 40 000 téléphones, dont la moitié ne sera pas mise à jour avant des mois : au moindre champ renommé, elle s'arrête d'afficher les concerts. Il faut servir **deux contrats** en même temps, prévenir les retardataires, puis éteindre l'ancien proprement.

Jusqu'à Spring 6, chaque équipe bricolait : `/v1/` dans les chemins, en-têtes lus à la main, contrôleurs dupliqués. **Spring Framework 7** intègre le versionnement d'API dans Spring MVC. Bien configuré, il protège les anciens clients ; mal configuré, il les casse dès l'activation.

## Déclarer des versions

Côté contrôleur, un attribut `version` sur les `@RequestMapping` :

```java title="EventController.java"
@GetMapping(path = "/events/{id}", version = "1")
EventV1 v1(@PathVariable long id) { … }

@GetMapping(path = "/events/{id}", version = "2+")
EventV2 v2(@PathVariable long id) { … }
```

`"2+"` est une **version de base** : la route répond pour la version 2 et toutes les suivantes, jusqu'à ce qu'une route plus précise (`"4"`) prenne le relais. On ne duplique donc pas chaque méthode à chaque nouvelle version : seules les routes qui changent ont une nouvelle déclaration. Une route sans attribut `version` répond à toutes les versions.

Côté configuration, il faut dire **où lire** la version et **lesquelles** existent :

```java title="WebConfig.java"
@Override
public void configureApiVersioning(ApiVersionConfigurer versions) {
    versions.useRequestHeader("API-Version")     // ou usePathSegment(0), useQueryParam("version"), useMediaTypeParameter(…)
            .addSupportedVersions("1", "2")
            .setDefaultVersion("1");               // les clients sans en-tête restent en version 1
}
```

Les versions déclarées dans les routes sont aussi reconnues d'office (`detectSupportedVersions`, actif par défaut) ; la liste explicite documente le contrat. Spring Boot propose les mêmes réglages en propriétés : `spring.mvc.apiversion.use.header=API-Version`, `spring.mvc.apiversion.supported=1,2`, `spring.mvc.apiversion.default=1`.

::visual{id="spring-ch05-version-routing"}

## Trois réglages, trois comportements

C'est ici que les équipes se trompent. Une fois le versionnement activé, une version est **exigée** par défaut, et pour **toutes** les requêtes :

| Configuration | Requête sans version | Version inconnue |
|---|---|---|
| ni défaut ni réglage | **400** partout, même sur `/health` | 400 |
| `setDefaultVersion("1")` | la version 1 répond | 400 |
| `setVersionRequired(false)`, sans défaut | la version **la plus haute** répond | 400 |

::checkpoint{id="c1"}

La première ligne casse tous les clients existants le jour du déploiement, sonde de santé comprise. La troisième est plus sournoise : rien ne casse… jusqu'au jour où la version 2 sort, et où les clients sans en-tête reçoivent en silence la nouvelle représentation.

::checkpoint{id="c2"}

Pour une API déjà en service, la seule configuration sûre est donc une **version par défaut** égale à la version que les clients utilisent aujourd'hui.

> **Sous le capot :** le versionnement s'appuie sur le `HandlerMapping` de la leçon 1. Avant la recherche de route, un `ApiVersionStrategy` lit la version dans la requête, la **parse** (les versions sont comparées comme des versions sémantiques : `1.10` est plus récente que `1.9`), et vérifie qu'elle est prise en charge. L'attribut `version` devient une condition de correspondance de plus, comme le chemin ou la méthode HTTP. Les échecs sont des exceptions de Spring MVC (`MissingApiVersionException`, `InvalidApiVersionException`) : avec le conseil de la leçon 3, elles sortent en ProblemDetail.

## Éteindre une version proprement

Retirer la version 1 sans prévenir, c'est casser les retardataires. Spring 7 sait **l'annoncer** dans chaque réponse de cette version, sans toucher aux contrôleurs :

```java
var deprecation = new StandardApiVersionDeprecationHandler();
deprecation.configureVersion("1")
        .setDeprecationDate(ZonedDateTime.parse("2026-12-01T00:00:00Z"))
        .setSunsetDate(ZonedDateTime.parse("2027-06-01T00:00:00Z"))
        .setSunsetLink(URI.create("https://tixa.example/docs/v2"));
versions.setDeprecationHandler(deprecation);
```

Une réponse en version 1 porte alors `Deprecation: @1796083200` (la date de dépréciation), `Sunset: Tue, 01 Jun 2027 00:00:00 GMT` (la date d'extinction) et `Link: <https://tixa.example/docs/v2>; rel="sunset"`. Les clients bien écrits peuvent alerter leurs développeurs, et tes journaux d'accès disent qui appelle encore la version 1.

## Tester la couche web

`@WebMvcTest` démarre une **tranche** du contexte : les contrôleurs, les conseils, les `WebMvcConfigurer`, les filtres et intercepteurs, Jackson, la validation. Pas les `@Service`, ni la base de données, ni Tomcat. Le test reçoit un **`MockMvcTester`**, qui envoie des requêtes à une `DispatcherServlet` en mémoire, avec des assertions AssertJ :

```java title="EventVersionsTest.java"
@WebMvcTest(EventController.class)
@Import(EventCatalog.class)        // ou @MockitoBean EventCatalog catalog;
class EventVersionsTest {
    @Autowired MockMvcTester mvc;

    @Test
    void versionTwo() {
        assertThat(mvc.get().uri("/events/1").header("API-Version", "2"))
                .hasStatusOk()
                .bodyJson().extractingPath("$.venue.city").isEqualTo("Lyon");
    }
}
```

::checkpoint{id="c3"}

Dans Spring Boot 4, l'annotation vit dans le module `spring-boot-webmvc-test` (`org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`). Un test de tranche démarre en une fraction de seconde ; il couvre le routage, la conversion, la validation, les erreurs et le versionnement. Ce qu'il ne voit pas, c'est le **transport** réel : une réponse engagée trop tôt (leçon 4), la compression, le comportement de Tomcat. Pour ça, `@SpringBootTest(webEnvironment = RANDOM_PORT)` et un vrai client HTTP.

## Pièges fréquents

- **Activer le versionnement sans version par défaut** sur une API en service : tous les clients existants reçoivent 400, sondes de santé comprises.
- **`required = false` sans défaut** : les clients sans en-tête suivent toujours la version la plus récente, et cassent à chaque nouvelle version.
- **Dupliquer toutes les routes à chaque version** : une version de base (`"2+"`) suffit pour celles qui ne changent pas.
- **Oublier d'annoncer la fin d'une version** : sans `Sunset`, les retardataires découvrent l'extinction par une panne.
- **`@SpringBootTest` pour tout** : lent, et inutile pour tester un contrôleur. Une tranche `@WebMvcTest` pour la couche web ; un vrai serveur seulement pour ce qui dépend du transport.

## À retenir

- `version = "1"`, `version = "2+"` sur les routes ; `configureApiVersioning` (ou `spring.mvc.apiversion.*`) dit où lire la version et lesquelles existent.
- Une fois activé : version exigée partout, sauf **version par défaut**. Sans défaut ni exigence, la plus haute répond. Inconnue : 400.
- `StandardApiVersionDeprecationHandler` : `Deprecation`, `Sunset`, `Link rel="sunset"` sur les réponses d'une version en fin de vie.
- `@WebMvcTest` + `MockMvcTester` pour la couche web (services importés ou simulés) ; `RANDOM_PORT` pour le transport réel.

> **Source :** Spring Framework 7, [API Versioning](https://docs.spring.io/spring-framework/reference/web/webmvc-versioning.html) et [MockMvcTester (AssertJ)](https://docs.spring.io/spring-framework/reference/testing/mockmvc/assertj.html) ; Spring Boot 4.1, [Testing Spring Boot Applications — Auto-configured Spring MVC Tests](https://docs.spring.io/spring-boot/4.1/reference/testing/spring-boot-applications.html) ; [RFC 9745 (Deprecation)](https://www.rfc-editor.org/rfc/rfc9745) et [RFC 8594 (Sunset)](https://www.rfc-editor.org/rfc/rfc8594).
