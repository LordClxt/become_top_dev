---
id: spring-ch03-l04
title: "Les profils : une application, plusieurs environnements"
source: { book: spring-docs, chapter: 27, pages: "#page-title", url: "https://docs.spring.io/spring-boot/4.1/reference/features/profiles.html" }
duration_min: 30
concepts:
  - id: spring-ch03-profiles-activation
    label: "spring.profiles.active choisit les profils ; chaque profil actif ajoute ses fichiers application-{profil} et ses documents YAML (spring.config.activate.on-profile), qui l'emportent sur la base"
  - id: spring-ch03-profile-beans
    label: "@Profile sur un composant ou une méthode @Bean : la définition n'existe que si l'expression de profils est vraie (négation, &, |)"
  - id: spring-ch03-profile-groups
    label: "Un groupe (spring.profiles.group.staging: prod, us) active plusieurs profils d'un coup, dans l'ordre"
glossary:
  - term: "profil"
    definition: "Un nom (dev, prod, eu…) qui active un ensemble de configurations et de beans. Plusieurs profils peuvent être actifs à la fois."
  - term: "document YAML"
    definition: "Une partie d'un fichier YAML séparée par ---. Spring Boot lit chaque document comme une source à part, éventuellement réservée à un profil."
  - term: "groupe de profils"
    definition: "Un profil qui, une fois activé, active une liste d'autres profils."
visuals: [spring-ch03-profile-layers]
labs: [spring-ch03-l04-lab-bank-per-profile]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Des beans réservés à des expressions de profils. Qu'affiche le programme ?"
    code: |
      import org.springframework.boot.*;
      import org.springframework.context.annotation.*;

      public class Main {
          @Configuration
          static class App {
              @Bean @Profile("prod & eu") String euProd() { return "eu-prod"; }
              @Bean @Profile("prod & !eu") String otherProd() { return "other-prod"; }
              @Bean @Profile("!prod") String dev() { return "dev"; }
          }

          public static void main(String[] args) {
              for (String profiles : new String[] { "prod,eu", "prod", "eu" }) {
                  var app = new SpringApplication(App.class);
                  app.setBannerMode(Banner.Mode.OFF);
                  app.setWebApplicationType(WebApplicationType.NONE);
                  try (var ctx = app.run("--spring.profiles.active=" + profiles)) {
                      System.out.println(profiles + " → " + String.join(",", ctx.getBeanNamesForType(String.class)));
                  }
              }
          }
      }
    answer: "prod,eu → euProd\nprod → otherProd\neu → dev"
    explanation: "@Profile accepte des expressions : & (et), | (ou), ! (non). La définition n'est enregistrée que si l'expression est vraie pour les profils actifs. Avec eu seul, prod n'est pas actif : seul le bean !prod existe."
    concept: spring-ch03-profile-beans
  - id: c2
    type: single
    prompt: "`application.yml` contient un groupe `staging: prod, us`. On démarre avec `--spring.profiles.active=staging`. Quels profils sont actifs ?"
    choices:
      - "staging seulement"
      - "staging, prod, us"
      - "prod, us seulement"
      - "us seulement, le dernier de la liste"
    answer: 1
    explanation: "Activer un groupe active le groupe lui-même puis ses membres, dans l'ordre : getActiveProfiles() rend [staging, prod, us]. Tous leurs documents de configuration et leurs beans @Profile s'appliquent."
    concept: spring-ch03-profile-groups
---

## Pourquoi c'est important

Tixa tourne en trois versions : sur le poste des développeurs (banque factice), en recette (vraie banque, région de test), en production (vraie banque, tarifs contractuels). Copier trois applications est exclu ; multiplier les `if (env.equals("prod"))` dans le code aussi. Les **profils** permettent à une seule application de changer de configuration et de composants selon l'environnement, sans une ligne de code conditionnelle.

Mal utilisés, ils produisent le pire des bugs : une production qui démarre avec la banque factice parce qu'un profil a été mal orthographié.

## Activer des profils

On active des profils par une propriété comme une autre : `spring.profiles.active=prod,eu`, passée en ligne de commande, en variable d'environnement (`SPRING_PROFILES_ACTIVE`) ou dans un fichier. Sans profil actif, Spring Boot utilise le profil `default`.

Chaque profil actif ajoute de la configuration, qui **l'emporte** sur la configuration de base (leçon 2) :
- un fichier `application-prod.yml` à côté de `application.yml` ;
- ou un **document** du même fichier, réservé à un profil :

```yaml
tixa:
  bank:
    region: eu
---
spring:
  config:
    activate:
      on-profile: us
tixa:
  bank:
    region: us
```

Un document de profil ne contient que **ce qui change**. Tout le reste vient de la base.

## Des beans par profil

`@Profile` sur un `@Component` ou une méthode `@Bean` : la définition n'est enregistrée que si l'**expression** de profils est vraie. Elle accepte la négation (`!prod`), le *et* (`prod & eu`) et le *ou* (`prod | staging`).

::checkpoint{id="c1"}

> **Sous le capot :** `@Profile` est une condition comme les autres : il est méta-annoté `@Conditional(ProfileCondition.class)`, et la condition est évaluée par le `ConditionEvaluator` au moment où `ConfigurationClassPostProcessor` lit les configurations (module 01, temps des recettes). Un bean d'un profil inactif n'est donc jamais une définition, encore moins un objet. Le module 04 généralise ce mécanisme à toute l'autoconfiguration.

La règle de sûreté : le bean **dangereux** (la vraie banque) est réservé au profil explicite (`@Profile("prod")`), et il **exige** sa configuration. En production sans URL, le démarrage échoue. Jamais l'inverse : une banque factice marquée `@Profile("dev")`, avec la vraie banque par défaut, transforme un profil oublié en vrais débits depuis un poste de développement.

## Les groupes

Un environnement est souvent une **combinaison** : la recette, c'est la configuration de production plus la région de test. Un groupe le dit une fois pour toutes :

```yaml
spring:
  profiles:
    group:
      staging: prod, us
```

::checkpoint{id="c2"}

> **En production :** les profils sont faits pour les **différences d'environnement** (quelle banque, quelle région), pas pour les **secrets** ni les valeurs propres à un serveur. Un mot de passe dans `application-prod.yml` est versionné avec le code. Les valeurs propres au déploiement viennent de l'environnement ou de secrets montés (leçon 5).

## Pièges fréquents

- **Une faute de frappe dans un profil** (`spring.profiles.active=prd`) : aucun document ne correspond, l'application démarre sur la configuration de base, sans erreur.
- **Le bean dangereux par défaut** et le sûr réservé à `dev` : un profil oublié déclenche la production.
- **Des `if` sur `env.getActiveProfiles()`** dans le code métier : la logique d'environnement se disperse ; préfère `@Profile` ou une propriété.
- **Un document de profil qui recopie toute la configuration** : la base et le profil divergent avec le temps ; ne mets que les différences.

## À retenir

- `spring.profiles.active` choisit les profils ; leurs fichiers et documents l'emportent sur la base.
- `@Profile` (expressions `!`, `&`, `|`) décide quels beans existent, au temps des recettes.
- Un groupe active plusieurs profils d'un coup, dans l'ordre.
- Le composant dangereux doit être l'exception explicite, et exiger sa configuration.

> **Source :** Spring Boot 4.1, [Profiles](https://docs.spring.io/spring-boot/4.1/reference/features/profiles.html) et [Externalized Configuration — Activation Properties](https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html) ; Spring Framework 7.0, [`@Profile`](https://docs.spring.io/spring-framework/reference/core/beans/environment.html).
