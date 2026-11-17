---
id: java-ch00-l04
title: "Collections et streams modernes : fabriques immuables, collections ordonnées et gatherers"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/485" }
duration_min: 40
concepts:
  - id: java-collection-factories
    label: "List.of, Set.of, Map.of : non modifiables, hostiles à null, sans doublons, ordre d'itération des Set et Map non spécifié"
  - id: java-copyof-vs-view
    label: "List.copyOf copie (et ne copie pas ce qui est déjà immuable) ; Collections.unmodifiableList n'est qu'une vue"
  - id: java-stream-tolist
    label: "Stream.toList() renvoie une liste non modifiable (qui accepte null) ; Collectors.toList() ne garantit rien"
  - id: java-sequenced
    label: "Collections ordonnées (Java 21) : getFirst, getLast, addFirst, reversed() et leurs équivalents pour les Map"
  - id: java-gatherers-builtin
    label: "Gatherers prédéfinis : windowFixed, windowSliding, scan, fold, mapConcurrent"
  - id: java-gatherer-custom
    label: "Écrire un gatherer : état initial, intégrateur qui pousse vers l'aval, finisseur, et arrêt anticipé en renvoyant false"
glossary:
  - term: "vue"
    definition: "Objet qui présente une autre collection sans la copier : il reflète ses modifications (unmodifiableList, keySet, reversed)."
  - term: "collection ordonnée"
    definition: "SequencedCollection (Java 21) : collection dont les éléments ont un premier et un dernier, et un ordre inversable."
  - term: "gatherer"
    definition: "Opération intermédiaire de stream définie par l'utilisateur (Java 24, JEP 485), passée à Stream.gather."
  - term: "intégrateur"
    definition: "Fonction d'un gatherer appelée pour chaque élément, avec l'état et l'aval (Downstream) vers lequel pousser des résultats."
visuals: [java-ch00-gatherer-flow]
labs: [java-ch00-l04-lab-trade-batches]
extra: true
xp: 30
checkpoints:
  - id: c1
    type: single
    prompt: "En revue de code : `var names = users.stream().map(User::name).toList();` puis, trois lignes plus bas, `names.sort(Comparator.naturalOrder());`. Que se passe-t-il ?"
    choices:
      - "Ça compile et trie la liste, comme avec une ArrayList"
      - "Ça ne compile pas : toList() renvoie un type sans méthode sort"
      - "Ça compile, mais sort lève UnsupportedOperationException à l'exécution"
      - "Ça compile, sort ne fait rien en silence"
    answer: 2
    explanation: "toList() renvoie bien une List (qui déclare sort), donc le compilateur ne voit rien ; mais l'implémentation est non modifiable et refuse à l'exécution. L'immuabilité de ces listes n'est pas dans le type : c'est le contrat de la méthode qui te la promet."
    concept: java-stream-tolist
  - id: c2
    type: code-output
    prompt: "Prédis la sortie : l'élément 2 est déjà dans l'ensemble."
    code: |
      void main() {
          var ids = new LinkedHashSet<>(List.of(3, 1, 2));
          ids.addFirst(2);
          IO.println(ids + " " + ids.reversed().getFirst());
      }
    answer: "[2, 3, 1] 1"
    explanation: "Sur un LinkedHashSet, addFirst d'un élément présent ne crée pas de doublon : il le DÉPLACE en tête (contrairement à put sur une LinkedHashMap, qui laisse la clé à sa place). reversed() est une vue inversée, dont le premier élément est donc le dernier de l'original."
    concept: java-sequenced
  - id: c3
    type: code-output
    prompt: "Ce gatherer est le même que plus haut, mais sans finisseur. Qu'affiche le programme ?"
    code: |
      static Gatherer<Integer, ?, List<Integer>> upTo(int limit) {
          class Batch { List<Integer> items = new ArrayList<>(); int sum; }
          return Gatherer.ofSequential(
              Batch::new,
              Gatherer.Integrator.ofGreedy((batch, x, downstream) -> {
                  if (!batch.items.isEmpty() && batch.sum + x > limit) {
                      downstream.push(List.copyOf(batch.items));
                      batch.items.clear();
                      batch.sum = 0;
                  }
                  batch.items.add(x);
                  batch.sum += x;
                  return true;
              }));
      }

      void main() {
          IO.println(Stream.of(6, 3, 2, 7).gather(upTo(8)).toList());
      }
    answer: "[[6], [3, 2]]"
    explanation: "L'intégrateur n'émet un paquet que lorsque l'élément SUIVANT le ferait déborder : le dernier paquet [7] reste dans l'état quand la source est épuisée. Sans finisseur pour le pousser, il disparaît sans erreur."
    concept: java-gatherer-custom
