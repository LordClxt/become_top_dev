---
id: grails-ch00-l02
title: "Chaînes, GString, regex et nombres"
source: { book: groovy-in-action, chapter: 3, pages: "54-90" }
duration_min: 25
concepts:
  - id: grails-groovy-gstring-lazy
    label: "GString : interpolation immédiate ou paresseuse (${-> x})"
  - id: grails-groovy-string-literals
    label: "Les cinq littéraux de chaînes et leurs usages"
  - id: grails-groovy-regex
    label: "Regex : =~ (find), ==~ (match entier), ~/…/ (Pattern)"
  - id: grails-groovy-bigdecimal
    label: "Les décimaux sont des BigDecimal : exacts, et la division garde les décimales"
glossary:
  - term: "GString"
    definition: "Chaîne entre guillemets doubles contenant ${expression} ; ce n'est pas une String, mais elle s'y convertit au besoin."
  - term: "slashy string"
    definition: "Chaîne délimitée par /…/ : les antislashs n'y sont pas doublés, idéale pour les regex."
  - term: "Matcher"
    definition: "Résultat de l'opérateur =~ : on peut le parcourir, le tester avec if, ou lire ses groupes par indice."
  - term: "BigDecimal"
    definition: "Nombre décimal de précision arbitraire : type par défaut des littéraux comme 3.5 en Groovy."
visuals: []
labs: [grails-ch00-l02-lab-text]
extra: false
xp: 25
---

## Pourquoi c'est important

Les vues GSP, les messages d'erreur, les requêtes HQL, les URL mappings : tout est du texte construit à la volée. Et les prix de ton domaine sont des `BigDecimal`. Si tu te trompes sur le moment où une chaîne est évaluée, ou sur le type d'un nombre, le bug sera silencieux.

## Cinq façons d'écrire une chaîne

| Forme | Interpolation | Multi-ligne | Usage typique |
|---|---|---|---|
| `'texte'` | non | non | littéral simple, clés de map |
| `"texte ${x}"` | oui (**GString**) | non | messages, formatage |
| `'''texte'''` | non | oui | SQL, JSON fixe |
| `"""texte ${x}"""` | oui | oui | gabarits courts |
| `/texte/` | oui | oui | regex, chemins |

```groovy
def name = 'Ada'
assert "Bonjour ${name.toUpperCase()}" == 'Bonjour ADA'
assert 'Bonjour ${name}' == 'Bonjour ${name}'     // aucune interpolation
assert /\d+/ == '\\d+'                            // pas de doublement d'antislash
```

Attention : `"$a.b"` lit la **propriété** `b` de `a`. Pour afficher « $a » suivi de « .b », écris `"${a}.b"`.

