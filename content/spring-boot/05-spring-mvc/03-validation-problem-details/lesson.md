---
id: spring-ch05-l03
title: "Valider et répondre aux erreurs : ProblemDetail"
source: { book: spring-docs, chapter: 33, pages: "#mvc-ann-rest-exceptions", url: "https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html" }
duration_min: 35
concepts:
  - id: spring-ch05-bean-validation
    label: "@Valid sur un @RequestBody valide l'objet (MethodArgumentNotValidException, 400) ; une contrainte posée directement sur un paramètre déclenche la validation de méthode intégrée (HandlerMethodValidationException, 400), sans @Validated"
  - id: spring-ch05-problem-detail
    label: "ProblemDetail (RFC 9457) : type, title, status, detail, instance et des propriétés libres, en application/problem+json ; toutes les exceptions de Spring MVC implémentent ErrorResponse et savent se décrire ainsi"
  - id: spring-ch05-controller-advice
    label: "@RestControllerAdvice + @ExceptionHandler centralise la traduction des exceptions ; le gestionnaire du type le plus proche gagne ; étendre ResponseEntityExceptionHandler couvre toutes les exceptions de Spring MVC"
  - id: spring-ch05-error-hygiene
    label: "Une erreur utile au client sans fuite : le détail des champs fautifs, un type stable pour les erreurs métier, et pour l'imprévu un 500 générique avec une référence, le détail restant dans les journaux"
glossary:
  - term: "Bean Validation"
    definition: "Spécification Jakarta de validation par annotations (@NotBlank, @Min, @Email…). Spring Boot fournit Hibernate Validator comme implémentation."
  - term: "ProblemDetail"
    definition: "Format standard d'erreur HTTP (RFC 9457) : un objet JSON avec type, title, status, detail, instance, et des propriétés d'extension."
  - term: "ErrorResponse"
    definition: "Interface de Spring pour une exception qui porte son statut, ses en-têtes et son corps ProblemDetail."
  - term: "@RestControllerAdvice"
    definition: "Composant dont les méthodes @ExceptionHandler s'appliquent à tous les contrôleurs (ou à une partie, selon ses attributs)."
  - term: "ResponseEntityExceptionHandler"
    definition: "Classe de base de Spring qui traduit chaque exception de Spring MVC en réponse ProblemDetail, avec une méthode à surcharger par type."
visuals: [spring-ch05-error-paths]
labs: [spring-ch05-l03-lab-debug-error-responses]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le même corps invalide est envoyé à deux applications : la première sans conseil, la seconde avec un `@RestControllerAdvice` **vide** qui étend `ResponseEntityExceptionHandler`. Qu'affiche le programme ?"
    code: |
      import jakarta.validation.Valid;
      import jakarta.validation.constraints.NotBlank;
      import org.springframework.context.annotation.*;
      import org.springframework.http.MediaType;
      import org.springframework.mock.web.MockServletContext;
      import org.springframework.test.web.servlet.assertj.MockMvcTester;
      import org.springframework.web.bind.annotation.*;
      import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
      import org.springframework.web.servlet.config.annotation.EnableWebMvc;
      import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

      public class Main {
          public record NewEvent(@NotBlank String name) { }

          @RestController
          public static class Events {
              @PostMapping("/events") public String create(@Valid @RequestBody NewEvent e) { return "ok"; }
          }

          @RestControllerAdvice
          public static class Problems extends ResponseEntityExceptionHandler { }

          @Configuration @EnableWebMvc
          public static class Web { @Bean Events events() { return new Events(); } }

          static void post(Class<?>... config) throws Exception {
              var ctx = new AnnotationConfigWebApplicationContext();
              ctx.setServletContext(new MockServletContext());
              ctx.register(config);
              ctx.refresh();
              var res = MockMvcTester.from(ctx).post().uri("/events")
                      .contentType(MediaType.APPLICATION_JSON).content("{\"name\": \"\"}").exchange().getResponse();
              System.out.println(res.getStatus() + " " + res.getContentType() + " " + res.getContentAsString().contains("Invalid request content"));
          }

          public static void main(String[] args) throws Exception {
              post(Web.class);
              post(Web.class, Problems.class);
          }
      }
    answer: "400 null false\n400 application/problem+json true"
    explanation: "Sans conseil, DefaultHandlerExceptionResolver traduit MethodArgumentNotValidException en 400 avec sendError : un statut, pas de corps (dans Spring Boot, ce serait le JSON générique de /error). Le conseil hérite d'un @ExceptionHandler pour chaque exception de Spring MVC : il écrit le ProblemDetail que l'exception porte déjà, en application/problem+json."
    concept: spring-ch05-problem-detail
  - id: c2
    type: single
    prompt: "`search(@RequestParam @Max(50) int size)`, dans un contrôleur **sans** `@Validated`. Que donne `GET /search?size=99` avec Spring Framework 7 ?"
    choices:
      - "200 : sans @Validated sur la classe, la contrainte est ignorée"
      - "400 : la validation de méthode est intégrée à Spring MVC depuis la version 6.1, elle voit la contrainte et lève HandlerMethodValidationException"
      - "500 : ConstraintViolationException non gérée"
      - "La contrainte est refusée à la compilation"
    answer: 1
    explanation: "Avant Spring 6.1, il fallait @Validated et un proxy AOP (ConstraintViolationException, 500 par défaut). Désormais, Spring MVC applique lui-même les contraintes posées sur les paramètres : HandlerMethodValidationException, une exception de Spring MVC traduite en 400. Avec @Validated sur la classe, c'est l'ancien mécanisme qui reprend la main, et l'erreur devient un 500 si personne ne la traduit."
    concept: spring-ch05-bean-validation
  - id: c3
    type: single
    prompt: "Un conseil a deux gestionnaires : `@ExceptionHandler(IllegalArgumentException.class)` et `@ExceptionHandler(RuntimeException.class)`. Le contrôleur lève `NumberFormatException`. Lequel répond ?"
    choices:
      - "Celui de RuntimeException, déclaré le plus haut"
      - "Celui d'IllegalArgumentException : NumberFormatException en hérite, c'est le type le plus proche"
      - "Les deux, l'un après l'autre"
      - "Aucun : il faut un gestionnaire pour le type exact"
    answer: 1
    explanation: "Spring mesure la distance d'héritage entre l'exception levée et chaque type déclaré (ExceptionDepthComparator), et choisit le plus proche : NumberFormatException → IllegalArgumentException (1 niveau) bat RuntimeException (2 niveaux). L'ordre d'écriture ne compte pas."
    concept: spring-ch05-controller-advice
