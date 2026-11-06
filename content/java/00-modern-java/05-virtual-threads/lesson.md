---
id: java-ch00-l05
title: "Threads virtuels et valeurs de portée"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/444" }
duration_min: 35
concepts:
  - id: java-virtual-thread
    label: "Thread virtuel : un thread géré par la JVM, monté sur un thread porteur et démonté à chaque blocage"
  - id: java-vt-executor
    label: "Un thread virtuel par tâche : newVirtualThreadPerTaskExecutor dans un try-with-resources, qui attend la fin des tâches"
  - id: java-vt-limit
    label: "Ne pas mettre les threads virtuels en pool : limiter l'accès à une ressource rare avec un Semaphore"
  - id: java-vt-pinning
    label: "Ce que les threads virtuels n'accélèrent pas (calcul) et ce qui épingle encore un porteur (code natif)"
  - id: java-scoped-value
    label: "ScopedValue : une valeur immuable liée pour la durée d'un appel, lue par tout le code appelé, à relier explicitement dans un autre thread"
  - id: java-structured-concurrency
    label: "Concurrence structurée (preview) : des sous-tâches dont la durée de vie est bornée par un bloc"
glossary:
  - term: "thread virtuel"
    definition: "Thread (java.lang.Thread) planifié par la JVM et non par le système d'exploitation ; très bon marché, on en crée un par tâche (Java 21, JEP 444)."
  - term: "thread porteur"
    definition: "Thread de plateforme (du système) sur lequel un thread virtuel est monté pendant qu'il s'exécute."
  - term: "épinglage"
    definition: "Situation où un thread virtuel bloqué ne peut pas être démonté et immobilise son thread porteur."
  - term: "valeur de portée"
    definition: "ScopedValue (Java 25, JEP 506) : valeur liée pour la durée d'un appel, immuable, visible par tout le code appelé dans ce thread."
visuals: [java-ch00-virtual-threads]
labs: [java-ch00-l05-lab-quote-fanout]
extra: true
xp: 35
---

## Pourquoi c'est important

Le service de cotations interroge trois fournisseurs pour chaque requête. Chaque appel attend environ 300 ms le réseau. Le serveur a un pool de 200 threads. Un lundi à 9 h, 2 000 requêtes arrivent en même temps : 200 sont traitées, 1 800 attendent un thread libre, et la latence passe de 300 ms à plusieurs secondes. Le processeur, lui, est occupé à… 4 %. Les threads ne calculent rien : ils **attendent**.

Pendant quinze ans, la réponse a été de passer en asynchrone : `CompletableFuture`, callbacks, frameworks réactifs. Le code devenait illisible, les traces de pile inutiles, le débogage pénible. En Go, on lance une goroutine par requête et on écrit du code bloquant tout simple. Depuis Java 21, on peut faire exactement pareil.

## Le concept

### Un thread par tâche, vraiment

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (String symbol : symbols) {
        executor.submit(() -> provider.quote(symbol));   // un thread virtuel par appel
    }
}   // close() attend la fin de toutes les tâches
```

Un **thread virtuel** est un vrai `java.lang.Thread` : il a une pile, il peut se bloquer sur `sleep`, une socket, un verrou, une `BlockingQueue`. Mais il ne coûte que quelques centaines d'octets tant qu'il ne fait rien, et la JVM peut en gérer des **millions**. Sur un seul cœur, 10 000 tâches qui attendent 100 ms chacune se terminent en moins d'une demi-seconde.

Trois façons d'en créer :

```java
Thread.startVirtualThread(task);
Thread.ofVirtual().name("quote-", 0).start(task);
Executors.newVirtualThreadPerTaskExecutor();     // le plus courant
```

`ExecutorService` est `AutoCloseable` depuis Java 19 : le `try`-with-resources garantit qu'aucune tâche ne survit au bloc (module 1, item 9).

### Ne pas les mettre en pool, limiter autrement

Un pool de threads servait à deux choses : **amortir** le coût de création (inutile ici, un thread virtuel ne coûte presque rien) et **limiter** la concurrence. Mais limiter le nombre de threads est une façon indirecte de protéger une ressource. Avec les threads virtuels, on protège la ressource elle-même :

```java
private final Semaphore permits = new Semaphore(20);   // le fournisseur accepte 20 appels simultanés

long quote(String symbol) throws InterruptedException {
    permits.acquire();
    try {
        return provider.quote(symbol);
    } finally {
        permits.release();
    }
}
```

10 000 threads virtuels peuvent attendre le sémaphore : attendre ne coûte presque rien.

### Ce qu'ils n'accélèrent pas

Les threads virtuels augmentent le **débit** de tâches qui *attendent*, pas la vitesse de tâches qui *calculent*. Pour compresser des images, il y a toujours autant de cœurs : un pool de threads de plateforme dimensionné sur `availableProcessors()` (ou un `parallelStream`) reste le bon outil.

Ils sont aussi un mauvais endroit pour des caches dans un `ThreadLocal` : avec un million de threads, chacun a sa copie.

### Passer un contexte : `ScopedValue` (Java 25)

Il faut un identifiant de requête dans chaque ligne de journal, jusque dans le code du fournisseur. Le passer en paramètre partout est lourd ; le mettre dans un `ThreadLocal` a trois défauts : il est **modifiable** par n'importe qui, il **vit** jusqu'à ce qu'on pense à appeler `remove()` (une fuite classique avec les pools), et `InheritableThreadLocal` **copie** les valeurs dans chaque thread enfant.

```java
static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

