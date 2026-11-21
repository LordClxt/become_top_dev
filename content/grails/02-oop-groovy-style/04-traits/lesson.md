---
id: grails-ch02-l04
title: "Traits : composer des capacités, comme Grails"
source: { book: groovy-in-action, chapter: 7, pages: "183-187" }
duration_min: 40
concepts:
  - id: grails-trait-state-behavior
    label: "Un trait apporte méthodes ET état ; chaque instance a son propre état"
  - id: grails-trait-conflict-order
    label: "Conflit entre traits : le dernier déclaré dans implements gagne ; Trait.super.m() choisit explicitement ; la classe gagne sur ses traits"
  - id: grails-trait-super-stacking
    label: "super dans un trait appelle le trait suivant vers la gauche, puis la classe mère : les traits s'empilent comme des décorateurs"
  - id: grails-trait-abstract-contract
    label: "Une méthode abstraite de trait exige une capacité de la classe qui l'implémente"
  - id: grails-trait-runtime
    label: "as Trait et withTraits appliquent un trait à l'exécution, via un proxy qui n'est plus de la classe d'origine"
  - id: grails-sam-coercion
    label: "Une closure est convertie en interface ou trait à une seule méthode abstraite (SAM)"
  - id: grails-trait-grails-artefacts
    label: "Grails 7 construit ses artefacts avec des traits : Controller, GormEntity, Service, ControllerUnitTest"
glossary:
  - term: "trait"
    definition: "Unité de comportement réutilisable (méthodes, propriétés, état) qu'une classe ajoute avec implements, sans héritage de classe."
  - term: "capacité"
    definition: "Un comportement indépendant du métier (être persistant, horodaté, audité) qu'on veut partager entre classes sans lien d'héritage."
  - term: "SAM"
    definition: "Single Abstract Method : interface ou trait qui n'a qu'une méthode abstraite, comme Runnable ou Comparator."
  - term: "proxy"
    definition: "Objet généré qui se fait passer pour un autre et lui transmet les appels."
visuals: [grails-ch02-trait-stack]
labs: [grails-ch02-l04-lab-capabilities]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Qu'affiche ce script ?"
    code: |
      trait Persistent { String save() { 'enregistré' } }
      trait Audited    { String save() { 'audité' } }
      class Ticket implements Persistent, Audited {}
      class Comment implements Audited, Persistent {}
      println new Ticket().save()
      println new Comment().save()
    answer: "audité\nenregistré"
    explanation: "En cas de conflit, le trait déclaré en dernier dans implements gagne. Inverser l'ordre de la liste change le comportement, sans erreur ni avertissement."
    concept: grails-trait-conflict-order
  - id: c2
    type: code-output
    prompt: "Chaque trait appelle super. Qu'affiche ce script ?"
    code: |
      class Base { String speak() { 'salut' } }
      trait Bracket { String speak() { '[' + super.speak() + ']' } }
      trait Excited { String speak() { super.speak() + '!' } }
      class A extends Base implements Bracket, Excited {}
      class B extends Base implements Excited, Bracket {}
      println new A().speak()
      println new B().speak()
    answer: "[salut]!\n[salut!]"
    explanation: "Le dernier trait s'exécute en premier ; son super appelle le trait à sa gauche, puis la classe mère. Pour A : Excited(Bracket(Base)) ; pour B : Bracket(Excited(Base))."
    concept: grails-trait-super-stacking
  - id: c3
    type: single
    prompt: "`def b = new Book(title: 'x') as HasId`. Que vaut `b instanceof Book` ?"
    choices:
      - "true : as ajoute le trait à l'objet existant"
      - "false : as crée un proxy d'une nouvelle classe, qui implémente HasId mais n'est plus un Book"
      - "Une ClassCastException"
      - "true, mais seulement si Book est final"
    answer: 1
    explanation: "as Trait (comme withTraits) génère une classe proxy qui implémente le trait et transmet les appels à l'objet d'origine. Le résultat n'est plus un Book : instanceof et les surcharges qui attendent Book ne le reconnaissent plus."
    concept: grails-trait-runtime
---

## Pourquoi c'est important

Dans une app Grails 7, tu écris :

```groovy
@Entity
class Book { String title }

book.save()
Book.findByTitle('Groovy in Action')
```

`Book` n'hérite de rien et ne déclare ni `save` ni `findByTitle`. D'où viennent-elles ? D'un **trait**, `GormEntity<Book>`, que la transformation AST de GORM ajoute à chaque classe de domaine. Même chose pour les contrôleurs, qui reçoivent le trait `Controller` (`render`, `redirect`, `params`), pour les services avec le trait `Service`, et pour tes tests avec `ControllerUnitTest<BookController>`. Comprendre les traits, c'est pouvoir lire le code de Grails et savoir ce que fait chaque méthode « magique ».

