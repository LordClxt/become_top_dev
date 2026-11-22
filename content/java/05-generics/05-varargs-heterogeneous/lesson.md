---
id: java-ch05-l05
title: "Varargs génériques et conteneurs hétérogènes typés"
source: { chapter: 5, pages: "146-155" }
duration_min: 35
concepts:
  - id: java-generic-varargs
    label: "Un paramètre variable générique (T... args) crée un tableau générique : avertissement de pollution du tas ; dangereux si la méthode écrit dans ce tableau ou l'expose à du code non fiable"
  - id: java-safevarargs
    label: "@SafeVarargs promet que la méthode est sûre : elle n'écrit rien dans le tableau et ne le laisse pas s'échapper ; seulement sur des méthodes non redéfinissables (static, final, private) ; sinon, un paramètre List<T>"
  - id: java-heterogeneous-container
    label: "Conteneur hétérogène typé : la clé porte le type (Class<T> comme jeton de type) ; put(Class<T>, T) et get(Class<T>) renvoie un T, vérifié par type.cast"
  - id: java-type-token-limits
    label: "Limites des jetons Class<T> : un type brut peut contourner la vérification (d'où type.cast à l'entrée), et il n'existe pas de Class<List<String>> ; jetons bornés et asSubclass pour restreindre"
glossary:
  - term: "paramètre variable (varargs)"
    definition: "Paramètre T... qui accepte un nombre quelconque d'arguments ; Java les range dans un tableau T[] créé à chaque appel."
  - term: "@SafeVarargs"
    definition: "Annotation par laquelle l'auteur d'une méthode promet que l'usage de son tableau varargs générique est sûr ; elle supprime l'avertissement chez les appelants."
  - term: "jeton de type (type token)"
    definition: "Un objet Class<T> passé pour transmettre un type à l'exécution, malgré l'effacement."
  - term: "conteneur hétérogène typé"
    definition: "Conteneur dont chaque entrée a son propre type, garanti par une clé paramétrée (Class<T>, Key<T>)."
visuals: [java-ch05-heterogeneous-container]
labs: [java-ch05-l05-lab-typed-settings]
extra: false
xp: 35
checkpoints:
  - id: c1
    type: code-output
    prompt: "`toArray` renvoie le tableau de son paramètre variable ; `pickTwo` l'appelle avec deux de ses trois arguments. Qu'affiche le programme ?"
    code: |
      public class Main {
          // Expose le tableau du paramètre variable : dangereux
          @SafeVarargs   // faux, à dessein : cette méthode n'est PAS sûre
          static <T> T[] toArray(T... args) {
              return args;
          }

          static <T> T[] pickTwo(T a, T b, T c) {
              return toArray(a, b);   // le compilateur crée un Object[] : il ne connaît pas T
          }

          public static void main(String[] args) {
              Object[] ok = pickTwo("Good", "Fast", "Cheap");
              System.out.println(ok.length + " " + ok.getClass().getSimpleName());
              try {
                  String[] attributes = pickTwo("Good", "Fast", "Cheap");
                  System.out.println(attributes[0]);
              } catch (ClassCastException e) {
                  System.out.println("ClassCastException");
              }
          }
      }
    answer: "2 Object[]\nClassCastException"
    explanation: "Dans pickTwo, T est effacé : pour appeler toArray, javac crée un Object[] (le seul tableau sûr pour un T quelconque). toArray le renvoie tel quel. Affecté à un Object[], tout va bien ; affecté à un String[], le cast inséré dans main échoue, deux niveaux loin de l'appel qui a créé le tableau. Le @SafeVarargs mensonger a fait taire l'avertissement qui l'annonçait."
    concept: java-generic-varargs
  - id: c2
    type: code-output
    prompt: "Un conteneur de favoris, un par type, dont la clé est le `Class` du type. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          static final class Favorites {
              private final Map<Class<?>, Object> favorites = new HashMap<>();

              <T> void put(Class<T> type, T instance) {
                  favorites.put(Objects.requireNonNull(type), type.cast(instance));
              }

              <T> T get(Class<T> type) {
                  return type.cast(favorites.get(type));
              }
          }

          @SuppressWarnings({ "unchecked", "rawtypes" })
          public static void main(String[] args) {
              Favorites f = new Favorites();
              f.put(String.class, "Java");
              f.put(Integer.class, 0xcafebabe);
              f.put(Class.class, Favorites.class);
              String s = f.get(String.class);
              int i = f.get(Integer.class);
              Class<?> c = f.get(Class.class);
              System.out.printf("%s %x %s%n", s, i, c.getSimpleName());
              try {
                  f.put((Class) Integer.class, "pas un entier");
              } catch (ClassCastException e) {
                  System.out.println("refusé à l'entrée");
              }
          }
      }
    answer: "Java cafebabe Favorites\nrefusé à l'entrée"
    explanation: "La clé porte le type : get(String.class) renvoie un String, sans cast chez l'appelant. type.cast vérifie dynamiquement à la lecture et, surtout, à l'entrée : un client qui passe par un type brut pour ranger une chaîne sous Integer.class est arrêté tout de suite, pas des mois plus tard à la lecture."
    concept: java-heterogeneous-container
  - id: c3
    type: single
    prompt: "Sur quelle méthode `@SafeVarargs` est-il permis **et** justifié ?"
    choices:
      - "Une méthode d'instance publique non finale, qui renvoie son tableau varargs"
      - "Une méthode static qui ne fait que lire les éléments de son tableau varargs, sans le stocker ni le renvoyer"
      - "N'importe quelle méthode, pour supprimer l'avertissement"
      - "Un constructeur qui garde le tableau dans un champ"
    answer: 1
    explanation: "Deux conditions de sûreté : ne rien écrire dans le tableau, et ne pas le laisser s'échapper (ni le renvoyer, ni le stocker, ni le passer à du code non fiable). Et l'annotation n'est permise que sur des méthodes non redéfinissables (static, final, private) et les constructeurs, puisqu'une redéfinition pourrait trahir la promesse."
    concept: java-safevarargs
