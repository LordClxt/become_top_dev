---
id: java-ch01-l03
title: "Singletons et injection de dépendances"
source: { chapter: 2, pages: "17-21" }
duration_min: 25
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
visuals: []
labs: [java-ch01-l03-lab-token-service]
extra: false
xp: 25
---

## Pourquoi c'est important

« Il n'y aura jamais qu'un dictionnaire / une horloge / une base de données » : c'est faux dès le premier test unitaire. Une classe qui va chercher elle-même ses ressources (un `static`, un singleton, `Instant.now()`) devient **impossible à tester** et **impossible à réutiliser** dans un autre contexte. Ce que tu apprends ici, c'est exactement ce que font Spring, Guice ou Dagger à grande échelle, et ce que Grails fait avec ses services injectés.

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

**Les deux formes ont des failles :**
- un client privilégié peut appeler le constructeur privé par **réflexion** (`setAccessible(true)`). Parade : lever une exception si une deuxième instance est créée ;
- si la classe devient `Serializable`, **chaque désérialisation crée une nouvelle instance**. Parade : champs `transient` et une méthode `readResolve()` qui renvoie `INSTANCE` (on verra au module 12 que même ça est fragile).

**L'enum à un élément :**

```java
public enum Registry {
    INSTANCE;
    public void register(String name) { ... }
}
```

C'est la forme recommandée : aussi concise que le champ public, sérialisation gérée gratuitement, et une **garantie absolue** contre une seconde instance, même face à la réflexion. Une enum peut implémenter des interfaces. Seule limite : elle ne peut pas étendre une autre classe que `Enum`.

> Un singleton rend ses **clients** difficiles à tester : impossible de le remplacer par un faux, sauf s'il implémente une interface et que le client dépend de cette interface.

## Ne câble pas tes ressources en dur

Le cas typique : une classe qui dépend d'une ressource dont le comportement change le sien.

```java
// Câblé en dur : rigide et intestable
public class ExchangeRates {
    private static final RateSource SOURCE = new EcbRateSource();   // la BCE, en dur
    private ExchangeRates() { }
    public static BigDecimal convert(Money m, Currency to) { ... }
}
```

Écrite comme classe utilitaire ou comme singleton, elle suppose qu'**une seule source** de taux convient à tout le monde, pour toujours. Or il en faut une autre pour les tests, une pour la crypto, une en cache… Ajouter un `setSource(...)` serait pire : fragile et faux dès qu'il y a plusieurs threads.

**Classes utilitaires et singletons ne conviennent pas aux classes dont le comportement dépend d'une ressource sous-jacente.** Il faut pouvoir créer plusieurs instances, chacune avec la ressource choisie par le client. Le moyen le plus simple : **la passer au constructeur**.

```java
// Injection de dépendances : souple et testable
public class ExchangeRates {
    private final RateSource source;

    public ExchangeRates(RateSource source) {
        this.source = Objects.requireNonNull(source);
    }
    public BigDecimal convert(Money m, Currency to) { ... }
}
```

C'est tout : ce patron est si simple que beaucoup l'utilisent sans savoir qu'il a un nom. Il marche avec n'importe quel nombre de ressources, préserve l'**immutabilité** (champs `final`), et s'applique aussi aux fabriques statiques et aux builders.

### L'horloge est une dépendance

`Instant.now()` et `System.currentTimeMillis()` sont des ressources cachées. Le JDK fournit `java.time.Clock` justement pour pouvoir les injecter : `Clock.systemUTC()` en production, `Clock.fixed(...)` ou une horloge maison dans les tests. C'est ce que tu fais dans le lab.

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
