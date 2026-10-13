---
id: grails-ch00-l03
title: "Listes, maps, ranges et GPath"
source: { book: groovy-in-action, chapter: 4, pages: "91-116" }
duration_min: 25
concepts:
  - id: grails-groovy-list-map
    label: "Listes et maps littérales, opérateurs et méthodes du GDK"
  - id: grails-groovy-range
    label: "Les ranges sont des objets : bornes, exclusion, parcours, classification"
  - id: grails-groovy-copy-vs-mutate
    label: "Méthodes qui modifient le receveur ou qui renvoient une copie"
  - id: grails-groovy-spread-gpath
    label: "Spread *. et GPath pour extraire une propriété de toute une liste"
glossary:
  - term: "range"
    definition: "Objet qui représente une suite de valeurs entre deux bornes : 1..5 (inclusif), 1..<5 (borne haute exclue)."
  - term: "opérateur spread"
    definition: "Écriture liste*.propriété : appelle la propriété ou la méthode sur chaque élément et rassemble les résultats."
  - term: "GPath"
    definition: "Navigation dans un graphe d'objets avec la notation pointée, y compris à travers des listes (order.items*.price)."
  - term: "withDefault"
    definition: "Méthode qui rend une map capable de fabriquer la valeur d'une clé absente (par exemple une liste vide)."
visuals: []
labs: [grails-ch00-l03-lab-colls]
extra: false
xp: 25
---

## Pourquoi c'est important

Les méthodes de GORM renvoient des listes (`Book.list()`, `findAllByAuthor`), les `params` d'un contrôleur sont une map, et les modèles passés aux vues sont des maps. Presque tout le code de ton application passe son temps à filtrer, regrouper, trier et transformer des collections. Le GDK te donne pour ça une boîte à outils très complète, avec **un piège central** : certaines méthodes modifient la collection, d'autres en renvoient une copie.

## Listes

```groovy
def list = [1, 2, 3, 4, 5]
assert list[0] == 1 && list[-1] == 5          // index négatif : depuis la fin
assert list[1..3] == [2, 3, 4]                // tranche
assert list + [6] == [1, 2, 3, 4, 5, 6]       // nouvelle liste
list << 6                                     // ajoute EN PLACE
assert list - [2, 3] == [1, 4, 5, 6]
assert list*.multiply(2) == [2, 4, 6, 8, 10, 12]
```

Les méthodes à connaître d'emblée : `each`, `collect` (map), `findAll` (filter), `find`, `inject` (reduce), `any`, `every`, `sum`, `max`, `min`, `unique`, `flatten`, `groupBy`, `countBy`, `collectEntries`, `sort`, `reverse`, `take`, `drop`, `join`.

```groovy
def names = ['ada', 'grace', 'linus']
assert names.collect { it.capitalize() } == ['Ada', 'Grace', 'Linus']
assert names.findAll { it.size() > 3 } == ['grace', 'linus']
assert names.inject(0) { acc, n -> acc + n.size() } == 13
```

### Copie ou modification : le piège principal

```groovy
def l = [3, 1, 2]
def sorted = l.sort()          // modifie l ET renvoie la même liste
assert l.is(sorted) && l == [1, 2, 3]

def l2 = [3, 1, 2]
def copy = l2.sort(false)      // copie triée
assert l2 == [3, 1, 2]
assert l2.toSorted() == [1, 2, 3]   // équivalent, depuis Groovy 2.4
```

`sort`, `unique`, `reverse` n'ont pas la même discipline : pour chacun, vérifie dans la documentation du GDK s'il modifie le receveur, et quel est le paramètre `mutate` quand il existe. En cas de doute, travaille sur `l.toList()` ou utilise la variante qui renvoie une copie. C'est aussi pourquoi les tests du lab vérifient la liste d'origine.

Autre piège : **modifier une liste pendant qu'on la parcourt** lève `ConcurrentModificationException`, même sans thread. Construis une nouvelle liste ou utilise `removeAll { … }`.

## Maps

