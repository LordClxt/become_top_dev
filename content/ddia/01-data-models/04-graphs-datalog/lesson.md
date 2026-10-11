---
id: ddia-ch01-l04
title: "Graphes, Cypher, SPARQL et Datalog"
source: { chapter: 2, pages: "49-62" }
duration_min: 40
concepts:
  - id: ddia-property-graph
    label: "Graphe de propriétés : sommets, arêtes étiquetées, propriétés"
  - id: ddia-variable-length-traversal
    label: "Parcours de longueur variable (WITHIN*0..)"
  - id: ddia-recursive-cte
    label: "Requêtes de graphe en SQL avec WITH RECURSIVE"
  - id: ddia-triple-store
    label: "Triple-store : (sujet, prédicat, objet)"
  - id: ddia-datalog-rules
    label: "Datalog : faits, règles et application jusqu'au point fixe"
  - id: ddia-graph-vs-network
    label: "Un graphe n'est pas CODASYL"
glossary:
  - term: "graphe de propriétés (property graph)"
    definition: "Sommets (identifiant, propriétés, arêtes entrantes et sortantes) reliés par des arêtes (identifiant, sommet de queue, sommet de tête, étiquette, propriétés)."
  - term: "sommet de queue / de tête"
    definition: "Le sommet où une arête commence (queue) et celui où elle finit (tête)."
  - term: "Cypher"
    definition: "Langage déclaratif de requête de graphes de propriétés, créé pour Neo4j : `(a)-[:WITHIN*0..]->(b)`."
  - term: "triple-store"
    definition: "Base où toute information est un triplet (sujet, prédicat, objet) ; équivalente en substance au graphe de propriétés."
  - term: "SPARQL"
    definition: "Langage de requête des triple-stores RDF, antérieur à Cypher dont il a inspiré la syntaxe de motifs."
  - term: "Datalog"
    definition: "Langage de règles logiques, ancêtre de SPARQL et Cypher : on définit de nouveaux prédicats dérivés à partir de faits et d'autres règles."
  - term: "point fixe"
    definition: "État où appliquer de nouveau toutes les règles ne produit plus aucun fait nouveau."
visuals: []
labs: [ddia-ch01-l04-lab-graph-design]
xp: 40
---

## Pourquoi c'est important

Quand les relations plusieurs-à-plusieurs sont partout (réseaux sociaux, routes, recommandations, hiérarchies de lieux), le document est maladroit et le relationnel alourdi. Le **graphe** est alors le modèle le plus naturel. Cette leçon te montre comment on le stocke, comment on l'interroge, et pourquoi une requête qui prend 4 lignes dans un langage en prend 29 dans un autre.

## Le graphe de propriétés

Un graphe est fait de **sommets** (*vertices*, nœuds, entités) et d'**arêtes** (*edges*, relations). Exemples : personnes qui se connaissent, pages web et liens, carrefours et routes. Des algorithmes connus s'y appliquent (plus court chemin, PageRank). Les sommets peuvent aussi être **hétérogènes** : Facebook garde dans un seul graphe personnes, lieux, événements, check-ins et commentaires.

Dans le **graphe de propriétés** (Neo4j, Titan) :

- un **sommet** a : un identifiant, ses arêtes sortantes et entrantes, des propriétés (clé-valeur) ;
- une **arête** a : un identifiant, un sommet de **queue**, un sommet de **tête**, une **étiquette** décrivant la relation, des propriétés.

On peut le stocker avec deux tables relationnelles : `vertices(vertex_id, properties)` et `edges(edge_id, tail_vertex, head_vertex, label, properties)`, avec des index sur `tail_vertex` **et** `head_vertex`. Conséquences importantes :

1. Un sommet peut être relié à **n'importe quel** autre : aucun schéma ne restreint ce qui peut être associé.
2. On retrouve efficacement les arêtes **entrantes et sortantes** d'un sommet : on parcourt le graphe dans les deux sens.
3. Des **étiquettes** différentes permettent de ranger plusieurs sortes d'informations dans un même graphe, avec un modèle propre.

