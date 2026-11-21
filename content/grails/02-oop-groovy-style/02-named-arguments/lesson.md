---
id: grails-ch02-l02
title: "Arguments nommés, valeurs par défaut et varargs"
source: { book: groovy-in-action, chapter: 7, pages: "168-175, 197-198" }
duration_min: 35
concepts:
  - id: grails-named-args-map
    label: "Les arguments nommés sont regroupés dans une Map passée en premier paramètre, où qu'ils soient dans l'appel"
  - id: grails-named-args-silent-typo
    label: "Une clé mal orthographiée dans une Map d'options est ignorée sans erreur : il faut valider les clés"
  - id: grails-named-args-typed
    label: "@NamedParam et @NamedVariant déclarent les clés admises : erreur à la compilation (@TypeChecked) ou à l'exécution"
  - id: grails-default-params-overloads
    label: "Une valeur par défaut de paramètre génère une surcharge par paramètre optionnel"
  - id: grails-params-coercion
    label: "Les valeurs venues de HTTP sont des String : les convertir et les borner avant de s'en servir"
  - id: grails-spread-varargs
    label: "Varargs (Object... ou tableau en dernier), spread *liste dans les arguments, *:map dans les arguments nommés"
glossary:
  - term: "argument nommé"
    definition: "Paire clé: valeur dans un appel (save(flush: true)). Groovy les regroupe dans une Map : ce sont les clés d'une Map, pas de vrais noms de paramètres."
  - term: "Map d'options"
    definition: "Paramètre Map qui reçoit les arguments nommés d'une méthode : list(max: 10, sort: 'title')."
  - term: "surcharge"
    definition: "Plusieurs méthodes de même nom avec des listes de paramètres différentes."
  - term: "varargs"
    definition: "Paramètre final qui accepte un nombre variable d'arguments, reçus sous forme de tableau."
visuals: []
labs: [grails-ch02-l02-lab-pager]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Qu'affiche ce script ?"
    code: |
      def mail(Map opts, String to) { "${opts.subject}|${opts.cc}|$to" }
      println mail('ana@x.io', subject: 'Facture', cc: 'compta@x.io')
    answer: "Facture|compta@x.io|ana@x.io"
    explanation: "Les arguments nommés sont regroupés dans une Map passée en premier, même s'ils sont écrits après la chaîne. L'appel devient mail([subject: …, cc: …], 'ana@x.io')."
    concept: grails-named-args-map
  - id: c2
    type: single
    prompt: "Un domaine invalide est sauvé avec `book.save(failOnErorr: true)` (faute de frappe). Que se passe-t-il, vérifié sur GORM 7 ?"
    choices:
      - "Une ValidationException, comme avec la bonne clé"
      - "Une MissingPropertyException sur la clé inconnue"
      - "save renvoie null sans exception : la clé inconnue est ignorée, et le livre n'est pas enregistré"
      - "Le livre est enregistré malgré la validation"
    answer: 2
    explanation: "save lit des clés précises dans sa Map d'options. failOnErorr n'en fait pas partie, elle est ignorée : on retombe sur le comportement par défaut (null si invalide). Rien ne prévient du bug."
    concept: grails-named-args-silent-typo
  - id: c3
    type: code-output
    prompt: "Qu'affiche ce script ?"
    code: |
      class Report {
          def render(String title, String format = 'pdf', boolean draft = false) { "$title.$format draft=$draft" }
      }
      println Report.declaredMethods.findAll { it.name == 'render' }.size()
      println new Report().render('ventes', 'csv')
    answer: "3\nventes.csv draft=false"
    explanation: "Deux paramètres optionnels génèrent trois méthodes : render(title), render(title, format) et render(title, format, draft). Les versions courtes appellent la complète avec les valeurs par défaut."
    concept: grails-default-params-overloads
---

## Pourquoi c'est important

Dans un contrôleur Grails, tu enregistres un livre ainsi :

```groovy
book.save(failOnErorr: true)   // faute de frappe : « Erorr »
```

Le livre est invalide (titre vide). Avec la bonne clé, `failOnError`, GORM lèverait une `ValidationException` et ta transaction serait annulée. Avec la faute de frappe, **rien** : `save` renvoie `null`, aucune exception, aucun avertissement, et le livre n'est pas enregistré. Nous l'avons vérifié sur GORM 7.2. La suite du code croit que tout va bien.

Deux lignes plus loin, la pagination :

