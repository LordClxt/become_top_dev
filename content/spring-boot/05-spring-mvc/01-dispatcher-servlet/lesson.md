---
id: spring-ch05-l01
title: "Le trajet d'une requête : de Tomcat au contrôleur"
source: { book: spring-docs, chapter: 31, pages: "#mvc-servlet", url: "https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html" }
duration_min: 30
concepts:
  - id: spring-ch05-front-controller
    label: "DispatcherServlet est le contrôleur frontal : une seule servlet reçoit toutes les requêtes et délègue à des stratégies trouvées dans le contexte (mappings, adaptateurs, résolveurs)"
  - id: spring-ch05-handler-mapping
    label: "HandlerMapping trouve le handler et ses intercepteurs (HandlerExecutionChain) ; HandlerAdapter sait l'appeler. Pour @RequestMapping : RequestMappingHandlerMapping et RequestMappingHandlerAdapter"
  - id: spring-ch05-response-body
    label: "@RestController = @Controller + @ResponseBody : la valeur de retour est écrite dans le corps par un HttpMessageConverter ; sans @ResponseBody, elle est prise pour un modèle à rendre par une vue"
  - id: spring-ch05-exception-resolvers
    label: "Une exception du handler passe par les HandlerExceptionResolver (@ExceptionHandler, @ResponseStatus, exceptions standard de Spring MVC) ; non résolue, elle remonte au conteneur, et Spring Boot la rend via /error"
glossary:
  - term: "contrôleur frontal"
    definition: "Patron où un point d'entrée unique reçoit toutes les requêtes et les répartit. Dans Spring MVC, c'est la DispatcherServlet."
  - term: "handler"
    definition: "L'objet qui traite une requête. Avec les annotations, c'est une méthode de contrôleur, représentée par un HandlerMethod."
  - term: "HandlerExecutionChain"
    definition: "Le handler trouvé par un HandlerMapping, accompagné des intercepteurs qui s'appliquent à cette requête."
  - term: "HttpMessageConverter"
    definition: "Composant qui lit un corps de requête en objet Java, ou écrit un objet Java dans le corps de la réponse (JSON avec Jackson, texte, octets…)."
  - term: "/error"
    definition: "Le chemin d'erreur que Spring Boot enregistre dans Tomcat : une exception non résolue ou un statut d'erreur y est renvoyé, et BasicErrorController écrit la réponse."