```groovy
def m = [name: 'Ada', age: 36]      // clés = String sans guillemets
assert m.name == 'Ada' && m['age'] == 36
m.city = 'Londres'                  // ajoute
assert m.get('zip', '00000') == '00000'   // valeur par défaut, et l'insère
def key = 'dyn'
def m2 = [(key): 1]                 // parenthèses : clé = la valeur de key
assert m2 == [dyn: 1]
assert [*:m, age: 37].age == 37     // spread de map : copie puis remplace
```

Une map littérale est une `LinkedHashMap`, donc **l'ordre d'insertion est conservé**. `each` accepte une closure à un paramètre (l'entrée, avec `.key` et `.value`) ou à deux paramètres (clé, valeur). Le module 01 montre comment une méthode choisit entre les deux.

`withDefault` évite le test « la clé existe-t-elle ? » :

```groovy
def groups = [:].withDefault { [] }
['a1', 'b1', 'a2'].each { groups[it[0]] << it }
assert groups == [a: ['a1', 'a2'], b: ['b1']]
```

Dans Grails, `params` est une map : `params.id`, `params.max`, avec les conversions `params.int('max')`. Tu reconstruiras cette idée au projet.

## Ranges

```groovy
assert (1..5).toList() == [1, 2, 3, 4, 5]
assert (1..<5).toList() == [1, 2, 3, 4]
assert (5..1).toList() == [5, 4, 3, 2, 1]        // inversé
assert ('a'..'e').contains('c')
assert 3 in 1..5                                  // classification
```

Un range est un objet (`IntRange`) qui implémente `List` : tu peux le parcourir, le découper, le passer à `each`. Toute classe qui fournit `next()`, `previous()` et `compareTo` peut servir de borne. Les ranges sont aussi des **classificateurs** pour `switch` et `grep` (leçon 4).

## Spread et GPath

```groovy
def orders = [[id: 1, items: [[price: 5], [price: 7]]],
              [id: 2, items: [[price: 3]]]]
assert orders*.id == [1, 2]
assert orders.items.price.flatten().sum() == 15    // GPath
```

`*.` appelle la propriété sur chaque élément et rassemble les résultats. `orders.items` (sans étoile) fait la même chose pour une liste de maps ou d'objets. C'est le raccourci que tu retrouves dans les vues GSP et dans les rendus JSON/XML.

> **Grails 7.** Ces méthodes du GDK existent à l'identique en Groovy 4. Comme Grails 7 tourne sur JDK 17, les fabriques `List.of(…)` et `Map.of(…)` du JDK sont disponibles : elles renvoient des collections **immuables** (`UnsupportedOperationException` à l'écriture), à ne pas confondre avec les listes littérales Groovy, modifiables.

## Pièges fréquents

- **`sort()` qui modifie la liste d'origine** (voir plus haut).
- **`[:]` contre `[]`** : une map vide s'écrit `[:]`. `{}` est une closure.
- **Clé de map sans guillemets** : `[a: 1]` a la clé `'a'` (String), pas la valeur de la variable `a`. Pour la valeur, `[(a): 1]`.
- **`list.remove(1)` contre `list.remove(Integer)`** : sur une `List<Integer>`, le premier retire l'indice 1. Utilise `list - [1]` ou `list.removeElement(1)`.
- **Test de vide** : `if (list)` est faux pour une liste vide (vérité Groovy, leçon suivante).

## À retenir

- `[]` liste, `[:]` map, `1..5` range : les trois sont des objets du GDK.
- Chaque méthode a une discipline : modifie le receveur ou renvoie une copie. Vérifie-la.
- `*.` et GPath extraient une propriété de toute une liste.
- `groupBy`, `countBy`, `collectEntries` et `withDefault` remplacent la plupart des boucles de regroupement.

> **Sources :** *Groovy in Action*, 2e éd., chapitre 4 (« Working with collective datatypes » : ranges, listes, maps) ; *Programming Grails*, chapitre 1 (collections) et chapitre 3 (le rôle de `params`).
