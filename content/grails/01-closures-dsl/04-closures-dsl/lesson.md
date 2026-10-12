---
id: grails-ch01-l04
title: "Un DSL en 20 lignes : le bloc constraints"
source: { book: groovy-in-action, chapter: 8, pages: "204-207" }
duration_min: 30
concepts:
  - id: grails-dsl-method-missing
    label: "methodMissing : un objet qui accepte des appels de méthode qu'il ne déclare pas"
  - id: grails-dsl-builder-delegate
    label: "Un DSL = une closure + un builder en delegate"
  - id: grails-dsl-command-syntax
    label: "name blank: false se lit name([blank: false]) : appel sans parenthèses, avec arguments nommés"
glossary:
  - term: "DSL"
    definition: "Langage dédié à un domaine : ici une syntaxe lisible (celle d'un bloc de closure) qui exprime des règles métier."
  - term: "methodMissing"
    definition: "Méthode spéciale appelée par Groovy quand on invoque une méthode qui n'existe pas sur l'objet."
  - term: "builder"
    definition: "Objet qui reçoit les appels d'une closure DSL et construit une structure de données à partir d'eux."
  - term: "arguments nommés"
    definition: "Écriture nom: valeur dans un appel ; Groovy les regroupe dans une Map passée en premier argument."
visuals: [grails-ch01-closure-scope]
labs: [grails-ch01-l04-lab-constraints]
extra: false
xp: 30
---

## Pourquoi c'est important

Dans une classe de domaine Grails, tu écris :

```groovy
class Thing {
    String cardNumber
    String color
    String email

    static constraints = {
        cardNumber creditCard: true, blank: false
        color inList: ['Red', 'Green', 'Blue']
        email unique: true, size: 5..100
    }
}
```

Aucune de ces trois lignes ne correspond à une méthode de `Thing`. Pourtant le tout fonctionne, et même si tu fais une faute de frappe sur un nom de champ, **Grails te dit laquelle**. Ce n'est pas de la magie de compilateur : c'est une closure, un `delegate` et `methodMissing`. Tu vas les assembler toi-même.

## Lire la syntaxe

Remets les parenthèses :

```groovy
static constraints = {
    cardNumber(creditCard: true, blank: false)
    color(inList: ['Red', 'Green', 'Blue'])
    email(unique: true, size: 5..100)
}
```

Ce sont des **appels de méthode ordinaires**, avec une `Map` d'arguments nommés. Groovy permet d'omettre les parenthèses d'un appel qui a au moins un argument : `cardNumber creditCard: true` est `cardNumber([creditCard: true])`.

## `methodMissing` : accepter n'importe quel nom

Quand on appelle une méthode qui n'existe pas, Groovy cherche une méthode `methodMissing(String name, Object args)` sur l'objet, et l'appelle avec le nom demandé et les arguments.

```groovy
class Pretender {
    def methodMissing(String name, Object args) {
        "appelé $name avec $args"
    }
}
assert new Pretender().hello('monde') == 'appelé hello avec [monde]'
```

C'est ainsi que les *finders dynamiques* de GORM fonctionnent : `Album.findByArtist('Oscar Peterson')` n'existe nulle part, mais une classe de domaine intercepte l'appel et lit le nom de la méthode pour fabriquer la requête. Dans *Groovy in Action*, un « MiniGorm » de quelques lignes montre le principe.

## Assembler le DSL

Il manque une pièce : **où** les appels de la closure arrivent-ils ? Grâce à la leçon précédente, tu connais la réponse : sur son **delegate**.

```groovy
class RuleBuilder {
    final Map rules = [:]

    def methodMissing(String field, Object args) {
        rules[field] = args[0] as Map      // field = nom de la « méthode », args = la map des contraintes
    }
}

def build(Closure spec) {
    def builder = new RuleBuilder()
    spec.delegate = builder
    spec.resolveStrategy = Closure.DELEGATE_FIRST
    spec()
    builder.rules
}

def rules = build {
    name  blank: false, size: 2..10
    age   range: 0..150
}
assert rules.name == [blank: false, size: 2..10]
```

Trois ingrédients :

1. un **builder** qui implémente `methodMissing` ;
2. la closure reçoit ce builder comme **delegate**, avec `DELEGATE_FIRST` ;
3. on **exécute** la closure ; chaque ligne devient un appel que le builder enregistre.

Tout ce que fait ensuite Grails (valider un objet, créer les colonnes, ajouter `unique`) vient de **ce que le builder a enregistré**.

## Valider avec les règles enregistrées

Une fois les règles collectées dans une structure de données, la validation est un simple parcours : pour chaque champ, pour chaque contrainte, une petite vérification qui produit un code d'erreur du type `age.range`. Les contraintes de GORM suivent cette convention de codes (`className.propertyName.constraint`), qui permet de retrouver le message dans les fichiers i18n. Deux détails à connaître, et que tu coderas :

- par défaut, **une propriété ne peut pas être `null`** (`nullable: false` implicite) ;
- `blank` ne concerne que les chaînes.

## Pièges fréquents

- **Oublier de fixer le delegate** : les noms de champs sont alors cherchés sur l'owner et lèvent `MissingMethodException`.
- **Un champ qui porte le nom d'une méthode existante** (`size`, `class`…) est résolu sur le mauvais objet. Avec `DELEGATE_FIRST`, c'est le builder qui gagne ; c'est pourquoi les builders sérieux déclarent aussi leurs propres méthodes.
- **`methodMissing` sur une classe interne statique** est refusé par le compilateur de Groovy 4 (« synthetic version of methodMissing »). Déclare ton builder comme classe de premier niveau.
- **Pas de contrôle des noms** : un builder qui accepte tout accepte aussi les fautes. Valide les contraintes connues et refuse le reste, comme le fait Grails au démarrage.

## À retenir

- Un DSL Groovy, c'est **une closure + un builder en `delegate`** (avec `methodMissing` pour accepter les noms libres).
- `champ contrainte: valeur` est un appel de méthode avec arguments nommés (une `Map`).
- Le builder **enregistre** ; un autre code **interprète** ce qui a été enregistré.

> **Sources :** *Groovy in Action*, 2e éd., chapitre 8 (section 8.3.1, `methodMissing` et le « MiniGorm ») et chapitre 19 (arguments nommés et chaînes de commandes) ; *Programming Grails*, chapitre 1 (« Owner, Delegate, and this ») et chapitre 3 (« Data Validation »).