visuals: [spring-ch05-request-journey]
labs: [spring-ch05-l01-lab-warmup-json-controller]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un intercepteur note son passage, et le contrôleur aussi. Trois requêtes : un id valide, un id qui n'est pas un nombre, une route inconnue. Qu'affiche le programme ?"
    code: |
      import jakarta.servlet.http.*;
      import org.springframework.context.annotation.*;
      import org.springframework.mock.web.MockServletContext;
      import org.springframework.test.web.servlet.assertj.MockMvcTester;
      import org.springframework.web.bind.annotation.*;
      import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
      import org.springframework.web.servlet.*;
      import org.springframework.web.servlet.config.annotation.*;

      public class Main {
          static final StringBuilder log = new StringBuilder();

          @RestController
          public static class Events {
              @GetMapping("/events/{id}")
              public String one(@PathVariable("id") long id) { log.append("handler "); return "jazz"; }
          }

          @Configuration @EnableWebMvc
          public static class Web implements WebMvcConfigurer {
              @Bean Events events() { return new Events(); }
              public void addInterceptors(InterceptorRegistry r) {
                  r.addInterceptor(new HandlerInterceptor() {
                      public boolean preHandle(HttpServletRequest q, HttpServletResponse s, Object h) { log.append("pre "); return true; }
                      public void postHandle(HttpServletRequest q, HttpServletResponse s, Object h, ModelAndView mv) { log.append("post "); }
                      public void afterCompletion(HttpServletRequest q, HttpServletResponse s, Object h, Exception ex) { log.append("after "); }
                  });
              }
          }

          public static void main(String[] args) {
              var ctx = new AnnotationConfigWebApplicationContext();
              ctx.setServletContext(new MockServletContext());
              ctx.register(Web.class);
              ctx.refresh();
              var mvc = MockMvcTester.from(ctx);
              for (String uri : new String[] { "/events/7", "/events/abc", "/concerts" }) {
                  log.setLength(0);
                  int status = mvc.get().uri(uri).exchange().getResponse().getStatus();
                  System.out.println(status + " [" + log.toString().trim() + "]");
              }
          }
      }
    answer: "200 [pre handler post after]\n400 [pre after]\n404 []"
    explanation: "Pour /events/7, tout le trajet : preHandle, la méthode, postHandle, afterCompletion. Pour /events/abc, le handler est trouvé (les intercepteurs tournent) mais « abc » ne se convertit pas en long : l'adaptateur échoue avant d'appeler la méthode, un résolveur d'exceptions répond 400, et postHandle est sauté. Pour /concerts, aucun handler : pas de chaîne, donc pas d'intercepteur du tout."
    concept: spring-ch05-handler-mapping
  - id: c2
    type: single
    prompt: "Dans une application Spring Boot sans moteur de templates, une classe annotée `@Controller` (pas `@RestController`) a une méthode `@GetMapping(\"/plain\") Event plain()`. Que reçoit le client ?"
    choices:
      - "Le JSON de l'événement : Spring Boot devine qu'il s'agit d'une API"
      - "Une erreur 500 : sans @ResponseBody, l'objet est pris pour un modèle, et Spring cherche une vue à rendre, qui n'existe pas"
      - "Une réponse 204 sans corps"
      - "Une erreur au démarrage de l'application"
    answer: 1
    explanation: "C'est @ResponseBody (porté par @RestController) qui envoie la valeur de retour vers un HttpMessageConverter. Sans lui, la méthode alimente un modèle, et la DispatcherServlet cherche une vue (ici déduite de l'URL). Aucune vue n'existe : 500. Le démarrage, lui, se passe bien : rien n'est vérifié avant la première requête."
    concept: spring-ch05-response-body
  - id: c3
    type: single
    prompt: "Un contrôleur lève `IllegalStateException(\"secret interne\")`, et personne ne la gère. Dans une application Spring Boot, que se passe-t-il ?"
    choices:
      - "Spring renvoie le message de l'exception au client, avec un statut 400"
      - "La connexion est coupée sans réponse"
      - "Aucun résolveur ne la reconnaît : elle remonte à Tomcat, qui renvoie la requête vers /error, où Spring Boot écrit un 500 générique, sans le message"
      - "La DispatcherServlet la convertit toujours en ProblemDetail"
    answer: 2
    explanation: "Les trois résolveurs par défaut (@ExceptionHandler, @ResponseStatus, exceptions standard de Spring MVC) ne connaissent pas cette exception. Elle sort de la DispatcherServlet ; Tomcat applique la page d'erreur que Spring Boot a enregistrée, /error, et BasicErrorController écrit un 500. Par défaut, le message n'est pas inclus : tant mieux, c'est un secret interne."
    concept: spring-ch05-exception-resolvers
---

## Pourquoi c'est important

Vendredi, 18 h, la nouvelle API de Tixa part en recette. Trois tickets arrivent dans l'heure : `GET /events/abc` répond 400 sans un mot, `GET /event/12` (sans « s ») répond 404, et l'écran d'administration affiche un 500 sur une page qui « marchait en local ». Les trois viennent du même endroit : le **trajet** d'une requête dans Spring MVC, que personne dans l'équipe ne savait dessiner.

Ce trajet, tu l'as déjà vu en Go : `net/http` appelle un `http.Handler`, souvent un routeur qui choisit la fonction, entouré de middlewares. Spring MVC fait la même chose, avec plus de pièces, chacune remplaçable. Savoir laquelle intervient, et dans quel ordre, c'est savoir **où** regarder quand une réponse n'est pas celle qu'on attend.

## Le contrôleur frontal

