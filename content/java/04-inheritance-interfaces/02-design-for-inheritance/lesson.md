---
id: java-ch04-l02
title: "Concevoir pour l'héritage, ou l'interdire"
source: { chapter: 4, pages: "93-98" }
duration_min: 35
concepts:
  - id: java-implspec-self-use
    label: "Une classe conçue pour l'héritage documente son auto-utilisation (@implSpec) : quelles méthodes redéfinissables chaque méthode appelle, dans quel ordre, avec quel effet"
  - id: java-protected-hooks
    label: "Des crochets protected choisis avec soin (comme removeRange) ; on les valide en écrivant au moins trois sous-classes, dont une par quelqu'un d'autre"
  - id: java-ctor-no-overridable
    label: "Un constructeur n'appelle jamais une méthode redéfinissable : elle s'exécute avant l'initialisation de la sous-classe, et voit ses champs final à null ou 0"
  - id: java-prohibit-subclassing
    label: "Interdire l'héritage d'une classe qui n'est pas conçue pour lui : final, ou constructeurs privés et fabriques statiques ; sealed pour une liste fermée de sous-classes"
  - id: java-flexible-ctor-bodies
    label: "Java 25 (JEP 513) : un constructeur peut initialiser ses propres champs avant super(...), ce qui protège contre un appel redéfinissable venu de la super-classe"
glossary:
  - term: "méthode redéfinissable"
    definition: "Méthode non finale, public ou protected, qu'une sous-classe peut remplacer."
  - term: "@implSpec"
    definition: "Section « Implementation Requirements » de la Javadoc : décrit le fonctionnement interne d'une méthode, pour ceux qui l'héritent."
  - term: "crochet (hook)"
    definition: "Méthode protected exposée pour qu'une sous-classe puisse s'insérer efficacement dans le fonctionnement de la super-classe."
  - term: "this-escape"
    definition: "Fuite de this pendant la construction : l'objet, pas encore initialisé, devient visible d'une sous-classe ou d'un autre code. javac le signale avec -Xlint:this-escape."
  - term: "classe scellée (sealed)"
    definition: "Classe ou interface qui liste les seules sous-classes autorisées (permits). Java 17."
visuals: [java-ch04-construction-order]
labs: [java-ch04-l02-lab-debug-alert-ctor]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le constructeur de `Super` appelle une méthode que `Sub` redéfinit. Qu'affiche le programme ?"
    code: |
      import java.time.Instant;

      public class Main {
          static class Super {
              Super() { overrideMe(); }       // appelle une méthode redéfinissable
              void overrideMe() { }
          }

          static final class Sub extends Super {
              private final Instant instant;
              Sub() { instant = Instant.EPOCH; }
              @Override void overrideMe() { System.out.println(instant); }
          }

          public static void main(String[] args) {
              Sub sub = new Sub();
              sub.overrideMe();
          }
      }
    answer: "null\n1970-01-01T00:00:00Z"
    explanation: "Le constructeur de Super s'exécute en premier, au super() implicite du début de Sub(). Il appelle overrideMe, redéfinie : celle de Sub, qui lit instant avant son affectation. Un champ final observé dans deux états différents ! Si overrideMe avait appelé une méthode sur instant, c'était une NullPointerException ; println, lui, tolère null."
    concept: java-ctor-no-overridable
  - id: c2
    type: code-output
    prompt: "Même programme, avec une seule différence, permise par Java 25 : `Sub` initialise son champ **avant** d'appeler `super()`. Qu'affiche-t-il ?"
    code: |
      import java.time.Instant;

      public class Main {
          static class Super {
              Super() { overrideMe(); }
              void overrideMe() { }
          }

          static final class Sub extends Super {
              private final Instant instant;
              Sub() {
                  instant = Instant.EPOCH;      // avant super() : Java 25, JEP 513
                  super();
              }
              @Override void overrideMe() { System.out.println(instant); }
          }

          public static void main(String[] args) {
              Sub sub = new Sub();
              sub.overrideMe();
          }
      }
    answer: "1970-01-01T00:00:00Z\n1970-01-01T00:00:00Z"
    explanation: "Les corps de constructeurs flexibles (JEP 513, définitifs en Java 25) autorisent des instructions avant super(...), tant qu'elles ne lisent pas this : on peut affecter ses propres champs. Quand Super appelle overrideMe, instant est déjà là. Cela protège la sous-classe ; la règle reste valable pour la super-classe : ne pas appeler de méthode redéfinissable dans un constructeur."
    concept: java-flexible-ctor-bodies
  - id: c3
    type: single
    prompt: "La classe publique `RateLimiter` n'a pas été conçue pour l'héritage, mais on veut garder la liberté d'en renvoyer plusieurs variantes internes plus tard. Quelle forme choisir ?"
    choices:
      - "public class, avec tous les champs protected pour aider les sous-classes"
      - "Constructeurs privés et fabriques statiques (of, perSecond…) : aucune sous-classe hors de la classe, et la fabrique peut renvoyer une implémentation interne"
      - "Laisser la classe ouverte et l'écrire dans la Javadoc"
      - "Une classe abstraite publique"
    answer: 1
    explanation: "final interdit l'héritage, mais des constructeurs privés avec des fabriques statiques font de même tout en laissant la classe libre de renvoyer d'autres implémentations, déclarées à l'intérieur (item 1). Une phrase dans la Javadoc n'empêche personne d'étendre la classe."
    concept: java-prohibit-subclassing
