---
id: java-ch01-l05
title: "Fermer ses ressources : finaliseurs, cleaners et try-with-resources"
source: { chapter: 2, pages: "29-36" }
duration_min: 30
concepts:
  - id: java-finalizer-unreliable
    label: "Finaliseurs et cleaners : ni prompts ni garantis, lents, et les finaliseurs ouvrent la porte aux attaques"
  - id: java-cleaner-safety-net
    label: "Le seul usage raisonnable d'un Cleaner : filet de sécurité si le client oublie close() (ou pair natif non critique)"
  - id: java-autocloseable-state
    label: "Une ressource implémente AutoCloseable, retient qu'elle est fermée et refuse ensuite de servir (IllegalStateException)"
  - id: java-try-with-resources
    label: "try-with-resources : fermeture automatique, dans l'ordre inverse, même en cas d'exception"
  - id: java-suppressed-exceptions
    label: "Exceptions supprimées : l'exception du corps reste principale, celles des close() lui sont attachées (getSuppressed)"
glossary:
  - term: "finaliseur"
    definition: "Méthode finalize() appelée par le GC avant de récupérer un objet. Dépréciée depuis Java 9, dépréciée pour suppression depuis Java 18."
  - term: "Cleaner"
    definition: "java.lang.ref.Cleaner (Java 9) : enregistre une action de nettoyage exécutée quand un objet devient inaccessible. Moins dangereux qu'un finaliseur, tout aussi imprévisible."
  - term: "AutoCloseable"
    definition: "Interface à une méthode close(). Toute classe qui l'implémente peut être déclarée dans un try-with-resources."
  - term: "exception supprimée"
    definition: "Exception levée pendant la fermeture automatique alors qu'une autre était déjà en cours ; elle est attachée à la première via addSuppressed et lisible par getSuppressed()."
visuals: [java-ch01-twr-suppressed]
labs: [java-ch01-l05-lab-resources]
extra: false
xp: 30
---

## Pourquoi c'est important

Fichiers, sockets, connexions JDBC, verrous : ces ressources sont **limitées** et doivent être rendues au bon moment. En Go, tu écris `defer f.Close()`. En C++, le destructeur s'en charge. En Java, beaucoup ont cru que `finalize()` jouait ce rôle : c'est faux, et des services en sont morts. Le bon outil existe depuis Java 7, et il fait mieux que fermer : il **préserve la vraie cause** d'une panne.

## Les finaliseurs et les cleaners ne sont pas des destructeurs

Un finaliseur (`finalize()`) ou un cleaner (`java.lang.ref.Cleaner`, Java 9) s'exécute quand le GC constate qu'un objet est devenu inaccessible. Ça paraît pratique. Les problèmes :

- **Aucune promptitude.** Entre le moment où l'objet devient inaccessible et l'exécution du nettoyage, il peut s'écouler un temps arbitraire, qui dépend de l'algorithme du GC. Fermer des fichiers ainsi, c'est risquer d'épuiser les descripteurs : le programme marche sur ta machine et tombe chez le client. Le livre cite une application graphique morte en `OutOfMemoryError`, avec des milliers d'objets en attente dans la file de finalisation parce que le thread de finalisation avait une priorité trop basse.
- **Aucune garantie d'exécution.** Le programme peut se terminer sans jamais les lancer. Ne libère donc jamais un état persistant (un verrou en base) ainsi. `System.gc()` augmente les chances, sans rien garantir.
- **Exceptions avalées.** Une exception non attrapée dans un finaliseur est ignorée, sans même un message, et peut laisser des objets corrompus.
- **Coût.** Dans le livre, créer puis libérer un objet avec un finaliseur est environ 50 fois plus lent qu'avec `try-with-resources`.
- **Attaque par finaliseur.** Si un constructeur lève une exception, une sous-classe malveillante peut, dans son `finalize()`, sauver une référence vers l'objet à moitié construit et s'en servir. Parade : classe `final`, ou une méthode `finalize()` `final` et vide.

> **Au-delà du livre :** depuis Java 18 (JEP 421), `finalize()` est **déprécié pour suppression**. Les cleaners restent, mais pour des usages très limités.

### Les deux usages légitimes

1. **Filet de sécurité** : si le client oublie `close()`, mieux vaut libérer tard que jamais. `FileInputStream` et `ThreadPoolExecutor` en ont un. Pèse bien le coût.
2. **Pairs natifs** : un objet Java qui délègue à un objet natif (C) que le GC ne connaît pas, s'il ne tient aucune ressource critique.

