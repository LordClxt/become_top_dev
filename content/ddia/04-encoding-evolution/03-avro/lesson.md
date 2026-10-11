---
id: ddia-ch04-l03
title: "Avro : le schéma de l'écrivain et celui du lecteur"
source: { chapter: 4, pages: "122-128" }
duration_min: 40
concepts:
  - id: ddia-avro-no-tags
    label: "Avro n'a pas de numéros de champ : les valeurs sont concaténées dans l'ordre du schéma (32 octets)"
  - id: ddia-writer-reader-schema
    label: "Schéma de l'écrivain et schéma du lecteur : ils ne doivent pas être identiques, seulement compatibles"
  - id: ddia-avro-resolution
    label: "Résolution : champs appariés par nom, champ inconnu ignoré, champ manquant rempli par la valeur par défaut du lecteur"
  - id: ddia-avro-evolution-rules
    label: "On ne peut ajouter ou retirer qu'un champ ayant une valeur par défaut ; null passe par un type union"
  - id: ddia-schema-registry
    label: "Retrouver le schéma de l'écrivain : en tête de fichier, par numéro de version, ou négocié à la connexion"
  - id: ddia-merits-of-schemas
    label: "Atouts des schémas : compacts, documentation toujours à jour, compatibilité vérifiable, code généré"
glossary:
  - term: "schéma de l'écrivain (writer's schema)"
    definition: "Le schéma que connaît le code qui encode, celui avec lequel les octets sont écrits."
  - term: "schéma du lecteur (reader's schema)"
    definition: "Le schéma sur lequel s'appuie le code qui décode."
  - term: "type union"
    definition: "Un champ qui peut avoir plusieurs types ; en Avro, c'est le seul moyen d'autoriser null (union { null, long })."
  - term: "alias"
    definition: "Nom alternatif d'un champ dans le schéma du lecteur, qui permet de renommer un champ."
  - term: "fichier conteneur d'objets Avro"
    definition: "Format de fichier qui écrit le schéma de l'écrivain une seule fois en tête, suivi de millions d'enregistrements."
visuals: []
labs: [ddia-ch04-l03-lab-avro-design]
xp: 40
---

## Pourquoi c'est important

Thrift et protobuf demandent de numéroter les champs à la main et de ne jamais changer ces numéros. Avro a pris un autre parti : **aucun numéro**. C'est ce qui donne l'encodage le plus compact du chapitre, et une façon différente de gérer les changements. Cette leçon explique comment, et ce que cela change pour choisir un format.

## Un schéma sans numéros

Le schéma d'Avro peut s'écrire en IDL (pour les humains) ou en JSON (pour les machines) :

```
record Person {
    string               userName;
    union { null, long } favoriteNumber = null;
    array<string>        interests;
}
```