---

## Pourquoi c'est important

La bibliothèque de règles d'alerte d'Ordo est publique : d'autres équipes écrivent leurs propres alertes en étendant `Alert`. Une nouvelle sous-classe, `ThresholdAlert`, plante dès sa construction avec une `NullPointerException` dans un champ `final`, que le constructeur affecte pourtant. Personne ne comprend : le champ est affecté sur la ligne juste en dessous du `super(name)`.

La leçon 1 disait : n'étends pas une classe qui n'a pas été conçue pour l'héritage. Celle-ci répond à la question inverse, côté auteur : que faut-il pour qu'une classe **soit** conçue pour l'héritage ? Et si on ne veut pas payer ce prix, comment l'interdire ? En Go, la question ne se pose pas. En Java, toute classe non finale est ouverte par défaut, et chaque classe ouverte est une promesse.

## Documenter l'auto-utilisation

Une classe conçue pour l'héritage doit dire **précisément** l'effet de chaque redéfinition possible : pour chaque méthode publique ou protégée, quelles méthodes redéfinissables elle appelle, dans quel ordre, et comment leur résultat change la suite. Cette description va dans une section spéciale de la Javadoc, « Implementation Requirements », produite par la balise `@implSpec`. Exemple dans le JDK, `AbstractCollection.remove` :

> *Implementation Requirements:* This implementation iterates over the collection looking for the specified element. If it finds the element, it removes the element from the collection using the iterator's remove method.

Celui qui hérite sait désormais que redéfinir `iterator()` change le comportement de `remove`. C'est exactement ce qui manquait à `HashSet` dans la leçon 1.

Oui, cela contredit le principe « une bonne documentation dit ce que fait la méthode, pas comment ». C'est le prix de l'héritage : il viole l'encapsulation, alors la documentation doit exposer des détails qu'elle aurait dû cacher.

## Les crochets et le test par les sous-classes

Documenter ne suffit pas toujours. Pour qu'une sous-classe puisse être **efficace**, la super-classe expose parfois des **crochets** : des méthodes `protected`, rarement des champs. L'exemple du JDK : `AbstractList.removeRange(from, to)`, inutile aux utilisateurs d'une liste, mais que `clear()` appelle sur les sous-listes. Une sous-classe qui le redéfinit avec un vrai décalage de tableau rend `subList(a, b).clear()` linéaire au lieu de quadratique.

Combien de crochets ? Il n'y a pas de formule. Chaque membre `protected` est un **engagement à vie** sur un détail d'implémentation (module 3), mais un crochet manquant rend la classe inutilisable. La seule façon de savoir est d'**écrire des sous-classes** avant de publier : trois suffisent en général, dont au moins une écrite par quelqu'un d'autre. Un crochet qu'aucune n'utilise devrait probablement être privé.

## Jamais de méthode redéfinissable dans un constructeur

La règle la plus importante, parce que la violer fait **planter** le programme : un constructeur ne doit appeler, ni directement ni indirectement, aucune méthode redéfinissable.

::checkpoint{id="c1"}

Le constructeur de la super-classe s'exécute avant le corps de celui de la sous-classe. La méthode redéfinie s'exécute donc sur un objet à moitié construit, et voit les champs de la sous-classe avec leur valeur par défaut : `null`, `0`, `false`. Même un champ `final`.

::visual{id="java-ch04-construction-order"}

