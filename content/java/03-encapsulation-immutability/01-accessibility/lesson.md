---
id: java-ch03-l01
title: "Rendre chaque chose aussi inaccessible que possible"
source: { chapter: 4, pages: "73-77" }
duration_min: 35
concepts:
  - id: java-information-hiding
    label: "Masquage d'information : l'API est un contrat, l'implémentation reste libre de changer"
  - id: java-access-levels
    label: "Les niveaux d'accès : private, package-private, protected, public ; et seulement package-private ou public pour une classe de premier niveau"
  - id: java-protected-is-api
    label: "protected fait partie de l'API exportée : un engagement à vie, comme public"
  - id: java-public-array-hole
    label: "Un tableau public static final est modifiable : liste non modifiable ou copie"
  - id: java-test-visibility
    label: "Pour tester, on peut descendre jusqu'à package-private, jamais au-delà"
  - id: java-modules-encapsulation
    label: "Modules (Java 9+) : un paquetage non exporté est inaccessible hors du module, strictement pour le JDK depuis Java 17"
glossary:
  - term: "masquage d'information"
    definition: "Principe (Parnas, 1972) : un composant cache ses détails d'implémentation et ne communique que par son API."
  - term: "package-private"
    definition: "Accès par défaut, sans modificateur : visible dans tout le paquetage, invisible au-dehors."
  - term: "API exportée"
    definition: "Tout ce qu'un client hors du paquetage peut voir et utiliser : classes publiques et leurs membres public et protected."
  - term: "module"
    definition: "Groupe de paquetages décrit par module-info.java, qui déclare ceux qu'il exporte et ceux dont il dépend."
visuals: [java-ch03-access-levels]
labs: [java-ch03-l01-lab-warmup-constants, java-ch03-l01-lab-tighten-api]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: single
    prompt: "Dans `Catalog`, la classe imbriquée `static class Cache` déclare `private int hits;`. Une méthode de `Catalog` écrit `cache.hits++`. Que se passe-t-il ?"
    choices:
      - "Erreur de compilation : hits est private dans Cache"
      - "Ça compile seulement si Cache est elle-même private"
      - "Ça compile : private ouvre l'accès à toute la classe de premier niveau, classes imbriquées comprises"
      - "Ça compile, mais la JVM lève IllegalAccessError à l'exécution"
    answer: 2
    explanation: "La portée de private n'est pas la classe qui déclare le membre, mais la classe de premier niveau qui l'englobe : Catalog et toutes ses classes imbriquées se voient mutuellement. Croire que private s'arrête à la classe imbriquée est la confusion classique."
    concept: java-access-levels
  - id: c2
    type: code-output
    prompt: "Les deux corrections du tableau constant, mises à l'épreuve. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          private static final int[] PRIVATE_LIMITS = {1, 2, 3};
          public static final List<Integer> LIMITS = List.of(1, 2, 3);
          public static int[] limits() { return PRIVATE_LIMITS.clone(); }

          public static void main(String[] args) {
              int[] v = limits();
              v[0] = 9;
              int[] w = limits();
              String verdict;
              try { LIMITS.set(0, 9); verdict = "modifiée"; }
              catch (UnsupportedOperationException e) { verdict = "refusée"; }
              System.out.println(w[0] + " " + (v == w) + " " + verdict);
          }
      }
    answer: "1 false refusée"
    explanation: "Chaque appel à limits() renvoie un nouveau tableau : le client modifie sa copie, jamais l'original. La liste de List.of, elle, refuse toute écriture à l'exécution (le compilateur ne dit rien, set existe dans l'interface List)."
    concept: java-public-array-hole
  - id: c3
    type: single
    prompt: "Le module `com.example.taxes` déclare seulement `exports com.example.taxes.api;`. Dans un autre module (sur le module path), du code écrit `new com.example.taxes.internal.Rates()`, où `Rates` est une classe public. Que se passe-t-il ?"
    choices:
      - "Ça compile : Rates est public, donc visible partout"
      - "Erreur de compilation : le paquetage internal n'est pas exporté, donc invisible hors du module"
      - "Ça compile, avec seulement un avertissement"
      - "Ça compile, puis échoue à l'exécution uniquement"
    answer: 1
    explanation: "Avec les modules, public veut dire « public pour les modules qui voient ce paquetage » : un paquetage non exporté reste fermé, même à ses classes publiques. C'est sur le classpath, pas sur le module path, que cette frontière disparaît."
    concept: java-modules-encapsulation
