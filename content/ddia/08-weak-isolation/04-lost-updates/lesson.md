---
id: ddia-ch08-l04
title: Éviter les mises à jour perdues
source:
  chapter: 7
  pages: 242-246
duration_min: 40
concepts:
- id: ddia-lost-update
  label: 'Mise à jour perdue : deux cycles lire-modifier-écrire concurrents, le second écrase le premier'
- id: ddia-atomic-write
  label: 'Opérations d''écriture atomiques (UPDATE … SET value = value + 1) : la meilleure solution quand elle est exprimable'
- id: ddia-explicit-lock
  label: 'Verrou explicite (SELECT … FOR UPDATE) : force la séquence mais facile à oublier'
- id: ddia-auto-detect
  label: 'Détection automatique : la base annule la transaction fautive (PostgreSQL, Oracle serializable, SQL Server ; pas MySQL/InnoDB)'
- id: ddia-compare-and-set
  label: 'Compare-and-set : l''écriture n''a lieu que si la valeur n''a pas changé ; peut être faux si le WHERE lit un vieil instantané'
- id: ddia-lost-update-replicated
  label: 'En réplication multi-leader ou sans leader : verrous et CAS ne s''appliquent pas ; siblings, opérations commutatives ; LWW perd des
    mises à jour'
glossary:
- term: mise à jour perdue (lost update)
  definition: Deux transactions lisent, modifient, écrivent la même donnée ; l'une des modifications est perdue car la seconde écriture n'inclut
    pas la première.
- term: cycle lire-modifier-écrire
  definition: Le schéma où l'application lit une valeur, la modifie, puis réécrit le résultat.
- term: cursor stability
  definition: Verrou exclusif pris à la lecture pour empêcher d'autres lectures jusqu'à la mise à jour.
- term: compare-and-set (CAS)
  definition: L'écriture ne s'applique que si la valeur courante est encore celle qu'on avait lue.
visuals: []
labs:
- ddia-ch08-l04-lab-lost-update-design
extra: false
xp: 40
---

## Pourquoi c'est important

Read committed et l'isolation par instantané parlent surtout de ce que **voit** une transaction en lecture seule face à des écritures concurrentes. On a presque ignoré le cas de deux transactions qui **écrivent** en même temps : on n'a vu que l'écriture sale, un type particulier de conflit écriture-écriture. Il y en a d'autres. Le plus connu est la **mise à jour perdue** (*lost update*), illustrée par les deux incréments concurrents d'un compteur.

Elle peut se produire dès qu'une application **lit** une valeur, la **modifie** et **réécrit** le résultat (cycle lire-modifier-écrire). Si deux transactions le font en même temps, une des modifications peut être perdue : la seconde écriture n'inclut pas la première (la seconde « écrase » la première). Cas typiques :

- incrémenter un compteur ou modifier un solde (lire, calculer, réécrire) ;
- modifier localement une valeur complexe, par exemple ajouter un élément à une liste dans un document JSON (analyser, modifier, réécrire le document) ;
- deux utilisateurs qui éditent la même page de wiki en envoyant chacun la page entière, écrasant ce qui est en base.

C'est tellement courant que plusieurs solutions existent.

## Opérations d'écriture atomiques

Beaucoup de bases offrent des **opérations atomiques**, qui évitent le cycle lire-modifier-écrire dans le code applicatif. C'est la meilleure solution quand elle est exprimable :

```sql
UPDATE counters SET value = value + 1 WHERE key = 'foo';
```

C'est sûr vis-à-vis de la concurrence dans la plupart des bases relationnelles. MongoDB propose des opérations atomiques pour modifier une partie d'un document JSON ; Redis, pour des structures comme les files de priorité. Mais toutes les écritures ne s'expriment pas ainsi : modifier un texte de wiki, par exemple. Ces opérations sont en général implémentées par un **verrou exclusif** pris à la lecture (*cursor stability*), ou en exécutant toutes les opérations atomiques sur un seul thread. Les frameworks ORM rendent facile d'écrire par accident un cycle lire-modifier-écrire dangereux plutôt que d'utiliser l'opération atomique.

## Verrouillage explicite

