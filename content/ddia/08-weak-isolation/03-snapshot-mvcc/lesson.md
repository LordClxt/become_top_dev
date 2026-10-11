---
id: ddia-ch08-l03
title: "Snapshot isolation et MVCC"
source: { chapter: 7, pages: "237-242" }
duration_min: 40
concepts:
  - id: ddia-read-skew
    label: "Read skew (lecture non répétable) : lire des parties de la base à des instants différents, et voir un état qui n'a jamais existé"
  - id: ddia-snapshot-isolation
    label: "Snapshot isolation : chaque transaction lit un instantané cohérent, figé à son démarrage ; les lecteurs ne bloquent jamais les écrivains"
  - id: ddia-mvcc-versions
    label: "MVCC : plusieurs versions validées par objet, marquées created_by et deleted_by avec des identifiants de transaction croissants"
  - id: ddia-mvcc-visibility-rules
    label: "Règles de visibilité : ignorer les transactions en cours au démarrage, abandonnées ou plus récentes ; voir tout le reste"
  - id: ddia-mvcc-indexes
    label: "Index et MVCC : l'index pointe vers toutes les versions et la requête filtre, ou B-tree en ajout seul (copy-on-write)"
  - id: ddia-repeatable-read-naming
    label: "Nommage confus : « serializable » chez Oracle et « repeatable read » chez PostgreSQL ou MySQL désignent le snapshot isolation"
glossary:
  - term: "read skew (lecture non répétable)"
    definition: "Anomalie où une transaction voit des parties de la base à des instants différents, donc un état incohérent."
  - term: "snapshot isolation"
    definition: "Niveau où chaque transaction lit un instantané cohérent : toutes les données validées au moment où elle a démarré, et rien d'autre."
  - term: "MVCC (multi-version concurrency control)"
    definition: "Technique qui garde plusieurs versions validées d'un objet, pour que des transactions démarrées à des moments différents voient chacune son instantané."
  - term: "txid"
    definition: "Identifiant unique et toujours croissant attribué à chaque transaction à son démarrage."
  - term: "ramasse-miettes (vacuum)"
    definition: "Processus qui supprime les versions qu'aucune transaction ne peut plus voir."
  - term: "B-tree en ajout seul (copy-on-write)"
    definition: "B-tree qui n'écrase jamais une page : il copie la page modifiée et tous ses parents jusqu'à une nouvelle racine."
visuals: []
labs: [ddia-ch08-l03-lab-snapshot-backup]
xp: 40
---

## Pourquoi c'est important

Read committed semble suffire : pas de lecture sale, pas d'écriture sale, des lecteurs qui n'attendent jamais. Et pourtant, une sauvegarde faite en read committed peut produire une copie **qui n'a jamais existé**, et rester incohérente pour toujours une fois restaurée. Le **snapshot isolation** règle ce problème, et sa mise en œuvre, le **MVCC**, est au cœur de PostgreSQL, MySQL InnoDB, Oracle ou SQL Server. Tu l'implémentes toi-même dans le projet de ce chapitre.

## Le read skew

Alice a 1 000 € répartis sur deux comptes de 500 €. Un virement de 100 € passe du compte 2 au compte 1. Alice consulte ses comptes au mauvais moment : elle lit le compte 1 **avant** le virement (500 €), puis le compte 2 **après** (400 €). Elle voit 900 € : 100 € semblent avoir disparu.

C'est une **lecture non répétable** (*nonrepeatable read*), aussi appelée **read skew** : si Alice relisait le compte 1, elle verrait 600 €. Chaque lecture ne portait que sur des données validées, donc read committed l'autorise. Pour Alice, ce n'est pas grave : il suffit de recharger la page. Mais certains cas ne tolèrent pas cette incohérence passagère :

- **les sauvegardes** : copier une base de 2 To prend des heures, pendant lesquelles les écritures continuent. Une partie de la copie contient d'anciennes valeurs, une autre de nouvelles. Si on la restaure, l'incohérence (100 € disparus) devient **permanente** ;
- **les requêtes analytiques et les contrôles d'intégrité** : une requête qui balaie une grande partie de la base, ou un contrôle « la somme des comptes est-elle constante ? », renvoie des résultats absurdes s'il voit des morceaux pris à des instants différents.

## Le snapshot isolation

La solution courante est le **snapshot isolation** : chaque transaction lit un **instantané cohérent** de la base, c'est-à-dire **toutes** les données validées au moment où elle a **démarré**, et rien de ce qui a été validé ensuite. Même si les données changent pendant qu'elle tourne, la transaction voit l'état figé de son début.

C'est idéal pour les transactions longues en lecture seule comme les sauvegardes et l'analytique : on raisonne bien plus facilement sur des données qui ne bougent pas sous nos pieds. Le snapshot isolation est supporté par PostgreSQL, MySQL avec InnoDB, Oracle, SQL Server et d'autres.

Comme read committed, il utilise des **verrous d'écriture** pour empêcher les écritures sales : un écrivain peut bloquer un autre écrivain. Mais les lectures ne prennent **aucun verrou**. Principe clé : **les lecteurs ne bloquent jamais les écrivains, et les écrivains ne bloquent jamais les lecteurs**. Une sauvegarde de six heures peut donc tourner sur la base de production pendant que les écritures continuent normalement.

## MVCC : garder plusieurs versions