---

## Pourquoi c'est important

Le partenaire de billetterie intègre l'API de Tixa. Il envoie une réservation à 9 places pour un maximum de 8, et reçoit `400 Bad Request`, sans un mot sur le champ fautif. Il envoie un identifiant d'événement inconnu : `500 Internal Server Error`. Le lendemain, un autre endpoint lui renvoie une trace Java complète, avec le nom de la base de données. Trois réponses, trois formats, et aucune ne l'aide à corriger sa requête.

Une API se juge autant sur ses erreurs que sur ses réponses. En Go, tu écrivais `http.Error(w, msg, code)` au cas par cas, ou un helper maison pour renvoyer un JSON d'erreur. Spring MVC fournit un format standard et un point central pour traduire les exceptions. Il reste à s'en servir, et à ne pas laisser fuir ce qui ne regarde pas le client.

## Valider les entrées

Spring Boot inclut Bean Validation (Hibernate Validator) avec `spring-boot-starter-validation`. Les contraintes s'écrivent sur les champs :

```java
record NewReservation(
        @NotBlank String event,
        @NotNull @Min(1) @Max(8) Integer seats,
        @Email String email) { }
```

Deux façons de déclencher la validation, avec deux exceptions différentes :

| Où est la contrainte | Ce qui la déclenche | Exception (400) |
|---|---|---|
| Dans l'objet d'un `@RequestBody` | `@Valid` sur le paramètre | `MethodArgumentNotValidException` |
| Directement sur un paramètre (`@RequestParam @Max(50) int size`) | rien : la validation de méthode est intégrée depuis Spring 6.1 | `HandlerMethodValidationException` |

::checkpoint{id="c2"}

Note le `Integer` pour `seats` : avec un `int`, un champ absent ferait échouer la lecture du JSON (leçon 2), avec une erreur qui ne nomme pas le champ. Avec `Integer` et `@NotNull`, c'est la validation qui répond, et elle dit **quel** champ manque.

## Un format d'erreur standard : ProblemDetail

La RFC 9457 définit un format d'erreur pour les API HTTP, servi en `application/problem+json` :

```json
{
  "type": "https://tixa.example/problems/event-not-found",
  "title": "Événement introuvable",
  "status": 404,
  "detail": "Aucun événement 42",
  "instance": "/events/42",
  "eventId": 42
}
```

`type` identifie la **sorte** de problème (une URI stable, que le client peut tester), `title` la résume, `detail` décrit **cette** occurrence, `instance` désigne la requête. Les autres propriétés sont libres : ici `eventId`, ou une liste des champs fautifs.

Spring le représente par la classe `ProblemDetail`. Et toutes les exceptions de Spring MVC (`MethodArgumentNotValidException`, `HttpMediaTypeNotSupportedException`, `NoResourceFoundException`…) implémentent `ErrorResponse` : elles **portent déjà** leur statut et leur `ProblemDetail`. Il suffit que quelqu'un l'écrive.

Ce quelqu'un, c'est `ResponseEntityExceptionHandler` : une classe de base avec un `@ExceptionHandler` pour chacune de ces exceptions. Un conseil qui l'étend, même vide, fait sortir toutes les erreurs de Spring MVC en ProblemDetail.

