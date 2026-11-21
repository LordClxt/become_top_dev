---
id: spring-ch03-l05
title: "Agir avant le contexte : EnvironmentPostProcessor, spring.factories et le jar exécutable"
source: { book: spring-docs, chapter: 28, pages: "#page-title", url: "https://docs.spring.io/spring-boot/4.1/specification/executable-jar/index.html" }
duration_min: 30
concepts:
  - id: spring-ch03-environment-post-processor
    label: "Un EnvironmentPostProcessor modifie l'Environment pendant ApplicationEnvironmentPreparedEvent, avant tout bean ; il passe après la lecture des fichiers, donc peut lire tixa.* et ajouter une source à la position voulue"
  - id: spring-ch03-spring-factories
    label: "Ce qui doit exister avant le contexte (EnvironmentPostProcessor, FailureAnalyzer, écouteurs précoces) se déclare dans META-INF/spring.factories, pas comme bean"
  - id: spring-ch03-executable-jar
    label: "Le jar de Spring Boot a pour Main-Class JarLauncher, qui lit BOOT-INF/classes et BOOT-INF/lib puis appelle le main de la Start-Class"
glossary:
  - term: "EnvironmentPostProcessor"
    definition: "Interface de Spring Boot (org.springframework.boot.EnvironmentPostProcessor dans Boot 4) dont la méthode reçoit l'Environment et la SpringApplication, avant la création du contexte."
  - term: "spring.factories"
    definition: "Un fichier META-INF/spring.factories du classpath qui associe une interface à des implémentations. Spring Boot y cherche ses composants de démarrage."
  - term: "jar exécutable"
    definition: "Un jar lancé par java -jar qui contient l'application et toutes ses dépendances, sous forme de jars imbriqués dans BOOT-INF/lib."
visuals: [spring-ch03-executable-jar]
labs: [spring-ch03-l05-lab-region-defaults]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "On ajoute une source à la toute fin, puis Spring Boot termine sa préparation. Où sont les sources ?"
    code: |
      import java.util.*;
      import org.springframework.boot.*;
      import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
      import org.springframework.context.ApplicationListener;
      import org.springframework.context.annotation.Configuration;
      import org.springframework.core.env.MapPropertySource;

      public class Main {
          @Configuration static class App { }

          public static void main(String[] args) {
              var app = new SpringApplication(App.class);
              app.setBannerMode(Banner.Mode.OFF);
              app.setWebApplicationType(WebApplicationType.NONE);
              app.setDefaultProperties(Map.of("tixa.currency", "XXX"));
              app.addListeners((ApplicationListener<ApplicationEnvironmentPreparedEvent>) e ->
                      e.getEnvironment().getPropertySources().addLast(new MapPropertySource("regionDefaults", Map.of("tixa.currency", "EUR"))));
              try (var ctx = app.run()) {
                  List<String> names = new ArrayList<>();
                  ctx.getEnvironment().getPropertySources().forEach(ps -> names.add(ps.getName()));
                  System.out.println(names.subList(names.size() - 3, names.size()) + " " + ctx.getEnvironment().getProperty("tixa.currency"));
              }
          }
      }
    answer: "[regionDefaults, applicationInfo, defaultProperties] EUR"
    explanation: "Après la préparation de l'environnement, Spring Boot ajoute encore sa source applicationInfo (le PID, la version), puis replace ses defaultProperties en toute dernière position. Une source ajoutée avec addLast reste donc au-dessus d'elles, et l'emporte sur les valeurs par défaut de la SpringApplication."
    concept: spring-ch03-environment-post-processor
  - id: c2
    type: single
    prompt: "Ton `EnvironmentPostProcessor` est annoté `@Component`, et non déclaré dans `spring.factories`. Quand est-il appelé ?"
    choices:
      - "Au démarrage, comme prévu"
      - "Jamais : l'environnement est préparé avant que le moindre bean existe"
      - "Après le refresh, trop tard mais une fois"
      - "À chaque lecture d'une propriété"
    answer: 1
    explanation: "Les post-processors d'environnement sont chargés depuis spring.factories par EnvironmentPostProcessorApplicationListener, pendant ApplicationEnvironmentPreparedEvent. Un bean n'existe que bien plus tard, et son type n'est même pas regardé."
    concept: spring-ch03-spring-factories
---

## Pourquoi c'est important

Certaines décisions doivent être prises **avant** que le moindre bean existe : ajouter des valeurs par défaut selon la région, charger des secrets montés en fichiers, refuser une configuration incohérente. À ce moment-là, il n'y a pas de conteneur : ni `@Component`, ni injection. Spring Boot fournit des points d'entrée pour cette phase, et un mécanisme pour les déclarer sans bean.

Cette leçon ferme le module en suivant l'application jusqu'au bout de la chaîne : comment `java -jar tixa.jar` arrive jusqu'à ton `main`.

## EnvironmentPostProcessor

```java
public class RegionDefaults implements EnvironmentPostProcessor {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String region = environment.getProperty("tixa.region", "eu");
        environment.getPropertySources().addLast(new MapPropertySource("tixaRegionDefaults", defaultsFor(region)));
    }
}
```

