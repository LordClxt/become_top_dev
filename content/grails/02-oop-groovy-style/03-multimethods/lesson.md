---
id: grails-ch02-l03
title: "Multiméthodes : la surcharge choisie à l'exécution"
source: { book: groovy-in-action, chapter: 7, pages: "181-185" }
duration_min: 35
concepts:
  - id: grails-multimethod-runtime-dispatch
    label: "Groovy choisit la surcharge selon le type réel des arguments à l'exécution, Java selon leur type déclaré"
  - id: grails-multimethod-most-specific
    label: "La surcharge la plus proche du type réel gagne (distance dans la hiérarchie) ; un cast explicite impose la surcharge"
  - id: grails-multimethod-null
    label: "Un argument null ne porte pas de type : Groovy choisit sans prévenir, souvent la surcharge Object"
  - id: grails-equals-overload-trap
    label: "equals(MaClasse) surcharge equals(Object) sans le redéfinir : == de Groovy et les collections Java ne sont plus d'accord"
  - id: grails-compilestatic-dispatch
    label: "@CompileStatic choisit la surcharge à la compilation, sur le type connu (déclaré ou inféré) : le comportement change sans erreur"
glossary:
  - term: "multiméthode"
    definition: "Méthode dont la version exécutée est choisie selon le type réel de tous ses arguments, pas seulement de l'objet receveur."
  - term: "type statique"
    definition: "Le type déclaré d'une variable ou d'une expression (Event e), connu du compilateur."
  - term: "type dynamique"
    definition: "La classe réelle de l'objet à l'exécution (TicketClosed), même rangé dans une variable Event."
  - term: "dispatch"
    definition: "Le choix de la méthode à exécuter pour un appel donné."
visuals: [grails-ch02-dispatch]
labs: [grails-ch02-l03-lab-renderer, grails-ch02-l03-lab-debug-cart]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Qu'affiche ce script ?"
    code: |
      class Shape {}
      class Circle extends Shape {}
      String area(Shape s) { 'forme' }
      String area(Circle c) { 'cercle' }
      Shape s = new Circle()
      println area(s)
      println area((Shape) new Circle())
    answer: "cercle\nforme"
    explanation: "Groovy regarde le type réel : s contient un Circle, donc area(Circle). Mais un cast explicite dans l'appel est pris comme une consigne : (Shape) impose area(Shape)."
    concept: grails-multimethod-most-specific
  - id: c2
    type: code-output
    prompt: "Qu'affiche ce script ?"
    code: |
      class Line {
          String sku
          boolean equals(Line other) { other != null && sku == other.sku }
      }
      def a = new Line(sku: 'A1'), b = new Line(sku: 'A1')
      println a == b
      println([a].contains(b))
      println new HashSet([a, b]).size()
    answer: "true\nfalse\n2"
    explanation: "== de Groovy appelle equals dynamiquement et trouve equals(Line). ArrayList.contains et HashSet, écrits en Java, appellent equals(Object), jamais redéfini : identité. Et sans hashCode, le HashSet range les deux lignes dans des cases différentes."
    concept: grails-equals-overload-trap
  - id: c3
    type: single
    prompt: "Un service Groovy dispatche des événements avec `notifier.on(event)` (surcharges on(Event), on(TicketClosed)…). Un collègue ajoute `@CompileStatic` à la classe pour la performance. Les tests compilent. Que se passe-t-il ?"
    choices:
      - "Rien : @CompileStatic ne change que la vitesse"
      - "Une erreur de compilation sur les surcharges"
      - "Tous les événements partent vers on(Event) : le choix se fait désormais à la compilation, sur le type déclaré"
      - "Une exception à l'exécution"
    answer: 2
    explanation: "@CompileStatic émet des appels résolus à la compilation, comme Java : event est déclaré Event, c'est donc on(Event) pour tous. Aucun message ne signale ce changement de comportement."
    concept: grails-compilestatic-dispatch
---

## Pourquoi c'est important

Helpdesk prévient les agents à chaque événement. Le code est simple :

```groovy
class Notifier {
    String on(Event e)          { 'générique' }
    String on(TicketClosed e)   { "fermé : enquête de satisfaction envoyée" }
    String on(TicketAssigned e) { "assigné : courriel à l'agent" }
}

List<Event> events = eventStore.since(lastRun)   // des TicketClosed, des TicketAssigned…
events.each { notifier.on(it) }
```