ScopedValue.where(REQUEST_ID, "req-42").run(() -> handle(request));

// n'importe où dans le code appelé par handle :
log.info("[{}] cotation demandée", REQUEST_ID.get());
```

La valeur est liée **pour la durée de l'appel** à `run` (ou `call`, qui renvoie un résultat), en lecture seule, puis disparaît d'elle-même. Hors liaison, `get()` lève `NoSuchElementException` ; `isBound()` et `orElse(défaut)` permettent de tester.

Attention : une `ScopedValue` n'est **pas** transmise à un thread lancé par un `ExecutorService` ordinaire. Si une tâche soumise doit la voir, capture la valeur et relie-la dans la tâche :

```java
String id = REQUEST_ID.get();
executor.submit(() -> ScopedValue.where(REQUEST_ID, id).call(() -> provider.quote(symbol)));
```

### La suite : la concurrence structurée (preview)

`StructuredTaskScope` (en *preview* dans les JDK 25, 26 et 27, avec `--enable-preview`) borne la durée de vie de sous-tâches par un bloc : on `fork` plusieurs appels, on `join`, et si l'un échoue, les autres sont annulés. Les sous-tâches héritent automatiquement des `ScopedValue` du parent. Son API change encore d'une version à l'autre : ce cours s'en tient à l'`ExecutorService`, et y reviendra au module 11.

::visual{id="java-ch00-virtual-threads"}

## Sous le capot

**Monter et démonter.** Un thread virtuel est une *continuation* (une pile d'appels qu'on peut suspendre) plus un ordonnanceur. L'ordonnanceur par défaut est un `ForkJoinPool` dont le parallélisme vaut le nombre de cœurs : ce sont les **threads porteurs**. Quand le thread virtuel se bloque (socket, `sleep`, verrou, file), la JVM copie ses cadres de pile dans le tas, sous forme d'objets « morceaux de pile », et libère le porteur. Quand l'opération peut reprendre, le thread virtuel est remis dans la file de l'ordonnanceur et remonté sur n'importe quel porteur libre, ses cadres recopiés au besoin. C'est pourquoi un thread inactif coûte si peu : sa pile est un objet du tas, de la taille de ce qu'elle contient vraiment.

Pour que ça marche, le JDK a réécrit ses API bloquantes : les sockets de `java.io` et `java.net` passent par des descripteurs non bloquants et un thread « poller », qui réveille le thread virtuel quand des données arrivent. Ton code reste bloquant, c'est le JDK qui fait l'asynchrone à ta place.

**L'épinglage.** Un thread virtuel est **épinglé** à son porteur quand ses cadres ne peuvent pas être déplacés. Jusqu'à Java 23, c'était le cas dans un bloc `synchronized` : un thread virtuel qui attendait une socket sous `synchronized` immobilisait un porteur, et quelques-uns suffisaient à geler l'application. Depuis Java 24 (JEP 491), les moniteurs appartiennent au thread virtuel et non plus au porteur : `synchronized` n'épingle plus. Restent épinglants : les appels de code natif (JNI, fonctions étrangères) qui remontent vers du Java et s'y bloquent. Le JDK signale ces cas dans les événements JFR `jdk.VirtualThreadPinned`.

## Pièges fréquents

- **Un pool de threads virtuels** (`newFixedThreadPool` avec une fabrique virtuelle) : on retrouve la file d'attente qu'on voulait supprimer. Un thread par tâche, et un `Semaphore` pour la ressource.
- **Attendre un gain sur du calcul** : les threads virtuels ne créent pas de cœurs.
- **Un `ThreadLocal` comme cache coûteux** (un `SimpleDateFormat`, un tampon de 64 Ko) : multiplié par le nombre de threads.
- **Croire qu'une `ScopedValue` traverse un `ExecutorService`** : non, il faut la relier dans la tâche (ou utiliser la concurrence structurée).
- **Oublier de fermer l'executor** : les tâches continuent après la fin de la méthode. `try`-with-resources, toujours.
- **Ignorer `InterruptedException`** : rétablis l'état avec `Thread.currentThread().interrupt()` ou propage-la, sinon l'annulation ne marche plus.

## À retenir

- Thread virtuel : un `Thread` bon marché, démonté de son porteur à chaque blocage ; un par tâche, jamais en pool.
- `newVirtualThreadPerTaskExecutor()` dans un `try`-with-resources ; un `Semaphore` pour limiter l'accès à une ressource.
- Gain sur le débit des tâches qui attendent, aucun sur le calcul.
- Depuis Java 24, `synchronized` n'épingle plus ; le code natif, si.
- `ScopedValue.where(K, v).run(…)` : un contexte immuable, borné à l'appel ; à relier explicitement dans une tâche soumise à un executor.

> **Sources :** JEP 444 (threads virtuels, Java 21), JEP 491 (synchronized sans épinglage, Java 24), JEP 506 (valeurs de portée, Java 25), JEP 505, 525 et 533 (concurrence structurée, preview JDK 25 à 27). Exécuteurs et tâches plutôt que threads : *Effective Java*, 3e éd., item 80 (module 11).