Dans une application Spring Boot avec `spring-boot-starter-webmvc`, Tomcat ne connaît qu'une servlet utile : la **`DispatcherServlet`**, enregistrée sur `/`. Toutes les requêtes passent par elle. C'est le patron du **contrôleur frontal** : un point d'entrée unique qui ne traite rien lui-même et répartit le travail.

Avant elle, il y a les **filtres** de servlet (leçon 4) : encodage, sécurité, traces. Après elle, il y a ton code. Entre les deux, la `DispatcherServlet` enchaîne des **stratégies** qu'elle va chercher dans le contexte Spring, par type (ce que la documentation appelle les *special bean types*) :

| Stratégie | Rôle | Implémentation pour `@RequestMapping` |
|---|---|---|
| `HandlerMapping` | trouver qui traite la requête, et ses intercepteurs | `RequestMappingHandlerMapping` |
| `HandlerAdapter` | savoir appeler ce handler | `RequestMappingHandlerAdapter` |
| `HandlerExceptionResolver` | transformer une exception en réponse | trois résolveurs, dans l'ordre (plus bas) |
| `ViewResolver` | trouver une vue à partir d'un nom | inutile pour une API JSON |

C'est le même principe que le conteneur du module 1 : la `DispatcherServlet` ne crée pas ses collaborateurs, elle les **reçoit** du contexte. Spring Boot les déclare (`WebMvcAutoConfiguration`, module 4), et tu peux en ajouter ou en remplacer.

## La boucle `doDispatch`

Le cœur tient dans une méthode, `DispatcherServlet.doDispatch`. Simplifiée, elle fait ceci :

1. Demander aux `HandlerMapping`, dans l'ordre, un **handler** pour la requête. `RequestMappingHandlerMapping` compare le chemin, la méthode HTTP, les en-têtes et les types de contenu aux `@RequestMapping` connus. Il renvoie une `HandlerExecutionChain` : la méthode de contrôleur (un `HandlerMethod`), plus les **intercepteurs** qui s'appliquent.
2. Aucun handler ? Réponse 404. Dans Spring Boot, il y en a presque toujours un : le gestionnaire de ressources statiques, consulté en dernier pour `/**`, qui répond lui-même 404 (`No static resource …`). Tes intercepteurs voient donc passer aussi les URL inconnues.
3. Trouver le `HandlerAdapter` qui sait appeler ce handler.
4. Appeler `preHandle` de chaque intercepteur. Si l'un répond `false`, on s'arrête.
5. **`ha.handle(...)`** : l'adaptateur prépare les arguments, appelle ta méthode, puis traite la valeur de retour.
6. Appeler `postHandle` des intercepteurs, dans l'ordre inverse.
7. Résoudre une éventuelle exception, puis rendre une vue s'il y en a une.
8. Toujours, même en cas d'échec : `afterCompletion` des intercepteurs dont le `preHandle` a réussi.

::visual{id="spring-ch05-request-journey"}

::checkpoint{id="c1"}

L'étape 5 cache presque tout le travail : c'est l'adaptateur qui convertit `"abc"` en `long` (et échoue), qui lit le JSON du corps, qui valide, puis qui écrit la réponse. C'est l'objet de la leçon 2.

> **Sous le capot :** `@RestController` n'est qu'un raccourci pour `@Controller` + `@ResponseBody`. Pendant l'étape 5, un `HandlerMethodReturnValueHandler` regarde la valeur de retour. Avec `@ResponseBody`, c'est `RequestResponseBodyMethodProcessor` : il choisit un `HttpMessageConverter` (Jackson 3 pour un objet, le texte pour un `String`), écrit le corps, et marque la requête comme traitée. Il n'y aura pas de vue. Sans `@ResponseBody`, l'objet devient un attribut de **modèle**, et la `DispatcherServlet` cherche une **vue** à l'étape 7.

::checkpoint{id="c2"}

## Quand ça casse : les résolveurs d'exceptions