---

## Pourquoi c'est important

Deux incidents dans la même semaine chez Ordo. D'abord, un utilitaire `pickTwo(a, b, c)` qui renvoie un `T[]` provoque une `ClassCastException` dans un code sans cast ; son auteur avait ajouté `@SafeVarargs` « pour faire taire un avertissement ». Ensuite, les réglages de l'application sont rangés dans une `Map<String, Object>` : un module y a écrit le seuil d'alerte comme chaîne (`"0.95"`), un autre le lit comme `Double`, et le service plante au premier dépassement.

Deux outils du chapitre 5 corrigent ces deux défauts : bien utiliser les varargs génériques, et ranger des valeurs de types différents dans un conteneur qui **garde** leur type.

## Varargs et génériques font mauvais ménage

Un paramètre variable (`T... args`) est un tableau déguisé : à chaque appel, Java range les arguments dans un tableau `T[]`. Or on ne peut pas créer de tableau générique (leçon 2). Quand `T` est un type générique ou une variable de type, Java le crée quand même… et javac avertit : *Possible heap pollution from parameterized vararg type*.

Pourquoi ce compromis ? Parce que des méthodes comme `Arrays.asList(T... a)`, `List.of(E... e)` ou `EnumSet.of(E first, E... rest)` sont trop utiles pour être interdites. Le danger vient de deux choses : **écrire** dans le tableau, et le **laisser s'échapper**.

::checkpoint{id="c1"}

L'exemple de Bloch est implacable : `pickTwo` n'a aucun cast, `toArray` non plus, et pourtant l'appelant reçoit une `ClassCastException`. Le tableau créé par javac dans `pickTwo` est un `Object[]`, faute de connaître `T` ; renvoyé par `toArray`, il s'échappe jusqu'à un code qui croit recevoir un `String[]`.

## `@SafeVarargs` : une promesse, pas un interrupteur

Depuis Java 7, l'auteur d'une méthode peut annoter `@SafeVarargs` pour **promettre** qu'elle est sûre, ce qui supprime l'avertissement chez tous les appelants. La promesse tient si la méthode :
1. **n'écrit rien** dans le tableau varargs ;
2. **ne le laisse pas s'échapper** : ni retourné, ni stocké, ni passé à une méthode qui pourrait le faire. Le passer à une autre méthode `@SafeVarargs`, ou à une méthode non varargs qui ne fait que lire son contenu, reste sûr.

::checkpoint{id="c3"}

