---
id: ddia-ch08-l02
title: 'Read committed : ni lecture sale ni écriture sale'
source:
  chapter: 7
  pages: 233-237
duration_min: 30
concepts:
- id: ddia-weak-isolation
  label: Les niveaux d'isolation faibles protègent de certaines conditions de course seulement ; beaucoup de bases ne proposent pas mieux par
    défaut
- id: ddia-read-committed
  label: 'Read committed : on ne lit que des données validées et on n''écrase que des données validées'
- id: ddia-dirty-read
  label: 'Lecture sale : voir les écritures d''une transaction pas encore validée ; état partiel ou valeurs qui seront annulées'
- id: ddia-dirty-write
  label: 'Écriture sale : écraser une écriture non validée ; peut mélanger deux transactions (vente à Bob, facture à Alice)'
- id: ddia-rc-implementation
  label: 'Implémentation : verrous de ligne pour les écritures ; pour les lectures, on sert l''ancienne valeur validée plutôt que des verrous
    de lecture'
glossary:
- term: read committed
  definition: 'Niveau d''isolation : pas de lecture sale ni d''écriture sale.'
- term: condition de course (race condition)
  definition: Un résultat qui dépend du timing exact de transactions concurrentes.
- term: verrou de ligne
  definition: Un verrou pris sur un objet par la transaction qui veut le modifier, jusqu'à sa fin.
visuals: []
labs:
- ddia-ch08-l02-lab-read-committed-design
extra: false
xp: 30
---

## Pourquoi c'est important

Deux transactions qui ne touchent pas les mêmes données peuvent s'exécuter en parallèle sans souci. Les problèmes de concurrence n'apparaissent que lorsqu'une transaction lit des données qu'une autre modifie en même temps, ou quand deux transactions modifient les mêmes données. Ces bugs sont **durs à trouver par des tests** : ils ne se déclenchent que si on a la malchance d'un certain timing, rarement, difficiles à reproduire. Le développement est déjà difficile avec un utilisateur à la fois ; avec beaucoup d'utilisateurs, n'importe quelle donnée peut changer à n'importe quel moment.

C'est pourquoi les bases ont longtemps essayé de cacher la concurrence par l'**isolation** : dans l'idéal, la **sérialisabilité** donne le même effet que si les transactions s'exécutaient une à une. En pratique, elle a un coût et beaucoup de bases ne veulent pas le payer. Il est donc courant d'utiliser des **niveaux d'isolation faibles**, qui protègent de certains problèmes mais pas de tous. Plus durs à comprendre, ils sont pourtant utilisés. Ces bugs ne sont pas théoriques : ils ont causé des pertes d'argent substantielles, des enquêtes d'auditeurs financiers, des corruptions de données de clients. Le commentaire « utilise une base ACID pour des données financières ! » **rate le sujet** : beaucoup de bases relationnelles « ACID » utilisent l'isolation faible. Il faut comprendre quels problèmes existent et comment les empêcher.

## Read committed

Le niveau le plus basique est **read committed**. Il donne deux garanties :

1. en **lecture**, on ne voit que des données **validées** (pas de lecture sale) ;
2. en **écriture**, on n'écrase que des données **validées** (pas d'écriture sale).

(Certaines bases proposent un niveau encore plus faible, *read uncommitted*, qui empêche les écritures sales mais pas les lectures sales.)

### Pas de lecture sale

Imagine qu'une transaction a écrit des données sans les avoir validées ni annulées. Une autre transaction peut-elle les voir ? Si oui, c'est une **lecture sale**. Sous read committed, les écritures d'une transaction ne deviennent visibles aux autres **que lorsqu'elle est validée**, et alors toutes à la fois. Exemple : l'utilisateur 1 a mis x = 3 ; tant qu'il n'a pas validé, le `get x` de l'utilisateur 2 renvoie toujours l'ancienne valeur, 2. Deux raisons d'empêcher les lectures sales :

- si une transaction met à jour plusieurs objets, une lecture sale permet à une autre d'en voir certains mis à jour et d'autres non (le nouveau message sans le compteur à jour). Voir la base à moitié mise à jour déroute et pousse à prendre de mauvaises décisions ;
- si une transaction est annulée, ses écritures sont défaites. Si la base permet les lectures sales, une transaction peut voir des données qui seront ensuite annulées, qui n'ont donc **jamais existé**.

### Pas d'écriture sale

Que se passe-t-il si deux transactions mettent à jour le même objet en même temps ? On suppose que l'écriture la plus tardive écrase la plus ancienne. Mais si l'ancienne écriture appartient à une transaction **pas encore validée**, la seconde écrase une valeur non validée : c'est une **écriture sale**. Read committed l'interdit, en général en **retardant la seconde écriture** jusqu'à la fin de la première transaction.

Exemple (site de voitures d'occasion) : Alice et Bob veulent acheter la même voiture. Un achat exige deux écritures : mettre à jour l'annonce avec l'acheteur et envoyer la facture à l'acheteur. Avec des écritures sales, la vente est attribuée à Bob (il gagne la mise à jour de la table des annonces) mais la facture est envoyée à Alice (elle gagne la mise à jour de la table des factures). Read committed évite ce mélange.

Mais read committed **n'empêche pas** la course entre deux incréments du même compteur : la seconde écriture a lieu après la validation de la première, donc ce n'est pas une écriture sale. C'est pourtant faux, pour une autre raison (mise à jour perdue, leçon 4).

## Comment c'est implémenté

Read committed est très répandu : c'est le niveau par défaut d'Oracle 11g, PostgreSQL, SQL Server 2012, MemSQL et d'autres. Le plus souvent, les bases empêchent les écritures sales avec des **verrous de ligne** : une transaction qui veut modifier un objet doit d'abord prendre un verrou sur lui, qu'elle garde jusqu'à sa validation ou son annulation. Une seule transaction peut détenir le verrou ; les autres qui veulent écrire attendent. La base le fait automatiquement.

Comment empêcher les lectures sales ? On pourrait utiliser le même verrou et exiger de tout lecteur qu'il le prenne brièvement avant de lire. Mais **ça ne marche pas bien en pratique** : une transaction d'écriture longue peut forcer beaucoup de transactions en lecture seule à attendre. Cela nuit au temps de réponse des lectures et à l'exploitation : un ralentissement dans une partie de l'application a des effets de bord dans une partie complètement différente.

Pour cette raison, la plupart des bases font autrement : pour chaque objet écrit, la base garde **l'ancienne valeur validée** et la **nouvelle valeur** posée par la transaction qui détient le verrou d'écriture. Pendant que la transaction est en cours, les autres transactions qui lisent l'objet reçoivent l'ancienne valeur. Elles ne passent à la nouvelle que lorsque celle-ci est validée. (Seuls DB2 et SQL Server avec `read_committed_snapshot=off` utilisent des verrous de lecture.)


## Pièges fréquents

- **Croire que « read committed » protège un compteur** : deux incréments valides successifs perdent une mise à jour.
- **Se fier à « base ACID » pour de l'argent** : le niveau d'isolation par défaut est souvent faible.
- **Verrouiller aussi les lectures** : les lectures longues bloquent les écritures.
- **Écrire un test qui passe** : un bug de concurrence peut ne se produire qu'une fois sur un million.

## À retenir

- Read committed = pas de lecture sale + pas d'écriture sale.
- Écritures : verrous de ligne. Lectures : l'ancienne valeur validée tant que l'écriture n'est pas validée.
- Il laisse passer beaucoup d'anomalies (lecture non répétable, mise à jour perdue, write skew).