---

## Pourquoi c'est important

Ta bibliothèque de calcul de taxes a une classe utilitaire `TaxTables`, publique « parce que c'était plus simple ». Deux ans plus tard, tu veux la remplacer par un appel à un service : impossible, trois équipes l'utilisent directement. Pire, l'une d'elles écrit dans son tableau `public static final double[] RATES` pour « corriger » un taux en production, et toutes les factures du pays changent.

Deux leçons en une : ce que tu rends public, tu le maintiens **pour toujours** ; ce que tu ne protèges pas, quelqu'un finit par le modifier.

Le critère qui distingue le plus un composant bien conçu, c'est ce qu'il **cache**. C'est le **masquage d'information** : un composant ne montre que son API (ce qu'il promet), et garde son implémentation pour lui. Un composant qui cache bien peut être compris, testé, optimisé et remplacé seul, sans peur de casser les autres.

> **Le modèle mental :** chaque mot `public` est une promesse signée. Moins tu en signes, plus tu restes libre.

## Le concept

### La règle : le niveau d'accès le plus bas qui marche

Pour une **classe de premier niveau** (non imbriquée), deux choix seulement :

- `public` : elle fait partie de l'API du paquetage. Tu la supportes à vie ;
- **package-private** (aucun modificateur) : elle fait partie de l'implémentation. Tu peux la changer, la remplacer ou la supprimer à la prochaine version.

Si une classe package-private n'est utilisée que par **une** classe, fais-en une classe imbriquée `private static` de celle-ci : son accès se réduit alors de tout le paquetage à une seule classe.

Pour les **membres** (champs, méthodes, classes imbriquées), quatre niveaux, du plus fermé au plus ouvert :

| Niveau | Visible depuis |
|---|---|
| `private` | la classe de premier niveau qui le déclare |
| package-private | tout le paquetage |
| `protected` | le paquetage + les sous-classes, même ailleurs |
| `public` | partout |

Note la première ligne : `private` ne s'arrête pas à la classe qui déclare le membre, il couvre toute la classe de **premier niveau**, avec ses classes imbriquées.

::checkpoint{id="c1"}

::visual{id="java-ch03-access-levels"}

Le réflexe : conçois soigneusement l'API publique, puis rends **tout le reste `private`**. Ne descends à package-private que si une autre classe du paquetage en a vraiment besoin. Si ça t'arrive souvent, c'est que le découpage en classes est à revoir.

Voici à quoi ressemble ce réflexe appliqué à un petit catalogue :

:::steps
```java title="catalog/Catalog.java"
package catalog;

public final class Catalog {
    public static final int MAX_ITEMS = 500;

    private final PriceIndex index = new PriceIndex();

    public Product find(String sku) { return index.lookup(sku); }

    int size() { return index.size(); }

    private static final class Entry { String sku; long cents; }
}

final class PriceIndex { /* ... */ }
```
--- 3: `Catalog` est **publique** : c'est la seule porte d'entrée du paquetage, un engagement à vie. `final` en plus, pour que personne ne l'étende.
--- 4: Une constante `public static final` d'un type primitif : la seule sorte de champ public acceptable.
--- 6: Le champ d'instance est `private`. Demain tu peux remplacer `PriceIndex` par un cache ou un service, aucun client ne le saura.
--- 8: La seule méthode publique : l'API se réduit à ce que les clients doivent vraiment faire.
--- 10: `size()` est package-private (aucun modificateur) : les tests du paquetage `catalog` la voient, le reste du monde non.
--- 12,15: `Entry` ne sert qu'à `Catalog` : classe imbriquée `private static`. `PriceIndex` sert à plusieurs classes du paquetage : classe de premier niveau package-private, libre de changer.
:::

### Le grand saut : de package-private à protected

Passer un membre de package-private à `protected`, c'est l'**exporter**. L'**API exportée**, c'est tout ce qu'un client hors du paquetage peut voir : les classes publiques, et leurs membres `public` **et** `protected`.

Pourquoi `protected` en fait partie ? N'importe qui peut étendre ta classe publique, dans son propre paquetage, et appeler ce membre. Il devient un engagement : tu dois le maintenir, et il révèle un détail d'implémentation (on y reviendra au module 4, sur l'héritage). Les membres protégés devraient être rares.

:::reveal Avant de lire la suite : une classe implémente `Runnable`. Peut-elle déclarer `void run()` sans `public` ?
Non. Une méthode qui **redéfinit** ne peut pas être moins accessible que celle qu'elle redéfinit, et les méthodes d'une interface sont implicitement `public`. C'est le principe de Liskov (module 2) : une sous-classe doit être utilisable partout où l'est la classe mère. Si `run()` devenait package-private, du code qui manipule un `Runnable` ne pourrait plus l'appeler. Conséquence : les méthodes qui implémentent une interface sont forcément `public`.
:::

### Et pour les tests ?

Tu peux rendre **package-private** (aucun modificateur : visible dans tout le paquetage, invisible au-dehors) un membre `private` pour le tester, **pas plus**.

Pourquoi ça suffit : les tests vivent dans `src/test/java`, mais avec le **même nom de paquetage** que le code testé. Pour Java, c'est le même paquetage, donc ils voient tout ce qui est package-private. Rendre une méthode publique « pour les tests », c'est l'ajouter à l'API.

### Les champs : jamais publics (sauf les constantes)

Un champ d'instance public et non `final`, ou qui référence un objet mutable, te fait renoncer à **tout** contrôle :

- tu ne peux plus valider les valeurs ;
- ni réagir à une modification ;
- ni garantir la sûreté entre threads.

Même `final` et immuable, il t'interdit de changer de représentation (la leçon suivante y revient).

Exception : les **constantes**, `public static final`, nommées en `MAJUSCULES_AVEC_SOULIGNÉS`, qui font partie de l'abstraction. Elles doivent contenir un primitif ou un objet **immuable**.

### Le trou de sécurité classique : le tableau constant

`final` protège la **variable** (elle désignera toujours le même tableau), pas le **contenu** du tableau. Et un tableau non vide est **toujours** mutable. Deux corrections, selon ce que le client fera du résultat :

:::compare
--- bad: Tableau public
```java
public static final Thing[] VALUES = { ... };
// n'importe quel client : VALUES[0] = null;
```
La référence est figée, les cases ne le sont pas.
--- good: Liste non modifiable
```java
private static final Thing[] PRIVATE_VALUES = { ... };
public static final List<Thing> VALUES = List.of(PRIVATE_VALUES);
```
Une seule copie, faite à l'initialisation ; toute écriture lève une exception.
--- good: Copie à chaque appel
```java
private static final Thing[] PRIVATE_VALUES = { ... };
public static Thing[] values() { return PRIVATE_VALUES.clone(); }
```
Le client reçoit un vrai tableau, à lui : il peut le modifier sans rien casser.
:::

La liste convient quand le client veut **lire** ; la copie, quand il a besoin d'un tableau (une API qui en attend un, un tri sur place).

::checkpoint{id="c2"}

Méfie-toi des accesseurs générés par les IDE, qui renvoient souvent directement le tableau privé : même problème.

> **Attention :** `List.of(array)` copie le tableau à la création. `Collections.unmodifiableList(Arrays.asList(array))`, la version du livre, est une **vue** : elle reflète toute modification ultérieure du tableau privé.

### Les modules (Java 9+)

Un **module** est un groupe de paquetages, décrit par un fichier `module-info.java` qui déclare ceux qu'il **exporte** et ceux dont il dépend. Il ajoute une frontière **au-dessus** des paquetages.

```java title="module-info.java"
module com.example.taxes {
    exports com.example.taxes.api;   // seul ce paquetage est visible de l'extérieur
    // com.example.taxes.internal : non exporté, même ses classes public restent dedans
}
```

Les membres `public` d'un paquetage non exporté sont invisibles hors du module : on peut partager des classes entre paquetages d'un même module sans les montrer au monde.

::checkpoint{id="c3"}

Pour ton propre code, cette protection reste largement **indicative** : un JAR modulaire placé sur le *classpath* (et non sur le *module path*) retrouve l'accessibilité classique. Le JDK, lui, l'applique strictement : depuis **Java 17**, il n'est plus possible d'ouvrir ses paquetages internes par réflexion sans option explicite (`--add-opens`). C'est pour cela que de vieilles bibliothèques qui fouillaient dans `sun.misc` ou les champs privés de `String` ont cassé lors des migrations.

## Sous le capot : qui vérifie l'accès, et quand

L'accès est vérifié **deux fois** :

1. par `javac`, qui refuse de compiler `obj.champPrivé` depuis une autre classe ;
2. par la **JVM**, au moment où elle résout une référence de champ ou de méthode dans le bytecode.

Pourquoi la seconde vérification ? Si la classe cible a changé depuis la compilation (un membre devenu `private` dans une nouvelle version d'une bibliothèque, sans recompiler le client), la JVM lève `IllegalAccessError` à l'exécution. Les niveaux d'accès sont donc aussi une protection **binaire**, pas seulement une politesse du compilateur.

> **Sous le capot :** les classes imbriquées (celles du checkpoint c1). Pour le langage, elles partagent leurs membres `private` avec la classe englobante. Pour la JVM d'avant Java 11, c'étaient deux classes distinctes : `javac` générait donc des méthodes cachées `access$000` de niveau package, ce qui ouvrait en réalité le membre privé à tout le paquetage. Depuis **Java 11**, la JVM connaît les **nestmates** (JEP 181) : la classe englobante déclare ses classes imbriquées dans un attribut `NestMembers`, et la JVM autorise directement l'accès privé entre elles, sans méthode passerelle.

La réflexion contourne `private` avec `setAccessible(true)`, mais seulement si le module de la cible l'**ouvre** à l'appelant. Sinon, `InaccessibleObjectException`. C'est ce mécanisme qui protège le JDK depuis Java 17.

## Pièges fréquents

- **Une classe publique « par défaut »** alors que personne hors du paquetage ne s'en sert : elle devient une API à vie.
- **`protected` vu comme « presque privé »** : c'est de l'API exportée.
- **`public static final` sur un tableau ou une collection mutable** : le contenu est modifiable par tous.
- **Un accesseur généré qui renvoie le tableau interne.**
- **Une méthode publique « pour les tests »** : package-private suffit, les tests sont dans le même paquetage.
- **Des champs d'instance publics** dans une classe publique.

## À retenir

- Rends chaque classe et chaque membre **aussi inaccessible que possible**.
- Classe de premier niveau : package-private si possible ; utilisée par une seule classe : `private static` imbriquée.
- `protected` et `public` sont des engagements à vie.
- Aucun champ public, sauf des constantes `static final` primitives ou immuables. Jamais de tableau public.
- Tests : package-private au maximum.
- Les modules ajoutent une frontière au-dessus des paquetages ; strictement appliquée pour le JDK.

> **Source :** *Effective Java*, 3e éd., item 15 (pages 73 à 77). Nestmates : JEP 181 (Java 11). Encapsulation forte du JDK : JEP 403 (Java 17).
