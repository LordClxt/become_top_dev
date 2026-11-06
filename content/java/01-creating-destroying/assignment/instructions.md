## Contexte

Ton service doit exposer des métriques : nombre de requêtes, durée des appels à la base. Tu écris un petit registre, du genre de Micrometer, avec trois exigences de production :

- **un nom = une métrique** : deux parties du code qui demandent `counter("http.requests")` doivent incrémenter **le même** compteur ;
- **testable** : on doit pouvoir mesurer des durées sans attendre, donc l'horloge est **injectée** ;
- **mémoire bornée** : un timer appelé un milliard de fois ne garde que ses N dernières mesures.

Tu édites `MetricRegistry.java`, `Counter.java` et `Timer.java`. Les signatures sont là ; le reste (champs, structures, validations) est à toi.

## L'API attendue

```java
var ticks = new long[] {0};                     // une horloge factice en nanosecondes
MetricRegistry registry = MetricRegistry.builder()
        .ticker(() -> ticks[0])                 // défaut : System::nanoTime
        .maxSamples(3)                          // défaut : 100
        .build();

Counter requests = registry.counter("http.requests");
requests.increment();
requests.add(4);
requests.count();                               // 5
registry.counter("http.requests") == requests;  // true

Timer db = registry.timer("db.query");
try (Timer.Sample s = db.start()) {
    ticks[0] += 2_000_000;                      // 2 ms passent
}
db.count();                                     // 1
db.recent();                                    // [PT0.002S]
db.max();                                       // PT0.002S
```

## Règles

**Builder**
- `MetricRegistry` n'a **aucun constructeur public** : on passe par `builder()`.
- `ticker(null)` : `NullPointerException`. `maxSamples(n)` avec `n < 1` : `IllegalArgumentException`, tout de suite.
- Un builder peut resservir : les registres déjà construits ne changent pas.

**Noms et instances**
- Un nom valide : des segments en minuscules séparés par des points, chaque segment commence par une lettre (`http.requests`, `db.query2`). Sinon `IllegalArgumentException` avec le nom dans le message.
- Même nom, même type : **la même instance**. Un nom déjà pris par un compteur ne peut pas devenir un timer (ni l'inverse) : `IllegalArgumentException`.
- `names()` renvoie les noms enregistrés, triés, dans un ensemble non modifiable.

**Counter**
- `add(n)` refuse un `n` négatif (`IllegalArgumentException`) : un compteur ne descend jamais.

**Timer**
- `start()` renvoie un `Sample`, à fermer dans un `try`-with-resources. La durée mesurée = ticker à la fermeture − ticker au démarrage.
- Fermer un `Sample` deux fois n'enregistre **qu'une** mesure.
- `count()` compte **toutes** les mesures depuis la création ; `recent()` ne renvoie que les `maxSamples` dernières, de la plus ancienne à la plus récente, dans une liste non modifiable ; `max()` est le maximum de `recent()` (`Duration.ZERO` si aucune mesure).
- La mémoire d'un timer ne doit pas grandir avec le nombre de mesures.

## Ce qui sera relu

Au-delà des tests, la revue juge la **qualité de création des objets** (où valides-tu, qu'est-ce qui est recréé à chaque appel ?) et la **gestion de la mémoire**. Écris le code qu'un senior accepterait en revue.