Le même enregistrement ne tient qu'en **32 octets** : le plus petit de tous. Dans les octets, **rien n'identifie les champs ni leurs types**. L'encodage est la simple concaténation des valeurs : une chaîne est une longueur suivie d'octets UTF-8 (rien ne dit que c'est une chaîne), un entier utilise l'encodage de longueur variable de Thrift Compact. Pour décoder, on parcourt les champs **dans l'ordre du schéma**, qui indique le type de chacun.

Conséquence : les octets ne se décodent correctement qu'avec **exactement le schéma qui les a écrits**. Toute différence entre écrivain et lecteur donne des données mal décodées. Alors, comment évoluer ?

## Schéma de l'écrivain, schéma du lecteur

Quand une application **encode**, elle utilise la version du schéma qu'elle connaît : c'est le **schéma de l'écrivain**. Quand elle **décode**, elle s'attend à un schéma, souvent celui d'où le code a été généré : le **schéma du lecteur**.

L'idée clé : les deux schémas **n'ont pas besoin d'être identiques, seulement compatibles**. À la lecture, la bibliothèque compare les deux côte à côte et **traduit** les données du schéma de l'écrivain vers celui du lecteur (la spécification d'Avro décrit exactement cette résolution) :

- l'**ordre des champs** peut différer : la résolution apparie les champs **par leur nom** ;
- un champ présent chez l'écrivain mais **absent chez le lecteur** est **ignoré** ;
- un champ attendu par le lecteur mais **absent chez l'écrivain** est rempli par la **valeur par défaut** déclarée dans le schéma du lecteur.

## Règles d'évolution

Avec Avro, la **compatibilité ascendante** (ancien code lit nouvelles données) signifie : nouvelle version du schéma comme écrivain, ancienne comme lecteur. La **rétrocompatibilité** : nouvelle version comme lecteur, ancienne comme écrivain.

Pour rester compatible, on ne peut **ajouter ou retirer qu'un champ doté d'une valeur par défaut**.

- Ajouter un champ **avec** défaut : un nouveau lecteur lit une ancienne donnée et remplit le défaut. Compatible dans les deux sens.
- Ajouter un champ **sans** défaut : un nouveau lecteur ne sait pas remplir le champ manquant d'une ancienne donnée → **rétrocompatibilité cassée**.
- Retirer un champ **sans** défaut : un ancien lecteur ne sait pas remplir le champ manquant d'une nouvelle donnée → **compatibilité ascendante cassée**.

Pas de `null` par défaut dans tous les types : pour autoriser `null`, il faut un **type union**. `union { null, long, string } champ` peut être un nombre, une chaîne ou null. Et `null` n'est utilisable comme défaut que s'il est la première branche de l'union. C'est un peu plus verbeux qu'un langage où tout est nullable, mais cela évite des bogues en disant explicitement ce qui peut être null. Avro n'a donc pas de marqueurs `optional` / `required` : il a des unions et des valeurs par défaut.

Changer le **type** d'un champ est possible si Avro sait le convertir. **Renommer** un champ est possible mais délicat : le schéma du lecteur peut contenir des **alias** qui font correspondre les anciens noms. Renommer est donc rétrocompatible mais pas ascendant ; de même, ajouter une branche à une union est rétrocompatible, pas ascendant.

## Mais quel est le schéma de l'écrivain ?

Le lecteur doit le connaître. On ne peut pas l'inclure dans chaque enregistrement : il serait bien plus gros que la donnée. Cela dépend du contexte :

- **un gros fichier de millions d'enregistrements** (typique dans Hadoop) : l'écrivain place le schéma **une fois en tête de fichier** (le *fichier conteneur d'objets* d'Avro) ;
- **une base avec des enregistrements écrits individuellement, à des moments différents** : on met un **numéro de version** au début de chaque enregistrement, et on garde la liste des versions de schéma dans la base. Le lecteur lit le numéro, récupère le schéma correspondant, puis décode (Espresso de LinkedIn fonctionne ainsi) ;
- **une connexion réseau bidirectionnelle** : les deux processus **négocient** la version à l'établissement de la connexion (le protocole RPC d'Avro).

Une base de versions de schémas est de toute façon utile : elle sert de documentation et permet de **vérifier la compatibilité** d'un changement. Le numéro peut être un entier incrémental ou un **hachage** du schéma.

## Schémas générés dynamiquement

Sans numéros de champ, Avro se prête aux schémas **générés automatiquement**. Exemple : exporter une base relationnelle dans un fichier binaire. On génère un schéma Avro depuis le schéma relationnel : une table devient un `record`, une colonne un champ de même nom. Si la base change (une colonne ajoutée, une retirée), on **régénère** le schéma et on exporte : le processus n'a pas à se soucier du changement. Les lecteurs voient d'autres champs, mais comme ils sont identifiés par leur **nom**, l'ancien schéma de lecteur s'apparie quand même.

Avec Thrift ou protobuf, il faudrait **attribuer les numéros à la main** à chaque changement de la base (et ne jamais réutiliser un numéro). Ce n'était simplement pas leur objectif de conception.

### Code généré et langages dynamiques

Thrift et protobuf reposent sur la **génération de code** : très utile dans les langages à typage statique (Java, C++, C#), qui obtiennent des structures efficaces, la vérification de types et l'auto-complétion. Dans les langages dynamiques (JavaScript, Python, Ruby), il n'y a pas de vérificateur à satisfaire : la génération de code est mal vue, et pour un schéma généré dynamiquement elle gêne. Avro la propose en option, mais s'en passe : avec un fichier conteneur qui embarque le schéma de l'écrivain, on ouvre le fichier comme du JSON. Il est **auto-descriptif**.

## Les atouts des schémas

Protobuf, Thrift et Avro ont des langages de schéma bien plus simples que XML Schema ou JSON Schema (qui permettent « cette chaîne doit respecter cette expression régulière »). Ils sont donc simples à implémenter et supportés par beaucoup de langages. L'idée n'est pas neuve : ASN.1, normalisé en 1984, en est un ancêtre (son encodage DER sert encore aux certificats SSL/X.509), mais il est complexe et mal documenté.

Les encodages binaires à schéma ont de belles propriétés :

- bien plus **compacts** que les variantes binaires de JSON, car ils omettent les noms de champs ;
- le schéma est une **documentation** toujours à jour (il est requis pour décoder) ;
- une **base de schémas** permet de vérifier la compatibilité d'un changement **avant** de déployer ;
- le **code généré** permet la vérification de types à la compilation.

En somme, l'évolution de schéma offre la même souplesse qu'une base JSON sans schéma (*schema-on-read*), avec de meilleures garanties et de meilleurs outils.

## Pièges fréquents

- **Ajouter un champ Avro sans valeur par défaut** : les nouveaux lecteurs échouent sur les anciennes données.
- **Oublier l'union pour autoriser null** : `null` n'est pas un défaut valide s'il n'est pas dans l'union.
- **Décoder sans connaître le schéma de l'écrivain** : le résultat est du bruit. Stocke un numéro de version ou le schéma en tête de fichier.
- **Croire que renommer un champ est sans risque** : avec des alias, c'est rétrocompatible seulement.

## À retenir

- Avro : pas de numéros, valeurs concaténées dans l'ordre du schéma, 32 octets pour l'exemple.
- Écrivain et lecteur ont chacun un schéma ; la résolution apparie les champs par nom, ignore l'excédent, remplit les manquants par le défaut du lecteur.
- Seuls les champs avec valeur par défaut peuvent être ajoutés ou retirés ; null exige une union.
- Le schéma de l'écrivain se retrouve par fichier conteneur, numéro de version ou négociation de connexion.
- Les schémas apportent compacité, documentation et contrôle de compatibilité.
