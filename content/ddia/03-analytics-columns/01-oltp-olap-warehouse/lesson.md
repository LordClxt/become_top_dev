---
id: ddia-ch03-l01
title: "OLTP ou OLAP ? Le rôle de l'entrepôt de données"
source: { chapter: 3, pages: "90-93" }
duration_min: 30
concepts:
  - id: ddia-oltp
    label: "OLTP : peu d'enregistrements par requête, trouvés par clé, écritures aléatoires à faible latence"
  - id: ddia-olap
    label: "OLAP : agrégats sur un très grand nombre d'enregistrements, lecture de quelques colonnes seulement"
  - id: ddia-data-warehouse
    label: "Entrepôt de données : copie en lecture seule des bases de production, réservée à l'analyse"
  - id: ddia-etl
    label: "ETL : extraire, transformer, charger les données de production dans l'entrepôt"
glossary:
  - term: "transaction"
    definition: "Un groupe de lectures et d'écritures qui forme une unité logique ; ici, le mot désigne surtout l'accès à faible latence, pas forcément les propriétés ACID."
  - term: "OLTP"
    definition: "Online transaction processing : l'application cherche un petit nombre d'enregistrements par clé et les insère ou les met à jour selon l'action de l'utilisateur."
  - term: "OLAP"
    definition: "Online analytic processing : des requêtes d'analyse qui parcourent énormément d'enregistrements pour calculer des agrégats (somme, moyenne, comptage)."
  - term: "entrepôt de données (data warehouse)"
    definition: "Base séparée, en lecture seule, qui contient une copie de toutes les bases transactionnelles de l'entreprise, optimisée pour l'analyse."
  - term: "ETL"
    definition: "Extract–Transform–Load : extraire les données (dump périodique ou flux de mises à jour), les transformer en schéma d'analyse, les nettoyer, puis les charger."
visuals: []
labs: [ddia-ch03-l01-lab-workload-design]
xp: 30
---

## Pourquoi c'est important

Jusqu'ici, nous avons rangé des données pour retrouver *une* clé vite. Ça suffit pour afficher la page d'un utilisateur. Mais dès que la direction demande « quel est le chiffre d'affaires par magasin en janvier ? », la question change complètement : on ne cherche plus une ligne, on en balaie des millions. Les structures de la première moitié du chapitre (hachage, SSTable, B-tree) sont conçues pour le premier cas. Cette leçon donne les mots pour distinguer les deux mondes, et explique pourquoi les entreprises ont fini par séparer leurs bases.

## Transaction : un mot qui a glissé

À l'origine, une écriture en base correspondait à une **transaction commerciale** : une vente, une commande, un salaire versé. Quand les bases ont servi à autre chose (commentaires, actions dans un jeu, contacts), le mot est resté. Il désigne maintenant un groupe de lectures et d'écritures formant une unité logique, et surtout un **accès à faible latence** par opposition au traitement par lots qui tourne une fois par jour. Cela n'implique pas forcément les propriétés ACID, que nous verrons plus loin.

## Deux profils d'accès

**OLTP** (*online transaction processing*) : une application interactive cherche **peu d'enregistrements** par requête, retrouvés par clé grâce à un index, puis insère ou met à jour selon l'action de l'utilisateur.

**OLAP** (*online analytic processing*) : une requête **parcourt un énorme nombre d'enregistrements**, n'en lit que **quelques colonnes**, et renvoie un **agrégat** (comptage, somme, moyenne) plutôt que les lignes brutes. Exemples : le chiffre d'affaires de chaque magasin en janvier, combien de bananes de plus que d'habitude pendant la promotion, quelle marque de lait infantile est achetée avec telle marque de couches.

| | OLTP | OLAP |
|---|---|---|
| Lecture typique | quelques enregistrements, par clé | agrégat sur un très grand nombre d'enregistrements |
| Écriture typique | aléatoire, faible latence, saisie utilisateur | import en masse (ETL) ou flux d'événements |
| Utilisé par | client final via une application web | analyste interne, aide à la décision |
| Les données représentent | l'état courant | l'historique des événements |
| Volume | de gigaoctets à téraoctets | de téraoctets à pétaoctets |

> Le « online » d'OLAP n'a pas de sens très net : il rappelle sans doute que les analystes interrogent le système de façon interactive, pas seulement pour des rapports prédéfinis.

## L'entrepôt de données

Au début, la même base servait aux deux usages, et SQL se prête bien aux deux. Mais à la fin des années 1980, les entreprises ont commencé à faire tourner l'analyse sur une **base séparée** : l'**entrepôt de données**.

La raison est pratique. Une entreprise a des dizaines de systèmes transactionnels (site web, caisses, stocks, tournées de livraison, fournisseurs, RH), chacun géré par une équipe. Ils doivent être très disponibles et rapides, car l'activité en dépend. Les administrateurs refusent donc qu'un analyste lance une requête ad hoc qui parcourt la moitié du jeu de données et ralentit les transactions en cours.

L'entrepôt contient une **copie en lecture seule** de toutes ces bases. Les données y arrivent par **ETL** : *extract* (un export périodique ou un flux continu de mises à jour), *transform* (conversion vers un schéma adapté à l'analyse, nettoyage), *load* (chargement dans l'entrepôt). Les analystes y requêtent à volonté sans toucher à la production.

Autre gain majeur : l'entrepôt peut être **optimisé pour l'analyse**. Les algorithmes d'indexation vus dans la première moitié du chapitre conviennent à l'OLTP, mais répondent mal aux requêtes analytiques. Les entrepôts utilisent donc d'autres moteurs, que les leçons suivantes détaillent.

### Même SQL, moteurs différents

Un entrepôt est le plus souvent **relationnel**, parce que SQL convient bien à l'analyse, et de nombreux outils graphiques en génèrent (forage, découpage). En surface, un entrepôt et une base OLTP se ressemblent donc. Dessous, ils diffèrent beaucoup. Certains produits (SQL Server, SAP HANA) proposent les deux dans un même logiciel, mais ce sont de plus en plus **deux moteurs séparés** derrière une interface SQL commune. Côté entrepôts : Teradata, Vertica, Amazon Redshift (version hébergée de ParAccel) ; côté logiciels libres, les projets « SQL sur Hadoop » (Hive, Spark SQL, Impala, Presto, Drill), dont plusieurs s'inspirent de Dremel de Google.

Les petites entreprises n'ont presque jamais d'entrepôt : peu de systèmes, peu de données (une base SQL ordinaire ou un tableur suffit).

## Pièges fréquents

- **Lancer l'analyse sur la base de production** « juste une fois » : un balayage complet peut dégrader les transactions pendant des minutes.
- **Croire qu'OLTP et OLAP se distinguent par le langage** : c'est le même SQL, ce sont les moteurs de stockage qui diffèrent.
- **Confondre transaction et ACID** : ici, « transaction » désigne surtout un accès interactif à faible latence.
- **Penser que l'entrepôt est une base de plus à maintenir à la main** : l'ETL est un processus continu, avec ses propres pannes.

## À retenir

- OLTP : peu de lignes, par clé, état courant. OLAP : énormément de lignes, quelques colonnes, agrégats, historique.
- L'entrepôt est une copie en lecture seule, alimentée par ETL, qui protège la production et permet d'optimiser le stockage pour l'analyse.
- Le même langage SQL cache des moteurs très différents : c'est le moteur de stockage qui change.