Si les opérations atomiques ne suffisent pas, l'application peut **verrouiller explicitement** les objets à modifier. Elle fait alors son cycle lire-modifier-écrire, et toute autre transaction qui essaie de lire le même objet est forcée d'attendre. Exemple : un jeu multijoueur où plusieurs joueurs peuvent déplacer la même figure. Une opération atomique ne suffit pas, car il faut aussi vérifier que le déplacement respecte les règles du jeu, ce qu'on ne peut pas exprimer en requête.

```sql
BEGIN TRANSACTION;
SELECT * FROM figures
  WHERE name = 'robot' AND game_id = 222
  FOR UPDATE;
-- vérifier que le déplacement est valide, puis mettre à jour la position
UPDATE figures SET position = 'c4' WHERE id = 1234;
COMMIT;
```

`FOR UPDATE` dit à la base de verrouiller toutes les lignes renvoyées. Ça marche, mais il faut bien réfléchir à la logique applicative : il est facile d'oublier un verrou quelque part et d'introduire une condition de course.

## Détection automatique

Verrous et opérations atomiques forcent les cycles à se dérouler **séquentiellement**. Autre option : les laisser s'exécuter **en parallèle** et, si le gestionnaire de transactions détecte une mise à jour perdue, **annuler** la transaction fautive pour qu'elle recommence son cycle. Avantage : la base peut le faire efficacement avec l'isolation par instantané. Le *repeatable read* de PostgreSQL, le *serializable* d'Oracle et l'*isolation par instantané* de SQL Server **détectent automatiquement** les mises à jour perdues et annulent la transaction. Mais **pas** le *repeatable read* de MySQL/InnoDB. Certains auteurs estiment qu'une base doit empêcher les mises à jour perdues pour mériter le nom d'isolation par instantané : MySQL ne la fournirait donc pas. C'est une excellente fonction : elle ne demande aucun code spécial et on ne peut pas l'oublier.

## Compare-and-set

Dans les bases sans transactions, on trouve parfois une opération atomique de **compare-and-set** : l'écriture n'a lieu que si la valeur n'a pas changé depuis ta lecture. Sinon elle n'a aucun effet et il faut recommencer le cycle.

```sql
-- Peut être sûr ou non, selon l'implémentation de la base
UPDATE wiki_pages SET content = 'nouveau contenu'
  WHERE id = 1234 AND content = 'ancien contenu';
```

Attention : si la base permet à la clause `WHERE` de lire dans un **vieil instantané**, la condition peut être vraie alors qu'une autre écriture a lieu en parallèle : l'instruction n'empêche alors pas la mise à jour perdue. Vérifie que le compare-and-set de ta base est sûr.

## Réplication : un autre monde

Avec des copies sur plusieurs nœuds modifiables en parallèle, il faut des étapes supplémentaires. Verrous et compare-and-set supposent **une seule copie à jour** des données. Or les bases multi-leader ou sans leader autorisent plusieurs écritures concurrentes répliquées en asynchrone : elles ne peuvent pas garantir une seule copie à jour. Les techniques à verrou ou à CAS ne s'appliquent donc pas (on y reviendra avec la linéarisabilité, module 11). Approche courante : laisser les écritures concurrentes créer plusieurs versions conflictuelles (**siblings**) et les fusionner après coup (module 06). Les opérations atomiques fonctionnent bien en réplication si elles sont **commutatives** (on peut les appliquer dans un autre ordre sur chaque réplica et obtenir le même résultat) : incrémenter un compteur, ajouter à un ensemble. C'est l'idée des types de données de Riak 2.0. À l'inverse, le LWW est sujet aux mises à jour perdues, et il est malheureusement le défaut de beaucoup de bases répliquées.


## Pièges fréquents

- **Faire `SELECT` puis `UPDATE` avec une valeur calculée côté application** quand une opération atomique existe.
- **Oublier `FOR UPDATE`** à un endroit du code.
- **Supposer que « repeatable read » détecte les mises à jour perdues** : pas dans MySQL/InnoDB.
- **Utiliser un `WHERE content = …` sur un vieil instantané** en croyant faire un CAS sûr.

## À retenir

- Mise à jour perdue = lecture-modification-écriture concurrente.
- Défenses : opération atomique, verrou explicite, détection automatique (avec instantané), compare-and-set.
- En multi-leader ou sans leader, il faut fusionner (siblings) ou utiliser des opérations commutatives.