Un cleaner bien écrit enregistre un **état séparé** qui ne doit **pas** référencer l'objet à nettoyer. Sinon l'objet reste accessible et ne sera jamais nettoyé. D'où une classe imbriquée **statique** (une classe interne garde une référence vers son englobant) et pas de lambda, qui capture facilement `this`.

```java
public final class TempDir implements AutoCloseable {
    private static final Cleaner CLEANER = Cleaner.create();

    // État à nettoyer. Statique : ne référence PAS le TempDir.
    private static final class State implements Runnable {
        private final Path path;
        State(Path path) { this.path = path; }
        @Override public void run() { deleteRecursively(path); }
    }

    private final Cleaner.Cleanable cleanable;

    public TempDir(Path path) {
        cleanable = CLEANER.register(this, new State(path));
    }

    @Override public void close() {
        cleanable.clean();   // exécute run() au plus une fois
    }
}
```

## La bonne réponse : AutoCloseable + try-with-resources

Ta classe implémente `AutoCloseable` ; le client appelle `close()` quand il a fini. Deux détails importants :

- la ressource **retient qu'elle est fermée** : après `close()`, ses autres méthodes lèvent `IllegalStateException` ;
- `close()` est **idempotent** quand c'est possible : un second appel ne fait rien.

### Le problème de try/finally

Avant Java 7 :

```java
static String firstLine(Path p) throws IOException {
    BufferedReader r = Files.newBufferedReader(p);
    try {
        return r.readLine();
    } finally {
        r.close();
    }
}
```

Avec deux ressources, il faut imbriquer, et le code devient vite illisible. Selon l'auteur, en 2007, les deux tiers des appels à `close` dans le JDK lui-même étaient faux. Il y a pire, et c'est subtil : si `readLine()` lève une exception (disque défaillant) **puis** que `close()` en lève une autre (même cause), la **seconde écrase la première**. La trace de pile ne mentionne même pas l'erreur d'origine, celle dont tu as besoin.

### try-with-resources

```java
static String firstLine(Path p) throws IOException {
    try (BufferedReader r = Files.newBufferedReader(p)) {
        return r.readLine();
    }
}

static void copy(Path src, Path dst) throws IOException {
    try (InputStream in = Files.newInputStream(src);
         OutputStream out = Files.newOutputStream(dst)) {
        in.transferTo(out);
    }
}
```

Ce que le langage garantit :
- chaque ressource déclarée est fermée, **même** en cas d'exception ou de `return` ;
- dans l'**ordre inverse** de déclaration (`out` puis `in`) ;
- seulement si elle a été ouverte : si `out` ne s'ouvre pas, `in` est quand même fermée ;
- si le corps lève une exception et qu'un `close()` en lève aussi, l'exception du corps **reste l'exception principale** ; celle de `close()` lui est attachée comme **exception supprimée**. Elle s'affiche dans la trace (« Suppressed: … ») et se lit avec `getSuppressed()`.

::visual{id="java-ch01-twr-suppressed"}

On peut ajouter des `catch` (et un `finally`) à un try-with-resources, sans niveau d'imbrication supplémentaire :

```java
static String firstLine(Path p, String defaultValue) {
    try (BufferedReader r = Files.newBufferedReader(p)) {
        return r.readLine();
    } catch (IOException e) {
        return defaultValue;
    }
}
```

> **Depuis Java 9**, une variable `final` ou effectivement `final` déjà déclarée peut être réutilisée directement : `try (r) { … }`.

## Pièges fréquents

- **Compter sur `finalize()` ou sur un cleaner pour fermer** : le programme marche en test et épuise ses descripteurs en production.
- **Un cleaner dont l'état référence l'objet** (classe interne non statique, lambda qui capture `this`) : l'objet n'est plus jamais inaccessible, donc jamais nettoyé.
- **`try/finally` à la main** : verbeux, souvent faux, et l'erreur de fermeture masque la vraie cause.
- **Laisser `close()` déclarer `throws Exception`** alors qu'il ne peut pas échouer : redéclare-le sans `throws`, pour épargner un `catch` inutile à tes clients.
- **Utiliser une ressource fermée sans erreur claire** : vérifie l'état et lève `IllegalStateException`.

## À retenir

- Pas de finaliseurs ; des cleaners seulement comme filet de sécurité ou pour des pairs natifs non critiques.
- Une ressource implémente `AutoCloseable`, retient qu'elle est fermée et refuse ensuite de servir.
- **Toujours `try-with-resources`** : plus court, fermeture garantie dans l'ordre inverse, et la vraie cause est conservée (exceptions supprimées).

> **Source :** *Effective Java*, 3e éd., items 8 et 9 (pages 29 à 36).