Appeler une méthode `private`, `final` ou `static` dans un constructeur est sûr : aucune n'est redéfinissable. C'est aussi la technique pour **supprimer l'auto-utilisation** d'une classe qu'on veut ouvrir : on déplace le corps de chaque méthode redéfinissable dans une méthode d'aide privée, et chaque méthode publique (y compris les autres méthodes publiques qui l'utilisaient) appelle l'aide, jamais la version redéfinissable.

> **Sous le capot :** `new Sub()` compile en deux étapes. L'instruction `new` alloue l'objet, avec **tous** ses champs à zéro, y compris ceux de `Sub`. Puis `invokespecial` appelle `Sub.<init>`, dont la première instruction est l'appel à `Super.<init>`. Pendant ce temps, l'objet est déjà de classe `Sub` : un appel virtuel à `overrideMe` trouve donc la version de `Sub`. javac le sait et le signale avec `-Xlint:this-escape` (Java 21) : *possible 'this' escape before subclass is fully initialized*.

**Java 25 change une partie du tableau.** Avec les corps de constructeurs flexibles (JEP 513), une sous-classe peut affecter ses propres champs **avant** `super(...)` (elle ne peut pas encore lire `this`) :

::checkpoint{id="c2"}

C'est une protection pour la **sous-classe**, et le bon réflexe quand on hérite d'une classe qu'on ne contrôle pas. Ce n'est pas une excuse pour la **super-classe** : elle doit rester sûre pour toutes les sous-classes, y compris celles qui n'utilisent pas cette forme.

Les mêmes règles s'appliquent à `clone` et `readObject`, qui se comportent comme des constructeurs : ils ne doivent appeler aucune méthode redéfinissable (modules 2 et 12). Une classe conçue pour l'héritage a d'ailleurs rarement intérêt à implémenter `Cloneable` ou `Serializable`, qui imposent une lourde charge à toutes ses sous-classes.

## Ou bien interdire l'héritage

Concevoir pour l'héritage coûte cher et engage pour toujours. Pour une classe ordinaire, non conçue ni documentée pour l'extension, la meilleure décision est souvent de l'**interdire** :

- déclarer la classe **`final`** ;
- ou rendre tous les constructeurs **privés** (ou package-private) et exposer des **fabriques statiques** (item 1). La classe peut alors renvoyer ses propres sous-classes internes, que personne d'autre ne peut créer.

::checkpoint{id="c3"}

> **Au-delà du livre :** Java 17 ajoute un entre-deux, les classes et interfaces **scellées**. `sealed abstract class Alert permits ThresholdAlert, KeywordAlert` autorise exactement ces sous-classes, et aucune autre. Chaque sous-classe autorisée doit elle-même dire si elle est `final`, `sealed` ou `non-sealed`. C'est la bonne forme quand la hiérarchie est **fermée par nature** (leçon 4).

Si une classe non finale doit absolument rester ouverte sans avoir été conçue pour l'héritage, Bloch donne un minimum : éliminer son auto-utilisation, pour que la redéfinition d'une méthode n'ait d'effet sur aucune autre.

## Pièges fréquents

- **Appeler une méthode redéfinissable dans un constructeur**, directement ou à travers une autre méthode : journalisation (`log("créé : " + describe())`), validation par un crochet, enregistrement auprès d'un écouteur.
- **Laisser une classe ouverte « au cas où »** : chaque sous-classe écrite par un tiers fige ton implémentation.
- **Trop de `protected`** : chaque membre est une promesse. Trop peu : la classe ne s'étend pas utilement.
- **Publier une classe conçue pour l'héritage sans avoir écrit de sous-classe** : les crochets manquants n'apparaissent qu'à l'usage.
- **Compter sur JEP 513 côté super-classe** : il protège seulement les sous-classes qui l'utilisent.

## À retenir

- Conçue pour l'héritage : auto-utilisation documentée (`@implSpec`), crochets `protected` validés par au moins trois sous-classes.
- Un constructeur (et `clone`, `readObject`) n'appelle jamais de méthode redéfinissable ; `private`, `final` et `static`, si. `-Xlint:this-escape` le détecte.
- Java 25 : une sous-classe peut initialiser ses champs avant `super(...)`.
- Non conçue pour l'héritage : `final`, ou constructeurs privés et fabriques statiques ; `sealed` pour une hiérarchie fermée.

> **Source :** *Effective Java*, 3e éd., item 19 (pages 93 à 98) ; [JEP 513 : Flexible Constructor Bodies](https://openjdk.org/jeps/513) ; [JEP 409 : Sealed Classes](https://openjdk.org/jeps/409).
