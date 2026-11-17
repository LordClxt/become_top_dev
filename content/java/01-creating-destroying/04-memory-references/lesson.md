---
id: java-ch01-l04
title: "Objets inutiles et références obsolètes"
source: { chapter: 2, pages: "22-28" }
duration_min: 35
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
checkpoints:
  - id: c1
    type: code-output
    prompt: "`Long.valueOf` (appelé par l'autoboxing) garde un cache des petites valeurs. Qu'affiche le programme ?"
    code: |
      public class Main {
          public static void main(String[] args) {
              Long a = 127L, b = 127L;
              Long c = 128L, d = 128L;
              System.out.println((a == b) + " " + (c == d));
          }
      }
    answer: "true false"
    explanation: "L'autoboxing passe par la fabrique statique Long.valueOf, qui réutilise des instances en cache de -128 à 127 : a et b sont le même objet. 128 sort du cache, donc c et d sont deux objets distincts : croire que == compare les valeurs de deux Long est le piège."
    concept: java-reuse-expensive-objects
  - id: c2
    type: single
    prompt: "En revue de code, un collègue « optimise » ainsi : `static boolean isHex(String s) { Pattern p = Pattern.compile(\"#[0-9a-f]{6}\"); return p.matcher(s).matches(); }`. Ton avis ?"
    choices:
      - "Parfait : la regex est compilée une seule fois"
      - "Aucun gain : la Pattern est encore compilée à chaque appel, il faut un champ static final"
      - "Pire qu'avant : Pattern.compile est plus lent que String.matches"
      - "Inutile : le JIT met automatiquement Pattern.compile en cache"
    answer: 1
    explanation: "Une variable locale naît et meurt à chaque appel, donc l'automate est reconstruit à chaque fois, exactement comme avec String.matches. Le coût disparaît seulement si la Pattern vit dans un champ static final, initialisé une fois avec la classe."
    concept: java-reuse-expensive-objects
  - id: c3
    type: code-output
    prompt: "La vue est créée AVANT les insertions. Qu'affiche le programme ?"
    code: |
      public class Main {
          public static void main(String[] args) {
              Map<String, Integer> prices = new HashMap<>();
              Set<String> keys = prices.keySet();
              prices.put("cafe", 2);
              prices.put("the", 3);
              System.out.println(keys.size() + " " + (keys == prices.keySet()));
          }
      }
    answer: "2 true"
    explanation: "keySet() ne copie rien : c'est une vue qui lit la map à chaque appel, donc elle voit les insertions faites après sa création. HashMap mémorise même cette vue dans un champ et renvoie toujours la même instance."
    concept: java-reuse-expensive-objects
  - id: c4
    type: single
    prompt: "Un `EventBus` garde ses abonnés dans une `static List<Listener>`. Chaque écran ouvert s'y abonne, aucun ne se désabonne. Après avoir ouvert et fermé 10 000 écrans, que se passe-t-il ?"
    choices:
      - "Rien : le GC libère les écrans fermés, puisque l'utilisateur ne les voit plus"
      - "Les 10 000 écrans restent en mémoire, accessibles depuis la liste statique"
      - "Un appel à System.gc() suffit à les récupérer"
      - "La JVM lève une exception dès qu'un écran fermé reçoit un événement"
    answer: 1
    explanation: "Le GC ne juge pas l'utilité d'un objet, seulement son accessibilité : un champ statique est une racine, donc chaque écran abonné reste vivant avec tout ce qu'il référence. Il faut un désabonnement explicite ou des références faibles."
    concept: java-cache-retention
---

## Pourquoi c'est important

Lundi, un service de facturation redémarre. Jeudi à 3 h du matin, il tombe en `OutOfMemoryError`, et personne n'arrive à reproduire la panne en test. La cause : une `Map` statique qui grossit à chaque requête, sans jamais rien oublier.

Le GC te libère de `free()`, pas de la réflexion sur la mémoire. Deux erreurs opposées guettent : **créer des objets pour rien** dans un chemin chaud (ça coûte du CPU), et **retenir des objets dont plus personne n'a besoin** (ça tue le service au bout de trois jours). En Go, c'est la même mécanique que la petite tranche qui garde vivant un énorme tableau.

