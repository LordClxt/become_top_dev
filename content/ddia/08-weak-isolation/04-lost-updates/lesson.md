---
id: ddia-ch08-l04
title: "Prévenir les mises à jour perdues"
source: { chapter: 7, pages: "242-246" }
duration_min: 35
concepts:
  - id: ddia-lost-update
    label: "Mise à jour perdue : deux cycles lire-modifier-écrire concurrents, le second écrase le premier sans l'avoir vu"
  - id: ddia-atomic-write-ops
    label: "Opérations atomiques d'écriture (UPDATE … SET n = n + 1) : la meilleure solution quand elle s'exprime ainsi"
  - id: ddia-explicit-locking
    label: "Verrou explicite (SELECT … FOR UPDATE) : l'application verrouille ce qu'elle va modifier, au risque d'oublier"
  - id: ddia-lost-update-detection
    label: "Détection automatique : la base abandonne la transaction perdante et on réessaie (PostgreSQL, Oracle, SQL Server ; pas InnoDB)"
  - id: ddia-compare-and-set
    label: "Compare-and-set : n'écrire que si la valeur n'a pas changé depuis la lecture, à condition de comparer à la valeur courante"
  - id: ddia-replicated-lost-updates
    label: "Avec réplication multi-leader ou sans leader : pas de verrou ni de compare-and-set ; versions concurrentes, opérations commutatives, et LWW perd des écritures"
glossary:
  - term: "mise à jour perdue (lost update)"
    definition: "Deux transactions lisent une valeur, la modifient et l'écrivent ; l'une des deux modifications disparaît."
  - term: "cycle lire-modifier-écrire"
    definition: "Lire une valeur, calculer une nouvelle valeur dans l'application, puis l'écrire."
  - term: "cursor stability"
    definition: "Implémentation d'une opération atomique par un verrou exclusif sur l'objet lu, gardé jusqu'à l'écriture."
  - term: "SELECT … FOR UPDATE"
    definition: "Lecture qui verrouille les lignes renvoyées, comme si on allait les écrire, jusqu'à la fin de la transaction."
  - term: "compare-and-set (CAS)"
    definition: "Opération qui écrit une nouvelle valeur seulement si la valeur actuelle est toujours celle qu'on a lue."
  - term: "opération commutative"
    definition: "Opération dont le résultat ne dépend pas de l'ordre d'application, comme un incrément ou l'ajout dans un ensemble."
visuals: []
labs: [ddia-ch08-l04-lab-lost-update-fixes]
xp: 40
---

## Pourquoi c'est important

Read committed et le snapshot isolation parlent surtout de ce qu'un **lecteur** voit pendant que d'autres écrivent. Mais quand **deux écrivains** travaillent en même temps, une autre anomalie apparaît, la plus répandue de toutes : la **mise à jour perdue**. Un compteur de vues qui retarde, un solde faux de quelques euros, une modification de page wiki qui disparaît. Cette leçon passe en revue les cinq façons de l'empêcher, et quand chacune s'applique.

## L'anomalie

Une mise à jour perdue se produit quand l'application fait un **cycle lire-modifier-écrire** : elle lit une valeur, calcule une nouvelle valeur, puis l'écrit. Si deux transactions le font en même temps, la seconde écrit sans tenir compte de la première, qui est **écrasée** (*clobbered*). Exemples :

- incrémenter un compteur ou mettre à jour un solde (lire, calculer, écrire) ;
- modifier une liste dans un document JSON (lire le document, ajouter un élément, réécrire le document entier) ;
- deux utilisateurs qui éditent la même page wiki et envoient chacun la page entière.

Avec un compteur à 42 et deux incréments concurrents, on obtient 43 au lieu de 44. Read committed ne l'empêche pas : la seconde écriture ne touche pas une valeur non validée, elle écrase une valeur **déjà validée**, simplement lue trop tôt.

## 1. Les opérations atomiques d'écriture

La meilleure solution, quand on peut l'exprimer : laisser la **base** faire le calcul.

```sql
UPDATE counters SET value = value + 1 WHERE key = 'page-views';
```

