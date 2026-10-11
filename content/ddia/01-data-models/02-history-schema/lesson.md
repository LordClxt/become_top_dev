---
id: ddia-ch01-l02
title: "Histoire, schéma à la lecture et localité"
source: { chapter: 2, pages: "36-42" }
duration_min: 30
concepts:
  - id: ddia-hierarchical-network
    label: "Hiérarchique (IMS) et réseau (CODASYL) : les chemins d'accès écrits à la main"
  - id: ddia-relational-optimizer
    label: "Le relationnel rend les chemins d'accès automatiques grâce à l'optimiseur de requêtes"
  - id: ddia-model-choice
    label: "Choisir le modèle d'après les relations : document, relationnel ou graphe"
  - id: ddia-schema-on-read
    label: "Schema-on-read contre schema-on-write"
  - id: ddia-data-locality
    label: "Localité : lire un document entier est rapide, le réécrire entier est coûteux"
  - id: ddia-convergence
    label: "Les bases relationnelles et documentaires convergent"
glossary:
  - term: "modèle hiérarchique (IMS)"
    definition: "Toutes les données sont un arbre d'enregistrements imbriqués : bon pour l'un-à-plusieurs, pénible pour le plusieurs-à-plusieurs, sans jointure."
  - term: "modèle réseau (CODASYL)"
    definition: "Généralisation du hiérarchique où un enregistrement peut avoir plusieurs parents, relié par des pointeurs que l'on suit via des chemins d'accès."
  - term: "chemin d'accès (access path)"
    definition: "Chaîne de liens à suivre depuis un enregistrement racine pour atteindre un autre enregistrement. En CODASYL, le programmeur la choisit à la main."
  - term: "optimiseur de requêtes"
    definition: "Composant qui choisit automatiquement l'ordre d'exécution et les index d'une requête déclarative."
  - term: "schema-on-read"
    definition: "La structure des données est implicite et interprétée seulement à la lecture (comparable au typage dynamique)."
  - term: "schema-on-write"
    definition: "Le schéma est explicite et la base vérifie à l'écriture que tout y est conforme (comparable au typage statique)."
visuals: []
labs: [ddia-ch01-l02-lab-schema-on-read-design]
xp: 30
---

## Pourquoi c'est important

Les bases de documents ont ressuscité un débat de 1970. Reconnaître les mêmes problèmes sous un nouveau nom t'évite de refaire des erreurs. Et la question « schéma ou pas ? » est plus subtile qu'elle n'en a l'air : le schéma existe toujours, la seule question est **où** il vit.

## L'histoire se répète

Dans les années 1970, IBM **IMS** (conçu pour les stocks du programme Apollo) utilisait le **modèle hiérarchique** : tout est un arbre d'enregistrements imbriqués, comme du JSON. Comme les bases de documents, il gérait bien l'un-à-plusieurs et mal le plusieurs-à-plusieurs, et n'offrait pas de jointure : les développeurs devaient **dupliquer** (dénormaliser) ou **suivre les références à la main**. Voilà les problèmes que rencontrent les équipes avec un document aujourd'hui.

Deux solutions s'affrontèrent pendant la « grande controverse » des années 1970 : le **modèle réseau (CODASYL)** et le **modèle relationnel**.

### Le modèle réseau

Dans CODASYL, un enregistrement peut avoir **plusieurs parents** : un enregistrement « Seattle » relie tous les utilisateurs qui y vivent. Les liens ressemblent à des **pointeurs** de langage de programmation, stockés sur disque. Pour atteindre un enregistrement, on suit un **chemin d'accès** depuis une racine, avec un curseur qui parcourt des listes. Quand plusieurs chemins mènent au même enregistrement, le programmeur doit tous les garder en tête : même le comité CODASYL comparait cela à naviguer dans un espace à *n* dimensions. Les chemins optimisaient le matériel de l'époque (bandes magnétiques), mais rendaient le code de requête et de mise à jour **rigide** : changer le modèle de données obligeait à réécrire le code.

### Le modèle relationnel

À l'inverse, le relationnel **met tout à plat** : une table est un ensemble de lignes, sans structure imbriquée ni chemin à suivre. On peut lire n'importe quelles lignes selon n'importe quelle condition, insérer une ligne sans se soucier des références.

Surtout, l'**optimiseur de requêtes** choisit **automatiquement** l'ordre et les index : ce sont les « chemins d'accès », mais décidés par la machine, pas par le développeur. Pour interroger autrement, on déclare un nouvel index et les requêtes l'utilisent d'elles-mêmes. L'idée clé : on construit un optimiseur **une fois**, et toutes les applications en profitent. Écrire à la main le chemin d'une requête est plus simple que de construire un optimiseur général, mais **la solution générale gagne à long terme**.

### Et les bases de documents ?

Elles ont repris du hiérarchique le stockage des enregistrements imbriqués dans leur parent. Pour le plusieurs-à-un et le plusieurs-à-plusieurs, **relationnel et document ne diffèrent pas fondamentalement** : l'élément lié est désigné par un identifiant (clé étrangère ou référence de document), résolu à la lecture par une jointure ou une requête supplémentaire. Les bases de documents n'ont pas suivi la voie de CODASYL.