Une exception levée pendant les étapes 3 à 6 n'interrompt pas tout. La `DispatcherServlet` la confie à ses `HandlerExceptionResolver`, dans cet ordre :

1. `ExceptionHandlerExceptionResolver` : une méthode `@ExceptionHandler`, dans le contrôleur ou dans un `@ControllerAdvice` (leçon 3).
2. `ResponseStatusExceptionResolver` : une exception annotée `@ResponseStatus`, ou une `ResponseStatusException`.
3. `DefaultHandlerExceptionResolver` : les exceptions **de Spring MVC lui-même**, traduites en statut. Conversion impossible (`MethodArgumentTypeMismatchException`) : 400. Corps illisible : 400. Méthode HTTP non prise en charge : 405. Type de réponse impossible à produire (`Accept: application/xml` sur une API JSON) : 406.

Si un résolveur répond, l'exception est **résolue** : le client voit le statut choisi, et `afterCompletion` reçoit `null` au lieu de l'exception. Si aucun ne la reconnaît, elle sort de la `DispatcherServlet` et remonte à Tomcat.

Spring Boot a prévu ce cas : il enregistre dans Tomcat une **page d'erreur** globale, `/error`. Tomcat rejoue alors la requête vers ce chemin (un *dispatch* d'erreur), où `BasicErrorController` écrit un 500 générique : horodatage, statut, chemin. Le message de l'exception **n'est pas inclus** par défaut (`server.error.include-message=never`), pour ne pas révéler l'intérieur de l'application.

::checkpoint{id="c3"}

Conséquence pratique : une requête qui échoue traverse **deux fois** la `DispatcherServlet` (la requête, puis `/error`), et donc deux fois tes intercepteurs. Tu le vérifieras à la leçon 4.

## Pièges fréquents

- **`@Controller` au lieu de `@RestController`** pour une API : la valeur de retour part vers un moteur de vues, et le client reçoit un 500.
- **Chercher le bug dans la méthode alors qu'elle n'est jamais appelée** : un 400 sur `/events/abc` vient de la conversion de l'argument, avant l'appel. Un point d'arrêt dans la méthode ne s'arrêtera pas.
- **Compter sur `postHandle`** pour toutes les requêtes : il est sauté dès qu'une exception survient.
- **Croire que Spring renvoie le message de l'exception** : par défaut, Spring Boot le cache. Pour un message utile au client, il faut le décider explicitement (leçon 3).
- **Oublier `-parameters`** : `@PathVariable long id` sans nom explicite suppose que le compilateur garde le nom des paramètres. Maven et Gradle le font avec Spring Boot ; un `javac` nu, non.

## À retenir

- Une seule servlet, la `DispatcherServlet`, enchaîne des stratégies trouvées dans le contexte : `HandlerMapping` → intercepteurs `preHandle` → `HandlerAdapter` → `postHandle` → résolution des exceptions → `afterCompletion`.
- `@ResponseBody` (dans `@RestController`) fait écrire la valeur de retour par un `HttpMessageConverter` ; sinon, Spring cherche une vue.
- Exceptions : `@ExceptionHandler`, puis `@ResponseStatus`, puis les exceptions standard de Spring MVC. Non résolue, l'exception finit dans `/error`, en 500 générique.
- Pour diagnostiquer, situe le problème sur le trajet : pas de handler (404), argument (400 avant l'appel), méthode (ton code), écriture de la réponse (406), exception non gérée (500 via `/error`).

> **Source :** Spring Framework 7, [DispatcherServlet](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html), [Special Bean Types](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/special-bean-types.html), [Processing](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/sequence.html) et [Exceptions](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/exceptionhandlers.html) ; Spring Boot 4.1, [Servlet Web Applications — Error Handling](https://docs.spring.io/spring-boot/4.1/reference/web/servlet.html#web.servlet.spring-mvc.error-handling) ; code de [`DispatcherServlet.doDispatch`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-webmvc/src/main/java/org/springframework/web/servlet/DispatcherServlet.java) (v7.0.11).
