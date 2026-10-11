---
id: ddia-ch01-l01
title: "Relationnel ou document : arbres, références et normalisation"
source: { chapter: 2, pages: "27-35" }
duration_min: 30
concepts:
  - id: ddia-data-model-layers
    label: "Un modèle de données est une couche qui impose des hypothèses d'usage"
  - id: ddia-impedance-mismatch
    label: "Le décalage d'impédance entre objets et tables"
  - id: ddia-one-to-many-tree
    label: "Les relations un-à-plusieurs forment un arbre : le document les rend explicites"
  - id: ddia-normalization
    label: "Normaliser = stocker une information signifiante pour un humain à un seul endroit"
  - id: ddia-many-to-many
    label: "Les relations plusieurs-à-un et plusieurs-à-plusieurs exigent des références et des jointures"
glossary:
  - term: "modèle relationnel"
    definition: "Proposé par Codd en 1970 : les données sont des relations (tables), chacune une collection non ordonnée de tuples (lignes)."
  - term: "modèle document"
    definition: "Chaque enregistrement est un document auto-contenu (JSON, XML, BSON) qui imbrique ses sous-éléments."
  - term: "décalage d'impédance (impedance mismatch)"
    definition: "Désaccord entre le modèle objet du code et le modèle tables/lignes/colonnes, qui impose une couche de traduction (ORM)."
  - term: "normalisation"
    definition: "Retirer la duplication : l'information porteuse de sens pour les humains est stockée une fois, le reste y renvoie par un identifiant."
  - term: "clé étrangère / référence de document"
    definition: "Identifiant d'un enregistrement stocké ailleurs, résolu à la lecture par une jointure ou une requête supplémentaire."
  - term: "polyglot persistence"
    definition: "Utiliser plusieurs types de bases côte à côte, chacune pour le cas d'usage qui lui convient."
visuals: []
labs: [ddia-ch01-l01-lab-normalize-design]
xp: 30
---

## Pourquoi c'est important

Le choix d'un modèle de données précède le choix d'une base. Il décide de ce qui sera **facile** à écrire, **rapide** à lire et **pénible** à changer. Avant de te demander « Postgres ou MongoDB ? », il faut savoir quelle forme ont tes données : un arbre autonome, un réseau de références, ou autre chose. Cette leçon te donne le vocabulaire et la grille de lecture.

## Des couches de modèles

Une application empile des modèles, et chaque couche se définit en termes de la couche du dessous :

1. Le monde réel (personnes, commandes, capteurs) devient des **objets et structures** du code.
2. Ces structures sont exprimées dans un modèle **général** : tables, documents JSON/XML ou graphe.
3. L'équipe de la base décide comment représenter ce modèle en **octets** en mémoire, sur disque, sur le réseau (c'est le chapitre suivant du livre, ton prochain module).
4. Plus bas encore, le matériel.

Chaque couche cache la complexité de celle d'en dessous. Mais **chaque modèle embarque des hypothèses d'usage** : certaines opérations sont naturelles, d'autres maladroites ou lentes. D'où l'importance de choisir le bon.

## Relationnel, NoSQL et polyglot persistence

Le **modèle relationnel** (Codd, 1970) range les données en tables de lignes. D'abord un pari théorique que beaucoup jugeaient inefficace, il domine depuis environ 25 à 30 ans, parce qu'il s'est révélé étonnamment général : de la comptabilité aux réseaux sociaux.

**NoSQL** n'est pas une technologie : c'est le mot-clic d'un meetup de 2009, ensuite relu comme « Not Only SQL ». Les moteurs de son adoption :

- une scalabilité (jeux de données énormes, débit d'écriture élevé) plus facile à atteindre ;
- une préférence pour le logiciel libre ;
- des opérations de requête spécialisées mal servies par le relationnel ;
- la frustration face à des schémas jugés trop rigides.

Conséquence probable : des bases relationnelles **et** non relationnelles côte à côte, c'est la **polyglot persistence**.

## Le décalage d'impédance

Le code est orienté objet, la base est en tables : il faut une couche de traduction. Les **ORM** (ActiveRecord, Hibernate) réduisent le code répétitif mais ne cachent pas complètement la différence.

Prenons un CV (profil LinkedIn). Le prénom et le nom apparaissent une fois par personne : deux colonnes de `users`. Mais une personne a **plusieurs postes**, plusieurs formations, plusieurs moyens de contact : c'est une relation **un-à-plusieurs**. En relationnel classique, on met chaque famille dans une table à part avec une clé étrangère vers `users` (c'est le *shredding*, le « déchiquetage » du document). Alternatives : types structurés ou JSON dans une colonne.

