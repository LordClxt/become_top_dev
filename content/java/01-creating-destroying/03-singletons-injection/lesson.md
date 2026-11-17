---
id: java-ch01-l03
title: "Singletons et injection de dépendances"
source: { chapter: 2, pages: "17-21" }
duration_min: 30
concepts:
  - id: java-singleton-field-factory
    label: "Singleton par champ public final ou par fabrique statique : constructeur privé, une instance à l'initialisation de la classe"
  - id: java-singleton-enum
    label: "L'enum à un élément : la forme de singleton la plus sûre (réflexion et sérialisation)"
  - id: java-dependency-injection
    label: "Injecter les ressources par le constructeur plutôt que les câbler en dur (singleton ou classe utilitaire)"
  - id: java-supplier-factory
    label: "Injecter une fabrique : Supplier<? extends T> appelé à chaque fois qu'il faut un nouvel objet"
glossary:
  - term: "singleton"
    definition: "Classe instanciée exactement une fois. Utile pour un objet sans état (une fonction) ou un composant unique par nature."
  - term: "injection de dépendances"
    definition: "Passer à un objet les ressources dont il dépend (par le constructeur, une fabrique ou un builder) au lieu qu'il les crée ou les cherche lui-même."
  - term: "readResolve"
    definition: "Méthode appelée après la désérialisation d'un objet, qui peut renvoyer une autre instance à sa place ; sert à préserver un singleton sérialisable."
  - term: "Supplier<T>"
    definition: "Interface fonctionnelle de Java 8 : une méthode T get() sans paramètre. Parfaite pour représenter une fabrique."
visuals: [java-ch01-injected-clock]
labs: [java-ch01-l03-lab-token-service]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Ce singleton est devenu Serializable, sans readResolve. On l'écrit puis on le relit. Qu'affiche le programme ?"
    code: |
      import java.io.*;

      public class Main {
          static class Registry implements Serializable {
              static final Registry INSTANCE = new Registry();
              private Registry() { }
          }

          public static void main(String[] args) throws Exception {
              var bytes = new ByteArrayOutputStream();
              try (var out = new ObjectOutputStream(bytes)) { out.writeObject(Registry.INSTANCE); }
              try (var in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
                  Object copy = in.readObject();
                  System.out.println((copy == Registry.INSTANCE) + " " + (copy instanceof Registry));
              }
          }
      }
    answer: "false true"
    explanation: "La désérialisation fabrique un nouvel objet sans passer par ton constructeur privé : tu as maintenant deux Registry. Le constructeur privé ne protège que contre new dans le code source, pas contre ce mécanisme ; readResolve ou une enum referment la brèche."
    concept: java-singleton-field-factory
  - id: c2
    type: single
    prompt: "Pour tester `ExchangeRates` (singleton), deux classes de test appellent `ExchangeRates.INSTANCE.setSource(fake)` avec des faux différents. En local tout passe ; en CI, avec les tests en parallèle, un test échoue une fois sur dix. Pourquoi ?"
    choices:
      - "La CI est plus lente, il faut augmenter les timeouts"
      - "Les deux tests partagent la même instance : l'un remplace la source de l'autre pendant qu'il tourne"
      - "setSource n'est pas synchronized : il suffit de l'ajouter"
      - "Les singletons ne sont pas chargés dans les tests parallèles"
    answer: 1
    explanation: "Un singleton n'a qu'un état, partagé par tous ses clients, donc par tous les tests qui tournent en même temps. synchronized rendrait l'écriture atomique mais un test verrait toujours la source posée par l'autre : la vraie correction est une instance par client, chacune avec sa source au constructeur."
    concept: java-dependency-injection
  - id: c3
    type: code-output
    prompt: "TokenService reçoit son horloge au constructeur. Qu'affiche le programme ?"
    code: |
      import java.time.*;

      public class Main {
          record TokenService(Clock clock) {
              boolean isExpired(Instant expiresAt) { return clock.instant().isAfter(expiresAt); }
          }

          public static void main(String[] args) {
              Instant t0 = Instant.parse("2026-01-01T00:00:00Z");
              Instant expiresAt = t0.plusSeconds(60);
              Clock fixed = Clock.fixed(t0, ZoneOffset.UTC);
              var before = new TokenService(fixed);
              var after = new TokenService(Clock.offset(fixed, Duration.ofSeconds(61)));
              System.out.println(before.isExpired(expiresAt) + " " + after.isExpired(expiresAt));
          }
      }
    answer: "false true"
    explanation: "Avec une horloge fixe, le service voit toujours le même instant : le résultat ne dépend plus du moment où le test tourne. Clock.offset simule 61 secondes plus tard sans aucun Thread.sleep, ce qu'Instant.now() câblé en dur ne permettrait jamais."
    concept: java-dependency-injection
---

## Pourquoi c'est important