---

## Pourquoi c'est important

Deux incidents réels, dans la même équipe, la même semaine :

1. `Config.allowedHosts()` renvoyait `Collections.unmodifiableList(hosts)`. « Non modifiable », pensait l'appelant, qui la gardait en cache. Mais une **vue** non modifiable reflète la liste d'origine : quand le rechargement à chaud a vidé `hosts`, toutes les requêtes ont été refusées.
2. Un test comparait la sortie JSON d'un `Set.of("a", "b", "c")` à une chaîne fixe. Il passait sur le poste du développeur et échouait une fois sur trois en CI : l'ordre d'itération d'un `Set.of` **change à chaque démarrage de la JVM**, volontairement.

Les collections de Java 9 à 21 et les gatherers de Java 24 sont simples, à condition de savoir précisément ce que chaque méthode promet.

**Le modèle mental.** Devant chaque collection qu'on te rend, pose deux questions : « puis-je la modifier ? » et « est-ce une **copie** (une photo, figée) ou une **vue** (une fenêtre sur une autre collection, qui montre ses changements) ? ». Les deux incidents viennent d'une mauvaise réponse à l'une de ces questions. Le type `List` ne répond à aucune des deux : c'est le contrat de la méthode qui le fait.

## Le concept

### Les fabriques immuables (Java 9)

```java
List<String> hosts = List.of("api.example.com", "cdn.example.com");
Set<String> roles = Set.of("admin", "dev");
Map<String, Integer> limits = Map.of("free", 100, "pro", 10_000);
```

Ce qu'elles garantissent :

- **non modifiables** : `add`, `set`, `remove`, `put` lèvent `UnsupportedOperationException` ;
- **hostiles à `null`** : `List.of(1, null)` lève `NullPointerException`, et même `contains(null)` ;
- **pas de doublons** pour `Set.of` et `Map.of` (clés) : `IllegalArgumentException` à la création ;
- ordre de `List.of` conservé ; ordre d'itération de `Set.of` et `Map.of` **non spécifié**.

### Copie ou vue ?

```java
var source = new ArrayList<>(List.of("a", "b"));
var view = Collections.unmodifiableList(source);   // vue : on ne peut pas écrire à travers…
var copy = List.copyOf(source);                    // copie indépendante et immuable
source.add("c");
view;  // [a, b, c] : la vue a « bougé »
copy;  // [a, b]
```

Règle : à la frontière d'une classe (constructeur, accesseur), utilise **`List.copyOf`** (et `Set.copyOf`, `Map.copyOf`). Elle ne coûte rien quand on lui passe une liste déjà immuable : elle renvoie la même instance. C'est l'outil des copies défensives du module 3.

Le premier incident, et sa correction :

:::compare
--- bad: Une vue à la frontière
```java
List<String> allowedHosts() {
    return Collections.unmodifiableList(hosts);  // fenêtre sur hosts
}
// hosts.clear() au rechargement : le cache de l'appelant se vide aussi
```
L'appelant ne peut pas écrire, mais il voit tout ce que la classe écrit.
--- good: Une copie à la frontière
```java
List<String> allowedHosts() {
    return List.copyOf(hosts);                   // photo indépendante
}
// hosts.clear() au rechargement : le cache garde l'ancienne liste
```
Chaque appelant garde la liste qu'il a reçue, quoi qu'il arrive à `hosts`.
:::

### `Stream.toList()` (Java 16)

```java
List<String> names = users.stream().map(User::name).toList();
```

`toList()` renvoie une liste **non modifiable**. `collect(Collectors.toList())` renvoie aujourd'hui une `ArrayList` modifiable, mais la documentation ne garantit ni le type ni la mutabilité. Préfère `toList()`, sauf si tu as besoin de modifier le résultat (alors `Collectors.toCollection(ArrayList::new)`, qui le dit). Différence subtile : `toList()` accepte les éléments `null`, contrairement à `List.of`.

::checkpoint{id="c1"}

### Les collections ordonnées (Java 21)

Avant Java 21, obtenir le dernier élément dépendait du type : `list.get(list.size() - 1)`, `deque.getLast()`, `sortedSet.last()`, et pour un `LinkedHashSet`… une boucle jusqu'au bout. Trois interfaces unifient tout ça :

