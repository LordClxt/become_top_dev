---
id: spring-ch05-l02
title: "Arguments et réponses : résolveurs, conversion et convertisseurs de messages"
source: { book: spring-docs, chapter: 32, pages: "#mvc-ann-methods", url: "https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods.html" }
duration_min: 35
concepts:
  - id: spring-ch05-argument-resolvers
    label: "Chaque paramètre est fourni par le premier HandlerMethodArgumentResolver qui le prend en charge : d'abord les annotations intégrées, puis les résolveurs de l'application, puis les « attrape-tout » (type simple : @RequestParam implicite, sinon @ModelAttribute)"
  - id: spring-ch05-type-conversion
    label: "Chemin, paramètres et en-têtes sont des chaînes : la conversion vers le type du paramètre passe par le ConversionService ; un échec (400) ou un paramètre obligatoire absent (400) arrive avant l'appel"
  - id: spring-ch05-message-converters
    label: "@RequestBody et la valeur de retour passent par un HttpMessageConverter : choisi par Content-Type à la lecture (415 si aucun), par Accept et ce qu'il sait produire à l'écriture (406 si aucun) ; Jackson 3 pour le JSON dans Spring Boot 4"
  - id: spring-ch05-custom-resolver
    label: "Un HandlerMethodArgumentResolver maison (supportsParameter + resolveArgument), enregistré par WebMvcConfigurer.addArgumentResolvers, injecte une valeur calculée depuis la requête, comme le client appelant"
glossary:
  - term: "HandlerMethodArgumentResolver"
    definition: "Stratégie de Spring MVC qui fournit la valeur d'un paramètre de méthode de contrôleur à partir de la requête."
  - term: "ConversionService"
    definition: "Service de conversion de types de Spring : transforme la chaîne « 42 » en long, « 2026-07-03 » en LocalDate, etc."
  - term: "négociation de contenu"
    definition: "Choix du format de la réponse en croisant l'en-tête Accept du client et les types que les convertisseurs savent produire."
  - term: "ResponseEntity"
    definition: "Valeur de retour qui porte le statut, les en-têtes et le corps de la réponse."
  - term: "WebMvcConfigurer"
    definition: "Interface de rappel pour ajuster Spring MVC (résolveurs, intercepteurs, convertisseurs, versionnement) sans remplacer la configuration de Spring Boot."