3 h du matin, la CI est rouge : `TokenServiceTest.expiresAfterOneHour` échoue, puis repasse au relancement. Le service appelle `Instant.now()` en plein calcul, donc le test dépend de l'heure à laquelle il tourne (et de la lenteur de la machine). Personne ne peut le corriger sans toucher au code de production.

« Il n'y aura jamais qu'une horloge / un dictionnaire / une base de données » : c'est faux dès le premier test unitaire. Une classe qui va chercher elle-même ses ressources (un `static`, un singleton, `Instant.now()`) devient **impossible à tester** et **impossible à réutiliser** ailleurs. Ce que tu apprends ici, c'est ce que font Spring, Guice ou Dagger à grande échelle, et Grails avec ses services injectés.

La règle à retenir : **une classe ne va pas chercher ce dont elle a besoin, on le lui donne.**

## Les trois façons d'écrire un singleton

Un **singleton** est une classe instanciée une seule fois. Les deux premières formes reposent sur un constructeur privé.

**Champ public final :**

```java
public class Registry {
    public static final Registry INSTANCE = new Registry();
    private Registry() { }
}
```

Avantages : l'API dit clairement que c'est un singleton, et c'est le plus simple.

**Fabrique statique :**

```java
public class Registry {
    private static final Registry INSTANCE = new Registry();
    private Registry() { }
    public static Registry getInstance() { return INSTANCE; }
}
```

Avantages : tu peux changer d'avis plus tard (une instance par thread, par exemple) sans changer l'API ; elle peut être générique (module 5) ; et `Registry::getInstance` est un `Supplier<Registry>`. Si aucun de ces avantages ne te sert, préfère le champ public.

:::reveal Avant de lire la suite : un constructeur privé garantit-il qu'il n'y aura qu'une instance ?
Non. `private` est vérifié par le compilateur et par l'accès normal, mais deux mécanismes créent des objets sans passer par ton code : la **réflexion** et la **désérialisation**.
:::

