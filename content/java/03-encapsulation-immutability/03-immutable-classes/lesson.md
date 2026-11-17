---
id: java-ch03-l03
title: "Des classes immuables"
source: { chapter: 4, pages: "80-85" }
duration_min: 45
concepts:
  - id: java-immutable-five-rules
    label: "Les cinq règles : pas de mutateur, classe non extensible, champs final, champs private, accès exclusif aux composants mutables"
  - id: java-functional-approach
    label: "Approche fonctionnelle : les opérations renvoient un nouvel objet (plus, pas add) au lieu de modifier this"
  - id: java-immutable-sharing
    label: "Immuable donc partageable : thread-safe sans verrou, constantes et fabriques avec cache, aucune copie défensive, internes partagés"
  - id: java-effectively-final-factories
    label: "Constructeurs privés + fabriques statiques : une classe effectivement finale, plus souple que final"
  - id: java-defensive-copy-untrusted
    label: "BigInteger et BigDecimal sont extensibles : copier un argument dont la classe n'est pas exactement la leur"
  - id: java-lazy-cached-fields
    label: "Champ non final de cache (hash) : permis tant qu'aucun changement n'est visible de l'extérieur"
  - id: java-final-field-semantics
    label: "Sémantique des champs final dans le modèle mémoire : publication sûre sans synchronisation, si this ne s'échappe pas"
glossary:
  - term: "classe immuable"
    definition: "Classe dont les instances ne changent jamais d'état observable après leur construction (String, Integer, BigDecimal, LocalDate)."
  - term: "mutateur"
    definition: "Méthode qui modifie l'état de l'objet (setX, add, clear)."
  - term: "approche fonctionnelle"
    definition: "Style où une opération renvoie le résultat sous forme d'un nouvel objet, sans modifier son opérande."
  - term: "atomicité en cas d'échec"
    definition: "Propriété d'un objet qui reste dans un état cohérent quand une opération échoue au milieu."
  - term: "publication sûre"
    definition: "Transmission d'un objet à un autre thread de façon que celui-ci voie son état complètement initialisé."
visuals: [java-ch03-structural-sharing]
labs: [java-ch03-l03-lab-fraction, java-ch03-l03-lab-drifting-quote]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Team a un champ `private final List<String>`. Qu'affiche le programme ?"
    code: |
      public class Main {
          static final class Team {
              private final List<String> names;
              Team(List<String> names) { this.names = names; }
              List<String> names() { return names; }
          }

          public static void main(String[] args) {
              var source = new ArrayList<>(List.of("Ana"));
              var team = new Team(source);
              source.add("Bob");
              team.names().add("Eve");
              System.out.println(team.names());
          }
      }
    answer: "[Ana, Bob, Eve]"
    explanation: "final fige la référence, pas la liste : l'appelant garde un accès par source, et l'accesseur en donne un second. Il fallait List.copyOf à l'entrée (et ne jamais renvoyer une liste modifiable), c'est la règle 5."
    concept: java-immutable-five-rules
  - id: c2
    type: code-output
    prompt: "LocalDate est immuable. Qu'affiche le programme ?"
    code: |
      var d = LocalDate.of(2026, 1, 15);
      d.withDayOfMonth(1);
      var e = d.plusDays(1);
      System.out.println(d + " " + e);
    answer: "2026-01-15 2026-01-16"
    explanation: "withDayOfMonth renvoie une nouvelle date que la ligne 2 jette : d n'a jamais changé. Croire qu'une méthode « with » ou « plus » modifie l'objet est exactement le piège que l'approche fonctionnelle évite si on utilise le résultat."
    concept: java-functional-approach
  - id: c3
    type: single
    prompt: "`public class Money` (non finale, constructeur public) a deux champs `private final long cents; private final String currency;` et aucun mutateur. Un code non fiable te passe un `Money`. Que peut-il se passer ?"
    choices:
      - "Rien : les champs private final ne peuvent pas changer, l'objet est sûr"
      - "Le compilateur refuse toute sous-classe d'une classe aux champs final"
      - "Une sous-classe peut redéfinir cents() ou toString() pour renvoyer des valeurs qui changent, tout en passant pour un Money"
      - "La sous-classe peut écrire directement dans le champ cents hérité"
    answer: 2
    explanation: "Les champs du parent restent intacts, mais ce que tu observes passe par des méthodes qu'une sous-classe peut redéfinir avec son propre état mutable. C'est pour ça que la règle 2 exige une classe non extensible : final, ou des constructeurs privés."
    concept: java-effectively-final-factories
  - id: c4
    type: code-output
    prompt: "Integer est immuable et Integer.valueOf est une fabrique statique. Qu'affiche le programme ?"
    code: |
      Integer a = Integer.valueOf(127), b = Integer.valueOf(127);
      Integer c = Integer.valueOf(128), d = Integer.valueOf(128);
      System.out.println((a == b) + " " + (c == d) + " " + c.equals(d));
    answer: "true false true"
    explanation: "valueOf renvoie une instance en cache pour -128 à 127 : partager est sans risque puisque personne ne peut la modifier. Au-delà, chaque appel crée un objet ; == compare des identités, pas des valeurs, d'où equals pour comparer deux Integer."
    concept: java-immutable-sharing
