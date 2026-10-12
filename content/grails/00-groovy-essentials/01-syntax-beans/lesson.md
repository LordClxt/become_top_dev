---
id: grails-ch00-l01
title: "Syntaxe Groovy et GroovyBeans"
source: { book: groovy-in-action, chapter: 2, pages: "28-53" }
duration_min: 25
concepts:
  - id: grails-groovy-bean
    label: "Une propriété Groovy = champ + getter + setter générés"
  - id: grails-groovy-named-ctor
    label: "Le constructeur par arguments nommés passe par les setters"
  - id: grails-groovy-assert
    label: "assert et power assert comme outil de vérification"
  - id: grails-groovy-optional-syntax
    label: "Points-virgules, parenthèses, return et types optionnels"
glossary:
  - term: "GroovyBean"
    definition: "Classe dont les champs sans modificateur de visibilité sont des propriétés : Groovy génère getter et setter."
  - term: "power assert"
    definition: "Un assert raté affiche la valeur de chaque sous-expression, ce qui évite d'ajouter des println pour comprendre."
  - term: "def"
    definition: "Déclare une variable sans type statique : son type est Object à la compilation, le vrai type est vérifié à l'exécution."
  - term: "GDK"
    definition: "Groovy Development Kit : les méthodes que Groovy ajoute aux classes du JDK (par exemple size() sur un tableau, eachLine sur un File)."
visuals: []
labs: [grails-ch00-l01-lab-beans]
extra: false
xp: 25
---

## Pourquoi c'est important

Une classe de domaine Grails ressemble à ceci :

```groovy
class Book {
    String title
    BigDecimal price
    static constraints = { title blank: false }
}
```

Pas de getter, pas de setter, pas de constructeur, pas de point-virgule. Si tu viens de Java, ce n'est pas du pseudo-code : c'est du Groovy valide, et il se compile en une vraie classe Java avec `getTitle()`, `setTitle()` et un constructeur sans argument. Comprendre **ce que le compilateur génère** te permet de prévoir le comportement de Hibernate, de la validation et du data binding plus loin dans le cours.

## Groovy est le compagnon de Java, pas un autre monde

Groovy compile vers du **bytecode JVM standard**. Une classe Groovy est une classe Java : tu peux l'appeler depuis Java, en hériter, l'implémenter. Presque tout code Java valide est aussi du Groovy valide, ce qui permet de migrer par petits pas.

Une idée à garder : Groovy n'est jamais « interprété ». Même un script lancé avec `groovy script.groovy` est d'abord compilé en classe, puis chargé par un classloader. Ce qui est dynamique, ce n'est pas la compilation, c'est le **dispatch** : chaque appel de méthode passe par la `MetaClass` de l'objet (tu y reviens au module 03).

> **Grails 7.** Grails 7 tourne sur Groovy 4 et Java 17 au minimum, contre Groovy 2.4 et Java 7/8 dans les deux livres. Les exemples de ce cours sont tous exécutés en Groovy 4.0 sur JDK 17. La syntaxe de base n'a pas changé ; ce sont les modules périphériques (XML, JSON, SQL…) qui ont été découpés en jars séparés.

## Une syntaxe qui enlève le bruit

Chaque ligne ci-dessous est valide :

```groovy
println 'Bonjour'                  // pas de parenthèses ni de point-virgule
def n = 3                          // pas de type obligatoire
String greet(String who) { "Salut ${who}" }   // return implicite : la dernière expression
assert greet('Ada') == 'Salut Ada'
```

Ce qui est **optionnel** : `;`, les parenthèses d'un appel avec au moins un argument, `return` (la dernière expression est renvoyée), `public` (tout est public par défaut), la déclaration des exceptions vérifiées, et les imports les plus courants (`java.util.*`, `java.io.*`, `java.net.*`, `groovy.lang.*`, `groovy.util.*`, `BigDecimal`, `BigInteger`).

Ce qui **ne l'est pas** : les accolades des blocs de classe et de méthode, et les parenthèses d'un appel sans argument (`list.clear()`).

## assert : ton premier outil de test

```groovy
def prices = [3.5, 2.0]
assert prices.sum() == 5.5
assert prices.size() == 3        // échoue
```

