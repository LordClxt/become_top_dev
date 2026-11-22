---
id: java-ch04-l03
title: "Interfaces, implémentations squelettes et méthodes par défaut"
source: { chapter: 4, pages: "99-106" }
duration_min: 35
concepts:
  - id: java-interfaces-over-abstract
    label: "Préférer les interfaces aux classes abstraites : une classe existante peut en implémenter une de plus, elles servent de mixins (Comparable) et de types non hiérarchiques"
  - id: java-skeletal-implementation
    label: "Implémentation squelette (AbstractList, AbstractMap…) : l'interface définit le type, la classe abstraite implémente tout sauf les primitives ; patron Méthode modèle"
  - id: java-default-methods
    label: "Méthodes par défaut : une implémentation dans l'interface ; la classe gagne sur l'interface, l'interface la plus spécifique gagne, X.super.m() appelle une version précise ; jamais equals ni hashCode"
  - id: java-interface-posterity
    label: "Ajouter une méthode par défaut injecte du code dans toutes les implémentations existantes, qui ne l'ont jamais vu (removeIf et les collections synchronisées) : concevoir une interface pour durer, et la tester avec au moins trois implémentations"
glossary:
  - term: "mixin"
    definition: "Type qu'une classe implémente en plus de son type principal, pour déclarer un comportement optionnel (Comparable, AutoCloseable)."
  - term: "implémentation squelette"
    definition: "Classe abstraite qui implémente une interface à partir de quelques méthodes primitives laissées à la sous-classe. Le JDK les nomme Abstract + interface."
  - term: "méthode par défaut"
    definition: "Méthode d'interface avec un corps (default), héritée par les classes qui ne la redéfinissent pas. Java 8."
  - term: "Méthode modèle (Template Method)"
    definition: "Patron où une méthode définit l'algorithme et délègue certaines étapes à des méthodes que les sous-classes fournissent."
visuals: [java-ch04-skeletal-layers]
labs: [java-ch04-l03-lab-price-series-view]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Une vue `List<Integer>` sur un tableau `int[]`, construite sur `AbstractList` avec trois méthodes. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          static List<Integer> intArrayAsList(int[] a) {
              Objects.requireNonNull(a);
              return new AbstractList<>() {
                  @Override public Integer get(int i) { return a[i]; }
                  @Override public Integer set(int i, Integer val) { int old = a[i]; a[i] = val; return old; }
                  @Override public int size() { return a.length; }
              };
          }

          public static void main(String[] args) {
              int[] a = { 3, 1, 2 };
              List<Integer> list = intArrayAsList(a);
              Collections.sort(list);
              list.set(0, 9);
              System.out.println(Arrays.toString(a) + " " + list.contains(2) + " " + list.indexOf(9));
              try {
                  list.add(4);
              } catch (UnsupportedOperationException e) {
                  System.out.println("add refusé");
              }
          }
      }
    answer: "[9, 2, 3] true 0\nadd refusé"
    explanation: "C'est une vue : trier la liste trie le tableau (List.sort écrit le résultat avec set), et set(0, 9) écrit dans a. contains et indexOf viennent d'AbstractList, construits sur get et size. add n'est pas une primitive fournie : l'implémentation squelette lève UnsupportedOperationException, ce qui convient à une vue de taille fixe."
    concept: java-skeletal-implementation
  - id: c2
    type: code-output
    prompt: "Trois classes, trois façons de résoudre `hi()` entre interfaces et classes. Qu'affiche le programme ?"
    code: |
      public class Main {
          interface Greeter { default String hi() { return "Greeter"; } }
          interface Polite extends Greeter { default String hi() { return "Polite"; } }
          static class Base { public String hi() { return "Base"; } }

          static class A implements Greeter, Polite { }
          static class B extends Base implements Polite { }
          static class C implements Polite {
              @Override public String hi() { return "C+" + Polite.super.hi(); }
          }

          public static void main(String[] args) {
              System.out.println(new A().hi() + " " + new B().hi() + " " + new C().hi());
          }
      }
    answer: "Polite Base C+Polite"
    explanation: "Trois règles. A : entre deux interfaces, la plus spécifique gagne (Polite étend Greeter). B : une méthode de classe, même héritée, gagne toujours sur une méthode par défaut. C : une redéfinition peut appeler une version précise avec Interface.super.methode(). Si deux interfaces sans lien fournissaient hi(), la classe devrait la redéfinir, sinon le code ne compilerait pas."
    concept: java-default-methods
  - id: c3
    type: single
    prompt: "Java 8 ajoute `Collection.removeIf` en méthode par défaut. Une ancienne bibliothèque a une collection synchronisée qui verrouille chaque méthode qu'elle redéfinit. Que se passe-t-il quand un client appelle `removeIf` ?"
    choices:
      - "Le compilateur oblige la bibliothèque à redéfinir removeIf"
      - "La version par défaut s'exécute sans le verrou : un autre thread qui modifie la collection en même temps peut provoquer une ConcurrentModificationException ou un état incohérent"
      - "removeIf est automatiquement synchronisée, comme les autres méthodes"
      - "La JVM refuse de charger la classe"
    answer: 1
    explanation: "Une méthode par défaut est injectée dans toutes les implémentations existantes, compilées avant qu'elle existe. La collection synchronisée n'en sait rien : removeIf passe par l'itérateur, sans verrou. C'est arrivé avec SynchronizedCollection d'Apache Commons ; le JDK, lui, a redéfini removeIf dans ses propres enveloppes synchronisées."
    concept: java-interface-posterity