Une `GString` n'est pas une `String` : `"${x}".getClass()` donne `GStringImpl`. Groovy la convertit en `String` quand c'est nécessaire (appel d'une méthode Java, clé de map…). Piège connu : **une GString utilisée comme clé de map n'est pas égale à la String correspondante** (leurs `hashCode` diffèrent). Écris `"${x}".toString()` quand une clé en dépend.

## GString : paresseuse ou non ?

Les valeurs sont **évaluées à la création** de la GString, sauf si tu mets une closure :

```groovy
def n = 1
def eager = "n vaut ${n}"
def lazy  = "n vaut ${-> n}"
n = 2
assert eager == 'n vaut 1'
assert lazy  == 'n vaut 2'
```

La flèche transforme l'expression en closure, évaluée à chaque conversion en `String`. C'est utile pour un message de log ou un gabarit qu'on prépare une fois et qu'on rend plusieurs fois. Dans le lab, tu codes exactement ça.

## Regex : trois opérateurs

```groovy
assert 'Grails 7.0' =~ /\d+\.\d+/               // find : un morceau suffit
assert !('Grails 7.0' ==~ /\d+\.\d+/)           // match : toute la chaîne
def p = ~/\d+/                                  // un Pattern compilé

def m = 'a1 b22 c333' =~ /([a-z])(\d+)/
assert m.size() == 3
assert m[1][2] == '22'                          // 2e correspondance, 2e groupe
m.each { all, letter, digits -> println "$letter -> $digits" }
```

- `=~` produit un `Matcher`. Dans un `if`, il vaut `true` s'il a trouvé quelque chose (vérité Groovy, leçon 4).
- `==~` renvoie un `boolean` et exige que la regex couvre **toute** la chaîne. Oublier cette différence est la source d'erreur numéro un.
- Quand la regex a des groupes, `each` et `collect` passent à ta closure la correspondance entière puis les groupes : les paramètres de la closure se « distribuent » dessus.
- `replaceAll(/x/) { match -> … }` accepte une closure pour calculer le remplacement.

Les classes `Pattern` sont aussi des classificateurs pour `switch` et `grep` (leçon 4).

## Les nombres sont des objets

Il n'y a pas de primitif en Groovy : `1 + 1` est `1.plus(1)`, et `3.times { … }` est un appel de méthode sur un `Integer`.

Les types retenus par les **littéraux** :

| Littéral | Type |
|---|---|
| `42` | `Integer` (puis `Long`, puis `BigInteger` si trop grand) |
| `3.5` | **`BigDecimal`** (pas `Double`) |
| `3.5d`, `3.5f` | `Double`, `Float` |
| `3.5G`, `10G` | `BigDecimal`, `BigInteger` |

La conséquence est agréable : `0.1 + 0.2 == 0.3` est **vrai**, parce que tout se calcule en décimal exact. Et `1 / 2` vaut `0.5` (un `BigDecimal`), pas `0`. Pour la division entière, utilise `intdiv`.

```groovy
assert 0.1 + 0.2 == 0.3
assert 1 / 2 == 0.5
assert 7.intdiv(2) == 3
assert 2 ** 10 == 1024
assert '3.50' as BigDecimal == 3.5
```

Quand tu mélanges les types, Groovy choisit le plus **général** (`Integer + BigDecimal` donne `BigDecimal`), sauf avec un `Double`, qui l'emporte. Pour de l'argent, ne passe jamais par `double`.

Attention aussi : `(int) '5'` donne 53 (le code du caractère), alors que `'5' as int` donne 5, et `'5'.toInteger()` aussi.

## Pièges fréquents

- **`==~` contre `=~`** : le premier exige une correspondance totale.
- **GString comme clé de map** : convertis-la en `String` avec `.toString()`.
- **`double` pour de l'argent** : écris les montants en littéraux décimaux (`BigDecimal`) et garde-les ainsi, le format (`Locale`) se fait à l'affichage.
- **`'texte' * 3`** : répète la chaîne, ce qui est pratique pour le padding mais surprend à la lecture.
- **L'égalité `==` entre `BigDecimal`** ignore l'échelle (`3.50 == 3.5`), alors que `equals` la compare : `3.50.equals(3.5)` est faux.

> **Grails 7.** Le ménage de Groovy 4 supprime des méthodes dépréciées de 2.4 ; en pratique le code de cette leçon est identique. Dans Grails, le format des nombres et des dates dans les vues dépend de la `Locale` de la requête : ne stocke jamais de texte formaté.

## À retenir

- `"…${x}"` est une **GString** évaluée tout de suite ; `"${-> x}"` est évaluée à chaque conversion.
- `=~` cherche, `==~` exige la correspondance entière, `~/…/` construit un `Pattern`.
- Les décimaux littéraux sont des `BigDecimal` : exacts, adaptés à l'argent.
- `/` donne un décimal ; `intdiv` donne l'entier.

> **Sources :** *Groovy in Action*, 2e éd., chapitre 3 (« Simple Groovy datatypes » : chaînes, GString, expressions régulières, nombres) ; *Programming Grails*, chapitre 1 pour l'usage dans les vues.
