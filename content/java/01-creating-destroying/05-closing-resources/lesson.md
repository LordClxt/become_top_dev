---
id: java-ch01-l05
title: "Fermer ses ressources : finaliseurs, cleaners et try-with-resources"
source: { chapter: 2, pages: "29-36" }
duration_min: 35
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
labs: [java-ch01-l05-lab-resources, java-ch01-l05-lab-pool-exhausted]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "On appelle `clean()` deux fois sur la même action. Qu'affiche le programme ?"
    code: |
      public class Main {
          public static void main(String[] args) {
              java.lang.ref.Cleaner cleaner = java.lang.ref.Cleaner.create();
              Object owner = new Object();
              java.lang.ref.Cleaner.Cleanable cleanable =
                      cleaner.register(owner, () -> System.out.println("nettoie"));
              cleanable.clean();
              cleanable.clean();
              System.out.println("fin");
          }
      }
    answer: "nettoie\nfin"
    explanation: "clean() lance l'action puis la désenregistre : elle s'exécute au plus une fois, que ce soit par clean() ou par le GC. C'est ce qui rend un close() bâti sur clean() idempotent sans compteur ni drapeau."
    concept: java-cleaner-safety-net
  - id: c2
    type: code-output
    prompt: "Le corps fait `return`, et il y a aussi un `finally`. Qu'affiche le programme ?"
    code: |
      public class Main {
          record Res(String name) implements AutoCloseable {
              @Override public void close() { System.out.println("ferme " + name); }
          }

          static String load() {
              try (Res r = new Res("fichier")) {
                  System.out.println("lit " + r.name());
                  return "contenu";
              } finally {
                  System.out.println("finally");
              }
          }

          public static void main(String[] args) {
              System.out.println("obtenu " + load());
          }
      }
    answer: "lit fichier\nferme fichier\nfinally\nobtenu contenu"
    explanation: "La ressource est fermée dès la fin du corps, avant le catch ou le finally que tu écris, et avant que la méthode rende sa valeur. Croire que return saute la fermeture, ou que ton finally passe avant close(), est l'erreur classique."
    concept: java-try-with-resources
  - id: c3
    type: single
    prompt: "Ce code tourne en production : `try (ResultSet rs = conn.prepareStatement(sql).executeQuery()) { … }`. Au bout de quelques heures, la base refuse de nouveaux curseurs. Pourquoi ?"
    choices:
      - "try-with-resources ne sait pas fermer un ResultSet"
      - "Le PreparedStatement n'est déclaré nulle part : seul rs est fermé, la requête préparée fuit"
      - "Il faut appeler rs.close() à la main dans un finally en plus"
      - "La connexion conn devrait être fermée à chaque requête"
    answer: 1
    explanation: "try-with-resources ne ferme que les variables déclarées entre ses parenthèses : l'objet intermédiaire créé par prepareStatement n'en fait pas partie. Déclare-le comme ressource à part (PreparedStatement ps = …; ResultSet rs = ps.executeQuery()) pour que les deux soient fermés, en ordre inverse."
    concept: java-try-with-resources
---

## Pourquoi c'est important

Vendredi soir, l'API de commandes répond « Too many open files » puis s'arrête de servir. En test, tout passait : la machine de dev redémarre souvent et n'ouvre jamais 1 024 fichiers d'un coup. En production, un fichier mal fermé par requête suffit, après quelques heures, à épuiser la limite du système.

Fichiers, sockets, connexions JDBC, verrous : ces ressources sont **limitées** et doivent être rendues au bon moment. En Go, tu écris `defer f.Close()`. En Java, beaucoup ont cru que `finalize()` jouait ce rôle : c'est faux, et des services en sont morts. Le bon outil existe depuis Java 7, et il fait mieux que fermer : il **préserve la vraie cause** d'une panne.

> **La règle à retenir :** le GC gère la **mémoire**, pas les **ressources**. Une ressource se rend explicitement, au moment où tu as fini, par `close()`.

## Les finaliseurs et les cleaners ne sont pas des destructeurs