Le graphe est bon pour l'**évolutivité** : ajouter une fonctionnalité revient à ajouter des sommets et des arêtes. Il exprime facilement ce qui est lourd en relationnel : structures régionales différentes selon les pays (départements et régions en France, comtés et États aux États-Unis), granularité variable (résidence connue à la ville, naissance connue seulement à l'État).

## Cypher

**Cypher** est déclaratif. Il crée des données avec une notation en flèches :

```
CREATE
  (NAmerica:Location {name:'North America', type:'continent'}),
  (USA:Location {name:'United States', type:'country'}),
  (Idaho:Location {name:'Idaho', type:'state'}),
  (Lucy:Person {name:'Lucy'}),
  (Idaho) -[:WITHIN]-> (USA) -[:WITHIN]-> (NAmerica),
  (Lucy) -[:BORN_IN]-> (Idaho)
```

Et il interroge par motif. « Trouver les personnes nées aux États-Unis qui vivent en Europe » :

```
MATCH
  (person) -[:BORN_IN]->  () -[:WITHIN*0..]-> (us:Location {name:'United States'}),
  (person) -[:LIVES_IN]-> () -[:WITHIN*0..]-> (eu:Location {name:'Europe'})
RETURN person.name
```

`:WITHIN*0..` signifie « suis une arête `WITHIN` **zéro fois ou plus** », comme l'étoile d'une expression régulière. C'est indispensable : le lieu de naissance peut être une ville, un département ou un État, et il faut remonter une **hiérarchie de profondeur inconnue**. Le **nombre de sauts n'est pas fixé d'avance**.

Autre point : la requête ne dit pas par où commencer. Le moteur peut balayer toutes les personnes, ou partir des deux lieux (via un index sur `name`), descendre les arêtes `WITHIN` entrantes, puis remonter aux personnes. Comme pour tout langage déclaratif, l'optimiseur choisit.

## Le même problème en SQL

On peut le faire en SQL depuis SQL:1999 avec les **expressions de table communes récursives** (`WITH RECURSIVE`) : un ensemble `in_usa` initialisé par le sommet « United States », étendu par jointure avec les arêtes `within` jusqu'à ce qu'aucune nouvelle ne s'ajoute, de même pour `in_europe`, puis des jointures pour garder les personnes dans les deux ensembles. Résultat : **29 lignes de SQL contre 4 de Cypher**. Ce n'est pas un défaut de SQL : chaque modèle de données répond à des cas d'usage précis, il faut choisir celui qui convient à l'application.

## Triple-stores et SPARQL

Le **triple-store** est en substance le même modèle avec d'autres mots. Toute information est un triplet **(sujet, prédicat, objet)**, par exemple `(Jim, likes, bananas)`. Le sujet est un sommet. L'objet est soit :

1. une **valeur** primitive : alors prédicat et objet sont la clé et la valeur d'une propriété du sujet, comme `(lucy, age, 33)` ;
2. **un autre sommet** : le prédicat est une arête, comme `(lucy, marriedTo, alain)`.

En format **Turtle** : `_:lucy a :Person; :name "Lucy"; :bornIn _:idaho.` Le **web sémantique** (RDF) voulait publier ces données lisibles par machine sur tout Internet ; il a déçu en pratique, mais le triple-store reste un bon modèle interne. Pour que deux jeux de données ne se heurtent pas, les prédicats RDF sont souvent des **URI** (`<urn:example:within>`), de simples espaces de noms.

**SPARQL** est encore plus concis que Cypher :

```
SELECT ?personName WHERE {
  ?person :name ?personName.
  ?person :bornIn  / :within* / :name "United States".
  ?person :livesIn / :within* / :name "Europe".
}
```

## Un graphe, ce n'est pas CODASYL

Ressemblance trompeuse : les bases de graphes ne sont pas CODASYL ressuscité.