visuals: [spring-ch05-resolver-chain]
labs: [spring-ch05-l02-lab-current-customer]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un résolveur maison prétend fournir **tous** les paramètres de type `String`. Qu'affiche le programme ?"
    code: |
      import org.springframework.context.annotation.*;
      import org.springframework.core.MethodParameter;
      import org.springframework.mock.web.MockServletContext;
      import org.springframework.test.web.servlet.assertj.MockMvcTester;
      import org.springframework.web.bind.annotation.*;
      import org.springframework.web.bind.support.WebDataBinderFactory;
      import org.springframework.web.context.request.NativeWebRequest;
      import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
      import org.springframework.web.method.support.*;
      import org.springframework.web.servlet.config.annotation.*;

      public class Main {
          @RestController
          public static class Search {
              @GetMapping("/search")
              public String search(@RequestParam("q") String q, String city) { return "q=" + q + " city=" + city; }
          }

          /** Fournit tout paramètre de type String… en théorie. */
          static class Shout implements HandlerMethodArgumentResolver {
              public boolean supportsParameter(MethodParameter p) { return p.getParameterType() == String.class; }
              public Object resolveArgument(MethodParameter p, ModelAndViewContainer m, NativeWebRequest r, WebDataBinderFactory f) { return "SHOUT"; }
          }

          @Configuration @EnableWebMvc
          public static class Web implements WebMvcConfigurer {
              @Bean Search search() { return new Search(); }
              public void addArgumentResolvers(java.util.List<HandlerMethodArgumentResolver> resolvers) { resolvers.add(new Shout()); }
          }

          public static void main(String[] args) throws Exception {
              var ctx = new AnnotationConfigWebApplicationContext();
              ctx.setServletContext(new MockServletContext());
              ctx.register(Web.class);
              ctx.refresh();
              var mvc = MockMvcTester.from(ctx);
              System.out.println(mvc.get().uri("/search?q=jazz&city=Lyon").exchange().getResponse().getContentAsString());
          }
      }
    answer: "q=jazz city=SHOUT"
    explanation: "Les résolveurs des annotations intégrées passent avant ceux de l'application : @RequestParam(\"q\") est servi par RequestParamMethodArgumentResolver, et Shout n'est même pas consulté. Le paramètre city, sans annotation, aurait été pris par l'attrape-tout (un @RequestParam implicite)… qui passe après les résolveurs de l'application : Shout le prend."
    concept: spring-ch05-argument-resolvers
  - id: c2
    type: single
    prompt: "`POST /events` attend `@RequestBody NewEvent event`. Un client envoie un JSON valide, mais avec l'en-tête `Content-Type: text/plain`. Que répond Spring ?"
    choices:
      - "200 : Jackson lit le JSON quel que soit l'en-tête"
      - "415 Unsupported Media Type : aucun convertisseur ne sait lire text/plain vers NewEvent"
      - "406 Not Acceptable"
      - "400 Bad Request : le JSON est invalide"
    answer: 1
    explanation: "À la lecture, le convertisseur est choisi d'après le Content-Type de la requête. Le convertisseur JSON ne lit que application/json (et +json) ; le convertisseur de texte ne sait produire qu'un String. Personne ne peut lire : HttpMediaTypeNotSupportedException, 415. Le 406, lui, concerne l'écriture de la réponse."
    concept: spring-ch05-message-converters
  - id: c3
    type: single
    prompt: "`search(@RequestParam int page)` est appelé avec `GET /search`, sans paramètre. Que se passe-t-il ?"
    choices:
      - "page vaut 0, la valeur par défaut d'un int"
      - "400 : @RequestParam est obligatoire par défaut, et l'absence est détectée avant l'appel"
      - "500 : NullPointerException en convertissant null en int"
      - "La route ne correspond pas : 404"
    answer: 1
    explanation: "required vaut true par défaut : MissingServletRequestParameterException, traduite en 400 par DefaultHandlerExceptionResolver. Pour une page facultative : @RequestParam(defaultValue = \"0\") int page, ou un Integer avec required = false."
    concept: spring-ch05-type-conversion
---

## Pourquoi c'est important

Dans chaque contrôleur de Tixa, les mêmes quatre lignes reviennent : lire l'en-tête `X-Customer-Id`, vérifier qu'il est là, le convertir, charger le client, et répondre 401 sinon. Copiées dans trente méthodes, elles divergent : l'une oublie la vérification, l'autre répond 403 au lieu de 401. Et le jour où l'identifiant passe dans un jeton, il faut tout reprendre.

Spring MVC a une réponse à ce problème : c'est lui qui **fournit** les paramètres de tes méthodes, et tu peux lui apprendre un nouveau type de paramètre. Pour le faire proprement, il faut savoir comment il choisit qui fournit quoi, et comment il écrit la réponse. En Go, tu aurais écrit un middleware qui range le client dans le `context.Context`, puis un `ctx.Value(...)` avec assertion de type dans chaque handler. Ici, le client arrive **typé** dans la signature.

## Une chaîne de résolveurs

À l'étape 5 du trajet (leçon 1), `RequestMappingHandlerAdapter` prépare chaque paramètre de ta méthode. Pour chacun, il interroge une liste de `HandlerMethodArgumentResolver` : le **premier** dont `supportsParameter` répond oui fournit la valeur, avec `resolveArgument`.

L'ordre de cette liste est fixe, en trois groupes :

