---
id: java-ch05-l01
title: "Pas de types bruts, et zéro avertissement unchecked"
source: { chapter: 5, pages: "117-125" }
duration_min: 30
concepts:
  - id: java-raw-types
    label: "Un type brut (List sans paramètre) désactive la vérification des types : l'erreur ne se voit qu'à la lecture, par une ClassCastException loin de sa cause ; il n'existe que pour la compatibilité avec le code d'avant Java 5"
  - id: java-unbounded-wildcard
    label: "List<Object> accepte tout objet ; List<?> accepte une liste de n'importe quoi mais refuse d'y écrire (sauf null) ; un type brut, lui, accepte tout sans rien vérifier"
  - id: java-raw-type-exceptions
    label: "Deux usages légitimes de la forme brute : les littéraux de classe (List.class) et instanceof (o instanceof Set, puis Set<?>)"
  - id: java-unchecked-warnings
    label: "Éliminer chaque avertissement unchecked ; si l'un est prouvé sûr, le supprimer avec @SuppressWarnings(\"unchecked\") sur la plus petite portée possible (une variable locale), avec un commentaire qui dit pourquoi"
glossary:
  - term: "type paramétré"
    definition: "Un type générique avec ses arguments : List<String>."
  - term: "type brut (raw type)"
    definition: "Le nom d'un type générique sans arguments : List. Il se comporte comme si les informations génériques étaient effacées."
  - term: "joker non borné"
    definition: "List<?> : une liste d'un type inconnu. On peut lire des Object, on ne peut écrire que null."
  - term: "avertissement unchecked"
    definition: "Message du compilateur qui signale une opération dont il ne peut pas vérifier la sûreté des types (conversion, appel, cast)."
  - term: "effacement (erasure)"
    definition: "Les arguments de type n'existent qu'à la compilation : à l'exécution, List<String> et List<Integer> sont la même classe, List."
visuals: [java-ch05-cce-distance]
labs: [java-ch05-l01-lab-warmup-no-raw]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Une méthode écrite avec un type brut ajoute un `Integer` dans une `List<String>`. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          // Type brut : le compilateur ne peut plus rien vérifier
          @SuppressWarnings({ "rawtypes", "unchecked" })
          static void unsafeAdd(List list, Object o) {
              list.add(o);
          }

          public static void main(String[] args) {
              List<String> strings = new ArrayList<>();
              unsafeAdd(strings, Integer.valueOf(42));
              System.out.println(strings.size() + " " + strings);
              try {
                  String s = strings.get(0);
                  System.out.println("lu : " + s);
              } catch (ClassCastException e) {
                  System.out.println("ClassCastException à la lecture");
              }
          }
      }
    answer: "1 [42]\nClassCastException à la lecture"
    explanation: "Avec le type brut, l'ajout passe : à l'exécution, une List<String> n'est qu'une List (effacement). L'affichage passe aussi, toString ne transtype rien. L'erreur n'apparaît qu'à la lecture, où le compilateur a inséré un cast vers String : loin de l'appel fautif, peut-être dans un autre module, des mois plus tard."
    concept: java-raw-types
  - id: c2
    type: single
    prompt: "Laquelle de ces méthodes compile, et accepte une `List<String>` comme une `List<Integer>` ?"
    choices:
      - "static void addOne(List<Object> list) { list.add(1); }"
      - "static int count(List<?> list) { return list.size(); }"
      - "static void addNull(List<?> list) { list.add(\"x\"); }"
      - "static int count(List<Object> list) { return list.size(); }"
    answer: 1
    explanation: "List<?> accepte une liste de n'importe quel type, et permet de lire et de compter. On ne peut pas y écrire (sauf null) : le compilateur ignore son type d'éléments. List<Object> compile mais n'accepte pas une List<String> : les génériques sont invariants (leçon 2)."
    concept: java-unbounded-wildcard
  - id: c3
    type: single
    prompt: "Un `toArray` générique contient un cast `(T[])` que tu as prouvé sûr. Où placer `@SuppressWarnings(\"unchecked\")` ?"
    choices:
      - "Sur la classe, pour ne plus être dérangé"
      - "Sur la déclaration d'une variable locale qui reçoit le résultat du cast, avec un commentaire qui explique pourquoi c'est sûr"
      - "Sur le return, directement"
      - "Nulle part : il faut laisser l'avertissement"
    answer: 1
    explanation: "Une annotation ne peut pas porter sur un return. La plus petite portée est la déclaration d'une variable locale : T[] result = (T[]) …; annotée et commentée. Sur la classe, elle cacherait aussi les prochains avertissements, ceux qui signalent de vrais problèmes. Et un avertissement sûr laissé en place noie les autres."
    concept: java-unchecked-warnings
---

## Pourquoi c'est important

Le module de rapprochement d'Ordo plante une nuit avec une `ClassCastException` dans `Settlement.java`, ligne 212 : un `Integer` dans une liste qui ne devait contenir que des identifiants d'ordres en `String`. Le code de `Settlement` n'a pas changé depuis un an. L'enquête remonte trois modules plus haut, à une vieille méthode utilitaire qui prend un `List` sans paramètre et y ajoute ce qu'on lui donne. Le compilateur l'avait signalé. Personne ne lisait plus les avertissements : il y en avait 412.

En Go, avant les génériques (1.18), on écrivait `[]interface{}` et des assertions de type, avec le même genre de panique à l'exécution. Java a eu ce problème en 2004, quand les génériques sont arrivés sur des millions de lignes de code existant. Les **types bruts** sont la porte laissée ouverte pour ce code-là. Ce module apprend à la fermer.

