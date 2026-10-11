---
id: ddia-ch01-l03
title: "Requêtes déclaratives, impératives et MapReduce"
source: { chapter: 2, pages: "42-48" }
duration_min: 25
concepts:
  - id: ddia-declarative-vs-imperative
    label: "Déclaratif : dire quel résultat, pas comment l'obtenir"
  - id: ddia-declarative-benefits
    label: "Le déclaratif laisse l'optimiseur réordonner, changer d'index et paralléliser"
  - id: ddia-mapreduce-model
    label: "MapReduce : map émet des paires clé-valeur, reduce agrège par clé"
  - id: ddia-pure-functions
    label: "Map et reduce doivent être des fonctions pures"
  - id: ddia-aggregation-pipeline
    label: "Les pipelines d'agrégation réinventent SQL"
glossary:
  - term: "requête déclarative"
    definition: "Spécifie le motif des données voulues (conditions, tri, regroupement) sans dire comment les trouver. Exemples : SQL, CSS, XPath."
  - term: "requête impérative"
    definition: "Une suite d'instructions exécutées dans un ordre précis : boucles, conditions, variables mutées."
  - term: "MapReduce"
    definition: "Modèle de traitement de gros volumes : une fonction map émet des paires (clé, valeur) pour chaque document, une fonction reduce agrège toutes les valeurs d'une même clé."
  - term: "fonction pure"
    definition: "N'utilise que ses arguments et n'a aucun effet de bord : on peut l'exécuter n'importe où, dans n'importe quel ordre, et la relancer après une panne."
  - term: "pipeline d'agrégation"
    definition: "Langage déclaratif à base de JSON (MongoDB) enchaînant $match, $group… : un sous-ensemble de SQL en syntaxe différente."
visuals: []
labs: [ddia-ch01-l03-lab-mapreduce-design]
xp: 25
---

## Pourquoi c'est important

SQL a survécu à presque tous ses concurrents parce qu'il est **déclaratif**. Savoir ce que cela autorise (et ce qu'un code impératif interdit) explique pourquoi une base peut devenir plus rapide sans que tu changes une ligne de tes requêtes. Et MapReduce, avec ses deux fonctions, est un bon exemple du compromis entre les deux styles.

## Déclaratif contre impératif

Pour sélectionner les requins dans une liste d'animaux, voici la version **impérative** :

```go
func sharks(animals []Animal) []Animal {
    var out []Animal
    for _, a := range animals {
        if a.Family == "Sharks" {
            out = append(out, a)
        }
    }
    return out
}
```

En algèbre relationnelle : `sharks = σ_family="Sharks"(animals)`. SQL en est proche : `SELECT * FROM animals WHERE family = 'Sharks';`.

Le code impératif dit à l'ordinateur d'exécuter des opérations dans un ordre précis. Une requête **déclarative** décrit seulement **le motif** du résultat : quelles conditions, quel tri, quel regroupement, sans l'algorithme. C'est à l'**optimiseur** de choisir index, méthodes de jointure et ordre d'exécution.

Trois avantages :

1. **Concision** : plus court et plus facile que l'API impérative.
2. **Liberté d'implémentation** : la base peut réorganiser son stockage (récupérer de l'espace, déplacer des lignes) sans casser les requêtes. Une requête impérative peut dépendre de l'ordre des éléments, la base ne peut jamais en être sûre. Le fait que SQL soit **plus limité** laisse plus de place aux optimisations automatiques.
3. **Parallélisme** : les processeurs gagnent en nombre de cœurs, pas en fréquence. Du code impératif, qui impose un ordre d'instructions, est très difficile à répartir sur plusieurs cœurs ou machines ; un motif de résultat peut être exécuté en parallèle librement.

### Même idée dans le navigateur