## Quel modèle simplifie le code ?

Les arguments pour le document : **flexibilité de schéma**, **localité**, structure proche de celle du code. Pour le relationnel : meilleurs **jointures** et relations plusieurs-à-un / plusieurs-à-plusieurs.

- Données en **arbre chargé d'un bloc** (profil, article) : le document est adapté. Le *shredding* en plusieurs tables alourdit schéma et code.
- Limites du document : on ne peut pas désigner un élément imbriqué directement (« le deuxième poste de l'utilisateur 251 », presque un chemin d'accès) ; en pratique ce n'est pas gênant tant que l'imbrication reste faible.
- Beaucoup de relations plusieurs-à-plusieurs : le document devient pénible. On peut dénormaliser, mais alors le code doit garder les copies cohérentes ; émuler les jointures est plus lent qu'une jointure faite par la base.
- Données très interconnectées : document maladroit, relationnel acceptable, **graphe** (leçon 04) le plus naturel.

## Schema-on-read et schema-on-write

Les bases de documents sont dites « sans schéma » (*schemaless*), mais c'est trompeur : le **code qui lit** suppose toujours une structure. Il y a un schéma **implicite**, que la base ne vérifie pas. Le terme exact est **schema-on-read**, par opposition à **schema-on-write** (relationnel) où le schéma est explicite et vérifié à l'écriture. L'analogie : typage **dynamique** (à l'exécution) contre typage **statique** (à la compilation). Aucun camp n'a raison dans l'absolu.

La différence se voit au moment de **changer le format**. Exemple : remplacer `name` par `first_name` et `last_name`.

- Document : on écrit les nouveaux documents avec les nouveaux champs et le code de lecture gère les anciens :

  ```go
  if u.FirstName == "" && u.Name != "" {
      u.FirstName, _, _ = strings.Cut(u.Name, " ")
  }
  ```

- Relationnel : une migration, `ALTER TABLE users ADD COLUMN first_name text;` puis `UPDATE users SET first_name = split_part(name, ' ', 1);`.

Le mauvais renom de l'`ALTER TABLE` est en partie immérité : la plupart des moteurs l'exécutent en quelques millisecondes. MySQL, qui recopie la table, fait exception. L'`UPDATE`, lui, réécrit chaque ligne et est lent partout ; si c'est inacceptable, on laisse `first_name` à `NULL` et on le remplit **à la lecture**, comme avec un document.

Le schema-on-read est précieux quand les éléments sont **hétérogènes** : beaucoup de types d'objets qu'on ne veut pas mettre chacun dans une table, ou une structure dictée par un système externe qui peut changer à tout moment. Si tous les enregistrements ont la même structure, un schéma documente et impose cette structure.

## Localité des données

Un document est généralement stocké comme **une seule chaîne continue** (JSON, XML, BSON). Si l'application lit souvent le document entier, c'est un gain de performance : une seule recherche au lieu de plusieurs index. Mais :

- la base charge **tout le document** même si tu n'en lis qu'une partie ;
- à chaque mise à jour, le document est **réécrit en entier** (sauf si la taille encodée ne change pas).

D'où le conseil : **garde les documents petits** et évite les écritures qui les font grossir.

La localité n'est pas réservée aux documents : Spanner permet d'**entrelacer** (*interleave*) les lignes d'une table dans celles de sa table parente ; Oracle propose les *multi-table index cluster tables* ; le concept de *column family* de Bigtable (Cassandra, HBase) sert au même but.

## Convergence

Presque tous les moteurs relationnels gèrent le XML depuis le milieu des années 2000 et le JSON aujourd'hui (PostgreSQL, MySQL, DB2). À l'inverse, RethinkDB offre des jointures, et certains pilotes MongoDB résolvent les références côté client. Un hybride est une bonne direction : tu combines le modèle qui convient à chaque donnée. Codd lui-même avait décrit des « domaines non simples », proches de documents imbriqués.

## Pièges fréquents

- **Dire « sans schéma »** : il y a un schéma implicite, et il est dans ton code de lecture, sans garde-fou.
- **Mettre de grosses listes dans un document** qui grossit sans fin : chaque ajout réécrit tout.
- **Résoudre les références en boucle** côté application sans compter les requêtes.
- **Croire le relationnel lent à migrer** : l'`ALTER` est rapide presque partout, c'est l'`UPDATE` qui coûte.

## À retenir

- Le document répète le modèle hiérarchique ; le relationnel a gagné parce que l'optimiseur automatise les chemins d'accès.
- Pour les références, relationnel et document font la même chose : un identifiant résolu à la lecture.
- Schema-on-read = typage dynamique, schema-on-write = typage statique ; le schéma existe toujours, seul son lieu change.
- La localité profite aux lectures de documents entiers, pas aux petites lectures ni aux mises à jour fréquentes.
- Les modèles convergent : choisis par la forme des relations, pas par l'étiquette.