Un `assert` raté n'affiche pas seulement « Assertion failed » : il dessine l'**arbre des sous-expressions** avec leur valeur. C'est le *power assert*. Tous les tests de ce cours s'en servent, et tu peux ajouter un message : `assert x > 0, 'x doit être positif'`.

## Types optionnels, mais jamais ignorés

```groovy
def x = 'texte'
x = 42                 // permis : x est un Object
int y = 'texte'        // GroovyCastException à l'exécution
```

`def` veut dire « je ne précise pas ». Un type déclaré est **vérifié à l'exécution**. La règle du livre : dès que tu penses au type d'une variable, déclare-le, ça documente et ça aide l'IDE. Pour un paramètre de méthode publique, déclare toujours le type : il sert aussi au choix de la méthode appelée.

## Propriétés et GroovyBeans

Un champ **sans modificateur de visibilité** est une propriété :

```groovy
class Person {
    String name          // propriété : champ privé + getName() + setName()
    private int secret   // champ privé, rien de généré
    final String id = 'x' // propriété en lecture seule : getter seulement
}
def p = new Person(name: 'Ada')   // constructeur nommé
p.name = 'Grace'                  // appelle setName
assert p.name == 'Grace'          // appelle getName
```

Deux conséquences importantes :

1. **`p.name` n'accède pas au champ**, il appelle le getter. Si tu écris le tien, il est utilisé partout, aussi par `new Person(name: …)`. Pour toucher le champ en contournant le getter, écris `p.@name`, ce qu'on fait dans un setter personnalisé (`this.@price = value`).
2. Une méthode `getLabel()` **crée la propriété `label`**, même sans champ : c'est une propriété calculée. Ça ne vaut pas que pour tes classes : `file.name`, `list.empty` et `date.time` sont tous des getters déguisés.

### Le constructeur par arguments nommés

`new Person(name: 'Ada', age: 36)` n'est pas un constructeur spécial. Groovy crée l'objet avec le constructeur sans argument, puis appelle `setName` et `setAge`. Cela explique pourquoi un setter qui refuse une valeur fait échouer la construction, et pourquoi Grails peut remplir ses objets à partir des paramètres d'une requête.

### Les transformations qui évitent le code répétitif

Les annotations du paquet `groovy.transform` écrivent du code à ta place, **à la compilation** (tu verras comment au module 09) :

| Annotation | Génère |
|---|---|
| `@ToString` | `toString()` lisible (`includeNames`, `excludes`) |
| `@EqualsAndHashCode` | `equals` et `hashCode` à partir des propriétés |
| `@TupleConstructor` | un constructeur positionnel `new Point(1, 2)` |
| `@Canonical` | les trois ci-dessus |

Attention : `@ToString` énumère aussi les propriétés **calculées** (comme `label`). Utilise `excludes` quand tu ne veux pas les voir apparaître, c'est ce que le lab te fait découvrir.

## Pièges fréquents

- **Écrire `price = value` dans le setter de `price`** : selon le contexte, ça rappelle le setter et boucle. Utilise `this.@price`.
- **Croire que `def` désactive les types** : `def x = 1` puis `x.foo()` compile et échoue à l'exécution, pas à la compilation.
- **Oublier que `==` appelle `equals`** (ou `compareTo` pour les `Comparable`), alors que `is()` compare l'identité. `3.50 == 3.5` est donc vrai pour des `BigDecimal`.
- **Mettre `private` pour « protéger » un champ** et s'étonner que le code Groovy puisse quand même y accéder : en Groovy, `private` n'est pas appliqué à l'exécution (`obj.secret` fonctionne). C'est une convention, pas une barrière.

## À retenir

- Une classe Groovy est une classe Java ; le dynamisme vient du dispatch par `MetaClass`, pas d'une compilation différée.
- Un champ sans modificateur est une **propriété** ; un `getXxx()` suffit à en créer une.
- `new X(a: 1)` = constructeur vide + setters : un setter strict protège aussi la construction.
- Le *power assert* affiche chaque sous-expression : lis-le avant de déboguer autrement.

> **Sources :** *Groovy in Action*, 2e éd., chapitre 2 (« Overture: Groovy basics », classes, scripts, GroovyBeans, assertions) et chapitre 7 (champs et propriétés) ; *Programming Grails*, chapitre 1 (Groovy pour les développeurs Java). Grails 7 : exigences de plateforme, documentation officielle de Grails (docs.grails.org).