---

## Pourquoi c'est important

Un service de réservation calcule un tarif avec `BigDecimal`, puis le passe à un module de remise qui fait `prix.add(remise)`. Rien ne change : `add` ne modifie pas `prix`, il **renvoie** un nouveau `BigDecimal`, que le code jette. Le bug inverse est bien pire : avec une classe `Money` **mutable** dotée d'un `add` qui modifie `this`, le module de remise change le prix stocké dans le panier de *tous* les objets qui partagent cette référence : la facture, le récapitulatif, le journal d'audit.

L'image à garder : un objet immuable se comporte comme le nombre 3. Personne ne « modifie » 3 ; on calcule `3 + 1` et on obtient **une autre** valeur, 4, pendant que 3 reste 3 pour tous ceux qui le tiennent.

Un objet immuable ne peut donc être que dans un seul état : celui de sa construction. Tu vérifies les invariants une fois, dans le constructeur, et ils sont vrais pour toujours, quel que soit le nombre de threads ou de modules qui le partagent.

## Le concept

### Les cinq règles

1. **Aucun mutateur** : pas de méthode qui change l'état.
2. **Classe non extensible** : sinon une sous-classe peut ajouter un état mutable et faire *semblant* d'être toi. En général : `final`.
3. **Tous les champs `final`** : l'intention est vérifiée par le compilateur, et c'est nécessaire à la *publication sûre* : un autre thread qui reçoit l'objet le voit complètement initialisé (voir *Sous le capot*).
4. **Tous les champs `private`** : sinon un client accède aux objets mutables référencés par un champ.
5. **Accès exclusif aux composants mutables** : ne stocke jamais une référence mutable fournie par le client, ne la renvoie jamais. Copies défensives à l'entrée **et** à la sortie.

Voici les cinq règles appliquées à une classe de nombres complexes, ligne par ligne :

:::steps
```java
public final class Complex {
    public static final Complex ZERO = new Complex(0, 0);
    public static final Complex ONE  = new Complex(1, 0);

    private final double re;
    private final double im;

    public Complex(double re, double im) { this.re = re; this.im = im; }

    public double realPart()      { return re; }
    public double imaginaryPart() { return im; }

    public Complex plus(Complex c)  { return new Complex(re + c.re, im + c.im); }
    public Complex times(Complex c) { return new Complex(re * c.re - im * c.im, re * c.im + im * c.re); }
    // equals, hashCode, toString : module 2
}
```
--- 1: `final` sur la classe (règle 2) : aucune sous-classe ne pourra ajouter d'état ni redéfinir `realPart()` pour mentir.
--- 2-3: Des constantes publiques : sans danger, puisque personne ne peut les modifier. Tout le monde partage le même `ZERO`.
--- 5-6: `private final` (règles 3 et 4) : le compilateur refuse toute réaffectation, et aucun client ne voit les champs.
--- 8: Le constructeur établit l'état une fois pour toutes. Deux `double` sont des valeurs, pas des objets mutables : la règle 5 n'a rien à copier ici.
--- 10-11: Des accesseurs, aucun `setRe` : il n'existe aucun mutateur (règle 1).
--- 13-14: Chaque opération calcule et renvoie un **nouveau** `Complex`. `this` n'est jamais touché.
:::

La règle 5 est celle qu'on rate le plus souvent, car rien ne la vérifie à la compilation dès qu'un champ pointe vers un objet mutable (une liste, une date `java.util.Date`, un tableau).

::checkpoint{id="c1"}

### L'approche fonctionnelle (et ses noms)