Le bug qu'ils peuvent causer est discret. Deux traits qui définissent la même méthode, et c'est **l'ordre de la liste `implements`** qui décide laquelle s'exécute. Un collègue réordonne la liste « pour faire propre », et l'audit de tes tickets cesse d'être écrit.

## Un trait : des méthodes et de l'état

Une **capacité** comme « être persistant » ou « être horodaté » n'a rien à voir avec le métier d'un ticket. L'héritage force à choisir une seule classe mère ; une interface Java (même avec des méthodes `default`) ne peut pas porter d'état. Un trait apporte les deux :

```groovy
trait Timestamped {
    Date lastUpdated                       // une propriété : de l'état, par instance
    void touch() { lastUpdated = new Date() }
}

trait Audited {
    List<String> log = []
    void audit(String what) { log << what }
}

class Ticket implements Timestamped, Audited {
    String title
}

def t = new Ticket(title: 'Imprimante')
t.touch(); t.audit('créé')
assert t instanceof Audited
```

Chaque instance a **son propre** `log` : la liste initialisée dans le trait est créée pour chaque objet, pas partagée. Une classe qui implémente un trait est aussi de son type : `t instanceof Audited` est vrai, et tu peux typer une variable ou un paramètre `Audited`.

## Les conflits : le dernier déclaré gagne

Quand deux traits définissent la même méthode, Groovy ne se plaint pas : le trait **déclaré en dernier** dans `implements` gagne.

::checkpoint{id="c1"}

Trois règles résolvent tous les cas :

1. Une méthode **écrite dans la classe** gagne toujours sur celles de ses traits.
2. Entre traits, **le dernier déclaré** gagne.
3. Pour choisir explicitement, la classe redéfinit la méthode et appelle `NomDuTrait.super.methode()` :

```groovy
class Ticket implements Persistent, Audited {
    String save() { Audited.super.save(); Persistent.super.save() }   // les deux, dans l'ordre voulu
}
```

> **Attention :** l'ordre de `implements` fait partie du comportement. Dès que deux traits partagent un nom de méthode, rends le choix explicite (règle 3) plutôt que de compter sur l'ordre.

## Empiler des traits avec super

Dans un trait, `super.methode()` n'appelle pas forcément la classe mère : il appelle **le trait suivant vers la gauche** dans `implements`, et la classe mère seulement au bout de la chaîne. Chaque trait peut donc ajouter son comportement autour des autres, comme une pile de décorateurs :

```groovy
trait Persistent  { String save() { 'save' } }
trait Timestamped { String save() { lastUpdated = new Date(); 'horodaté > ' + super.save() } }
trait Audited     { String save() { 'audité > ' + super.save() } }

class Ticket implements Persistent, Timestamped, Audited { Date lastUpdated }
new Ticket().save()   // 'audité > horodaté > save'
```

Lis la liste de droite à gauche : `Audited` s'exécute d'abord et appelle `Timestamped`, qui appelle `Persistent`. Choisis l'ordre des traits, et regarde la chaîne d'appels se reconstruire :

::visual{id="grails-ch02-trait-stack"}

::checkpoint{id="c2"}

## Exiger une capacité de la classe

Un trait peut déclarer une méthode **abstraite** : toute classe qui l'implémente doit la fournir. Le trait écrit le comportement général, la classe fournit le détail. C'est le patron de méthode, sans héritage :

```groovy
trait Describable {
    abstract String getName()
    String describe() { "${getClass().simpleName} : $name" }
}

class User implements Describable { String name }   // la propriété name fournit getName()
assert new User(name: 'ana').describe() == 'User : ana'
```

Dans le trait, `this` désigne l'**instance de la classe** qui l'implémente : `getClass()` renvoie `User`, pas le trait.

## Appliquer un trait à l'exécution

Tu peux aussi ajouter un trait à un objet existant, sans toucher à sa classe :

```groovy
def legacy = new Book(title: 'x')
def entity = legacy.withTraits(HasId, Audited)   // ou : legacy as HasId
assert entity instanceof HasId
assert !(entity instanceof Book)                 // le prix de la souplesse
```

`as Trait` et `withTraits` créent un **proxy** : une nouvelle classe, générée à la volée, qui implémente les traits et transmet les autres appels à l'objet d'origine. Le résultat **n'est plus un `Book`** : `instanceof`, un paramètre typé `Book` ou une surcharge `on(Book)` ne le reconnaissent plus.

::checkpoint{id="c3"}

## Closures et interfaces à une méthode

Un dernier outil, très utilisé avec les traits et les API Java : une closure peut tenir lieu d'une interface ou d'un trait qui n'a qu'**une seule méthode abstraite** (un type **SAM**).

```groovy
trait Rule {
    abstract boolean check(String value)
    boolean checkAll(List<String> values) { values.every { check(it) } }
}

Rule notBlank = { String s -> s?.trim() as boolean }   // la closure devient le check
assert notBlank.checkAll(['a', 'b'])

new Thread({ println 'tâche' }).start()                // Runnable, même principe
```

