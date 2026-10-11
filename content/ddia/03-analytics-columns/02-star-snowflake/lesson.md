---
id: ddia-ch03-l02
title: "Schémas en étoile et en flocon"
source: { chapter: 3, pages: "93-95" }
duration_min: 30
concepts:
  - id: ddia-star-schema
    label: "Schéma en étoile : une table de faits au centre, entourée de tables de dimensions"
  - id: ddia-fact-table
    label: "Table de faits : une ligne par événement, avec des attributs et des clés étrangères vers les dimensions"
  - id: ddia-dimension-table
    label: "Table de dimensions : le qui, quoi, où, quand, comment et pourquoi de l'événement"
  - id: ddia-snowflake-schema
    label: "Schéma en flocon : dimensions décomposées en sous-dimensions, plus normalisé mais plus lourd à manipuler"
glossary:
  - term: "table de faits"
    definition: "Table centrale d'un schéma d'analyse : chaque ligne est un événement (achat, clic, page vue). Elle peut contenir des dizaines de pétaoctets."
  - term: "table de dimensions"
    definition: "Table de référence rattachée aux faits par clé étrangère : produit, magasin, date, promotion, client."
  - term: "schéma en étoile (modélisation dimensionnelle)"
    definition: "Disposition formulaire des entrepôts : la table de faits au milieu, ses dimensions autour comme les branches d'une étoile."
  - term: "schéma en flocon"
    definition: "Variante où les dimensions sont elles-mêmes normalisées en sous-dimensions (marque, catégorie dans des tables à part)."
visuals: []
labs: [ddia-ch03-l02-lab-star-design]
xp: 30
---

## Pourquoi c'est important

Pour les bases transactionnelles, les modèles de données varient énormément : relationnel, documents, graphes. En analyse, la diversité est bien moindre : la plupart des entrepôts suivent une **recette presque toujours la même**. La connaître te permet de lire n'importe quel entrepôt, et surtout de comprendre pourquoi ses tables sont si larges et si grosses.

## La table de faits

Prenons l'entrepôt d'une chaîne de supermarchés. Au centre, une table `fact_sales`. Chaque ligne est un **événement** : un client a acheté un produit, à un instant donné, dans un magasin. (Pour un site web, une ligne serait une page vue ou un clic.)

On capture les faits comme des **événements individuels**, car cela donne un maximum de souplesse pour l'analyse future. Conséquence : la table de faits devient énorme. Les grandes entreprises (Apple, Walmart, eBay) stockent des dizaines de pétaoctets d'historique, dont l'essentiel dans les tables de faits.

Une ligne de faits contient deux sortes de colonnes :

- des **attributs** : le prix de vente, le coût d'achat chez le fournisseur (d'où on déduit la marge) ;
- des **clés étrangères** vers les **tables de dimensions**.

## Les dimensions

Chaque dimension répond à une question sur l'événement : **qui** (client), **quoi** (produit), **où** (magasin), **quand** (date), **comment** (promotion), **pourquoi**. Une ligne de `dim_product` décrit un type de produit : son identifiant de stock (SKU), sa description, sa marque, sa catégorie, sa teneur en graisses, la taille de l'emballage… La ligne de faits référence le produit vendu par clé étrangère. (Par simplicité, un client qui achète plusieurs produits d'un coup donne plusieurs lignes de faits.)

Même la **date** passe souvent par une table de dimensions. Pourquoi ? Pour y ranger des informations sur le calendrier (jours fériés, week-ends, trimestre fiscal) et permettre des requêtes qui distinguent les ventes un jour férié d'un jour ordinaire.

Le nom « étoile » vient du dessin : la table de faits au centre, ses dimensions autour, les liens comme les branches d'une étoile.

## Le flocon

Dans le **schéma en flocon**, les dimensions sont elles-mêmes décomposées en **sous-dimensions** : des tables séparées pour les marques et les catégories de produits, et chaque ligne de `dim_product` référence sa marque et sa catégorie par clé étrangère, au lieu de les stocker comme des chaînes de caractères. Un flocon est **plus normalisé** qu'une étoile. Pourtant, l'étoile est souvent préférée : elle est **plus simple à manipuler** pour les analystes (moins de jointures à écrire).

## Tables très larges

Dans un entrepôt typique, les tables sont **très larges** : une table de faits dépasse souvent 100 colonnes, parfois plusieurs centaines. Les dimensions aussi, car elles contiennent toutes les métadonnées utiles à l'analyse : pour `dim_store`, les services offerts, la présence d'une boulangerie, la surface en mètres carrés, la date d'ouverture, la dernière rénovation, la distance à l'autoroute… Cette largeur est la clé de la leçon suivante : une requête n'en lit que quelques-unes.

## Pièges fréquents

- **Normaliser à l'extrême un entrepôt** : le flocon est élégant, mais les analystes écrivent plus de jointures. L'étoile est le défaut raisonnable.
- **Agréger avant de stocker** : on perd l'événement individuel, donc la souplesse. On garde les faits bruts et on agrège ensuite.
- **Mettre la date dans une simple colonne de texte** : une dimension de dates permet de filtrer sur les jours fériés ou les trimestres fiscaux.
- **Confondre attribut et dimension** : le prix de vente est un attribut du fait ; le produit est une dimension.

## À retenir

- Étoile : une table de faits (un événement par ligne) entourée de tables de dimensions (qui, quoi, où, quand, comment, pourquoi).
- Les faits contiennent des attributs et des clés étrangères ; les dimensions décrivent le contexte.
- Flocon : dimensions normalisées en sous-dimensions ; plus propre, mais plus lourd à interroger, donc moins répandu.
- Les tables sont larges (souvent plus de 100 colonnes) et la table de faits est énorme.