Un **finaliseur** (la méthode `finalize()`) ou un **cleaner** (`java.lang.ref.Cleaner`, Java 9) est du code que le GC lance quand il constate qu'un objet est devenu inaccessible. Ça ressemble à un destructeur C++. Ça n'en est pas un :

- **Aucune promptitude.** Entre le moment où l'objet devient inaccessible et l'exécution du nettoyage, il peut s'écouler un temps arbitraire, qui dépend de l'algorithme du GC. Fermer des fichiers ainsi, c'est risquer d'épuiser les descripteurs : le programme marche sur ta machine et tombe chez le client. Le livre cite une application graphique morte en `OutOfMemoryError`, avec des milliers d'objets en attente dans la file de finalisation parce que le thread de finalisation avait une priorité trop basse.
- **Aucune garantie d'exécution.** Le programme peut se terminer sans jamais les lancer. Ne libère donc jamais un état persistant (un verrou en base) ainsi. `System.gc()` augmente les chances, sans rien garantir.
- **Exceptions avalées.** Une exception non attrapée dans un finaliseur est ignorée, sans même un message, et peut laisser des objets corrompus.
- **Coût.** Dans le livre, créer puis libérer un objet avec un finaliseur est environ 50 fois plus lent qu'avec `try-with-resources`.
- **Attaque par finaliseur.** Si un constructeur lève une exception, une sous-classe malveillante peut, dans son `finalize()`, sauver une référence vers l'objet à moitié construit et s'en servir. Parade : classe `final`, ou une méthode `finalize()` `final` et vide.

> **Au-delà du livre :** depuis Java 18 (JEP 421), `finalize()` est **déprécié pour suppression** ; il existe toujours dans le JDK 25. Pour vérifier qu'une application n'en dépend plus, lance-la avec `java --finalization=disabled` : les finaliseurs ne sont alors jamais appelés, comme le jour où ils auront disparu. Les cleaners restent, mais pour des usages très limités.

### Les deux usages légitimes

1. **Filet de sécurité** : si le client oublie `close()`, mieux vaut libérer tard que jamais. `FileInputStream` et `ThreadPoolExecutor` en ont un. Pèse bien le coût.
2. **Pairs natifs** : un objet Java qui délègue à un objet natif (C) que le GC ne connaît pas, s'il ne tient aucune ressource critique.

Un cleaner bien écrit enregistre un **état séparé** qui ne doit **pas** référencer l'objet à nettoyer. Sinon l'objet reste accessible et ne sera jamais nettoyé. D'où une classe imbriquée **statique** (une classe interne garde une référence cachée vers son englobant) et pas de lambda, qui capture facilement `this`.

:::steps
```java title="TempDir.java"
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
--- 1: Classe `final` et `AutoCloseable` : le chemin normal reste `close()`, le cleaner n'est qu'un filet.
--- 2: Un seul `Cleaner` partagé : chacun démarre son propre thread, inutile d'en créer un par objet.
--- 4-9: L'état ne contient que ce qu'il faut pour nettoyer (le chemin). Classe **statique** : aucune référence cachée vers le `TempDir`, qui peut donc devenir inaccessible.
--- 13-15: `register(this, state)` : « quand ce `TempDir` sera inaccessible, lance `state.run()` ».
--- 17-19: `close()` déclenche le nettoyage tout de suite. `clean()` désenregistre l'action : elle ne tournera plus jamais, ni par un second `close()`, ni par le GC.
:::

::checkpoint{id="c1"}

## La bonne réponse : AutoCloseable + try-with-resources

Ta classe implémente **`AutoCloseable`**, une interface à une seule méthode, `close()`. Le client l'appelle quand il a fini. Deux détails importants :

- la ressource **retient qu'elle est fermée** : après `close()`, ses autres méthodes lèvent `IllegalStateException` ;
- `close()` est **idempotent** quand c'est possible : un second appel ne fait rien.

### Le problème de try/finally

:::reveal Avant de lire la suite : si `readLine()` et `close()` lèvent toutes deux une exception dans un try/finally, laquelle voit-on ?
La **seconde**. L'exception levée dans le `finally` remplace celle du corps : la trace de pile ne mentionne même pas l'erreur d'origine, celle dont tu as besoin pour diagnostiquer.
:::

:::compare
--- bad: try/finally (avant Java 7)
```java
static String firstLine(Path p) throws IOException {
    BufferedReader r = Files.newBufferedReader(p);
    try {
        return r.readLine();
    } finally {
        r.close();   // son exception écrase celle de readLine()
    }
}
```
Verbeux, à imbriquer pour chaque ressource, et la vraie cause peut disparaître.
--- good: try-with-resources
```java
static String firstLine(Path p) throws IOException {
    try (BufferedReader r = Files.newBufferedReader(p)) {
        return r.readLine();
    }   // close() automatique, cause préservée
}
```
Plus court, et une exception de `close()` est attachée à celle du corps au lieu de la remplacer.
:::

Avec deux ressources, la version try/finally devient vite illisible. Selon l'auteur, en 2007, les deux tiers des appels à `close` dans le JDK lui-même étaient faux. Le cas subtil : `readLine()` lève une exception (disque défaillant) **puis** `close()` en lève une autre (même cause), et la **seconde écrase la première**.

### try-with-resources

```java
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