**Les deux formes ont des failles :**
- un client privilégié peut appeler le constructeur privé par **réflexion** (l'API qui inspecte et appelle les membres d'une classe à l'exécution, avec `setAccessible(true)`). Parade : lever une exception si une deuxième instance est créée ;
- si la classe devient `Serializable`, **chaque désérialisation crée une nouvelle instance**. Parade : champs `transient` et une méthode `readResolve()` (appelée juste après la lecture, elle peut rendre un autre objet à la place) qui renvoie `INSTANCE` (on verra au module 12 que même ça est fragile).

::checkpoint{id="c1"}

> **Sous le capot :** la désérialisation n'appelle pas le constructeur de ta classe `Serializable` : elle alloue l'objet puis remplit ses champs depuis le flux d'octets. Seul le constructeur sans paramètre de la première classe mère non sérialisable (ici `Object`) est exécuté. C'est pourquoi ta vérification « déjà une instance ? » dans le constructeur ne voit rien passer.

**L'enum à un élément :**

```java
public enum Registry {
    INSTANCE;
    public void register(String name) { ... }
}
```

C'est la forme recommandée : aussi concise que le champ public, sérialisation gérée gratuitement, et une **garantie absolue** contre une seconde instance, même face à la réflexion. Une enum peut implémenter des interfaces. Seule limite : elle ne peut pas étendre une autre classe que `Enum`.

> **Au-delà du livre : et si l'instance coûte cher ?** Les trois formes créent l'instance au chargement de la classe. Pour la créer seulement au premier usage, l'idiome de la *classe détentrice* (une classe imbriquée statique privée qui porte le champ, la JVM ne l'initialisant qu'au premier accès) est la réponse classique, détaillée au module 11 (item 83). Les JDK 26 et 27 préparent une API standard pour ce besoin, `LazyConstant` (`LazyConstant.of(() -> new Registry())`, appelée `StableValue` dans le JDK 25) : une valeur calculée au plus une fois, même entre threads, que le JIT traite ensuite comme une vraie constante. Elle est encore en *preview* : pas dans les TP.

> Un singleton rend ses **clients** difficiles à tester : impossible de le remplacer par un faux, sauf s'il implémente une interface et que le client dépend de cette interface.

## Ne câble pas tes ressources en dur

Le cas typique : une classe qui dépend d'une ressource dont le comportement change le sien. Écrite comme classe utilitaire ou comme singleton, elle suppose qu'**une seule source** de taux convient à tout le monde, pour toujours. Or il en faut une autre pour les tests, une pour la crypto, une en cache…

:::compare
--- bad: Câblé en dur
```java
public class ExchangeRates {
    // la BCE, en dur : impossible d'en mettre une autre
    private static final RateSource SOURCE = new EcbRateSource();
    private ExchangeRates() { }
    public static BigDecimal convert(Money m, Currency to) { ... }
}
```
Un test de `convert` appelle le vrai réseau de la BCE. Ajouter un `setSource(...)` serait pire : fragile et faux dès qu'il y a plusieurs threads.
--- good: Injection de dépendances
```java
public class ExchangeRates {
    private final RateSource source;   // final : fixée une fois pour toutes

    public ExchangeRates(RateSource source) {
        this.source = Objects.requireNonNull(source);
    }
    public BigDecimal convert(Money m, Currency to) { ... }
}
```
Chaque client crée **son** instance avec **sa** source : la BCE en production, un faux à taux fixe en test.
:::

**Classes utilitaires et singletons ne conviennent pas aux classes dont le comportement dépend d'une ressource sous-jacente.** Il faut pouvoir créer plusieurs instances, chacune avec la ressource choisie par le client. Le moyen le plus simple : **la passer au constructeur**. On appelle ça l'**injection de dépendances** : l'objet reçoit ses ressources au lieu de les créer ou de les chercher.

::checkpoint{id="c2"}

C'est tout : ce patron est si simple que beaucoup l'utilisent sans savoir qu'il a un nom. Il marche avec n'importe quel nombre de ressources, préserve l'**immutabilité** (champs `final`), et s'applique aussi aux fabriques statiques et aux builders.

### L'horloge est une dépendance

`Instant.now()` et `System.currentTimeMillis()` sont des ressources cachées. Le JDK fournit `java.time.Clock` justement pour pouvoir les injecter : `Clock.systemUTC()` en production, `Clock.fixed(...)` ou une horloge maison dans les tests. C'est ce que tu fais dans le lab.

:::steps
```java
public final class TokenService {
    private final Clock clock;

    public TokenService(Clock clock) {
        this.clock = Objects.requireNonNull(clock);
    }

    public boolean isExpired(Instant expiresAt) {
        return clock.instant().isAfter(expiresAt);
    }
}
```
--- 2: L'horloge est un champ `final` comme une autre dépendance : le service n'a aucune idée de laquelle il a reçu.
--- 4-6: Le constructeur la reçoit et refuse `null` tout de suite, plutôt qu'un `NullPointerException` loin d'ici.
--- 9-10: `clock.instant()` remplace `Instant.now()`. En production c'est la même heure ; en test, c'est l'heure que **le test** a choisie.
:::

> **Sous le capot :** la Javadoc d'`Instant.now()` dit qu'elle interroge l'horloge système UTC, celle que renvoie `Clock.systemUTC()`. Passer par un `Clock` injecté ne change donc pas le comportement en production, seulement la possibilité de le contrôler.

Change l'horloge injectée et lance le test plusieurs fois : regarde lequel est stable.

::visual{id="java-ch01-injected-clock"}

::checkpoint{id="c3"}

### Injecter une fabrique

Parfois l'objet a besoin de **créer** des ressources, pas d'en recevoir une seule. On injecte alors une **fabrique**, c'est-à-dire un objet qu'on peut appeler plusieurs fois pour obtenir des instances : c'est le patron *Factory Method*. Depuis Java 8, `Supplier<T>` le représente parfaitement.

```java
Report render(Supplier<? extends Formatter> formatterFactory) { ... }
```

Le joker borné `? extends Formatter` (module 5) permet au client de passer une fabrique de **n'importe quel sous-type** : `HtmlFormatter::new`, `CsvFormatter::new`…

### Et les frameworks ?

Dans un gros projet, câbler des milliers de dépendances à la main devient fastidieux. Spring, Guice ou Dagger le font pour toi. Bonne nouvelle : une classe écrite pour l'injection manuelle (dépendances au constructeur) se branche sur ces frameworks sans modification. L'injection par constructeur est d'ailleurs celle que Spring recommande.

## Pièges fréquents

- **`Instant.now()` au milieu d'une méthode métier** : la méthode devient intestable sans `Thread.sleep`.
- **Un singleton qui porte un état mutable partagé** : tous les clients le voient, y compris les tests entre eux.
- **Rendre un singleton `Serializable` sans `readResolve`** : chaque lecture crée un « faux » exemplaire.
- **Ajouter un setter pour changer la ressource** d'un singleton : fragile, et faux entre threads. Il fallait plusieurs instances.

## À retenir

- Singleton : préfère l'**enum à un élément**. Sinon, constructeur privé + champ `public static final` (ou fabrique si tu veux garder de la souplesse).
- Une classe qui dépend d'une ressource **la reçoit** par son constructeur (ou sa fabrique, ou son builder) : ni singleton, ni classe utilitaire, ni création interne.
- Besoin de créer plusieurs ressources ? Injecte une **fabrique** : `Supplier<? extends T>`.
- Le temps est une dépendance : injecte un `Clock`.

> **Source :** *Effective Java*, 3e éd., items 3 et 5 (pages 17 à 21).
