---
id: java-ch00-l05
title: "Threads virtuels et valeurs de portée"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/444" }
duration_min: 40
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
checkpoints:
  - id: c1
    type: code-output
    prompt: "Prédis la sortie de ce programme."
    code: |
      void main() throws Exception {
          var builder = Thread.ofVirtual().name("quote-", 0);
          var a = builder.unstarted(() -> { });
          var b = builder.unstarted(() -> { });
          try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
              var inTask = executor.submit(() -> Thread.currentThread().isVirtual());
              IO.println(a.getName() + " " + b.getName() + " " + inTask.get() + " " + Thread.currentThread().isVirtual());
          }
      }
    answer: "quote-0 quote-1 true false"
    explanation: "Le builder incrémente son compteur à chaque thread créé, ce qui donne des noms lisibles dans une trace. Chaque tâche de l'executor tourne sur son propre thread virtuel, mais main reste un thread de plateforme : virtuel n'est pas un mode global de la JVM, c'est un choix par thread."
    concept: java-vt-executor
  - id: c2
    type: single
    prompt: "Trouve le bug : `try { permits.acquire(); return provider.quote(symbol); } finally { permits.release(); }`"
    choices:
      - "Aucun : release est dans finally, il est toujours appelé"
      - "Si acquire est interrompu, finally rend un permis jamais pris : le sémaphore finit par en avoir plus que 20"
      - "Un Semaphore ne fonctionne pas avec des threads virtuels"
      - "acquire épingle le thread virtuel à son porteur"
    answer: 1
    explanation: "acquire peut lever InterruptedException avant d'avoir obtenu un permis, et le finally appelle quand même release : chaque interruption ajoute un permis, et la limite de 20 fuit silencieusement. acquire se place juste AVANT le try, pour que release ne coure que si le permis a vraiment été pris."
    concept: java-vt-limit
  - id: c3
    type: code-output
    prompt: "Une lambda créée pendant la liaison est appelée après. Qu'affiche le programme ?"
    code: |
      static final ScopedValue<String> ID = ScopedValue.newInstance();
      static Supplier<String> later;

      void main() {
          ScopedValue.where(ID, "req-42").run(() -> {
              later = () -> ID.orElse("aucun");
              IO.print(later.get() + " ");
          });
          IO.println(later.get());
      }
    answer: "req-42 aucun"
    explanation: "Une lambda ne capture pas la valeur d'une ScopedValue : elle la lit au moment où elle s'exécute. Après run, la liaison n'existe plus, donc un callback appelé plus tard ne voit rien ; pour emporter la valeur, copie-la dans une variable locale pendant la liaison."
    concept: java-scoped-value
---

## Pourquoi c'est important

Le service de cotations interroge trois fournisseurs pour chaque requête. Chaque appel attend environ 300 ms le réseau. Le serveur a un pool de 200 threads. Un lundi à 9 h, 2 000 requêtes arrivent en même temps : 200 sont traitées, 1 800 attendent un thread libre, et la latence passe de 300 ms à plusieurs secondes. Le processeur, lui, est occupé à… 4 %. Les threads ne calculent rien : ils **attendent**.

Pendant quinze ans, la réponse a été de passer en asynchrone : `CompletableFuture`, callbacks, frameworks réactifs. Le code devenait illisible, les traces de pile inutiles, le débogage pénible. En Go, on lance une goroutine par requête et on écrit du code bloquant tout simple. Depuis Java 21, on peut faire exactement pareil.

## Le concept

**Le modèle mental.** Pense à une salle de restaurant. Les serveurs sont les **threads porteurs** : de vrais threads du système, peu nombreux (un par cœur). Chaque commande est un **thread virtuel**. Quand une commande attend la cuisine (le réseau, un verrou, un `sleep`), le serveur ne reste pas planté devant le passe : il la pose et prend la commande suivante. Le jour où la cuisine répond, n'importe quel serveur libre reprend la commande là où elle en était. Résultat : des milliers de commandes en cours avec huit serveurs, tant qu'elles passent leur temps à attendre.