1. **Les annotations intégrées** : `@PathVariable`, `@RequestParam`, `@RequestHeader`, `@RequestBody`, `@CookieValue`…, puis les types connus (`HttpServletRequest`, `Principal`, `Locale`…).
2. **Les résolveurs de l'application**, ajoutés par `WebMvcConfigurer.addArgumentResolvers`.
3. **Les attrape-tout** : un paramètre sans annotation est un `@RequestParam` implicite s'il est d'un type simple (`String`, `int`, `LocalDate`…), et un `@ModelAttribute` sinon.

::visual{id="spring-ch05-resolver-chain"}

::checkpoint{id="c1"}

Conséquence : un résolveur maison **ne peut pas** voler un paramètre annoté `@RequestParam` ou `@RequestBody`. Il peut, en revanche, prendre un paramètre sans annotation avant les attrape-tout. D'où la règle : donne à ton résolveur un critère étroit, **un type à toi ou une annotation à toi**, jamais `String`.

## Des chaînes aux types : la conversion

Le chemin, les paramètres et les en-têtes arrivent en texte. Pour `@PathVariable long id` ou `@RequestParam LocalDate from`, Spring passe par un `WebDataBinder` et le **`ConversionService`** : `"42"` devient `42L`, `"2026-07-03"` devient une date.

Deux échecs possibles, tous deux **avant** l'appel de ta méthode :
- la conversion échoue (`"abc"` en `long`) : `MethodArgumentTypeMismatchException`, **400** ;
- un paramètre obligatoire manque : `MissingServletRequestParameterException`, **400**. `@RequestParam` est obligatoire par défaut ; `defaultValue` le rend facultatif.

::checkpoint{id="c3"}

## Les corps : `HttpMessageConverter`

Le corps de la requête et celui de la réponse ne passent pas par la conversion de chaînes, mais par les **`HttpMessageConverter`**. Chacun déclare ce qu'il sait **lire** et **écrire** : un type Java et des types de contenu.

- **À la lecture** (`@RequestBody`) : Spring prend le premier convertisseur qui sait lire ce type depuis le `Content-Type` de la requête. Aucun : **415 Unsupported Media Type**. Corps illisible (JSON mal formé) : **400**.
- **À l'écriture** (`@ResponseBody`, `ResponseEntity`) : c'est la **négociation de contenu**. Spring croise l'en-tête `Accept` du client avec les types que les convertisseurs savent produire pour cet objet, et choisit le plus précis. Intersection vide : **406 Not Acceptable**.

::checkpoint{id="c2"}

Dans Spring Boot 4, le JSON passe par **Jackson 3** (paquet `tools.jackson`, module 4) et son `JsonMapper`, que Spring Boot configure (propriétés `spring.jackson.*`, ou un bean `JsonMapperBuilderCustomizer`). Avec les réglages par défaut de Jackson 3, les dates `java.time` s'écrivent en texte ISO (`"2026-07-03"`), un champ inconnu dans le JSON reçu est **ignoré**, mais un champ **primitif** (`int`, `boolean`…) absent ou `null` fait échouer la lecture : 400.

> **Sous le capot :** la valeur de retour suit le même schéma que les arguments, avec des `HandlerMethodReturnValueHandler`. `ResponseEntity`, `@ResponseBody`, un `String` sans `@ResponseBody` (nom de vue), `void`… chacun a son gestionnaire. `HttpEntityMethodProcessor` (pour `ResponseEntity`) applique le statut et les en-têtes, puis délègue l'écriture du corps aux convertisseurs. `ResponseEntity` est donc l'outil quand le statut dépend du résultat : `ResponseEntity.of(optional)` pour 200 ou 404, `ResponseEntity.created(uri).body(x)` pour 201 avec `Location`.

## Écrire son résolveur

Le client appelant de Tixa devient un paramètre comme un autre :

```java title="ReservationController.java"
@GetMapping("/me/reservations")
List<Reservation> mine(@CurrentCustomer Customer customer) {
    return reservations.of(customer.id());
}
```

Trois pièces : une annotation (le critère étroit), le résolveur, son enregistrement.