Read committed gardait deux versions de chaque objet (l'ancienne validée, et la nouvelle en cours). Le snapshot isolation doit aller plus loin : des transactions démarrées à des instants différents voient des états différents, donc la base garde **plusieurs versions validées** d'un même objet. C'est le **contrôle de concurrence multiversion** (MVCC).

Une base MVCC sert souvent aussi read committed : il suffit de prendre un **nouvel instantané pour chaque requête** au lieu d'un seul pour toute la transaction.

Voici le schéma de PostgreSQL :

1. chaque transaction reçoit, à son démarrage, un **identifiant unique et toujours croissant**, le `txid` ;
2. chaque écriture est marquée avec le `txid` de son auteur ;
3. chaque version de ligne porte deux champs : `created_by` (la transaction qui l'a insérée) et `deleted_by` (vide au départ) ;
4. une **suppression** ne retire rien : elle remplit `deleted_by`. Quand plus aucune transaction ne peut voir la ligne, un **ramasse-miettes** la supprime pour de bon ;
5. une **mise à jour** est une suppression suivie d'une création.

Exemple : le compte 2 a une version `{500 €, created_by: 3}`. La transaction 13 retire 100 € : elle marque cette version `deleted_by: 13` et crée `{400 €, created_by: 13}`. Les deux versions coexistent ; la transaction 12, démarrée avant le commit de 13, continue de lire 500 €.

## Les règles de visibilité

Quand une transaction lit, elle décide quelles versions elle peut voir avec quatre règles :

1. au démarrage, la base note la **liste des transactions en cours**. Leurs écritures sont **ignorées**, même si elles valident ensuite ;
2. les écritures des transactions **abandonnées** sont ignorées ;
3. les écritures des transactions de `txid` **plus grand** (démarrées après) sont ignorées, qu'elles aient validé ou non ;
4. **toutes les autres** écritures sont visibles.

Autrement dit, une version est visible si, au démarrage du lecteur :

- la transaction qui l'a **créée** avait déjà **validé** ;
- et la version n'était **pas supprimée**, ou la transaction qui l'a supprimée n'avait **pas encore validé**.

Une transaction longue peut ainsi continuer à lire une ligne supprimée depuis longtemps par d'autres. Comme on ne modifie jamais une version en place, mais qu'on en crée une nouvelle à chaque changement, la base offre un instantané cohérent pour un surcoût modeste.

Petit test : la transaction 20 démarre alors que la 18 est en cours. La 18 valide une écriture, puis la 21 aussi. Que voit la 20 ? Ni la 18 (en cours à son démarrage, règle 1), ni la 21 (plus récente, règle 3).

## Index et MVCC

Comment un index fonctionne-t-il avec plusieurs versions ? Une option : l'index pointe vers **toutes** les versions d'un objet, et la requête **filtre** celles qui ne sont pas visibles. Quand le ramasse-miettes supprime une version, il retire aussi ses entrées d'index.

**Aller plus loin.** PostgreSQL évite de toucher aux index quand la nouvelle version tient dans la même page que l'ancienne (*heap-only tuples*), ce qui réduit fortement le coût des mises à jour fréquentes.

Une autre approche, utilisée par CouchDB, Datomic et LMDB, est le **B-tree en ajout seul** (*copy-on-write*) : on n'écrase jamais une page. Chaque écriture crée une copie de la page modifiée **et de tous ses parents** jusqu'à une nouvelle racine ; les pages non touchées sont partagées. Chaque racine est alors un instantané cohérent de la base au moment de son écriture : pas besoin de filtrer par `txid`, puisqu'une écriture ultérieure ne peut pas modifier un arbre existant. Il faut en revanche un compactage et un ramasse-miettes en arrière-plan. (Rappel du chapitre sur le stockage : un B-tree classique modifie ses pages en place, d'où le WAL.)

## Repeatable read : des noms trompeurs

Le snapshot isolation est très utile, surtout en lecture seule, mais il porte des noms différents selon la base. Le standard SQL ne le connaît pas : il s'appuie sur la définition de System R de 1975, alors que le snapshot isolation n'a été décrit qu'en 1995. Le standard définit à la place un niveau **repeatable read**, qui y ressemble en surface.

Résultat :

- **Oracle** appelle le snapshot isolation **serializable** (alors qu'il ne l'est pas, voir la leçon 5) ;
- **PostgreSQL** et **MySQL** l'appellent **repeatable read**, ce qui leur permet de se dire conformes au standard ;
- **IBM DB2** utilise « repeatable read » pour désigner la **sérialisabilité** ;
- et la définition de repeatable read du standard est elle-même ambiguë et imprécise.

Bilan : personne ne sait vraiment ce que « repeatable read » veut dire. Avant de te fier au nom d'un niveau, lis ce qu'il garantit **dans ta base**.

## Pièges fréquents

- **Faire une sauvegarde ou un audit en read committed** : la copie peut mélanger des instants différents, et l'incohérence restaurée est permanente.
- **Croire que le snapshot isolation bloque les lecteurs** : aucune lecture ne prend de verrou ; seuls les écrivains s'attendent entre eux.
- **Garder une transaction ouverte des heures sans raison** : le ramasse-miettes ne peut pas supprimer les versions qu'elle pourrait encore voir, et la base enfle.
- **Se fier au nom du niveau** : « serializable » chez Oracle et « repeatable read » chez PostgreSQL désignent le même snapshot isolation.

## À retenir

- Read skew : lire à deux instants différents et voir un état qui n'a jamais existé ; grave pour les sauvegardes et l'analytique.
- Snapshot isolation : un instantané figé au démarrage ; les lecteurs ne bloquent pas les écrivains, et inversement.
- MVCC : versions marquées `created_by` / `deleted_by`, `txid` croissants, mise à jour = suppression + création, ramasse-miettes.
- Visible si le créateur avait validé au démarrage et le suppresseur non.
- Index : pointer vers toutes les versions et filtrer, ou B-tree en ajout seul.