En Groovy, chaque événement arrive dans **sa** méthode. Un jour, pour gagner en performance, quelqu'un ajoute `@CompileStatic` à la classe qui fait la boucle. Tout compile. En production, **plus aucun courriel** ne part : tous les événements tombent dans `on(Event)`. Aucune erreur, aucun avertissement.

Le même mécanisme casse aussi les collections : une ligne de panier dont `==` dit qu'elle est égale à une autre, mais qu'un `HashSet` compte deux fois. Cette leçon t'explique la règle qui produit ces deux bugs, pour que tu puisses les prévoir.

## Java choisit à la compilation

En Java, quand plusieurs méthodes portent le même nom, le **compilateur** choisit laquelle appeler, d'après le **type déclaré** des arguments.

```java
Event e = new TicketClosed();
notifier.on(e);   // Java : on(Event), parce que e est DÉCLARÉ Event
```

Le type réel de l'objet ne sert qu'à choisir parmi les redéfinitions de **la méthode déjà choisie**, dans la classe du receveur (le polymorphisme classique). Pour un argument, seul compte ce que le compilateur voit.

## Groovy choisit à l'exécution : les multiméthodes

En Groovy (sans `@CompileStatic`), l'appel est résolu **à l'exécution**, avec le **type réel** de chaque argument. `notifier.on(e)` avec un `TicketClosed` dans `e` appelle `on(TicketClosed)`. C'est ce qu'on appelle les **multiméthodes** : la version exécutée dépend du type réel de **tous** les arguments, pas seulement du receveur.

Choisis une valeur, un type de variable et un mode de compilation, et regarde quelle surcharge part :

::visual{id="grails-ch02-dispatch"}

## La surcharge la plus proche gagne

Quand plusieurs surcharges conviennent, Groovy prend la plus **proche** du type réel, en remontant la hiérarchie :

```groovy
class Urgent extends TicketAssigned {}
notifier.on(new Urgent())   // pas de on(Urgent) : la plus proche est on(TicketAssigned)
```

Même logique pour les interfaces et les nombres : un `ArrayList` préfère `c(List)` à `c(Collection)`, un `Integer` préfère `k(Integer)` à `k(Number)`, un `Long` sans surcharge dédiée va à `k(Number)`.

Un **cast explicite** dans l'appel est la seule façon d'imposer une surcharge : Groovy prend le type du cast comme une consigne.

::checkpoint{id="c1"}

## null : le cas où il n'y a rien à regarder

`null` n'a pas de type réel. Groovy doit choisir quand même, et il le fait sans prévenir :

```groovy
def o(Object x) { 'object' }
def o(String x) { 'string' }

String s = null
o(s)        // 'object' (Java aurait choisi o(String), d'après le type déclaré)
```

Avec deux surcharges sans lien (`String` et `Integer`), Groovy en choisit une aussi, sans exception. La règle pratique : **ne laisse jamais null décider**. Teste-le avant l'appel, ou impose la surcharge par un cast (`o((String) null)`).

## Le piège d'equals

Groovy te laisse écrire un `equals` « typé » qui semble plus propre :

```groovy
class Line {
    String sku
    int qty
    boolean equals(Line other) { other != null && sku == other.sku }   // surcharge, pas redéfinition
}
```

`equals(Line)` **ne redéfinit pas** `equals(Object)` : c'est une surcharge de plus. Groovy la trouve, parce que `==` appelle `equals` dynamiquement, avec le type réel. Le code Java des collections, lui, appelle `equals(Object)`, compilé une fois pour toutes, qui compare les identités. Et la classe n'a pas de `hashCode` assorti.

::checkpoint{id="c2"}

Le résultat est un objet qui donne deux réponses à la même question, selon qui la pose :

| Qui compare | Méthode appelée | `a` et `b` égaux ? |
|---|---|---|
| `a == b` (Groovy) | `equals(Line)` | oui |
| `[a, b].unique()` (GDK) | `==` | oui |
| `list.contains(b)`, `HashSet`, `HashMap` (Java) | `equals(Object)` + `hashCode()` | non |

La correction : redéfinis le **vrai** contrat, `equals(Object)` et `hashCode()`. Ou, mieux, laisse Groovy les générer :

```groovy
import groovy.transform.EqualsAndHashCode

@EqualsAndHashCode(includes = 'sku')
class Line { String sku; int qty }
```

