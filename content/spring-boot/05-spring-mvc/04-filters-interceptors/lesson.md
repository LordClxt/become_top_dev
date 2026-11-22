---
id: spring-ch05-l04
title: "Filtres et intercepteurs : qui voit quoi, et quand"
source: { book: spring-docs, chapter: 35, pages: "#filters", url: "https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html" }
duration_min: 30
concepts:
  - id: spring-ch05-servlet-filter
    label: "Un filtre de servlet entoure la DispatcherServlet : il voit toutes les requêtes (y compris 404, ressources statiques, erreurs) mais ignore quel handler les traite ; OncePerRequestFilter ne repasse pas sur le dispatch d'erreur"
  - id: spring-ch05-handler-interceptor
    label: "Un HandlerInterceptor connaît le handler : preHandle peut arrêter la requête, postHandle est sauté en cas d'exception, afterCompletion est toujours appelé ; il repasse sur /error"
  - id: spring-ch05-response-commit
    label: "Une fois le corps écrit et envoyé, statut et en-têtes sont figés : un en-tête ajouté dans postHandle est perdu selon le convertisseur (texte), et MockMvc ne le montre pas"
  - id: spring-ch05-correlation-id
    label: "Identifiant de corrélation : lu dans X-Request-Id s'il est sûr, sinon généré, posé sur la réponse avant la chaîne, mis dans le MDC des journaux et retiré dans un finally"
glossary:
  - term: "Filter"
    definition: "Composant de l'API Servlet qui entoure le traitement d'une requête : il peut lire ou modifier la requête et la réponse, puis appelle chain.doFilter pour continuer."
  - term: "OncePerRequestFilter"
    definition: "Classe de base de Spring pour un filtre qui ne s'exécute qu'une fois par requête, même si la requête est rejouée (forward, dispatch d'erreur)."
  - term: "HandlerInterceptor"
    definition: "Point d'extension de Spring MVC appelé autour du handler choisi : preHandle, postHandle, afterCompletion."
  - term: "réponse engagée (committed)"
    definition: "État d'une réponse dont le statut et les en-têtes sont déjà partis vers le client : on ne peut plus les modifier."
  - term: "MDC"
    definition: "Mapped Diagnostic Context de SLF4J : des valeurs attachées au thread courant (comme l'identifiant de requête) et ajoutées à chaque ligne de journal."