```java title="CurrentCustomerResolver.java"
@Target(ElementType.PARAMETER) @Retention(RetentionPolicy.RUNTIME)
public @interface CurrentCustomer { }

class CurrentCustomerResolver implements HandlerMethodArgumentResolver {
    private final CustomerDirectory directory;

    CurrentCustomerResolver(CustomerDirectory directory) { this.directory = directory; }

    @Override
    public boolean supportsParameter(MethodParameter p) {
        return p.hasParameterAnnotation(CurrentCustomer.class) && p.getParameterType() == Customer.class;
    }

    @Override
    public Object resolveArgument(MethodParameter p, ModelAndViewContainer mav,
                                  NativeWebRequest request, WebDataBinderFactory binders) {
        String id = request.getHeader("X-Customer-Id");
        return directory.find(id)   // Optional<Customer>
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "client inconnu"));
    }
}

@Configuration
class WebConfig implements WebMvcConfigurer {
    private final CustomerDirectory directory;
    WebConfig(CustomerDirectory directory) { this.directory = directory; }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new CurrentCustomerResolver(directory));
    }
}
```

`supportsParameter` est appelé une fois par paramètre, puis mis en cache : garde-le rapide et sans effet de bord. `resolveArgument` peut lever une exception : elle suit le chemin des résolveurs d'exceptions (leçon 1), d'où le 401 de `ResponseStatusException`.

> **Attention :** `implements WebMvcConfigurer` **ajoute** à la configuration de Spring Boot. Une classe annotée `@EnableWebMvc` la **remplacerait** entièrement : convertisseurs, ressources statiques, réglages de Jackson… tout ce que `WebMvcAutoConfiguration` faisait disparaît.

## Pièges fréquents

- **Un résolveur trop large** (`supportsParameter` sur `String` ou `Object`) : il ne voit pas les paramètres annotés, et vole les autres. Toujours un type ou une annotation dédiés.
- **`@EnableWebMvc` dans une application Spring Boot** : la configuration automatique de Spring MVC s'efface, et des réglages « disparaissent » sans erreur.
- **Confondre 415 et 406** : 415, Spring ne sait pas **lire** ce que le client envoie (`Content-Type`) ; 406, il ne sait pas **produire** ce que le client demande (`Accept`).
- **Un `int` dans un corps JSON** : avec Jackson 3, un champ primitif absent ou `null` fait échouer la lecture (`FAIL_ON_NULL_FOR_PRIMITIVES` est désormais activé par défaut), et le client reçoit un 400 qui ne nomme pas le champ. Un `Integer` avec `@NotNull` (leçon 3) produit une erreur qui dit **quel** champ manque.
- **Faire le travail du résolveur dans un filtre** puis le relire avec `request.getAttribute(...)` dans chaque méthode : on perd le typage, et chaque méthode doit se souvenir de le faire.

## À retenir

- Chaque paramètre vient du premier résolveur qui l'accepte : annotations intégrées, puis résolveurs de l'application, puis attrape-tout.
- Chemin, paramètres, en-têtes : conversion de chaînes (400 si elle échoue ou si un paramètre obligatoire manque), avant l'appel.
- Corps : `HttpMessageConverter`. Lecture selon `Content-Type` (415), écriture selon `Accept` (406). Jackson 3 dans Spring Boot 4.
- Un résolveur maison = une annotation à toi, `supportsParameter` étroit, `resolveArgument`, et `addArgumentResolvers` dans un `WebMvcConfigurer` (jamais `@EnableWebMvc` avec Spring Boot).

> **Source :** Spring Framework 7, [Handler Methods — Method Arguments](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/arguments.html), [Return Values](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/return-types.html), [@RequestBody](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/requestbody.html) et [Message Converters](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/message-converters.html) ; code de [`RequestMappingHandlerAdapter.getDefaultArgumentResolvers`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-webmvc/src/main/java/org/springframework/web/servlet/mvc/method/annotation/RequestMappingHandlerAdapter.java) (v7.0.11).
