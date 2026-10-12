## Contexte

Dans Grails, `person.validate()` lit le bloc `static constraints` de la classe `Person` et applique les règles à l'instance. Tu construis cette brique pour **Minigrails**. Le `Validator` écrit au lab est fourni (il marche déjà pour les contraintes simples) ; tu écris `Domain.groovy` et tu étends `Validator.groovy`.

## Jalon 1 : `Domain.validate(Object instance)`

Trouve la closure `constraints` de la classe de `instance` (`instance.getClass().constraints`), construis le `Validator` et valide les **propriétés de l'instance**. Une classe sans `constraints` donne une liste vide.

⚠️ La closure `constraints` est un **champ statique partagé** par toutes les instances. Si tu changes son `delegate`, tu la modifies pour tout le monde. Travaille sur une **copie** (`closure.rehydrate(delegate, owner, thisObject)`), dans `Validator.build`.

## Jalon 2 : la contrainte `validator:`

```groovy
password validator: { pwd, acct -> pwd != acct.username }
```

Comme dans GORM (cf. *Programming Grails*, ch. 3), une closure personnalisée peut avoir :

| Paramètres | Reçoit | Retour |
|---|---|---|
| 1 | `(valeur)` | `true`/`null` : valide · `false` : `champ.validator` · une `String` : ce code d'erreur |
| 2 | `(valeur, objet)` | idem |
| 3 | `(valeur, objet, erreurs)` | la closure ajoute elle-même ses codes à `erreurs` ; le retour est ignoré |

Elle s'exécute après les autres contraintes du champ, et seulement si la valeur n'est pas `null`. `validate` reçoit donc l'objet en second paramètre optionnel. Pour choisir comment appeler la closure, regarde son **arité** (leçon 1).

## Jalon 3 : listes

`Domain.validateAll(Collection)` renvoie `index -> erreurs` pour les objets invalides seulement. `Domain.valid(Collection)` renvoie les objets valides.