`plus` renvoie un **nouveau** `Complex` et laisse `this` intact : c'est l'approche *fonctionnelle*. Le nom compte : une **préposition** (`plus`, `minus`, `times`) dit « le résultat de », un **verbe** (`add`) laisse croire que l'objet change. `BigInteger.add` et `BigDecimal.add` ont pris des verbes, et des générations de développeurs ont écrit `total.add(x);` en jetant le résultat. Pour une méthode qui « modifie » un objet immuable, les conventions modernes sont `withX(…)` (`LocalDate.withDayOfMonth`) ou un verbe au participe (`plusDays`).

:::compare
--- bad: Money mutable : add modifie this
```java
final class Money {
    private long cents;
    Money add(Money m) { cents += m.cents; return this; }
}
// cart.total() et invoice.total() pointent vers le même objet :
invoice.total().add(fee);   // le panier change aussi
```
--- good: Money immuable : plus renvoie une valeur
```java
final class Money {
    private final long cents;
    Money(long cents) { this.cents = cents; }
    Money plus(Money m) { return new Money(cents + m.cents); }
}
Money withFee = invoice.total().plus(fee);   // personne d'autre ne bouge
```
:::

Le prix de la version immuable : **utiliser le résultat**. Un appel dont on jette le retour ne fait rien, sans erreur ni avertissement.

::checkpoint{id="c2"}

### Ce qu'on gagne

- **Thread-safety gratuite** : aucun thread ne peut observer l'effet d'un autre, il n'y en a pas. Aucune synchronisation.
- **Partage libre** : expose des constantes (`ZERO`, `ONE`) et, mieux, une **fabrique statique** qui renvoie des instances en cache (`Integer.valueOf`, `BigInteger.valueOf`). Commencer par une fabrique te laisse ajouter ce cache plus tard sans toucher aux clients.
- **Jamais de copie** : une copie serait équivalente pour toujours à l'original. Pas de `clone`, pas de constructeur de copie (le constructeur `String(String)` est une erreur historique).
- **Partage des internes** : `BigInteger` stocke un signe (`int`) et une magnitude (`int[]`). `negate()` crée un nouveau `BigInteger` avec le signe opposé qui **pointe vers le même tableau** : il ne sera jamais modifié, il peut donc servir à deux objets.
- **De bonnes briques** : clés de `Map`, éléments de `Set`, composants d'objets plus gros (module 2 : une clé mutable détruit une `HashMap`).
- **Atomicité en cas d'échec gratuite** : si `dividedBy` lève une exception, aucun objet n'est à moitié modifié (c'est l'*atomicité en cas d'échec* : l'objet reste cohérent quand une opération échoue au milieu).

::checkpoint{id="c4"}

Le partage des internes est ce qui rend l'immutabilité bon marché. Construis toi-même des versions d'une pile immuable et compte les nœuds alloués :

::visual{id="java-ch03-structural-sharing"}

### Une alternative à `final` : constructeur privé + fabriques

Pourquoi tant d'insistance sur la règle 2, alors que les champs sont déjà `private final` ? Vérifie ton intuition :

::checkpoint{id="c3"}

```java
public class Complex {
    private final double re, im;
    private Complex(double re, double im) { this.re = re; this.im = im; }

    public static Complex valueOf(double re, double im) {
        return new Complex(re, im);
    }
    // …
}
```

Sans constructeur public ni protected, aucune classe d'un autre paquetage ne peut l'étendre : elle est **effectivement finale** pour ses clients. Et tu gardes la liberté d'avoir plusieurs implémentations package-private (une `Complex` polaire, une `Complex` réelle) et d'ajouter un cache dans `valueOf`. C'est souvent la meilleure option.

:::reveal Avant de lire la suite : même pour une classe `final`, pourquoi préférer `valueOf` à un constructeur public ?
Un constructeur promet **un nouvel objet** à chaque appel, pour toujours. Une fabrique ne promet qu'**une valeur** : tu peux plus tard renvoyer une instance en cache (`Complex.ZERO` pour `valueOf(0, 0)`) ou une sous-classe package-private plus efficace, sans casser un seul client.
:::

### L'erreur de `BigInteger` et `BigDecimal`

À leur conception, on ne savait pas encore qu'une classe immuable devait être non extensible : leurs méthodes sont toutes redéfinissables, et ça ne peut plus être corrigé. Si la sécurité de ton code dépend de l'immutabilité d'un `BigInteger` reçu d'un client non fiable, vérifie sa classe exacte :

```java
public static BigInteger safeInstance(BigInteger val) {
    return val.getClass() == BigInteger.class ? val : new BigInteger(val.toByteArray());
}
```

### Assouplir la règle : les champs de cache