Depuis Groovy 2.2, la conversion est implicite dès que le type attendu est SAM : affectation à une variable typée, passage à un paramètre typé. Mais **pas dans une collection** : `List<Rule> rules = [{ … }]` garde des closures, parce que les génériques ne sont pas vérifiés à l'exécution, et `rules[0].check('x')` lève une `MissingMethodException`. Convertis chaque élément (`{ … } as Rule`). Pour une interface à plusieurs méthodes, une **Map de closures** convertie avec `as` fait un bouchon de test rapide : `[find: { id -> null }, save: { it }] as BookRepository`.

## Les traits de Grails 7

Tu as maintenant de quoi lire le cœur de Grails. Vérifié sur Grails 7.2.4 avec `javap`, ce sont tous des traits :

| Trait | Ajouté à | Apporte |
|---|---|---|
| `grails.artefact.Controller` | chaque contrôleur | `render`, `redirect`, `params`, `request`, `session`, `bindData` (et `respond`, par un second trait, `RestResponder`) |
| `org.grails.datastore.gorm.GormEntity<D>` | chaque classe `@Entity` | `save`, `delete`, `validate`, `get`, `list`, `where`, les finders dynamiques |
| `grails.artefact.Service` | chaque service | la publication d'événements (`notify`, `sendAndReceive`) |
| `grails.testing.web.controllers.ControllerUnitTest<C>` | tes specs Spock | `controller`, `params`, `request`, `response` |

`GormEntity` s'empile elle-même sur d'autres traits (`GormValidateable`, `DirtyCheckable` : celui qui détecte les modifications dans les setters, leçon 01). Quand Grails ajoute ces traits, il le fait à la **compilation**, par transformation AST : tu le verras en détail au module 04.

## Sous le capot : ce que devient un trait

Compile `trait Audited { List log = []; String save() { … } }` et une classe `A implements Audited`, puis lis le résultat avec `javap -p` :

- `Audited.class` est une **interface Java** : c'est ce qui permet `instanceof Audited` et le typage.
- `Audited$Trait$Helper.class` contient le **code** des méthodes, sous forme de méthodes statiques qui reçoivent l'instance en paramètre.
- `Audited$Trait$FieldHelper.class` décrit les **champs** du trait.
- Dans `A`, le compilateur **copie** un champ privé `Audited__log` (nom préfixé pour éviter les collisions entre traits), écrit `save()` qui délègue au helper, et ajoute des méthodes `Auditedtrait$super$save()` qui servent à chaîner `super`.

Deux conséquences pratiques. D'abord, le code d'un trait est **copié dans chaque classe à la compilation** : modifier un trait impose de recompiler les classes qui l'implémentent (Gradle le fait pour toi, mais pas un jar déjà livré). Ensuite, les champs étant renommés et accédés par des méthodes générées, certaines formes ne sont pas prises en charge : `count++` sur une propriété de trait **ne compile pas** (« Postfix expressions on trait fields/properties are not supported in traits »). Écris `count += 1`. L'exemple `version++` de *Groovy in Action* (listing 7.18) ne compile donc plus en Groovy 4.

> **Au-delà du livre** : les champs `static` d'un trait sont dupliqués **par classe** qui l'implémente. Un compteur statique dans un trait compte séparément pour `A` et pour `B`.

## Pièges fréquents

- **Réordonner `implements`** quand deux traits partagent une méthode : le comportement change en silence.
- **Croire que `super` dans un trait vise la classe mère** : il vise d'abord le trait à gauche.
- **`obj as Trait` puis `instanceof ClasseDOrigine`** : faux, c'est un proxy.
- **`count++` sur une propriété de trait** : erreur de compilation, utilise `count += 1`.
- **Un trait qui suppose une méthode de la classe sans la déclarer `abstract`** : l'erreur n'apparaît qu'à l'exécution.
- **`List<Rule> rules = [{ … }]`** : les closures ne sont pas converties en `Rule` ; écris `{ … } as Rule`.

## À retenir

- Un trait = une interface + du code + de l'état, copiés dans chaque classe qui l'implémente.
- Conflit : la classe gagne, puis le dernier trait déclaré ; `T.super.m()` pour choisir.
- `super` dans un trait remonte la liste `implements` de droite à gauche, puis la classe mère.
- `abstract` dans un trait = une capacité exigée de la classe.
- `as` / `withTraits` : un proxy, qui n'est plus de la classe d'origine.
- Une closure remplace un type SAM.
- Grails 7 = des traits partout : `Controller`, `GormEntity`, `Service`, `ControllerUnitTest`.

> **Source :** *Groovy in Action*, 2e éd., section 7.3.4 et l'encadré sur les types SAM (pages 183 à 187). Traits de Grails vérifiés sur Grails 7.2.4.