Règle de Bloch : annote `@SafeVarargs` **chaque** méthode à varargs génériques qui respecte ces deux conditions, et n'écris jamais de méthode qui ne les respecte pas. L'annotation n'est permise que sur les méthodes non redéfinissables : `static`, `final`, `private` (Java 9), et les constructeurs. Une alternative sans tableau du tout : un paramètre `List<? extends T>`, avec `List.of(…)` chez l'appelant.

```java
@SafeVarargs
static <T> List<T> flatten(List<? extends T>... lists) {
    List<T> result = new ArrayList<>();
    for (List<? extends T> list : lists) result.addAll(list);   // on ne fait que lire le tableau
    return result;
}
```

## Le conteneur hétérogène typé

Une collection générique a **un** paramètre de type pour tous ses éléments : `Set<E>`, `Map<K, V>`. Parfois, chaque entrée a son propre type : les réglages d'une application, les colonnes d'une ligne de base de données, les attributs d'une requête. La solution classique (`Map<String, Object>` et des casts) est celle qui a planté chez Ordo.

L'idée de Bloch : **paramétrer la clé, pas le conteneur**. La clé porte le type de sa valeur. Le plus simple est d'utiliser un `Class<T>` comme clé : c'est un **jeton de type**, qui transporte `T` jusqu'à l'exécution malgré l'effacement.

::checkpoint{id="c2"}

::visual{id="java-ch05-heterogeneous-container"}

Le conteneur est **typé** : `get(String.class)` renvoie un `String`. Il est **hétérogène** : chaque clé a son propre type. La `Map` interne a des clés `Class<?>` et des valeurs `Object` ; le lien entre les deux est garanti par `put`, et rétabli à la lecture par `type.cast`, qui vérifie dynamiquement sans avertissement.

> **Sous le capot :** `Class.cast(obj)` vérifie `isInstance(obj)` puis renvoie `obj` avec le type `T`. Comme la méthode est générique dans sa signature (`T cast(Object obj)`), javac n'émet aucun avertissement : c'est un cast **vérifié**, à l'exécution. C'est aussi ce que font `Collections.checkedList(list, String.class)` et ses cousines : une enveloppe (module 4) qui appelle `type.cast` à chaque insertion, pour attraper un client qui passerait par un type brut.

**Limites du jeton `Class<T>`.**
- Un client malveillant ou maladroit peut passer un `Class` brut et ranger n'importe quoi : d'où `type.cast(instance)` **à l'entrée**, dans `put`.
- Il n'existe pas de `Class<List<String>>` : `List<String>.class` ne compile pas (effacement). Pour des clés typées par des types génériques, on définit sa propre clé, comme un `record Key<T>(String name, Class<T> type)`, qui ne contient lui-même qu'un `Class` effacé : la vérification ne peut porter que sur la forme brute.
- On peut **borner** les jetons : `<T extends Annotation> T getAnnotation(Class<T> type)` dans l'API de réflexion. Pour convertir un `Class<?>` en `Class<? extends Annotation>` sans avertissement : `type.asSubclass(Annotation.class)`.

## Pièges fréquents

- **`@SafeVarargs` pour faire taire un avertissement**, sans vérifier les deux conditions : la `ClassCastException` attend plus loin.
- **Renvoyer ou stocker le tableau varargs** d'une méthode générique.
- **`Map<String, Object>` pour des valeurs de types différents** : chaque lecture est un cast qui peut échouer loin de l'écriture.
- **Oublier `type.cast` dans `put`** : un client avec un type brut corrompt le conteneur, et l'erreur arrive à la lecture.
- **Croire qu'un jeton `Class` vérifie un type générique** : `List.class` ne connaît pas le type des éléments.

## À retenir

- Varargs génériques = tableau générique : avertissement de pollution du tas ; dangereux si on écrit dans le tableau ou s'il s'échappe.
- `@SafeVarargs` sur chaque méthode varargs générique sûre (et non redéfinissable) ; sinon, un paramètre `List`.
- Conteneur hétérogène typé : clé paramétrée (`Class<T>` ou `Key<T>`), valeur vérifiée par `type.cast` à l'entrée et à la sortie.
- Un jeton `Class` ne voit que la forme brute ; jetons bornés et `asSubclass` pour restreindre.

> **Source :** *Effective Java*, 3e éd., items 32 et 33 (pages 146 à 155).