La vraie règle est « aucun changement **visible de l'extérieur** ». Un champ non final qui mémorise un calcul coûteux est permis, précisément parce que l'objet étant immuable, le calcul donnerait toujours le même résultat. C'est ce que fait `String.hashCode()`, et le `PhoneNumber` du module 2.

## Sous le capot : pourquoi `final` compte entre les threads

Le modèle mémoire de Java (JLS 17.5) donne aux champs `final` une garantie spéciale : à la fin du constructeur, ils sont **gelés**. Tout thread qui obtient une référence à l'objet **après** la fin du constructeur voit leurs valeurs initialisées, même si cette référence a été transmise **sans synchronisation** (une course de données, par exemple via un champ non volatile). Concrètement, le compilateur JIT insère une barrière (sur ARM, un `dmb`) à la sortie d'un constructeur qui écrit un champ `final` : les écritures des champs ne peuvent pas être réordonnées après la publication de la référence.

Sans `final`, cette garantie n'existe pas : un autre thread peut voir l'objet avec des champs **à leur valeur par défaut** (`0`, `null`). Un `Complex` avec `re` à 0 alors qu'il a été construit avec 3, sur un processeur à mémoire faiblement ordonnée. C'est rare, non reproductible, et ça arrive en production.

Deux limites à connaître :

- **Ne laisse pas `this` s'échapper du constructeur** (l'enregistrer dans un registre statique, démarrer un thread qui le voit, appeler une méthode redéfinissable) : un thread qui obtient la référence *pendant* la construction n'a aucune garantie.
- Le gel couvre l'objet **atteint par** le champ final tel qu'il était à la fin du constructeur : un tableau rempli dans le constructeur est visible correctement ; un tableau modifié après ne l'est pas.

**`final` ne voulait pas encore tout à fait dire final.** Jusqu'au JDK 25, la réflexion profonde peut modifier un champ `final` d'instance : `f.setAccessible(true); f.setLong(money, 999);` réussit sur une classe ordinaire (vérifié dans l'image du cours), et c'est ce que font certaines bibliothèques de sérialisation ou de mock. Seuls les champs des **records** (et des classes cachées) sont protégés : la même ligne lève `IllegalAccessException`.

Conséquence méconnue : comme un champ final *peut* changer, le JIT n'ose pas le traiter comme une constante (il ne fait pas de *constant folding* sur les champs finals d'instance ordinaires), et ton immutabilité ne te rapporte pas toutes les optimisations qu'elle pourrait.

Le JDK 26 commence à corriger ça (JEP 500, « Prepare to Make Final Mean Final ») : une telle modification affiche un avertissement, et deviendra une erreur dans une version future. Pour vérifier dès aujourd'hui qu'aucune de tes dépendances ne le fait, lance tes tests sur un JDK 26+ avec `--illegal-final-field-mutation=deny`.

Et le champ de cache non final de `String.hash` ? Il fait une course *bénigne* : deux threads peuvent calculer le hash chacun de leur côté, mais ils écrivent la même valeur, et un `int` s'écrit atomiquement. Le pire cas est un calcul en double. (Depuis le JDK 13, un booléen `hashIsZero` évite de recalculer à chaque appel le hash des chaînes dont le hash vaut réellement 0.)

## Pièges fréquents

- **Jeter le résultat** : `total.add(x);` avec un `BigDecimal`. Le résultat est le nouvel objet.
- **Un champ `final` vers un objet mutable** (`final List`, `final Date`) sans copie défensive : la référence est figée, pas l'objet.
- **Renvoyer l'interne** dans un accesseur : `return items;`.
- **Oublier `final` sur la classe** (ou un constructeur public sur une classe non finale) : une sous-classe peut mentir.
- **Faire confiance à un `BigInteger` reçu** d'un code non fiable.
- **Laisser `this` s'échapper** du constructeur.

## À retenir

- Cinq règles : pas de mutateur, non extensible, champs `private final`, accès exclusif aux composants mutables.
- Les opérations renvoient de nouveaux objets, et leur nom le dit (`plus`, `withX`).
- Un objet immuable se partage librement entre threads et modules : constantes, fabriques avec cache, internes partagés, jamais de copie.
- Constructeur privé + fabriques statiques : effectivement final, plus souple que `final`.
- Les champs `final` garantissent la publication sûre, tant que `this` ne s'échappe pas.

> **Source :** *Effective Java*, 3e éd., item 17 (pages 80 à 85). Modèle mémoire : JLS §17.5.
