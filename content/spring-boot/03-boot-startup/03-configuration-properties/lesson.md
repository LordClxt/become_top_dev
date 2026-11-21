---
id: spring-ch03-l03
title: "@ConfigurationProperties : une configuration typée et validée"
source: { book: spring-docs, chapter: 26, pages: "#features.external-config.typesafe-configuration-properties", url: "https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html#features.external-config.typesafe-configuration-properties" }
duration_min: 35
concepts:
  - id: spring-ch03-configuration-properties
    label: "Un record @ConfigurationProperties(\"tixa\") représente tout un préfixe, lié par son constructeur, avec des valeurs par défaut (@DefaultValue) et des conversions (Duration, DataSize, listes)"
  - id: spring-ch03-relaxed-binding
    label: "Liaison souple : tixa.hold.max-seats, tixa.hold.maxSeats et TIXA_HOLD_MAXSEATS désignent la même propriété ; la forme canonique est le kebab-case"
  - id: spring-ch03-config-validation
    label: "@Validated et des contraintes Jakarta font échouer le démarrage sur une configuration invalide ; @Valid est nécessaire pour valider un objet imbriqué"
glossary:
  - term: "liaison (binding)"
    definition: "Le travail du Binder de Spring Boot : transformer des propriétés texte en un objet Java typé, en convertissant chaque valeur."
  - term: "@DefaultValue"
    definition: "Annotation de Spring Boot sur un paramètre de constructeur : la valeur à utiliser quand la propriété est absente, convertie comme une vraie propriété."
  - term: "Duration"
    definition: "Le type Java d'une durée. Spring Boot accepte 90s, 15m, 2h, 1d ou le format ISO-8601 (PT15M)."
visuals: [spring-ch03-binding]
labs: [spring-ch03-l03-lab-typed-config]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un record lié au préfixe `tixa`. Qu'affiche le programme ?"
    code: |
      import java.time.Duration;
      import java.util.List;
      import org.springframework.boot.*;
      import org.springframework.boot.context.properties.*;
      import org.springframework.boot.context.properties.bind.DefaultValue;
      import org.springframework.context.annotation.Configuration;

      public class Main {
          @ConfigurationProperties("tixa")
          public record TixaProps(@DefaultValue("150") int feeCents, Duration holdTimeout, List<String> notifiers) { }

          @Configuration @EnableConfigurationProperties(TixaProps.class)
          static class App { }

          public static void main(String[] args) {
              var app = new SpringApplication(App.class);
              app.setBannerMode(Banner.Mode.OFF);
              app.setWebApplicationType(WebApplicationType.NONE);
              try (var ctx = app.run("--tixa.hold-timeout=90s", "--tixa.notifiers=email,sms")) {
                  System.out.println(ctx.getBean(TixaProps.class));
              }
          }
      }
    answer: "TixaProps[feeCents=150, holdTimeout=PT1M30S, notifiers=[email, sms]]"
    explanation: "Le Binder fait correspondre hold-timeout au composant holdTimeout, convertit 90s en Duration (affichée en ISO-8601) et découpe la liste sur les virgules. feeCents, absente, prend sa @DefaultValue."
    concept: spring-ch03-configuration-properties
  - id: c2
    type: single
    prompt: "Un record `TixaProperties(@Valid Hold hold)` est `@Validated`, et `Hold` porte `@Max(10) int maxSeats`. Que se passe-t-il si on retire `@Valid` et qu'on démarre avec `tixa.hold.max-seats=50` ?"
    choices:
      - "Le démarrage échoue comme avant"
      - "L'application démarre avec 50 : sans @Valid, l'objet imbriqué n'est pas validé"
      - "La valeur est ramenée à 10"
      - "Le démarrage échoue avec une erreur de compilation"
    answer: 1
    explanation: "La validation Jakarta ne descend dans un objet imbriqué que si le champ porte @Valid (validation en cascade). C'est un oubli fréquent : les contraintes de l'objet imbriqué semblent en place, mais ne sont jamais vérifiées."
    concept: spring-ch03-config-validation
---

## Pourquoi c'est important

Avec `@Value("${tixa.hold.timeout}")`, la configuration est une chaîne lue au hasard des classes. Une faute de frappe dans la clé, une durée écrite `15` au lieu de `15m`, un nombre de places à `50` : rien ne se voit avant qu'un client réserve. Et personne ne sait, en lisant le code, quelles propriétés l'application attend vraiment.

`@ConfigurationProperties` regroupe toute la configuration d'un préfixe dans **un objet typé**, lié et **validé au démarrage**. Une configuration fausse devient une application qui refuse de démarrer, avec un message qui nomme la propriété.

## Un record pour tout un préfixe

```java
@ConfigurationProperties("tixa")
@Validated
public record TixaProperties(
        @DefaultValue("EUR") @Pattern(regexp = "[A-Z]{3}") String currency,
        @DefaultValue List<String> notifiers,
        @DefaultValue @Valid Hold hold) {

    public record Hold(
            @DefaultValue("15m") @NotNull Duration timeout,
            @DefaultValue("6") @Min(1) @Max(10) int maxSeats) { }
}
```