```groovy
Book.list(max: params.max)     // ?max=abc → ConversionFailedException (erreur 500)
                               // ?max=1000000 → un million de lignes chargées en mémoire
```

Grails est truffé d'arguments nommés : `save(flush: true)`, `list(max: 10, sort: 'title')`, `render(view: 'show', model: [book: b])`, `redirect(action: 'show', id: b.id)`. Pour les écrire **et** pour concevoir les tiens, tu dois savoir ce qu'ils sont vraiment : les clés d'une Map. Cette leçon te montre comment les recevoir, les valider et les convertir.

## Les arguments nommés sont une Map

La JVM ne connaît pas les arguments nommés. Groovy les simule : toutes les paires `clé: valeur` d'un appel sont **regroupées dans une seule Map**, passée **en premier** paramètre.

```groovy
def send(Map opts, String to) {
    "à $to, sujet ${opts.subject}, copie ${opts.cc ?: 'personne'}"
}

send(subject: 'Facture', 'ana@x.io')           // la Map passe en premier…
send('ana@x.io', subject: 'Facture', cc: 'b')  // … même écrite après
```

La position des paires dans l'appel n'a aucune importance : elles finissent toutes dans la même Map, en tête. C'est le piège que tu as rencontré au boss du module 01 (`get '/users', to: 'user#index'` arrive comme `get([to: …], '/users')`).

::checkpoint{id="c1"}

Pour un **constructeur**, c'est différent. `new Book(title: 'x')` sans constructeur Map explicite appelle le constructeur sans argument, puis le **setter** de chaque clé. Une clé inconnue y lève donc une `MissingPropertyException`. Pour une méthode, rien de tel : la Map est une Map, elle accepte n'importe quelle clé.

## Le danger : la clé mal orthographiée

Une méthode qui lit `opts.failOnError` ne voit jamais `opts.failOnErorr`. Elle ne sait pas non plus qu'il fallait la refuser. C'est le seul vrai défaut des arguments nommés, et il est grave, parce qu'il est silencieux.

::checkpoint{id="c2"}

Dans ta propre API, refuse explicitement les clés inconnues, en nommant les clés admises dans le message :

```groovy
private static final Set<String> KEYS = ['max', 'offset', 'sort', 'order'] as Set

static List page(Map opts = [:], List items) {
    def unknown = opts.keySet() - KEYS
    if (unknown) throw new IllegalArgumentException("options inconnues : $unknown (admises : $KEYS)")
    …
}
```

Groovy propose deux annotations qui font ce travail pour toi :

```groovy
import groovy.transform.*

@TypeChecked
class Pager {
    static String page(@NamedParam(value = 'max', type = Integer)
                       @NamedParam(value = 'offset', type = Integer) Map opts, List items) { … }

    static String use() { page(mx: 5, [1, 2]) }   // erreur de COMPILATION : unexpected named arg: mx
}
```

- **`@NamedParam`** documente les clés d'une Map d'options et leur type. Avec `@TypeChecked` ou `@CompileStatic`, le compilateur refuse une clé inconnue ou un type faux.
- **`@NamedVariant`** sur une méthode à paramètres ordinaires génère une variante qui accepte une Map : `page(max: 5)` appelle `page(5, 0, 'id')`. Une clé inconnue y lève une `AssertionError` (`Unrecognized namedArgKey: mx`) à l'exécution.

> **Au-delà du livre** : `@NamedParam`, `@NamedVariant` et `@NamedDelegate` sont arrivés avec Groovy 2.5, après *Groovy in Action*. Elles comblent le défaut principal des Map d'options.

## Les valeurs par défaut sont des surcharges

```groovy
class Report {
    def render(String title, String format = 'pdf', boolean draft = false) { … }
}
```

Groovy ne connaît pas non plus les paramètres optionnels au niveau de la JVM. Il génère **une méthode par paramètre optionnel** : `render(title)`, `render(title, format)` et `render(title, format, draft)`. Les versions courtes appellent la version complète avec les valeurs par défaut.

::checkpoint{id="c3"}

Deux conséquences pratiques :

- depuis **Java**, ces trois méthodes sont visibles et appelables : c'est une API propre ;
- une valeur par défaut peut **entrer en collision** avec une surcharge que tu écris à la main. `render(String title, String format)` existe déjà : la redéclarer ne compile pas.

Combiner les deux mécanismes donne l'idiome des API Grails, une Map d'options **optionnelle** en tête :