### Un thread par tâche, vraiment

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (String symbol : symbols) {
        executor.submit(() -> provider.quote(symbol));   // un thread virtuel par appel
    }
}   // close() attend la fin de toutes les tâches
```

Un **thread virtuel** est un vrai `java.lang.Thread` : il a une pile, il peut se bloquer sur `sleep`, une socket, un verrou, une `BlockingQueue`. Mais il ne coûte que quelques centaines d'octets tant qu'il ne fait rien, et la JVM peut en gérer des **millions**.

:::reveal Avant de lire la suite : sur un seul cœur, combien de temps pour 10 000 tâches qui attendent chacune 100 ms ?
Moins d'une demi-seconde. Pendant ces 100 ms, aucune tâche n'occupe le porteur : elles sont toutes démontées et attendent ensemble. Le temps total ressemble à celui d'une seule attente, plus le petit coût de création et de reprise de chaque thread. Avec un pool de 200 threads de plateforme, il faudrait 50 vagues, donc environ 5 secondes.
:::

Trois façons d'en créer :

```java
Thread.startVirtualThread(task);
Thread.ofVirtual().name("quote-", 0).start(task);
Executors.newVirtualThreadPerTaskExecutor();     // le plus courant
```

`ExecutorService` est `AutoCloseable` depuis Java 19 : le `try`-with-resources garantit qu'aucune tâche ne survit au bloc (module 1, item 9).

::checkpoint{id="c1"}

### Ne pas les mettre en pool, limiter autrement

Un pool de threads servait à deux choses : **amortir** le coût de création (inutile ici, un thread virtuel ne coûte presque rien) et **limiter** la concurrence. Mais limiter le nombre de threads est une façon indirecte de protéger une ressource. Avec les threads virtuels, on protège la ressource elle-même :

:::steps
```java title="LimitedProvider.java"
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
--- 1: Le **sémaphore** est un compteur de 20 permis. Il protège le fournisseur, pas le nombre de threads : on peut lancer autant de threads virtuels qu'on veut.
--- 3: `throws InterruptedException` : attendre un permis peut être interrompu (une annulation), et on le laisse remonter.
--- 4: `acquire()` prend un permis, ou **bloque** s'il n'en reste aucun. Pour un thread virtuel, bloquer veut dire être démonté : le porteur sert quelqu'un d'autre.
--- 5-6: L'appel réseau, avec au plus 20 appels en cours au même moment.
--- 7-9: `release()` dans `finally` : le permis est rendu même si l'appel lève une exception. Et `acquire()` est **avant** le `try`, pour ne jamais rendre un permis qu'on n'a pas pris.
:::

10 000 threads virtuels peuvent attendre le sémaphore : attendre ne coûte presque rien.

::checkpoint{id="c2"}

### Ce qu'ils n'accélèrent pas

Les threads virtuels augmentent le **débit** de tâches qui *attendent*, pas la vitesse de tâches qui *calculent*. Pour compresser des images, il y a toujours autant de cœurs : un pool de threads de plateforme dimensionné sur `availableProcessors()` (ou un `parallelStream`) reste le bon outil.

Ils sont aussi un mauvais endroit pour des caches dans un `ThreadLocal` : avec un million de threads, chacun a sa copie.

### Passer un contexte : `ScopedValue` (Java 25)

Il faut un identifiant de requête dans chaque ligne de journal, jusque dans le code du fournisseur. Le passer en paramètre partout est lourd. Une **valeur de portée** (`ScopedValue`) est une valeur attachée à un appel de méthode : tout le code appelé depuis là peut la lire, personne ne peut la changer, et elle disparaît au retour. Compare avec le `ThreadLocal`, l'outil d'avant :

:::compare
--- bad: ThreadLocal
```java
static final ThreadLocal<String> REQUEST_ID = new ThreadLocal<>();

REQUEST_ID.set("req-42");
try {
    handle(request);          // n'importe qui peut faire set(...) ici
} finally {
    REQUEST_ID.remove();      // oublie-le et la valeur fuit vers la requête suivante
}
```
Modifiable par n'importe qui, vivante jusqu'au `remove()`, et `InheritableThreadLocal` **copie** les valeurs dans chaque thread enfant.
--- good: ScopedValue
```java
static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

ScopedValue.where(REQUEST_ID, "req-42").run(() -> handle(request));

// n'importe où dans le code appelé par handle :
log.info("[{}] cotation demandée", REQUEST_ID.get());
```
En lecture seule, et la liaison s'arrête d'elle-même à la fin de `run`, sans rien à nettoyer.
:::

La valeur est liée **pour la durée de l'appel** à `run` (ou `call`, qui renvoie un résultat), en lecture seule, puis disparaît d'elle-même. Hors liaison, `get()` lève `NoSuchElementException` ; `isBound()` et `orElse(défaut)` permettent de tester.

::checkpoint{id="c3"}

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