```java
List<Integer> l = new ArrayList<>(List.of(1, 2, 3));
l.getFirst();      // 1
l.getLast();       // 3
l.addFirst(0);     // [0, 1, 2, 3]
l.reversed();      // vue inversée [3, 2, 1, 0], sans copie

LinkedHashMap<String, Integer> m = new LinkedHashMap<>();
m.put("a", 1);
m.putFirst("z", 0);           // {z=0, a=1}
m.firstEntry();               // z=0
m.pollLastEntry();            // retire et renvoie a=1
m.sequencedKeySet().reversed();
```

`SequencedCollection` (`List`, `Deque`, `LinkedHashSet`, `SortedSet`), `SequencedSet` et `SequencedMap` (`LinkedHashMap`, `SortedMap`). Une collection triée refuse `addFirst` (`UnsupportedOperationException`) : c'est l'ordre de tri qui décide. Et `reversed()` est une **vue**, comme `unmodifiableList` : elle suit les modifications de l'original.

::checkpoint{id="c2"}

### Les gatherers (Java 24)

Les streams avaient un jeu fixe d'opérations intermédiaires : `map`, `filter`, `flatMap`, `distinct`, `limit`… Grouper par paquets de 100 ou calculer une moyenne glissante obligeait à sortir du stream. `Stream.gather` est le point d'extension qui manquait :

```java
Stream.of(1, 2, 3, 4, 5).gather(Gatherers.windowFixed(2)).toList();      // [[1, 2], [3, 4], [5]]
Stream.of(1, 2, 3, 4).gather(Gatherers.windowSliding(2)).toList();       // [[1, 2], [2, 3], [3, 4]]
Stream.of(1, 2, 3, 4).gather(Gatherers.scan(() -> 0, Integer::sum)).toList();   // [1, 3, 6, 10]
Stream.of(1, 2, 3, 4).gather(Gatherers.fold(() -> 0, Integer::sum)).toList();   // [10]
```

`Gatherers.mapConcurrent(n, f)` applique `f` avec au plus `n` appels simultanés, sur des **threads virtuels** (leçon suivante), en gardant l'ordre du stream.

### Écrire son gatherer

Un gatherer, c'est un ouvrier posté sur la chaîne du stream, avec un carnet. Il reçoit les éléments un par un, note ce qu'il veut dans son carnet, et décide quand envoyer quelque chose à l'étape suivante (l'**aval**). En code, trois fonctions : un **état initial** (le carnet vierge), un **intégrateur** appelé pour chaque élément, et un **finisseur** appelé à la fin.

:::steps
```java title="UpTo.java"
/** Regroupe les éléments consécutifs tant que leur somme ne dépasse pas limit. */
static Gatherer<Integer, ?, List<Integer>> upTo(int limit) {
    class Batch { List<Integer> items = new ArrayList<>(); int sum; }
    return Gatherer.ofSequential(
        Batch::new,                                            // état, un par exécution du stream
        Gatherer.Integrator.ofGreedy((batch, x, downstream) -> {
            if (!batch.items.isEmpty() && batch.sum + x > limit) {
                downstream.push(List.copyOf(batch.items));     // émettre vers l'aval
                batch.items.clear();
                batch.sum = 0;
            }
            batch.items.add(x);
            batch.sum += x;
            return true;                                       // continuer
        }),
        (batch, downstream) -> {                               // finisseur : le dernier paquet
            if (!batch.items.isEmpty()) downstream.push(List.copyOf(batch.items));
        });
}

Stream.of(5, 4, 3, 8, 1, 1).gather(upTo(9)).toList();   // [[5, 4], [3], [8, 1], [1]]
```
--- 3-5: `Batch` est le carnet. `Batch::new` est l'**état initial** : appelé une fois par exécution du stream, jamais partagé entre deux exécutions.
--- 6: L'**intégrateur** reçoit le carnet, l'élément courant `x` et `downstream`, la porte vers l'aval.
--- 7-11: Si `x` ferait déborder le paquet en cours, on pousse une **copie** du paquet vers l'aval puis on vide le carnet. `List.copyOf` est indispensable : `items` va être réutilisé.
--- 12-14: On range `x`, puis on renvoie `true` : « continue de m'envoyer des éléments ». `ofGreedy` documente qu'on ne renverra jamais `false`, ce qui permet au stream quelques optimisations.
--- 16-18: Le **finisseur** tourne quand la source est épuisée : il pousse le dernier paquet, qui n'avait encore aucune raison de partir.
--- 21: Résultat : chaque paquet a une somme d'au plus 9, dans l'ordre du flux.
:::