---

## Pourquoi c'est important

Ordo publie une bibliothèque de séries de prix. Une première version l'avait écrite comme une classe abstraite `PriceSeries`, dont les équipes héritaient. Puis une équipe veut qu'une série soit aussi `Comparable`, une autre qu'elle s'insère dans un cache existant qui hérite déjà d'une autre classe : impossible, Java n'a qu'une super-classe. Et quand l'équipe de la bibliothèque a ajouté une méthode utile à l'interface `Quotes`, deux implémentations chez les clients se sont mises à renvoyer des résultats faux, sans recompilation et sans erreur.

En Go, les interfaces sont implicites et sans implémentation : la question des classes abstraites ne se pose pas, et ajouter une méthode à une interface casse la compilation de tous les types qui ne l'ont pas. Java a choisi deux autres outils, la classe abstraite et la méthode par défaut. Les deux ont un coût.

## Pourquoi des interfaces plutôt que des classes abstraites

Java a deux mécanismes pour définir un type à implémentations multiples. Bloch conseille l'**interface**, pour trois raisons :

- **Une classe existante peut implémenter une interface de plus.** Quand `Comparable`, `Iterable` et `AutoCloseable` sont arrivées dans le JDK, des centaines de classes les ont adoptées. Une classe abstraite, elle, exige d'être la super-classe, et il n'y en a qu'une.
- **Les interfaces servent de *mixins*** : un comportement optionnel ajouté au type principal. « Cette classe est aussi comparable. » Une classe abstraite ne peut pas jouer ce rôle.
- **Les interfaces décrivent des types non hiérarchiques.** Un `Singer` et un `Songwriter` sont deux interfaces ; un `SingerSongwriter` les étend toutes les deux et ajoute ses méthodes. Avec des classes abstraites, chaque combinaison demande sa classe : 2ⁿ classes pour n attributs.

Les interfaces sont aussi le support naturel de la composition (leçon 1) : `ForwardingSet` n'existe que parce que `Set` est une interface.

## Le meilleur des deux : l'implémentation squelette

Une interface ne peut pas avoir d'état, et longtemps elle n'a pas pu avoir de code. Pour éviter que chaque implémentation réécrive les mêmes méthodes, on fournit, **à côté** de l'interface, une **implémentation squelette** : une classe abstraite qui implémente l'interface entière à partir de quelques méthodes **primitives**, laissées abstraites. Le JDK les nomme `AbstractCollection`, `AbstractSet`, `AbstractList`, `AbstractMap`.

L'interface reste le **type** (tout le monde peut l'implémenter) ; la classe squelette n'est qu'une **aide** pour qui veut l'utiliser. C'est le patron **Méthode modèle** : `contains`, `indexOf`, `iterator`, `equals`, `hashCode` d'`AbstractList` sont écrites une fois, sur `get` et `size`.

::checkpoint{id="c1"}

Avec trois méthodes, on obtient une `List` complète, efficace et **vue** sur le tableau. Ce qui n'est pas fourni (`add`, `remove`) lève `UnsupportedOperationException`, le comportement attendu d'une liste de taille fixe.

::visual{id="java-ch04-skeletal-layers"}

