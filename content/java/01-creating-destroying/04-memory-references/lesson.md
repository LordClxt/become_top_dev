---
id: java-ch01-l04
title: "Objets inutiles et références obsolètes"
source: { chapter: 2, pages: "22-28" }
duration_min: 30
concepts:
  - id: java-reuse-expensive-objects
    label: "Réutiliser les objets immuables et mettre en cache les objets coûteux (Pattern compilé)"
  - id: java-autoboxing-cost
    label: "L'autoboxing caché : un Long à la place d'un long crée un objet à chaque tour de boucle"
  - id: java-obsolete-reference
    label: "Référence obsolète : une référence qui ne sera plus jamais suivie mais empêche le GC de libérer l'objet"
  - id: java-cache-retention
    label: "Caches et écouteurs : les deux autres sources classiques de rétention (borner, évincer, références faibles)"
glossary:
  - term: "référence obsolète"
    definition: "Référence qui ne sera plus jamais déréférencée mais reste stockée : l'objet visé, et tout ce qu'il référence, ne peut pas être ramassé."
  - term: "rétention involontaire"
    definition: "Nom exact de la « fuite mémoire » dans un langage à GC : des objets inutiles restent accessibles depuis une racine."
  - term: "autoboxing"
    definition: "Conversion automatique entre un primitif (long) et son type enveloppe (Long). Chaque boxing peut créer un objet."
  - term: "adaptateur (vue)"
    definition: "Objet sans état propre qui délègue à un objet d'appui, comme Map.keySet() : inutile d'en créer plusieurs."
  - term: "WeakHashMap"
    definition: "Map dont les clés sont tenues par des références faibles : une entrée disparaît quand plus personne d'autre ne référence sa clé."
visuals: [java-ch01-stack-leak]
labs: [java-ch01-l04-lab-leaks]
extra: false
xp: 30
---

## Pourquoi c'est important

Le GC te libère de `free()`, pas de la réflexion sur la mémoire. Deux erreurs opposées guettent : **créer des objets pour rien** dans un chemin chaud, et **retenir des objets dont plus personne n'a besoin**. La première coûte du CPU ; la seconde tue un service au bout de trois jours, avec une `OutOfMemoryError` que personne n'arrive à reproduire. Tu connais déjà le principe en Go avec les tranches qui gardent vivant un gros tableau ; ici, c'est la même mécanique.

## Ne crée pas d'objets inutiles

### Réutiliser ce qui est immuable

```java
String s = new String("bikini");   // NE FAIS PAS ÇA : un objet neuf à chaque exécution
String s = "bikini";               // une seule instance, partagée par toute la JVM
```

Un objet immuable peut toujours être réutilisé. Préfère les **fabriques statiques** aux constructeurs quand les deux existent : `Boolean.valueOf("true")` ne crée rien, alors que le constructeur `Boolean(String)` (déprécié depuis Java 9) créait un objet à chaque appel.

### Mettre en cache ce qui coûte cher

Certains objets sont chers à fabriquer, et on ne le voit pas toujours :

```java
static boolean isHexColor(String s) {
    return s.matches("#[0-9a-fA-F]{6}");   // compile la regex à CHAQUE appel
}
```

`String.matches` compile une `Pattern` (un automate), s'en sert une fois, puis la jette. Dans une boucle chaude, c'est du gâchis. La version efficace la compile une fois, à l'initialisation de la classe :

```java
private static final Pattern HEX_COLOR = Pattern.compile("#[0-9a-fA-F]{6}");

static boolean isHexColor(String s) {
    return HEX_COLOR.matcher(s).matches();
}
```

Sur l'exemple du livre (reconnaître un chiffre romain), le gain est d'environ ×6. Et le code est **plus lisible** : la constante a un nom, la regex brute n'en avait pas.

### Les vues ne se dupliquent pas

`map.keySet()` renvoie une **vue** de la map, pas une copie : un adaptateur sans état propre. Inutile d'en fabriquer plusieurs, elles reflètent toutes la même map.

### L'autoboxing caché

```java
Long total = 0L;                        // Long, pas long : une faute de frappe…
for (long i = 0; i <= Integer.MAX_VALUE; i++) {
    total += i;                         // … et un nouvel objet Long à chaque tour
}
```

Ce code donne le bon résultat, mais crée environ 2³¹ objets `Long` inutiles : dans le livre, 6,3 s au lieu de 0,6 s. **Préfère les primitifs aux types enveloppes** et méfie-toi de l'autoboxing involontaire (on y revient au module 9).

### Mais ne tombe pas dans l'excès inverse

