---
id: spring-ch04-l04
title: "Écrire son propre starter"
source: { book: spring-docs, chapter: 29, pages: "#features.developing-auto-configuration.custom-starter", url: "https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.custom-starter" }
duration_min: 30
concepts:
  - id: spring-ch04-starter-structure
    label: "Un starter = un module autoconfigure (code, conditions, propriétés, fichier imports) + un module starter (des dépendances) ; il ne commence jamais par spring-boot"
  - id: spring-ch04-customizer-pattern
    label: "Un customizer permet d'ajuster un objet configuré par le starter sans le remplacer ; l'autoconfiguration applique tous les customizers dans l'ordre de leur @Order"
glossary:
  - term: "starter"
    definition: "Une dépendance « tout-en-un » qui apporte une bibliothèque, son autoconfiguration et leurs dépendances habituelles."
  - term: "customizer"
    definition: "Un bean de l'application que l'autoconfiguration appelle pour ajuster un objet avant de le publier (RestClientCustomizer, JsonMapperBuilderCustomizer…)."
  - term: "métadonnées de configuration"
    definition: "Le fichier META-INF/spring-configuration-metadata.json, généré par un processeur d'annotations, qui décrit les propriétés d'un starter pour l'autocomplétion de l'IDE."
visuals: [spring-ch04-starter-layout]
labs: [spring-ch04-l04-lab-client-starter]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: single
    prompt: "Ton équipe publie un starter pour le client Tixa. Quel nom de module choisir ?"
    choices:
      - "spring-boot-starter-tixa"
      - "tixa-spring-boot-starter"
      - "spring-boot-tixa-autoconfigure"
      - "Peu importe"
    answer: 1
    explanation: "La documentation est explicite : ne commence jamais le nom d'un module par spring-boot, même avec un autre groupId. Ces noms sont réservés aux modules officiels ; le préfixe doit être celui de ta bibliothèque : tixa-spring-boot-starter, tixa-spring-boot-autoconfigure."
    concept: spring-ch04-starter-structure
  - id: c2
    type: single
    prompt: "Une équipe veut ajouter un en-tête d'authentification au client du starter, sans perdre l'URL, le délai et les autres réglages. Que lui proposer ?"
    choices:
      - "Déclarer son propre TixaClient complet"
      - "Déclarer un bean TixaClientCustomizer, que l'autoconfiguration applique au builder"
      - "Exclure l'autoconfiguration"
      - "Modifier le code du starter"
    answer: 1
    explanation: "Le customizer ajoute une touche sans remplacer le reste : c'est le patron de Spring Boot lui-même (RestClientCustomizer, JsonMapperBuilderCustomizer). Remplacer le client entier fait perdre toute la configuration du starter, et l'équipe devra la refaire."
    concept: spring-ch04-customizer-pattern
---

## Pourquoi c'est important

Trois équipes copient le même code de configuration du client de paiement, chacune avec ses variantes et ses bugs. Le jour où l'URL change, il faut trois correctifs. Un starter règle cela : une seule dépendance à ajouter, une configuration standard, et des points d'ajustement prévus. C'est exactement ce que fait Spring Boot pour chaque technologie qu'il prend en charge ; ton starter suit les mêmes règles.

## Deux modules

La documentation recommande de séparer :
- **le module autoconfigure** (`tixa-spring-boot-autoconfigure`) : les classes d'autoconfiguration, les `@ConfigurationProperties`, les conditions, le fichier `imports`. Les bibliothèques optionnelles y sont des dépendances **optionnelles** : c'est l'application qui choisit de les ajouter, et les conditions de classe réagissent ;
- **le module starter** (`tixa-spring-boot-starter`) : presque vide, il ne fait que **dépendre** de l'autoconfigure et des bibliothèques habituelles. C'est lui que les applications ajoutent.

Pour un petit starter, un seul module suffit.

::visual{id="spring-ch04-starter-layout"}

**Le nom** : jamais `spring-boot-…`, réservé aux modules officiels.

::checkpoint{id="c1"}

## Les propriétés du starter

Un starter expose ses réglages avec un `@ConfigurationProperties` sous **son propre préfixe** (`tixa.client`), activé par `@EnableConfigurationProperties` sur l'autoconfiguration (il ne peut pas compter sur le scan de l'application).

> **En production :** ajoute le processeur d'annotations `spring-boot-configuration-processor` au module autoconfigure : il génère `META-INF/spring-configuration-metadata.json`, que l'IDE utilise pour l'autocomplétion et la documentation des propriétés dans `application.yml`. Sans lui, personne ne devine qu'il existe un `tixa.client.timeout`.

## Trois niveaux de contrôle pour l'application

Un bon starter offre, du plus léger au plus lourd :
1. **les propriétés** : changer l'URL, le délai ;
2. **les customizers** : ajouter un comportement sans perdre le reste ;
3. **le remplacement complet** : déclarer son propre bean, grâce à `@ConditionalOnMissingBean`.

```java
@Bean
@ConditionalOnMissingBean
TixaClient tixaClient(TixaClientProperties props, ObjectProvider<TixaClientCustomizer> customizers) {
    TixaClient.Builder builder = TixaClient.builder().baseUrl(props.baseUrl()).timeout(props.timeout());
    customizers.orderedStream().forEach(c -> c.customize(builder));
    return builder.build();
}
```

::checkpoint{id="c2"}

`ObjectProvider.orderedStream()` (module 01) donne tous les customizers, triés par `@Order`, et aucun s'il n'y en a pas.

## Pièges fréquents

- **Un nom de module en `spring-boot-…`** : réservé, et trompeur pour qui lit le build.
- **Un `@ComponentScan` dans l'autoconfiguration** pour trouver ses propres classes : la documentation l'interdit ; déclare les beans explicitement.
- **Pas de point d'ajustement** : les équipes remplacent tout le bean, et perdent la configuration du starter.
- **Des dépendances optionnelles déclarées obligatoires** dans le module autoconfigure : l'application les reçoit toutes, et les conditions de classe ne servent plus à rien.

## À retenir

- Un starter = un module autoconfigure + un module starter (dépendances) ; jamais de nom en `spring-boot-`.
- Propriétés sous un préfixe propre, activées par `@EnableConfigurationProperties`, documentées par le processeur de métadonnées.
- Trois niveaux de contrôle : propriétés, customizers (`orderedStream()`), remplacement (`@ConditionalOnMissingBean`).

> **Source :** Spring Boot 4.1, [Creating Your Own Starter](https://docs.spring.io/spring-boot/4.1/reference/features/developing-auto-configuration.html#features.developing-auto-configuration.custom-starter) et [Configuration Metadata](https://docs.spring.io/spring-boot/4.1/specification/configuration-metadata/index.html).