> **La règle à retenir :** le GC ne libère pas ce qui est *inutile*, il libère ce qui est *inaccessible*. Tout le reste de la leçon découle de cette phrase.

## Ne crée pas d'objets inutiles

### Réutiliser ce qui est immuable

Un objet **immuable** (qui ne change jamais après sa construction) peut être partagé sans risque : personne ne peut le modifier dans le dos des autres.

```java
String s = new String("bikini");   // NE FAIS PAS ÇA : un objet neuf à chaque exécution
String s = "bikini";               // une seule instance, partagée par toute la JVM
```

Préfère aussi les **fabriques statiques** aux constructeurs quand les deux existent : `Boolean.valueOf("true")` renvoie une instance existante, alors que le constructeur `Boolean(String)` (déprécié depuis Java 9) créait un objet à chaque appel.

> **Sous le capot :** `Long.valueOf`, `Integer.valueOf` et leurs cousins gardent un cache des valeurs de -128 à 127. L'**autoboxing** (la conversion automatique d'un `long` en `Long`) passe par ces fabriques : il réutilise donc les petites valeurs et crée un objet neuf pour les autres.

::checkpoint{id="c1"}

### Mettre en cache ce qui coûte cher

Certains objets sont chers à fabriquer, et on ne le voit pas toujours. `String.matches` compile une `Pattern` (un automate), s'en sert une fois, puis la jette :

:::compare
--- bad: Regex recompilée à chaque appel
```java
static boolean isHexColor(String s) {
    return s.matches("#[0-9a-fA-F]{6}");   // compile la regex à CHAQUE appel
}
```
Dans une boucle chaude, l'automate est reconstruit des millions de fois.
--- good: Pattern compilée une fois
```java
private static final Pattern HEX_COLOR = Pattern.compile("#[0-9a-fA-F]{6}");

static boolean isHexColor(String s) {
    return HEX_COLOR.matcher(s).matches();   // réutilise l'automate
}
```
Compilée une seule fois, à l'initialisation de la classe.
:::

Sur l'exemple du livre (reconnaître un chiffre romain), le gain est d'environ ×6. Et le code est **plus lisible** : la constante a un nom, la regex brute n'en avait pas.

::checkpoint{id="c2"}

### Les vues ne se dupliquent pas

`map.keySet()` renvoie une **vue** de la map, pas une copie. C'est un **adaptateur** : un objet sans état propre qui délègue tout à la map d'appui. Inutile d'en fabriquer plusieurs, elles reflètent toutes la même map.

::checkpoint{id="c3"}

### L'autoboxing caché

```java
Long total = 0L;                        // Long, pas long : une faute de frappe…
for (long i = 0; i <= Integer.MAX_VALUE; i++) {
    total += i;                         // … déballe, additionne, puis crée un nouveau Long
}
```

Ce code donne le bon résultat, mais crée environ 2³¹ objets `Long` inutiles : dans le livre, 6,3 s au lieu de 0,6 s. **Préfère les primitifs aux types enveloppes** et méfie-toi de l'autoboxing involontaire (on y revient au module 9).

### Mais ne tombe pas dans l'excès inverse

Créer de petits objets est **bon marché** sur une JVM moderne : l'allocation se fait par simple incrément de pointeur, et le ramassage générationnel est très efficace pour les objets éphémères. Ajouter des objets pour gagner en clarté est généralement une bonne chose.

**N'écris pas ton propre pool d'objets**, sauf pour des objets vraiment lourds comme les connexions à une base de données. Un pool maison encombre le code, grossit la mémoire et fait souvent perdre en performance.