Écrire sa propre implémentation squelette suit une recette :
1. choisir les **primitives**, celles à partir desquelles tout le reste s'exprime ;
2. les fournir en méthodes par défaut quand c'est possible (souvent, rien d'autre) ;
3. écrire une classe abstraite qui implémente le reste, y compris `equals`, `hashCode` et `toString`, qu'une interface ne peut pas fournir ;
4. documenter son fonctionnement interne avec `@implSpec` (leçon 2), puisqu'elle est faite pour être étendue.

> **Sous le capot :** une classe qui ne peut pas étendre la classe squelette (elle hérite déjà d'autre chose) peut quand même en profiter : elle implémente l'interface et transmet chaque appel à une instance d'une classe **interne privée** qui étend le squelette. Bloch appelle cela de l'**héritage multiple simulé**. C'est la composition de la leçon 1, appliquée à l'intérieur.

## Les méthodes par défaut

Depuis Java 8, une interface peut fournir le corps d'une méthode (`default`). Trois règles décident de la version qui s'exécute :

1. une méthode de **classe** (déclarée ou héritée) gagne toujours sur une méthode par défaut ;
2. entre interfaces, la plus **spécifique** gagne (celle qui étend l'autre) ;
3. si deux interfaces sans lien fournissent la même méthode, la classe **doit** la redéfinir, et peut appeler une version précise avec `Interface.super.methode()`.

::checkpoint{id="c2"}

Limites : une interface ne peut pas fournir de méthode par défaut pour `equals`, `hashCode` ou `toString` (le compilateur le refuse), ni de champs d'instance. Elle peut avoir des méthodes `static` et, depuis Java 9, des méthodes `private` pour partager du code entre ses méthodes par défaut.

## Concevoir une interface pour durer

Les méthodes par défaut ont été introduites pour faire **évoluer** les interfaces du JDK : `Collection` a gagné `removeIf`, `stream`, `forEach`… sans casser les implémentations existantes. Mais « sans casser la compilation » ne veut pas dire « sans casser le comportement ». Une méthode par défaut est **injectée** dans des implémentations écrites avant qu'elle existe, par des gens qui ne pouvaient pas la prévoir.

::checkpoint{id="c3"}

Les conséquences pour toi :
- **ne pas ajouter** de méthode par défaut à une interface publiée sans nécessité ; si on le fait, la penser comme une méthode d'une classe conçue pour l'héritage (leçon 2) ;
- **concevoir l'interface avec soin dès le départ** : la corriger après publication est presque toujours impossible ;
- **tester une nouvelle interface avec au moins trois implémentations** différentes, et l'utiliser dans de vrais clients, avant de la publier.

> **Au-delà du livre :** depuis Java 17, une interface peut être **scellée** (`sealed interface Shape permits Circle, Square`). La liste des implémentations est alors connue et fermée : ajouter une méthode n'atteint plus des classes inconnues. C'est la forme des types de données de la leçon 4.

## Pièges fréquents

- **Une classe abstraite comme type public** : les clients ne peuvent plus hériter d'autre chose ni l'adopter en mixin. Exporte une interface, et la classe abstraite comme aide à côté.
- **Une méthode par défaut ajoutée à une interface publiée** : elle s'exécute dans des implémentations qui ne la connaissent pas, sans verrou, sans invariant.
- **Oublier `equals` et `hashCode` dans une implémentation squelette** : l'interface ne peut pas les fournir, la classe abstraite doit le faire.
- **Copier au lieu de donner une vue** : `List.copyOf(...)` est parfois voulu, mais une vue (squelette sur le tableau) partage les modifications sans copie.
- **Deux interfaces sans lien avec la même méthode par défaut** : la classe doit trancher par une redéfinition.

## À retenir

- Interface plutôt que classe abstraite : une classe existante peut l'adopter, elle sert de mixin, elle décrit des types non hiérarchiques.
- Implémentation squelette (`Abstract*`) : interface = type, classe abstraite = aide qui implémente tout sur quelques primitives.
- Méthodes par défaut : la classe gagne, l'interface la plus spécifique gagne, `X.super.m()` pour choisir ; jamais `equals`, `hashCode`, `toString`.
- Une interface publiée se fige : une méthode par défaut ajoutée plus tard s'injecte dans du code qui ne l'attend pas. Teste-la avec trois implémentations avant de publier.

> **Source :** *Effective Java*, 3e éd., items 20 et 21 (pages 99 à 106).