Un record est lié **par son constructeur** : chaque composant reçoit la propriété du même nom. Il faut ensuite en faire un bean : `@ConfigurationPropertiesScan` sur la classe d'application (qui trouve les classes du paquet), ou `@EnableConfigurationProperties(TixaProperties.class)`.

::checkpoint{id="c1"}

Le *Binder* convertit chaque valeur texte vers le type du composant :
- **durées** (`Duration`) : `90s`, `15m`, `2h`, `1d`, ou ISO-8601 (`PT15M`). Un nombre seul est lu en **millisecondes**, sauf si `@DurationUnit` dit autre chose ;
- **tailles** (`DataSize`) : `10MB`, `512KB` ;
- **listes** : `email,sms`, ou des entrées `notifiers[0]`, `notifiers[1]` ;
- **objets imbriqués** : un préfixe de plus (`tixa.hold.timeout`).

`@DefaultValue("15m")` donne une valeur par défaut, convertie comme une vraie propriété. Sans valeur, sur une liste ou un objet imbriqué, il donne une liste vide ou un objet construit avec ses propres défauts : jamais `null`.

> **Sous le capot :** la liaison est faite par `ConfigurationPropertiesBindingPostProcessor`, un `BeanPostProcessor` (module 01) enregistré par `@EnableConfigurationProperties`. Pour un record, il n'y a pas de setters : il appelle le constructeur avec les valeurs liées par le `Binder`, qui lit l'`Environment` au travers d'une vue (`ConfigurationPropertySources`) capable de reconnaître toutes les écritures d'un même nom.

## La liaison souple

Ces quatre écritures désignent la même propriété :

| écriture | où |
|---|---|
| `tixa.hold.max-seats` | `.properties` et `.yml` (forme canonique recommandée) |
| `tixa.hold.maxSeats` | acceptée dans les fichiers |
| `TIXA_HOLD_MAXSEATS` | variable d'environnement |
| `--tixa.hold.max-seats=4` | ligne de commande |

La forme **canonique** est le kebab-case en minuscules. C'est celle qu'il faut utiliser dans les fichiers, et celle qu'il faut chercher quand une valeur semble ignorée.

> **Attention :** la liaison souple ne s'applique **qu'**à `@ConfigurationProperties`. `@Value("${tixa.hold.max-seats}")` reconnaît aussi la variable d'environnement, mais il faut écrire la clé sous sa forme canonique : la documentation recommande le kebab-case dans les `@Value`.

## Valider au démarrage

`@Validated` sur la classe, et les contraintes Jakarta (`@NotNull`, `@Min`, `@Max`, `@Pattern`, `@NotEmpty`…) sur les composants. Une valeur invalide fait échouer le démarrage : `ConfigurationPropertiesBindException`, avec en cause une `BindValidationException` qui nomme la propriété. Le rapport d'échec de Spring Boot l'affiche lisiblement.

::checkpoint{id="c2"}

Deux règles à retenir :
- un objet imbriqué n'est validé que si son composant porte **`@Valid`** ;
- la validation a besoin d'un validateur Jakarta sur le classpath (Hibernate Validator, apporté par `spring-boot-starter-validation`) ; sans lui, `@Validated` n'a aucun effet.

## @Value ou @ConfigurationProperties ?

| | `@Value` | `@ConfigurationProperties` |
|---|---|---|
| Une valeur isolée, dans un seul bean | ✓ | — |
| Tout un préfixe, typé | — | ✓ |
| Liaison souple complète | — | ✓ |
| Validation au démarrage | — | ✓ |
| Expressions SpEL (`#{…}`) | ✓ | — |
| Documentation des propriétés (métadonnées pour l'IDE) | — | ✓ |

## Pièges fréquents

- **Oublier de faire du record un bean** : `@ConfigurationProperties` seul ne suffit pas (`@ConfigurationPropertiesScan` ou `@EnableConfigurationProperties`).
- **Oublier `@Valid`** sur un objet imbriqué : ses contraintes ne sont jamais vérifiées.
- **Une durée sans unité** : `timeout: 15` vaut 15 **millisecondes**.
- **Une variable d'environnement avec des underscores à la place des tirets** : `TIXA_HOLD_MAX_SEATS` ne correspond pas à `max-seats`.

## À retenir

- Un record `@ConfigurationProperties` = tout un préfixe, typé, lié par constructeur.
- `@DefaultValue` pour les défauts ; conversions de durées, tailles, listes et objets imbriqués.
- Liaison souple : kebab-case canonique, camelCase et variables d'environnement acceptés.
- `@Validated` + contraintes : la configuration invalide arrête le démarrage ; `@Valid` pour descendre dans les objets imbriqués.

> **Source :** Spring Boot 4.1, [Externalized Configuration — Type-safe Configuration Properties](https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html#features.external-config.typesafe-configuration-properties) (liaison par constructeur, liaison souple, conversions, validation).