L'intégrateur **renvoie un booléen** : `false` veut dire « je n'ai plus besoin d'éléments ». C'est ainsi qu'un gatherer s'arrête de lui-même (une sorte de `takeWhile` avec état). `push` renvoie aussi un booléen : `false` signifie que l'aval n'en veut plus (un `limit` plus loin, par exemple).

::checkpoint{id="c3"}

## Sous le capot

:::reveal Avant de lire la suite : pourquoi le JDK rendrait-il exprès l'ordre d'un `Set.of` imprévisible ?
Pour qu'aucun code ne puisse en dépendre. Un ordre stable « par hasard » finit toujours dans un test ou un format de sortie, puis casse le jour où l'implémentation change. Un ordre qui change à chaque démarrage fait échouer ce code tout de suite, chez son auteur.
:::

**Pourquoi l'ordre d'un `Set.of` change à chaque lancement.** `Set.of` et `Map.of` renvoient des classes internes de `java.util.ImmutableCollections` (`Set12`, `SetN`, `MapN`) : de petits tableaux à adressage ouvert, sans nœuds chaînés. La position de départ de chaque élément dans le tableau est mélangée avec un **sel** (`SALT`) tiré au hasard au démarrage de la JVM. C'est voulu : les auteurs du JDK ont vu trop de code dépendre de l'ordre d'itération de `HashMap`, puis casser à chaque changement d'implémentation. Rendre l'ordre imprévisible **dès le premier jour** empêche cette dépendance de naître. De même, `List.of` a des variantes `List12` (un ou deux éléments, dans deux champs, sans tableau) et `ListN` : pas de capacité de réserve, pas de compteur de modifications.

**Comment un gatherer s'insère dans le pipeline.** Un stream est une chaîne de `Sink` : chaque étape reçoit un élément et le passe à la suivante. `gather` crée une étape dont le `Sink` appelle ton intégrateur avec un `Downstream` qui n'est rien d'autre que le `Sink` de l'étape suivante. Quand l'aval signale qu'il est rassasié (un `limit` atteint), le stream cesse de tirer des éléments de la source : c'est pourquoi `Stream.iterate(0, i -> i + 1).gather(…).limit(2)` termine. En parallèle, un gatherer créé avec `Gatherer.of` (et non `ofSequential`) fournit en plus un **combineur** qui fusionne les états de deux moitiés du flux.

::visual{id="java-ch00-gatherer-flow"}

## Pièges fréquents

- **`Collections.unmodifiableList` comme copie défensive** : c'est une vue, elle bouge avec l'original. Utilise `List.copyOf`.
- **Compter sur l'ordre d'un `Set.of` ou `Map.of`** : il change à chaque démarrage. Pour un ordre stable, `LinkedHashSet` / `LinkedHashMap`, ou trie.
- **`null` dans `List.of`** : `NullPointerException`, même pour `contains(null)`.
- **`LinkedHashMap.put` d'une clé existante** : la valeur change, la position **non**. Pour déplacer la clé à la fin, `putLast`.
- **`windowSliding(n)` sur un flux plus court que `n`** : il émet **une** fenêtre incomplète (`[[1, 2]]` pour `windowSliding(3)` sur deux éléments). Filtre les fenêtres trop courtes si ton calcul l'exige.
- **Un état de gatherer partagé** (un champ statique, une variable capturée) : l'état doit venir de l'initialiseur, sinon deux exécutions du même stream se mélangent.

## À retenir

- `List.of` & co : non modifiables, sans `null`, ordre des `Set`/`Map` imprévisible (volontairement).
- Copie défensive : `List.copyOf` ; `unmodifiableList` et `reversed()` sont des vues.
- `Stream.toList()` plutôt que `collect(Collectors.toList())`.
- `getFirst`, `getLast`, `reversed()`, `putFirst`… marchent sur toutes les collections ordonnées depuis Java 21.
- Un gatherer = état initial + intégrateur (qui pousse vers l'aval, et renvoie `false` pour s'arrêter) + finisseur.

> **Sources :** JEP 269 (fabriques de collections, Java 9), JEP 431 (collections ordonnées, Java 21), JEP 485 (gatherers, Java 24), `java.util.ImmutableCollections` (OpenJDK 25). Copies défensives : *Effective Java*, 3e éd., items 17 et 50 (modules 3 et 8).