## Les types bruts

Un type générique, comme `List<E>`, définit une famille de **types paramétrés** : `List<String>`, `List<Order>`… Il définit aussi un **type brut** : son nom seul, `List`, qui se comporte comme si toute l'information générique avait été effacée.

Avec un type paramétré, le compilateur vérifie chaque insertion et insère un cast invisible à chaque lecture. Avec un type brut, il ne vérifie plus rien : l'erreur passe à la compilation, puis éclate à l'exécution, **à la lecture**, au moment où le cast caché échoue.

::checkpoint{id="c1"}

::visual{id="java-ch05-cce-distance"}

Il faut détecter les erreurs le plus tôt possible, idéalement à la compilation. Un type brut fait l'inverse : il repousse l'erreur au plus tard, et au plus loin de sa cause. Les types bruts n'existent que pour la **compatibilité de migration** avec le code d'avant Java 5. Il ne faut **jamais** en écrire de nouveaux.

> **Sous le capot :** pourquoi le Java d'aujourd'hui accepte-t-il encore `unsafeAdd` ? À cause de l'**effacement**. Les arguments de type n'existent qu'à la compilation : `javac` vérifie les types, puis les efface, et le bytecode ne connaît que `List` et `Object`. `List<String>` et `List<Integer>` sont donc la même classe à l'exécution. Pour que la lecture soit typée, javac insère un `checkcast String` à chaque `get` : c'est **cette** instruction qui lève la `ClassCastException`, à la ligne de la lecture.

## List, List<Object> et List<?>

Trois façons d'accepter « une liste de n'importe quoi », qui ne disent pas la même chose :

| Déclaration | Accepte une `List<String>` ? | Peut-on y ajouter ? | Vérifié ? |
|---|---|---|---|
| `List` (brut) | oui | n'importe quoi | **non** |
| `List<Object>` | **non** (invariance, leçon 2) | n'importe quel objet | oui |
| `List<?>` (joker non borné) | oui | rien (sauf `null`) | oui |

`List<?>` est la bonne réponse quand on veut traiter une liste sans connaître ni modifier son type d'éléments : la compter, la vider, comparer ses éléments à des `Object`.

::checkpoint{id="c2"}

Deux exceptions, où la forme brute est obligatoire, parce que les génériques sont effacés à l'exécution :
- les **littéraux de classe** : `List.class`, `String[].class` et `int.class` sont permis, `List<String>.class` ne l'est pas ;
- **`instanceof`** : `o instanceof Set` (ou `instanceof Set<?>`, équivalent), puis un cast vers `Set<?>`, jamais vers le type brut.

## Zéro avertissement unchecked

Les génériques produisent des **avertissements unchecked** : conversion non vérifiée, appel non vérifié, cast non vérifié… Beaucoup disparaissent en une correction : `Set<Lark> s = new HashSet();` devient `new HashSet<>()` (l'opérateur diamant, Java 7). D'autres demandent de la réflexion ; le reste du module en montre plusieurs.

La règle est sans exception : **élimine chaque avertissement unchecked que tu peux.** Un code sans avertissement est typé : il ne lèvera pas de `ClassCastException` à cause des génériques.

Si un avertissement ne peut pas être éliminé, mais que tu **prouves** que le code est sûr, alors (et seulement alors) supprime-le :
- avec `@SuppressWarnings("unchecked")` sur la **plus petite portée possible**, idéalement la déclaration d'une variable locale ;
- avec un commentaire qui dit **pourquoi** c'est sûr.

```java
public <T> T[] toArray(T[] a) {
    if (a.length < size) {
        // Ce cast est correct : le tableau créé a le même type que celui reçu, soit T[]
        @SuppressWarnings("unchecked") T[] result = (T[]) Arrays.copyOf(elements, size, a.getClass());
        return result;
    }
    …
}
```

::checkpoint{id="c3"}

Ignorer les avertissements « sûrs » sans les supprimer est aussi une faute : le jour où un vrai problème arrive, son avertissement se perd parmi les fausses alarmes. C'est ce qui s'est passé avec les 412 avertissements d'Ordo.

> **En pratique :** fais échouer la compilation sur les avertissements, pour qu'ils ne s'accumulent plus. `javac -Xlint:rawtypes,unchecked -Werror`, ou dans Gradle `options.compilerArgs += ["-Xlint:all", "-Werror"]`. Les tests de ce module compilent ton code exactement ainsi.

## Pièges fréquents

- **Écrire `List` « pour aller plus vite »** dans une méthode utilitaire : elle accepte tout, et l'erreur éclate ailleurs.
- **Confondre `List<Object>` et `List<?>`** : le premier n'accepte pas une `List<String>`, le second refuse les ajouts.
- **`@SuppressWarnings` sur une classe entière** : il cache aussi les avertissements futurs.
- **Supprimer sans prouver** : le code compile proprement et lève quand même une `ClassCastException`.
- **Laisser traîner des avertissements sûrs** : ils noient le prochain vrai problème.

## À retenir

- Jamais de type brut dans du code neuf : seulement `List.class` et `instanceof Set`.
- `List<?>` pour une liste de type inconnu, en lecture ; `List<Object>` pour une liste qui contient vraiment des objets quelconques.
- Élimine chaque avertissement unchecked ; sinon prouve, puis supprime sur la plus petite portée, avec un commentaire.
- Fais échouer la compilation sur les avertissements (`-Xlint:all -Werror`).

> **Source :** *Effective Java*, 3e éd., items 26 et 27 (pages 117 à 125).