- CODASYL avait un **schéma** précisant quel type d'enregistrement peut s'imbriquer dans quel autre ; dans un graphe, **n'importe quel sommet** peut avoir une arête vers n'importe quel autre ;
- en CODASYL, on n'atteint un enregistrement que par un **chemin d'accès** ; dans un graphe, on désigne un sommet par son **identifiant** ou on le trouve via un **index** ;
- en CODASYL, les enfants forment un **ensemble ordonné** que la base doit maintenir ; dans un graphe, sommets et arêtes ne sont **pas ordonnés** (on trie le résultat à la requête) ;
- les requêtes CODASYL étaient **impératives** et fragiles ; dans un graphe on peut écrire un parcours impératif, mais la plupart des bases proposent un langage **déclaratif** (Cypher, SPARQL).

## Datalog

**Datalog** est bien plus ancien (étudié dans les années 1980) et sert de **fondation** aux langages suivants. Utilisé par Datomic, et par Cascalog sur Hadoop. Le modèle est celui du triple-store, écrit `prédicat(sujet, objet)` :

```
name(namerica, 'North America').   type(namerica, continent).
name(usa, 'United States').        within(usa, namerica).
name(idaho, 'Idaho').              within(idaho, usa).
name(lucy, 'Lucy').                born_in(lucy, idaho).
```

Puis on définit des **règles**, qui créent de nouveaux prédicats **dérivés** :

```
within_recursive(Location, Name) :- name(Location, Name).            /* règle 1 */
within_recursive(Location, Name) :- within(Location, Via),           /* règle 2 */
                                    within_recursive(Via, Name).
migrated(Name, BornIn, LivingIn) :- name(Person, Name),              /* règle 3 */
                                    born_in(Person, BornLoc),
                                    within_recursive(BornLoc, BornIn),
                                    lives_in(Person, LivingLoc),
                                    within_recursive(LivingLoc, LivingIn).
?- migrated(Who, 'United States', 'Europe').
```

Les mots en **majuscule** sont des **variables**. Une règle **s'applique** si tous les prédicats à droite de `:-` trouvent une correspondance ; c'est alors comme si la partie gauche (avec les variables remplacées) était **ajoutée à la base**. On applique les règles en boucle :

1. `name(namerica, 'North America')` existe : la règle 1 produit `within_recursive(namerica, 'North America')` ;
2. `within(usa, namerica)` + le fait précédent : la règle 2 produit `within_recursive(usa, 'North America')` ;
3. `within(idaho, usa)` + le fait précédent : `within_recursive(idaho, 'North America')`.

On répète **jusqu'au point fixe** : quand plus aucun fait nouveau n'est produit, c'est fini. Les règles se **composent et se réutilisent** comme des fonctions (même récursives) : moins pratique pour une requête ponctuelle, mais plus à l'aise quand les données sont complexes. Tu écriras ce moteur dans le boss de ce module.

## Pièges fréquents

- **Oublier le cas zéro saut** (`*0..`) : un lieu de naissance qui *est* directement le pays ne serait plus trouvé.
- **Boucler à l'infini** sur un graphe qui contient un cycle : marque les sommets visités.
- **Confondre propriété et arête** en triple-store : tout dépend de si l'objet est une valeur ou un sommet.
- **Mettre en graphe des données qui sont en fait un arbre** : un document ou deux tables suffisent, et c'est plus simple.

## À retenir

- Le graphe convient quand « tout est potentiellement relié à tout » ; document pour l'inverse (peu de relations entre enregistrements).
- Graphe de propriétés et triple-store disent la même chose avec des mots différents.
- Le parcours de longueur variable (`*0..`, `WITH RECURSIVE`, `:within*`) est la difficulté clé de l'interrogation d'un graphe.
- Datalog construit les réponses par règles appliquées jusqu'au point fixe ; Cypher et SPARQL en sont des descendants.
- Aucun modèle n'est universel : un modèle peut en émuler un autre, mais souvent de façon maladroite.