En JSON, tout le profil tient dans un seul objet :

```json
{
  "user_id": 251, "first_name": "Ada", "last_name": "Lovelace",
  "positions": [
    {"job_title": "Analyste", "organization": "Maison Babbage"},
    {"job_title": "Autrice", "organization": "Éditions Taylor"}
  ],
  "contact_info": {"blog": "https://ada.example"}
}
```

L'avantage : la **localité**. Une lecture, un document. L'arbre des relations un-à-plusieurs (le profil au sommet, les postes en feuilles) est visible dans la structure même, alors qu'en relationnel il faut plusieurs requêtes ou une jointure à plusieurs branches.

## Plusieurs-à-un : pourquoi des identifiants ?

Dans l'exemple, la région et le secteur sont des **identifiants** (`"region_id": "fr:75"`) et non du texte (`"Paris"`). Raisons de standardiser avec une liste :

- style et orthographe cohérents ;
- pas d'ambiguïté (plusieurs villes de même nom) ;
- **mise à jour facile** : le nom n'est stocké qu'à un endroit ;
- traduction possible dans la langue du lecteur ;
- meilleure recherche (la liste sait que Paris est en France).

Stocker un identifiant ou un texte, c'est une question de **duplication**. Un identifiant n'a aucun sens pour un humain, donc il n'a jamais besoin de changer. Tout ce qui a du sens pour un humain peut changer un jour ; si l'information est copiée partout, il faut toutes les mettre à jour : écritures en plus, **risque d'incohérence** si l'on en oublie une. Supprimer cette duplication, c'est la **normalisation**.

> **Règle pratique.** Si tu dupliques une valeur qui pourrait n'être stockée qu'une fois, ton schéma n'est pas normalisé. Les distinctions fines entre formes normales ont peu d'intérêt pratique.

### Le point faible du document

La normalisation crée des relations **plusieurs-à-un** (beaucoup de personnes vivent dans une région) et, avec la suite des fonctionnalités, **plusieurs-à-plusieurs**. Elles s'adaptent mal au modèle document :

- les jointures y sont absentes ou faibles ; il faut les **émuler** dans le code applicatif par plusieurs requêtes ;
- les données ont tendance à devenir de plus en plus **interconnectées** quand le produit grandit.

Exemples tirés du livre : faire des organisations et des écoles des **entités** (page propre, logo) que les CV référencent ; ajouter des **recommandations** d'un utilisateur à un autre, où le nom et la photo de l'auteur doivent suivre ses mises à jour. Une recommandation doit donc **référencer** le profil de son auteur. Le document garde les sous-éléments imbriqués, mais les références vers organisations, écoles et utilisateurs demandent des jointures.

## Pièges fréquents

- **Dupliquer du texte au lieu d'un identifiant** : le jour où « Facebook » devient « Meta », il y a mille copies à corriger.
- **Choisir le document parce que « sans schéma c'est plus simple »** sans avoir regardé les relations plusieurs-à-plusieurs à venir.
- **Croire qu'un ORM supprime le décalage** : il le déplace dans une couche de code.
- **Émuler des jointures en boucle côté application** (une requête par élément) : lent ; voir le devoir du module.

## Au-delà du livre

Le problème du « N+1 » est la version quotidienne de la jointure émulée : une requête pour la liste, puis une par élément. La parade est de **regrouper** les identifiants et de les résoudre en une seule requête. Tu le mesureras dans le devoir.

## À retenir

- Chaque modèle de données embarque des hypothèses d'usage ; choisis-le d'après la forme de tes données.
- Un arbre autonome d'un-à-plusieurs, lu d'un seul bloc : le document brille.
- Plusieurs-à-un et plusieurs-à-plusieurs : références, donc jointures, donc le relationnel (ou le graphe) est plus naturel.
- Normaliser, c'est stocker une fois l'information porteuse de sens et y renvoyer par identifiant.
- Un document qui référence ressemble à une clé étrangère : l'identifiant est résolu à la lecture.