> **Astuce :** le module Java `java-ch02` (« Les contrats d'Object ») détaille le contrat d'`equals` et de `hashCode`. En Groovy comme en Java, il se redéfinit avec un paramètre `Object`, jamais autre chose.

## @CompileStatic : retour aux règles de Java

`@CompileStatic` demande à `groovyc` de compiler comme Java : chaque appel est résolu à la compilation. C'est plus rapide et vérifié par le compilateur, mais **le choix des surcharges change** : il se fait sur le type **connu à la compilation**.

Ce type connu n'est pas toujours le type déclaré. `@CompileStatic` fait de l'**inférence par flux** : après `Event e = new TicketClosed()`, il sait que `e` contient un `TicketClosed` et choisit `on(TicketClosed)`. Mais une valeur qui arrive **de l'extérieur** (paramètre de méthode, élément d'une `List<Event>`, résultat d'une requête) n'a que son type déclaré. C'est le cas de toute vraie boucle d'événements :

```groovy
@groovy.transform.CompileStatic
class Dispatcher {
    Notifier n = new Notifier()
    List<String> all(List<Event> es) { es.collect { Event e -> n.on(e) } }   // on(Event) pour tous
}
```

C'est un vrai sujet en Grails 7 : beaucoup de code de framework, et souvent les services, sont compilés statiquement (`@CompileStatic`, ou `@GrailsCompileStatic` qui garde les facilités de GORM). Deux conséquences professionnelles :

- **Ne fais pas reposer une règle métier sur le dispatch dynamique** si le code a des chances d'être compilé statiquement un jour. Préfère le polymorphisme classique : une méthode sur l'événement lui-même (`event.notifyWith(notifier)`), ou une Map `Class → handler` explicite.
- **Garde les multiméthodes pour ce qui doit rester ouvert** : des opérations externes sur des types que tu ne contrôles pas (rendu, export, conversion), dans du code dynamique assumé. C'est un visiteur sans méthode `accept`.

::checkpoint{id="c3"}

## Sous le capot : comment l'appel est choisi

Groovy 4 compile chaque appel dynamique en une instruction **`invokedynamic`**. Au premier passage, le runtime demande à la `MetaClass` du receveur la méthode à appeler pour **ces classes d'arguments** précises. La `MetaClassImpl` filtre les surcharges compatibles, calcule pour chacune une **distance** entre ses paramètres et les classes réelles (combien de niveaux d'héritage, interface ou non, conversion de nombre ou non), et garde la plus petite. Pour `null`, il n'y a pas de classe à mesurer : la distance favorise le paramètre le plus général.

Le résultat est mis en **cache dans le site d'appel**, avec un test sur les classes d'arguments : tant que les mêmes types reviennent, l'appel coûte un test de type et un appel direct, que le JIT peut ensuite optimiser. Un site qui voit défiler beaucoup de types différents (on dit **mégamorphe**) refait la sélection plus souvent et reste plus lent. `@CompileStatic`, lui, émet un `invokevirtual` ordinaire vers la surcharge choisie par le compilateur : pas de MetaClass, pas de cache, et la sémantique de Java.

## Pièges fréquents

- **`equals(MaClasse)`** au lieu de `equals(Object)` : `==` et les collections Java ne sont plus d'accord. Utilise `@EqualsAndHashCode` ou redéfinis `equals(Object)` et `hashCode()`.
- **Ajouter `@CompileStatic`** à du code qui dispatche par surcharge : le comportement change sans erreur.
- **Laisser `null` choisir une surcharge** : Groovy choisit (souvent `Object`) sans prévenir.
- **Un cast « juste pour la lisibilité »** dans un appel : il impose la surcharge du type casté.
- **Croire que la surcharge choisie dépend du type de la variable** : en Groovy dynamique, c'est l'objet qui compte.

## À retenir

- Java choisit la surcharge à la compilation (type déclaré), Groovy à l'exécution (type réel).
- La surcharge la plus proche du type réel gagne ; un cast l'impose.
- `null` ne porte pas de type : ne le laisse pas choisir.
- `equals` se redéfinit avec `Object`, toujours, et avec `hashCode`.
- `@CompileStatic` choisit à la compilation, sur le type connu (déclaré, ou inféré d'une affectation visible) : vérifie tout dispatch par surcharge avant de l'ajouter.

> **Source :** *Groovy in Action*, 2e éd., sections 7.3.1 à 7.3.3 (pages 181 à 185). Comportements vérifiés sur Groovy 4.0.33.