Il n'y a plus de cycle dans l'application, donc rien à perdre. Ces opérations existent dans la plupart des bases relationnelles, dans MongoDB (modifier une partie d'un document de façon atomique) ou dans Redis (modifier une structure de données comme une file de priorité).

Elles s'implémentent en général par un **verrou exclusif** sur l'objet pendant la lecture, gardé jusqu'à l'écriture (on parle de *cursor stability*), ou en exécutant toutes les opérations atomiques sur **un seul thread**.

Toutes les écritures ne s'expriment pas ainsi : modifier une page wiki demande de l'édition de texte arbitraire. Et attention aux **ORM** : il est très facile d'écrire, sans s'en rendre compte, un cycle lire-modifier-écrire dans le code (`page.views += 1; page.save()`) au lieu d'une opération atomique. Ces bogues sont subtils et durs à trouver par les tests.

## 2. Le verrou explicite

Si la base n'a pas l'opération qu'il faut, l'application peut **verrouiller explicitement** les objets qu'elle va modifier. Un autre cycle sur le même objet devra attendre la fin du premier.

Exemple du livre : un jeu à plusieurs joueurs où deux joueurs déplacent la même pièce. La règle du jeu est trop complexe pour une requête atomique, alors on verrouille :

```sql
BEGIN TRANSACTION;
SELECT * FROM figures
  WHERE name = 'robot' AND game_id = 222
  FOR UPDATE;
-- l'application vérifie que le coup est valide, puis :
UPDATE figures SET position = 'c4' WHERE id = 1234;
COMMIT;
```

`FOR UPDATE` demande à la base de verrouiller toutes les lignes renvoyées. Ça marche, mais il faut penser à **chaque** endroit du code qui fait ce cycle : un seul oubli, et la condition de concurrence revient.

## 3. La détection automatique

Les deux solutions précédentes forcent les cycles à s'exécuter **l'un après l'autre**. Une autre approche les laisse tourner en parallèle, et fait **détecter** la mise à jour perdue par la base : la transaction perdante est **abandonnée**, et l'application la réessaie.

Avantage : cette vérification s'appuie efficacement sur le snapshot isolation. Le **repeatable read** de PostgreSQL, le **serializable** d'Oracle et le **snapshot isolation** de SQL Server détectent automatiquement les mises à jour perdues. Le **repeatable read** de **MySQL/InnoDB**, lui, ne le fait **pas**. Certains auteurs considèrent qu'une base doit empêcher les mises à jour perdues pour mériter le nom de snapshot isolation ; selon cette définition, InnoDB n'en fournit pas.

Gros avantage : l'application n'a **rien à faire**, ni opération spéciale ni verrou à ne pas oublier. C'est exactement ce que tu codes dans le projet du chapitre : au commit, si une clé écrite a été validée entre-temps par une transaction concurrente, le **premier qui valide gagne**, l'autre reçoit une erreur.

## 4. Compare-and-set

Dans une base **sans transactions**, on trouve parfois un **compare-and-set** : l'écriture n'a lieu que si la valeur n'a pas changé depuis la lecture. Sinon, le cycle doit être recommencé.

```sql
-- n'écrit que si personne n'a modifié la page depuis qu'on l'a lue
UPDATE wiki_pages SET content = 'nouveau contenu'
  WHERE id = 1234 AND content = 'ancien contenu';
```

Si le contenu a changé, la mise à jour ne touche **aucune ligne** : l'application le voit et recommence (souvent, on compare un numéro de version plutôt que le texte entier). Mais attention : si la base laisse la clause `WHERE` lire un **ancien instantané**, la comparaison peut réussir alors qu'une écriture concurrente a eu lieu. Vérifie que le compare-and-set de ta base compare bien à la **valeur courante**.

## 5. Et avec de la réplication ?

Dans une base **répliquée**, le problème change de forme. Avec des copies sur plusieurs nœuds, et surtout en **multi-leader** ou **sans leader** (chapitre précédent), des écritures concurrentes peuvent avoir lieu sur des nœuds différents, en même temps. Les verrous et le compare-and-set supposent **une seule copie à jour** des données : ils ne s'appliquent pas.

On fait donc autrement :

- on laisse des **écritures concurrentes** créer plusieurs **versions en conflit** (des *siblings*), puis l'application ou des structures de données spéciales les **fusionnent** ;
- les **opérations commutatives** (incrémenter un compteur, ajouter un élément dans un ensemble) s'y prêtent bien : l'ordre d'application ne change pas le résultat. Riak 2.0 a des types de données qui fusionnent ainsi les mises à jour de plusieurs réplicas sans rien perdre ;
- en revanche, la stratégie **dernière écriture gagnante** (LWW), qui est le **défaut** dans beaucoup de bases répliquées, est **sujette aux mises à jour perdues** : la « dernière » efface simplement les autres.

**Aller plus loin.** Les types fusionnables de Riak sont des **CRDT** (*conflict-free replicated data types*) : un compteur qui garde un sous-compteur par réplica et fait la somme, un ensemble qui retient les ajouts et les retraits. Ils sont désormais disponibles dans Redis Enterprise, Automerge ou Yjs.

## Pièges fréquents

- **Écrire `obj.count += 1; obj.save()` avec un ORM** : un cycle lire-modifier-écrire déguisé. Préfère une mise à jour atomique.
- **Oublier un `FOR UPDATE` dans un des chemins de code** : le verrou explicite ne protège que là où on l'a écrit.
- **Supposer que « repeatable read » détecte les mises à jour perdues partout** : PostgreSQL oui, MySQL InnoDB non.
- **Faire un compare-and-set qui lit un vieil instantané** : la comparaison passe alors qu'elle ne devrait pas.
- **Garder LWW sur un compteur répliqué** : les incréments concurrents disparaissent.

## À retenir

- Mise à jour perdue = deux cycles lire-modifier-écrire concurrents ; read committed ne l'empêche pas.
- Les parades : opération atomique quand elle s'exprime (la meilleure), verrou explicite (`FOR UPDATE`), détection automatique par la base, compare-and-set dans les bases sans transactions.
- Détection automatique : PostgreSQL (repeatable read), Oracle (serializable), SQL Server (snapshot) ; pas MySQL InnoDB.
- En réplication multi-leader ou sans leader : pas de verrou ni de CAS ; versions concurrentes à fusionner, opérations commutatives, et méfiance envers LWW.