```groovy
static List page(Map opts = [:], List items) { … }

page(items)                       // opts = [:]
page(max: 5, sort: 'title', items)
```

## Les valeurs venues de HTTP sont des String

Dans un contrôleur, `params` est une Map de chaînes : `params.max` vaut `'10'`, `'abc'` ou rien. La passer telle quelle à `list(max: …)` est une erreur doublement dangereuse : `'abc'` fait planter la conversion, et `'1000000'` charge un million de lignes.

La règle : **convertir, avec une valeur par défaut, puis borner**.

```groovy
int max    = Math.min(params.int('max', 10), 100)   // 10 si max est absent ou vaut 'abc'
int offset = Math.max(params.int('offset', 0), 0)
Book.list(max: max, offset: offset)
```

`params.int('max', 10)` est une méthode de la `GrailsParameterMap` de Grails : elle renvoie la valeur par défaut si la clé manque ou n'est pas un entier. Hors de Grails, tu écris la même chose avec `String.isInteger()` et `toInteger()`.

> **En production :** borne toujours `max` côté serveur. Une API publique qui accepte `max` sans plafond est un déni de service à portée d'URL.

## Varargs et spread

Trois outils complètent la panoplie.

- **Varargs** : un dernier paramètre `Object...` (ou un tableau `Object[]`) reçoit les arguments en trop, sous forme de tableau.

```groovy
def tag(String name, Object... classes) { "<$name class='${classes.join(' ')}'>" }
tag('div')                     // classes vide
tag('div', 'card', 'shadow')
```

- **Spread d'une liste** : `*liste` répartit une liste sur les paramètres positionnels, `sum(*[1, 2, 3])`.
- **Spread d'une Map** : `*:map` répartit une Map dans les arguments nommés. C'est l'idiome des **options par défaut surchargées** :

```groovy
def defaults = [max: 10, sort: 'id']
Book.list(*:defaults, max: 50)     // [max: 50, sort: 'id'] : la clé écrite après gagne
```

## Sous le capot : ce que voit le compilateur

Quand `groovyc` rencontre `send('ana@x.io', subject: 'Facture')`, il construit dans l'arbre syntaxique une **`MapExpression`** avec toutes les paires nommées, et la place en **premier argument** de l'appel. À l'exécution, c'est une `LinkedHashMap` ordinaire : la méthode ne peut pas savoir que l'appelant a écrit des paires plutôt qu'une Map littérale `send([subject: 'Facture'], 'ana@x.io')`. Les deux appels sont identiques en bytecode.

Pour un constructeur sans constructeur Map déclaré, l'appel est résolu dynamiquement : la `MetaClass` crée l'objet par son constructeur sans argument, puis appelle `setProperty` pour chaque clé. D'où l'exception sur une clé inconnue, et d'où le passage par les setters vu à la leçon 01.

Les annotations `@NamedParam` ne changent rien à l'exécution : ce sont des métadonnées que le **vérificateur de types** lit pour contrôler les clés. `@NamedVariant` est une transformation AST qui **génère du code** : une méthode `page(Map)` avec une assertion sur chaque clé, qui appelle la méthode d'origine.

## Pièges fréquents

- **Faute de frappe dans une clé** (`failOnErorr`, `flsuh`) : ignorée en silence par la méthode. Valide les clés de tes propres API.
- **Chercher les arguments nommés à leur position** : ils sont toujours dans la Map, en premier.
- **Passer `params.max` brut à GORM** : chaîne non convertie (erreur 500) ou valeur sans plafond (DoS).
- **Redéclarer une surcharge déjà générée par une valeur par défaut** : erreur de compilation.
- **Modifier la Map d'options reçue** : c'est celle de l'appelant. Copie-la (`[:] + opts`) avant d'y ajouter des défauts.

## À retenir

- `f(a: 1, x)` = `f([a: 1], x)` : une Map, en premier, quel que soit l'ordre d'écriture.
- Une clé inconnue est ignorée par une méthode, refusée par un constructeur. Valide tes clés, ou déclare-les avec `@NamedParam` / `@NamedVariant`.
- Chaque paramètre optionnel génère une surcharge.
- Tout ce qui vient de HTTP est une `String` : convertir, mettre une valeur par défaut, borner.
- `*liste` et `*:map` répartissent une collection dans les arguments.

> **Source :** *Groovy in Action*, 2e éd., sections 7.1.2, 7.1.4 et 7.5.2 (pages 168 à 175 et 197 à 198). Comportement de GORM vérifié sur Grails 7.2.4.