::checkpoint{id="c1"}

> **Spring Boot :** `spring.mvc.problemdetails.enabled=true` enregistre ce conseil pour toi. Mais il ne couvre que les exceptions **de Spring MVC**. Une exception à toi (`EventNotFoundException`) ou une `IllegalStateException` continue vers `/error` et son JSON générique en 500. Pour celles-là, il faut décider.

## Un point central : `@RestControllerAdvice`

Les erreurs se traduisent dans un **conseil** : une classe `@RestControllerAdvice` dont les méthodes `@ExceptionHandler` s'appliquent à tous les contrôleurs.

```java title="ApiErrors.java"
@RestControllerAdvice
class ApiErrors extends ResponseEntityExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiErrors.class);

    // 1. La validation : on ajoute la liste des champs fautifs au ProblemDetail fourni par Spring.
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = ex.getBody();
        problem.setProperty("errors", ex.getFieldErrors().stream()
                .map(f -> Map.of("field", f.getField(), "message", String.valueOf(f.getDefaultMessage())))
                .toList());
        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    // 2. L'imprévu : un 500 générique, avec une référence ; le détail reste dans les journaux.
    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception ex) {
        String ref = UUID.randomUUID().toString();
        log.error("erreur {}", ref, ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur interne. Référence : " + ref);
    }
}
```

Pour une erreur **métier**, le plus simple est une exception qui porte son propre ProblemDetail :

```java
class EventNotFoundException extends ErrorResponseException {
    EventNotFoundException(long id) {
        super(HttpStatus.NOT_FOUND, ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Aucun événement " + id), null);
        getBody().setType(URI.create("https://tixa.example/problems/event-not-found"));
        getBody().setTitle("Événement introuvable");
        getBody().setProperty("eventId", id);
    }
}
```

`ResponseEntityExceptionHandler` sait déjà écrire une `ErrorResponseException` : rien à ajouter dans le conseil.

Quand plusieurs gestionnaires conviennent, Spring choisit celui dont le type est le **plus proche** de l'exception levée (distance d'héritage). Le gestionnaire général d'`Exception` ne vole donc pas les exceptions de Spring MVC : leurs gestionnaires dédiés sont plus proches.

::checkpoint{id="c3"}

::visual{id="spring-ch05-error-paths"}

> **Sous le capot :** c'est `ExceptionHandlerExceptionResolver`, le premier résolveur de la leçon 1, qui consulte les `@ExceptionHandler`, d'abord ceux du **contrôleur** qui a levé l'exception, puis ceux des conseils, dans l'ordre de leur `@Order`. Il réutilise les mêmes gestionnaires de valeurs de retour que les méthodes ordinaires : un `ProblemDetail` renvoyé est écrit par les convertisseurs, en `application/problem+json`, et Spring remplit `instance` avec le chemin de la requête s'il est vide.

## Pièges fréquents

- **Renvoyer `ex.getMessage()` au client** pour une exception imprévue : messages SQL, chemins de fichiers, noms d'hôtes. Le client reçoit une référence ; le message va dans les journaux.
- **Activer `spring.mvc.problemdetails.enabled` et croire que tout est couvert** : tes propres exceptions restent en 500 générique.
- **`@Validated` sur un contrôleur en Spring 6.1+** : la validation intégrée s'efface devant l'ancien mécanisme, un proxy AOP qui lève `ConstraintViolationException`. Ce n'est pas une exception de Spring MVC : sans gestionnaire, c'est un **500**, même avec ProblemDetail activé.
- **Tester l'ordre des erreurs de champ** : l'ordre de la liste n'est pas garanti. Les tests comparent des ensembles.
- **Un `int` pour un champ JSON obligatoire** : l'erreur de lecture arrive avant la validation, et ne nomme pas le champ.

## À retenir

- `@Valid @RequestBody` → `MethodArgumentNotValidException` ; contrainte sur un paramètre → `HandlerMethodValidationException`. Les deux en 400.
- ProblemDetail (RFC 9457) : `type`, `title`, `status`, `detail`, `instance`, et des propriétés libres, en `application/problem+json`.
- Un `@RestControllerAdvice` qui étend `ResponseEntityExceptionHandler` écrit toutes les erreurs de Spring MVC en ProblemDetail ; surcharge `handleMethodArgumentNotValid` pour lister les champs.
- Erreur métier : une `ErrorResponseException` avec un `type` stable. Imprévu : 500 générique avec une référence, détail dans les journaux.

> **Source :** Spring Framework 7, [Error Responses](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html), [Validation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html) et [Exceptions (@ExceptionHandler)](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-exceptionhandler.html) ; Spring Boot 4.1, [Servlet Web Applications — Error Handling](https://docs.spring.io/spring-boot/4.1/reference/web/servlet.html#web.servlet.spring-mvc.error-handling) ; [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457).