Dans Spring Boot 4, l'interface est `org.springframework.boot.EnvironmentPostProcessor` (l'ancienne, dans `org.springframework.boot.env`, existe encore). Elle est appelée pendant `ApplicationEnvironmentPreparedEvent` (leçon 1), par `EnvironmentPostProcessorApplicationListener`, dans l'ordre de leur `@Order`.

Le plus important de ces post-processors est celui de Spring Boot lui-même, `ConfigDataEnvironmentPostProcessor`, qui lit les fichiers `application.*` et les profils. Il est très prioritaire : **un post-processor ordinaire passe après lui**, donc voit déjà la configuration des fichiers et les profils actifs. C'est ce qui permet de lire `tixa.region` dans `application.yml`, ou un chemin de secrets dans un document de profil (le boss).

### Choisir sa position dans la pile

`MutablePropertySources` permet de placer une source exactement : `addFirst`, `addLast`, `addBefore(nom, …)`, `addAfter(nom, …)`. Le choix est une décision de conception :
- des **valeurs par défaut** : `addLast`, sous tous les fichiers ;
- des **secrets** : `addAfter(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, …)`, au-dessus des fichiers mais sous la ligne de commande et l'environnement, pour garder le dépannage possible.

::checkpoint{id="c1"}

> **Au-delà :** pour des secrets montés en fichiers, Spring Boot fournit déjà la solution : `spring.config.import=optional:configtree:/run/secrets/` lit un dossier dont chaque fichier est une propriété. Le boss te fait écrire l'équivalent pour en comprendre le mécanisme ; en production, préfère `configtree`.

## spring.factories : déclarer sans bean

Tout ce qui doit exister **avant** le contexte se déclare dans `META-INF/spring.factories`, un fichier de propriétés qui associe une interface à ses implémentations :

```properties
org.springframework.boot.EnvironmentPostProcessor=app.RegionDefaults
org.springframework.boot.diagnostics.FailureAnalyzer=app.MissingSecretFailureAnalyzer
org.springframework.context.ApplicationListener=app.EarlyListener
```

`SpringFactoriesLoader` lit **tous** les fichiers de ce nom présents dans le classpath, de toutes les bibliothèques. C'est ainsi qu'une dépendance ajoute un comportement de démarrage sans que tu écrives une ligne.

::checkpoint{id="c2"}

> **Sous le capot :** une classe imbriquée s'y écrit avec son nom **binaire** (`app.Tixa$RegionDefaults`), pas avec un point : `SpringFactoriesLoader` charge les classes par leur nom avec `Class.forName`. L'autoconfiguration (module 04) utilise un mécanisme voisin mais distinct : `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.

## Du jar à ton main

`java -jar tixa.jar` ne sait lancer qu'une classe dont les dépendances sont sur le classpath. Or un jar Java ne sait pas lire des jars **imbriqués**. Le plugin Maven ou Gradle de Spring Boot construit donc un jar particulier :

- `META-INF/MANIFEST.MF` déclare `Main-Class: org.springframework.boot.loader.launch.JarLauncher` et `Start-Class: app.TixaApp` ;
- les classes du lanceur sont à la racine du jar ;
- tes classes sont dans `BOOT-INF/classes`, tes dépendances dans `BOOT-INF/lib`.

`JarLauncher` crée un class loader capable de lire ces jars imbriqués, puis appelle le `main` de la `Start-Class`. À partir de là, c'est `SpringApplication.run()` (leçon 1).

::visual{id="spring-ch03-executable-jar"}

> **En production :** dans une image Docker, il vaut mieux **extraire** le jar en couches (dépendances d'un côté, code de l'autre) : seule la couche du code change à chaque version, et Docker réutilise les autres. Spring Boot le fait avec le mode `tools` du jar (`java -Djarmode=tools -jar tixa.jar extract --layers`) ; le module 14 en mesure l'effet.

## Pièges fréquents

- **Un `EnvironmentPostProcessor` déclaré `@Component`** : jamais appelé.
- **Un nom de classe imbriquée avec un point** dans `spring.factories` : `ClassNotFoundException` au démarrage.
- **`addFirst` pour des valeurs par défaut** : elles écrasent la configuration explicite, y compris la ligne de commande.
- **Lire une propriété qui n'existe pas encore** : un post-processor placé *avant* `ConfigDataEnvironmentPostProcessor` (ordre très prioritaire) ne voit pas les fichiers.

## À retenir

- `EnvironmentPostProcessor` : agir sur l'`Environment` avant tout bean, après la lecture des fichiers.
- Placer sa source consciemment : `addLast` pour des défauts, `addAfter(systemEnvironment)` pour des secrets.
- `META-INF/spring.factories` déclare ce qui doit exister avant le contexte ; nom binaire pour les classes imbriquées.
- Jar exécutable : `JarLauncher` (Main-Class) lit `BOOT-INF/classes` et `BOOT-INF/lib`, puis lance la `Start-Class`.

> **Source :** Spring Boot 4.1, [Customize the Environment or ApplicationContext Before It Starts](https://docs.spring.io/spring-boot/4.1/how-to/application.html), [Externalized Configuration — Configuration Trees](https://docs.spring.io/spring-boot/4.1/reference/features/external-config.html) et [The Executable Jar Format](https://docs.spring.io/spring-boot/4.1/specification/executable-jar/index.html) ; code de `EnvironmentPostProcessorApplicationListener` (spring-boot 4.1.3).