visuals: [spring-ch05-filter-vs-interceptor]
labs: [spring-ch05-l04-lab-correlation-id]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un filtre (`OncePerRequestFilter`) et un intercepteur notent chaque passage. Le contrôleur de `/boom` lève une exception que personne ne gère. Qu'affiche le programme ?"
    code: |
      import jakarta.servlet.*;
      import jakarta.servlet.http.*;
      import java.net.URI;
      import java.net.http.*;
      import java.util.*;
      import org.springframework.boot.SpringApplication;
      import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
      import org.springframework.boot.web.server.context.WebServerApplicationContext;
      import org.springframework.context.annotation.*;
      import org.springframework.web.bind.annotation.*;
      import org.springframework.web.filter.OncePerRequestFilter;
      import org.springframework.web.servlet.HandlerInterceptor;
      import org.springframework.web.servlet.config.annotation.*;

      public class Main {
          static final List<String> log = Collections.synchronizedList(new ArrayList<>());

          @RestController
          public static class Boom {
              @GetMapping("/boom") public String boom() { throw new IllegalStateException("boom"); }
          }

          @Configuration(proxyBeanMethods = false) @EnableAutoConfiguration
          public static class App implements WebMvcConfigurer {
              @Bean Boom boom() { return new Boom(); }

              @Bean OncePerRequestFilter trace() {
                  return new OncePerRequestFilter() {
                      protected void doFilterInternal(HttpServletRequest q, HttpServletResponse s, FilterChain chain) throws ServletException, java.io.IOException {
                          log.add("filtre " + q.getRequestURI());
                          chain.doFilter(q, s);
                      }
                  };
              }

              public void addInterceptors(InterceptorRegistry registry) {
                  registry.addInterceptor(new HandlerInterceptor() {
                      public boolean preHandle(HttpServletRequest q, HttpServletResponse s, Object h) { log.add("intercepteur " + q.getRequestURI()); return true; }
                  });
              }
          }

          public static void main(String[] args) throws Exception {
              var ctx = new SpringApplication(App.class).run("--server.port=0", "--spring.main.banner-mode=off");
              int port = ((WebServerApplicationContext) ctx).getWebServer().getPort();
              var res = HttpClient.newHttpClient().send(
                      HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/boom")).build(), HttpResponse.BodyHandlers.discarding());
              Thread.sleep(200);
              System.out.println(res.statusCode() + " " + log);
              ctx.close();
          }
      }
    answer: "500 [filtre /boom, intercepteur /boom, intercepteur /error]"
    explanation: "Le filtre entoure la requête une seule fois : OncePerRequestFilter ne repasse pas sur le dispatch d'erreur. L'intercepteur, lui, voit la requête /boom, puis le second passage dans la DispatcherServlet, quand Tomcat rejoue la requête vers /error (leçon 1). Un compteur de requêtes dans un intercepteur compterait donc chaque erreur deux fois."
    concept: spring-ch05-handler-interceptor
  - id: c2
    type: single
    prompt: "Sur un vrai serveur Tomcat, un intercepteur ajoute l'en-tête `X-Handler` dans `postHandle`. Le client le reçoit pour `GET /events/1` (un objet, en JSON), mais pas pour `GET /ping` (un `String`). Pourquoi ?"
    choices:
      - "Les en-têtes ne sont pas autorisés sur les réponses texte"
      - "Pour /ping, le convertisseur de texte a écrit et envoyé la réponse avant postHandle : statut et en-têtes étaient déjà partis, l'ajout est ignoré"
      - "postHandle n'est jamais appelé pour un String"
      - "C'est un bug de HttpClient"
    answer: 1
    explanation: "Pour @ResponseBody et ResponseEntity, la réponse est écrite pendant ha.handle, avant postHandle. Selon le convertisseur, elle est déjà engagée (committed) : c'est le cas du texte sur Tomcat, pas encore du JSON. MockMvc, lui, garde tout en mémoire et accepte l'en-tête dans les deux cas : un test MockMvc passerait. Un en-tête se pose dans un filtre, avant la chaîne, ou dans preHandle."
    concept: spring-ch05-response-commit
  - id: c3
    type: single
    prompt: "L'identifiant de corrélation doit figurer sur **toutes** les réponses, y compris un 404 sur une URL inconnue et un 500. Où le poser ?"
    choices:
      - "Dans le postHandle d'un intercepteur"
      - "Dans un @ExceptionHandler du conseil"
      - "Dans un filtre, sur la réponse, avant d'appeler chain.doFilter"
      - "Dans chaque méthode de contrôleur"
    answer: 2
    explanation: "Le filtre voit toutes les requêtes, avant tout le reste. Un en-tête posé avant chain.doFilter est en place avant que quiconque écrive le corps, et il survit au dispatch d'erreur : la réponse est la même. postHandle est sauté en cas d'exception, le conseil ne voit que les exceptions, et les contrôleurs ne voient pas les 404."
    concept: spring-ch05-correlation-id
---

## Pourquoi c'est important

Un client signale une réservation fantôme. Le support cherche dans les journaux… et trouve des milliers de lignes mêlées, de toutes les requêtes en parallèle, sans moyen de savoir lesquelles appartiennent à **cet** appel. L'équipe décide d'ajouter un identifiant de requête : sur chaque réponse (le client le transmet au support) et sur chaque ligne de journal. Un développeur l'écrit dans un intercepteur. En recette, l'en-tête manque sur les 404, sur les 500… et, sur le vrai serveur, sur certaines réponses 200.

En Go, tu aurais écrit un middleware : une fonction qui enveloppe le `http.Handler`, pose l'en-tête, met l'identifiant dans le `context.Context` et appelle la suite. Spring offre **deux** endroits pour ce genre de code, à deux étages différents. Choisir le mauvais, c'est rater une partie des requêtes.

## Deux étages

::visual{id="spring-ch05-filter-vs-interceptor"}

| | Filtre de servlet | Intercepteur (`HandlerInterceptor`) |
|---|---|---|
| Où | autour de la `DispatcherServlet`, dans Tomcat | dans la `DispatcherServlet`, autour du handler |
| Voit | **toutes** les requêtes : 404, ressources statiques, Actuator, erreurs | les requêtes qui ont un handler |
| Sait quel handler traite la requête | non | oui (`HandlerMethod`) |
| Peut arrêter la requête | oui (ne pas appeler `chain.doFilter`) | oui (`preHandle` renvoie `false`) |
| Exemples | identifiant de corrélation, encodage, sécurité (Spring Security est une chaîne de filtres) | contrôle d'accès par route, journal par méthode de contrôleur, locale |

Dans Spring Boot, un bean de type `Filter` est enregistré automatiquement dans Tomcat ; `@Order` (ou un `FilterRegistrationBean`) fixe sa place dans la chaîne. Un intercepteur s'enregistre avec `WebMvcConfigurer.addInterceptors`, éventuellement limité à des chemins (`addPathPatterns("/admin/**")`).

## Les trois méthodes de l'intercepteur

- **`preHandle`**, avant l'adaptateur : le handler est connu. Renvoyer `false` arrête tout ; c'est alors à l'intercepteur d'écrire la réponse (par exemple `response.sendError(403)`).
- **`postHandle`**, après l'appel réussi : **sauté** si le handler a levé une exception.
- **`afterCompletion`**, toujours, pour chaque intercepteur dont `preHandle` a réussi, avec l'exception si elle n'a pas été résolue. C'est le `finally` de l'intercepteur.

Et une requête qui échoue repasse dans la `DispatcherServlet` pour `/error` (leçon 1) : l'intercepteur la voit **deux fois**. Pas le filtre, s'il hérite d'`OncePerRequestFilter`.

::checkpoint{id="c1"}

## Le piège de la réponse engagée

Une réponse HTTP s'écrit dans l'ordre : statut, en-têtes, puis corps. Dès que les premiers octets du corps partent vers le client, la réponse est **engagée** (*committed*) : statut et en-têtes ne peuvent plus changer. Tomcat ignore alors en silence `setHeader` ou `setStatus`.

Or, pour `@ResponseBody` et `ResponseEntity`, le corps est écrit **pendant** l'appel du handler, donc avant `postHandle`. Selon le convertisseur et la taille, la réponse est déjà engagée : c'est le cas d'un `String` sur Tomcat, pas encore d'un petit objet JSON. Un en-tête ajouté dans `postHandle` arrive donc… parfois.

::checkpoint{id="c2"}

> **Attention :** MockMvc garde toute la réponse en mémoire et accepte un en-tête à tout moment. Un test MockMvc **ne voit pas** ce piège. Pour un comportement qui dépend de l'envoi réel (en-têtes tardifs, flux, compression), teste sur un vrai serveur : `@SpringBootTest(webEnvironment = RANDOM_PORT)`.

La règle qui en découle : un en-tête se pose **avant** que quiconque écrive le corps. Dans un filtre, avant `chain.doFilter` ; dans un intercepteur, dans `preHandle`. Pour modifier un corps déjà produit, Spring propose `ResponseBodyAdvice`, appelé juste avant l'écriture.

## L'identifiant de corrélation, au bon étage

```java title="CorrelationIdFilter.java"
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class CorrelationIdFilter extends OncePerRequestFilter {
    private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9-]{1,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String id = request.getHeader("X-Request-Id");
        if (id == null || !SAFE.matcher(id).matches()) {
            id = UUID.randomUUID().toString();   // une valeur du client n'est reprise que si elle est sûre
        }
        response.setHeader("X-Request-Id", id);   // avant la chaîne : présent même sur un 404 ou un 500
        MDC.put("requestId", id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove("requestId");              // le thread repart dans le pool de Tomcat
        }
    }
}
```

::checkpoint{id="c3"}

Trois détails comptent :
- **Valider l'identifiant reçu.** Il finit dans les journaux et dans une réponse : une valeur arbitraire permettrait d'injecter de fausses lignes de journal ou des caractères de contrôle.
- **Le `finally`.** Tomcat réutilise ses threads : un MDC oublié colle l'identifiant d'une requête aux journaux de la suivante.
- **`OncePerRequestFilter`.** Le dispatch d'erreur ne génère pas un second identifiant, et la réponse garde le premier.

> **Sous le capot :** Spring Boot enregistre chaque bean `Filter` dans Tomcat à travers un `FilterRegistrationBean` qu'il crée lui-même, sur `/*`. Un filtre ordinaire ne reçoit que le dispatch `REQUEST`. Un `OncePerRequestFilter` est enregistré pour **tous** les types de dispatch, et c'est lui qui trie : un attribut de requête (`<nom>.FILTERED`) l'empêche de repasser sur la même requête, et `shouldNotFilterErrorDispatch()` (vrai par défaut) l'écarte du passage sur `/error`. L'encodage des caractères (`CharacterEncodingFilter`) et l'observation des requêtes d'Actuator (`ServerHttpObservationFilter`) sont des filtres de ce type.

## Pièges fréquents

- **Un en-tête dans `postHandle`** : perdu sur une réponse déjà engagée, et sur toutes les requêtes en erreur (`postHandle` sauté).
- **Un compteur dans un intercepteur** : les erreurs passent deux fois (requête, puis `/error`).
- **Un MDC sans `finally`** : les journaux d'une requête héritent de l'identifiant d'une autre.
- **Reprendre `X-Request-Id` tel quel** : une valeur choisie par le client dans tes journaux.
- **Croire un test MockMvc** sur un en-tête tardif : il passe, le vrai serveur ne l'envoie pas.

## À retenir

- Filtre : toutes les requêtes, autour de la `DispatcherServlet`, sans connaître le handler. Intercepteur : les requêtes qui ont un handler, avec `preHandle` / `postHandle` / `afterCompletion`.
- `postHandle` est sauté en cas d'exception ; `afterCompletion` est toujours appelé. L'intercepteur repasse sur `/error`, pas un `OncePerRequestFilter`.
- Une réponse engagée ne change plus : pose les en-têtes avant l'écriture du corps. MockMvc ne voit pas ce problème ; un serveur réel, si.
- Identifiant de corrélation : filtre, valeur reçue validée ou générée, en-tête avant la chaîne, MDC retiré dans un `finally`.

> **Source :** Spring Framework 7, [Filters](https://docs.spring.io/spring-framework/reference/web/webmvc/filters.html), [Interception](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping-interceptor.html) et [Interceptors (configuration)](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/interceptors.html) ; Spring Boot 4.1, [Servlet Web Applications — Servlets, Filters, and Listeners](https://docs.spring.io/spring-boot/4.1/reference/web/servlet.html#web.servlet.embedded-container.servlets-filters-listeners) ; code de [`OncePerRequestFilter`](https://github.com/spring-projects/spring-framework/blob/v7.0.11/spring-web/src/main/java/org/springframework/web/filter/OncePerRequestFilter.java) (v7.0.11).