Pour mettre en bleu le titre de la page sélectionnée, CSS suffit : `li.selected > p { background-color: blue; }`. Avec l'API DOM impérative, il faut parcourir les éléments et poser le style à la main. Les problèmes de la version impérative : si la classe `selected` disparaît, **le bleu reste** (le navigateur ne le retire pas) alors que CSS le retire tout seul ; et pour profiter d'une nouvelle API plus rapide, **tu réécris le code**, alors que les navigateurs améliorent CSS et XPath sans rien casser. Même moralité pour les bases : le déclaratif a battu les API impératives d'IMS et CODASYL.

## MapReduce

**MapReduce** est un modèle de traitement en masse popularisé par Google, repris sous une forme limitée par MongoDB et CouchDB pour des requêtes en lecture seule sur beaucoup de documents (le modèle complet est vu au module sur le traitement par lots). Ce n'est ni déclaratif ni vraiment impératif : la logique est écrite sous forme de **fragments de code appelés à répétition** par le framework.

Exemple : compter les requins observés par mois. En SQL :

```sql
SELECT date_trunc('month', observation_timestamp) AS month, sum(num_animals)
FROM observations WHERE family = 'Sharks' GROUP BY month;
```

En MapReduce :

- `map` est appelée **une fois par document** retenu, et **émet** `(clé, valeur)`, par exemple `("1995-12", 3)` ;
- le framework **regroupe** les paires par clé ;
- `reduce` est appelée **une fois par clé** avec toutes ses valeurs, par exemple `reduce("1995-12", [3, 4])` → `7`.

En Go générique, la signature ressemble à :

```go
func MapReduce[In, V, Out any](
    docs []In,
    mapFn func(doc In, emit func(key string, value V)),
    reduceFn func(key string, values []V) Out,
) map[string]Out
```

### Des fonctions pures

`map` et `reduce` doivent être **pures** : elles n'utilisent que leurs arguments, ne font pas de requête supplémentaire et n'ont pas d'effet de bord. C'est ce qui permet à la base de les exécuter **n'importe où, dans n'importe quel ordre**, et de les **relancer en cas de panne**. Elles restent puissantes : parser des chaînes, appeler des bibliothèques, calculer.

### Pourquoi les pipelines d'agrégation ?

Il faut écrire **deux fonctions soigneusement coordonnées**, ce qui est souvent plus dur qu'une seule requête, et un langage déclaratif laisse plus de place à l'optimiseur. MongoDB 2.2 a donc ajouté le **pipeline d'agrégation** : `[{$match: {family: "Sharks"}}, {$group: {_id: {year, month}, totalAnimals: {$sum: "$numAnimals"}}}]`. Il est comparable à un sous-ensemble de SQL avec une syntaxe JSON. Moralité du livre : **un système NoSQL peut se retrouver à réinventer SQL sans le dire**.

> **Au-delà du livre.** Ce pipeline « filtrer puis grouper puis agréger » est exactement la forme que tu retrouveras en Go avec `slices`, en Spark, dans les « streams » Java ou dans une requête SQL. Reconnaître cette forme est plus utile que n'importe quelle syntaxe.

## Pièges fréquents

- **Écrire un `map` avec effet de bord** (compteur global, appel réseau) : le framework peut le rejouer ou l'exécuter sur plusieurs machines, ton résultat devient faux.
- **Supposer un ordre** des valeurs reçues par `reduce` ou des clés produites.
- **Croire que MapReduce est le seul moyen de distribuer une requête** : SQL peut aussi être exécuté sur un cluster.
- **Garder une boucle impérative quand une requête déclarative existe** : tu perds optimisations et parallélisme.

## À retenir

- Déclaratif = quel résultat ; impératif = comment. Le premier laisse à la base la liberté d'optimiser, de réorganiser et de paralléliser.
- `map` émet des paires, le framework regroupe par clé, `reduce` agrège chaque groupe.
- `map` et `reduce` doivent être des fonctions pures.
- Un pipeline d'agrégation JSON dit la même chose que SQL.