Seules les ressources **déclarées entre les parenthèses** sont fermées. Un objet intermédiaire créé dans l'expression d'initialisation n'est pas une ressource déclarée :

::checkpoint{id="c3"}

On peut ajouter des `catch` (et un `finally`) à un try-with-resources, sans niveau d'imbrication supplémentaire :

```java
static String firstLine(Path p, String defaultValue) {
    try (BufferedReader r = Files.newBufferedReader(p)) {
        return r.readLine();
    } catch (IOException e) {
        return defaultValue;   // r est déjà fermée quand on arrive ici
    }
}
```

> **Depuis Java 9**, une variable `final` ou effectivement `final` déjà déclarée peut être réutilisée directement : `try (r) { … }`.

## Sous le capot : ce que javac écrit à ta place

try-with-resources n'existe pas dans le bytecode. Le compilateur le **réécrit** en `try`/`catch`/`finally` ordinaires (la règle exacte est dans la spécification du langage, JLS §14.20.3). Pour `try (R r = open()) { corps }`, il produit l'équivalent de :

:::steps
```java
final R r = open();
Throwable primary = null;
try {
    corps
} catch (Throwable t) {
    primary = t;
    throw t;
} finally {
    if (r != null) {
        if (primary != null) {
            try { r.close(); } catch (Throwable s) { primary.addSuppressed(s); }
        } else {
            r.close();
        }
    }
}
```
--- 1: L'ouverture a lieu **avant** le `try` : si `open()` lève une exception, il n'y a rien à fermer. C'est pour ça qu'une ressource qui ne s'ouvre pas n'est jamais fermée.
--- 2,5-7: Si le corps échoue, on mémorise l'exception (la cause principale) avant de la relancer.
--- 8-9: Le `finally` tourne dans tous les cas. Une ressource qui vaut `null` est simplement sautée, sans `NullPointerException`.
--- 10-11: Échec du corps : l'exception de `close()` est **attachée** à la principale par `addSuppressed`, au lieu de la remplacer.
--- 12-13: Succès du corps : `close()` est appelé normalement, et s'il échoue, c'est son exception qui remonte.
:::

Lire cette traduction permet de prédire les autres cas limites :

- **Plusieurs ressources** : javac imbrique un bloc par ressource, la dernière déclarée au plus profond. D'où la fermeture en ordre inverse.
- **Le corps fait `return`** : le `finally` s'exécute après l'évaluation de la valeur de retour et avant de rendre la main.
- **Coût** : aucun objet créé tant que rien n'échoue. `addSuppressed` n'alloue que sur le chemin d'erreur (une liste interne à l'exception).

::checkpoint{id="c2"}

> **En production :** sur un serveur, une fuite de ressource ne se voit pas en test : elle se voit après des heures, quand le pool de connexions ou la limite de descripteurs (`ulimit -n`, souvent 1024) est atteint. Les pannes **rattrapées** (un réessai qui avale l'exception) sont les pires : aucune trace dans les logs. Le TP de débogage de cette leçon en est un exemple typique.

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