Créer de petits objets est **bon marché** sur une JVM moderne : allocation par incrément de pointeur, ramassage générationnel très efficace pour les objets éphémères. Ajouter des objets pour gagner en clarté est généralement une bonne chose. Et **n'écris pas ton propre pool d'objets**, sauf pour des objets vraiment lourds comme les connexions à une base de données : un pool maison encombre le code, grossit la mémoire et fait souvent perdre en performance.

> Contrepoint : au module 8, tu verras qu'il faut parfois **créer** un objet (une copie défensive) plutôt que réutiliser l'existant. Oublier une copie défensive cause des bugs et des failles ; créer un objet de trop ne coûte que des performances.

## Élimine les références obsolètes

Voici une pile sur tableau. Tous les tests fonctionnels passent :

```java
public Object pop() {
    if (size == 0) throw new EmptyStackException();
    return elements[--size];
}
```

Où est la fuite ? Après un `pop`, `size` recule, mais la case du tableau **référence toujours** l'objet dépilé. Pour la pile, cette case est libre ; pour le GC, c'est une référence comme une autre, accessible depuis la pile. L'objet ne sera jamais ramassé tant que la pile vit, ni tout ce qu'il référence lui-même.

::visual{id="java-ch01-stack-leak"}

La correction :

```java
public Object pop() {
    if (size == 0) throw new EmptyStackException();
    Object result = elements[--size];
    elements[size] = null;   // référence obsolète : on l'efface
    return result;
}
```

Bonus : si un bug réutilise plus tard la case par erreur, tu obtiens une `NullPointerException` immédiate au lieu d'un résultat silencieusement faux.

### Quand faut-il mettre à `null` ?

Pas partout ! Mettre chaque variable à `null` après usage encombre le code pour rien. La bonne façon de lâcher une référence est de laisser la variable **sortir de sa portée**, d'où l'intérêt de déclarer chaque variable dans la portée la plus étroite (module 9).

La règle : **dès qu'une classe gère sa propre mémoire, méfie-toi des fuites.** La pile gère un « pool » de cases : elle seule sait lesquelles sont libres, c'est donc à elle de les vider.

### Les deux autres suspects

**Les caches.** On met un objet en cache, on l'oublie, il reste là pour toujours. Selon le cas :
- si une entrée n'a d'intérêt que tant que sa **clé** est référencée ailleurs, utilise une `WeakHashMap` : l'entrée disparaît avec la clé ;
- plus souvent, l'intérêt d'une entrée décroît avec le temps : il faut **évincer** les vieilles entrées, par un thread de fond (`ScheduledThreadPoolExecutor`) ou au moment des insertions. `LinkedHashMap` et sa méthode `removeEldestEntry` font exactement ça, comme tu vas le voir dans le lab.

**Les écouteurs et callbacks.** Une API où les clients s'abonnent sans jamais se désabonner accumule les callbacks. Parade : n'en garder que des références faibles (par exemple comme clés d'une `WeakHashMap`), ou fournir un désabonnement explicite.

Ces fuites ne provoquent pas de panne visible ; on les trouve par inspection du code ou avec un **profileur de tas** (heap dump analysé dans VisualVM, Eclipse MAT ou JDK Mission Control). Mieux vaut les anticiper.

## Pièges fréquents

- **`String.matches`, `String.split(regex)` ou `replaceAll` dans une boucle chaude** : chacun compile une regex. Garde une `Pattern` en constante.
- **`Long`, `Integer` ou `Double` comme accumulateur** : un boxing par tour de boucle.
- **Décrémenter `size` avant de vérifier qu'elle est positive** : la taille devient négative et la pile est corrompue même si l'exception est levée.
- **Une `Map` statique utilisée comme cache sans borne** : c'est une fuite programmée.
- **Croire que `System.gc()` règle le problème** : le GC ne libère jamais un objet encore accessible.

## À retenir

- Réutilise les objets immuables ; mets en cache les objets **coûteux** (`Pattern` compilée en `static final`).
- Préfère les primitifs ; chasse l'autoboxing involontaire. Mais ne crée pas de pool pour des objets légers.
- Une **référence obsolète** retient un objet inutile ; une classe qui gère sa propre mémoire doit effacer les cases libérées.
- Caches : borne-les et évince (`LinkedHashMap.removeEldestEntry`) ou utilise une `WeakHashMap` quand la durée de vie suit la clé. Écouteurs : désabonnement ou références faibles.

> **Source :** *Effective Java*, 3e éd., items 6 et 7 (pages 22 à 28).