> **Java 25+ : ce que pèse vraiment un petit objet.** Sur une JVM 64 bits, chaque objet commence par un **en-tête** : 12 octets (le mot de marque, pour le hash, le verrou et l'âge GC, plus un pointeur de classe compressé), et la taille totale est arrondie à un multiple de 8. Un `Long` pèse donc 24 octets pour 8 octets de donnée. Le JDK 25 rend disponible un en-tête **compact** de 8 octets (JEP 519, option `-XX:+UseCompactObjectHeaders`), activé par défaut depuis le JDK 27 (JEP 534). Mesuré sur 5 millions de `Long` dans l'image du cours : 24 octets par objet sans l'option, 16 avec, soit un tiers de mémoire en moins. Un tas plein de petits objets (des `Long` dans une `Map`, des nœuds de liste) en profite directement ; ça ne rend pas l'autoboxing gratuit pour autant.

> Contrepoint : au module 8, tu verras qu'il faut parfois **créer** un objet (une copie défensive) plutôt que réutiliser l'existant. Oublier une copie défensive cause des bugs et des failles ; créer un objet de trop ne coûte que des performances.

## Élimine les références obsolètes

Une **référence obsolète** est une référence que le programme ne suivra plus jamais, mais qui reste stockée quelque part. Pour le GC, elle compte comme n'importe quelle autre : l'objet visé reste vivant. C'est ce qu'on appelle une **rétention involontaire**, le nom exact d'une « fuite mémoire » dans un langage à GC.

Voici une pile sur tableau. Tous les tests fonctionnels passent :

```java
public Object pop() {
    if (size == 0) throw new EmptyStackException();
    return elements[--size];
}
```

:::reveal Avant de lire la suite : où est la fuite ?
Après un `pop`, `size` recule, mais la case `elements[size]` **référence toujours** l'objet dépilé. Pour la pile, cette case est libre ; pour le GC, c'est une référence comme une autre, accessible depuis la pile. L'objet ne sera jamais ramassé tant que la pile vit, ni tout ce qu'il référence lui-même.
:::

::visual{id="java-ch01-stack-leak"}

La correction, ligne par ligne :

:::steps
```java title="Stack.java"
public Object pop() {
    if (size == 0) throw new EmptyStackException();
    Object result = elements[--size];
    elements[size] = null;   // référence obsolète : on l'efface
    return result;
}
```
--- 2: On vérifie **avant** de toucher à `size` : sinon la taille deviendrait négative et la pile serait corrompue, même avec l'exception.
--- 3: `--size` libère logiquement la case, et on garde l'objet dans une variable locale pour le rendre au client.
--- 4: On efface la case : plus aucune référence depuis la pile, l'objet devient récupérable dès que le client l'abandonne. Bonus : un bug qui relirait cette case obtient une `NullPointerException` immédiate au lieu d'un résultat silencieusement faux.
--- 5: La variable locale `result` disparaît à la sortie de la méthode : pas besoin de la mettre à `null`, sa portée s'en charge.
:::

### Quand faut-il mettre à `null` ?

Pas partout ! Mettre chaque variable à `null` après usage encombre le code pour rien. La bonne façon de lâcher une référence est de laisser la variable **sortir de sa portée**, d'où l'intérêt de déclarer chaque variable dans la portée la plus étroite (module 9).

La règle : **dès qu'une classe gère sa propre mémoire, méfie-toi des fuites.** La pile gère un « pool » de cases : elle seule sait lesquelles sont libres, c'est donc à elle de les vider.

### Les deux autres suspects

**Les caches.** On met un objet en cache, on l'oublie, il reste là pour toujours. Selon le cas :
- si une entrée n'a d'intérêt que tant que sa **clé** est référencée ailleurs, utilise une `WeakHashMap` (ses clés sont tenues par des références faibles, que le GC ignore) : l'entrée disparaît avec la clé ;
- plus souvent, l'intérêt d'une entrée décroît avec le temps : il faut **évincer** les vieilles entrées, par un thread de fond (`ScheduledThreadPoolExecutor`) ou au moment des insertions. `LinkedHashMap` et sa méthode `removeEldestEntry` font exactement ça, comme tu vas le voir dans le lab.

**Les écouteurs et callbacks.** Une API où les clients s'abonnent sans jamais se désabonner accumule les callbacks. Parade : n'en garder que des références faibles (par exemple comme clés d'une `WeakHashMap`), ou fournir un désabonnement explicite.

::checkpoint{id="c4"}

> **En production :** ces fuites ne provoquent pas de panne visible avant l'`OutOfMemoryError`. On les trouve par inspection du code ou avec un **profileur de tas** : un heap dump (par exemple `jcmd <pid> GC.heap_dump fichier.hprof`) analysé dans VisualVM, Eclipse MAT ou JDK Mission Control montre quelle racine retient les objets. Mieux vaut les anticiper.

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
