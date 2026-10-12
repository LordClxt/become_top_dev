---
id: ddia-ch08-l03
title: Isolation par instantané et MVCC
source:
  chapter: 7
  pages: 237-242
duration_min: 45
concepts:
- id: ddia-read-skew
  label: 'Lecture non répétable (read skew) : deux lectures dans la même transaction voient des états différents ; acceptable en read committed,
    pas pour les sauvegardes ou l''analytique'
- id: ddia-snapshot-isolation
  label: 'Isolation par instantané : chaque transaction lit un instantané cohérent pris au début ; lecteurs et écrivains ne se bloquent pas'
- id: ddia-mvcc
  label: 'MVCC : plusieurs versions d''un objet côte à côte, chacune marquée par la transaction qui l''a créée et celle qui l''a supprimée'
- id: ddia-visibility-rules
  label: 'Règles de visibilité : ignorer les transactions en cours au début, annulées, ou démarrées plus tard'
- id: ddia-append-only-btree
  label: 'Variante : B-tree en ajout seul / copy-on-write, où chaque racine est un instantané (CouchDB, Datomic, LMDB)'
- id: ddia-repeatable-read-naming
  label: '« Repeatable read » est un nom confus : PostgreSQL et MySQL l''emploient pour l''instantané, DB2 pour la sérialisabilité'
glossary:
- term: read skew (lecture non répétable)
  definition: 'Voir à un instant un compte avant un virement et un autre après : les totaux ne tombent pas juste.'
- term: isolation par instantané (snapshot isolation)
  definition: Chaque transaction voit l'état validé de la base au début de la transaction.
- term: MVCC
  definition: 'Contrôle de concurrence multi-versions : plusieurs versions d''un objet coexistent.'
- term: created_by / deleted_by
  definition: Les champs de chaque ligne qui disent quelle transaction l'a créée et laquelle l'a marquée supprimée.
visuals: []
labs:
- ddia-ch08-l03-lab-mvcc-visibility-design
extra: false
xp: 45
---

## Pourquoi c'est important

À première vue, read committed semble faire tout ce qu'il faut : il permet les annulations, empêche de lire des résultats incomplets et empêche les écritures de se mélanger. Mais il reste de nombreuses façons d'avoir des bugs de concurrence. Exemple : Alice a **1 000 €** d'économies répartis sur deux comptes de 500 €. Une transaction vire 100 € de l'un à l'autre. Si Alice regarde la liste de ses comptes au moment du virement, elle peut voir un compte avant l'arrivée du paiement (500 €) et l'autre après le départ (400 €) : **900 € au total**, 100 € ont disparu. C'est une **lecture non répétable** ou **read skew** : si Alice relisait le premier compte à la fin de sa transaction, elle verrait 600 €. Le read skew est considéré acceptable en read committed : les soldes qu'elle a vus étaient bien validés au moment de la lecture.

(« Skew » est surchargé : on l'avait utilisé pour une charge déséquilibrée avec hot spots ; ici il désigne une anomalie de timing.)

Pour Alice, ce n'est pas durable : elle verra des soldes cohérents en rechargeant la page. Mais certaines situations ne tolèrent pas cette incohérence temporaire :

- **sauvegardes** : copier toute la base peut prendre des heures, pendant lesquelles les écritures continuent. Des parties de la sauvegarde contiendraient une version ancienne, d'autres une version récente. Si on restaure, les incohérences (l'argent disparu) deviennent **permanentes** ;
- **requêtes d'analyse et vérifications d'intégrité** : elles parcourent de grandes parties de la base. Si elles observent des parties à des instants différents, elles renvoient des résultats absurdes.

## L'isolation par instantané

La solution la plus courante : chaque transaction lit un **instantané cohérent** de la base, c'est-à-dire qu'elle voit toutes les données **validées au moment où elle commence**. Même si les données sont modifiées ensuite par une autre transaction, elle ne voit que les anciennes données de cet instant précis. C'est une aubaine pour les requêtes longues en lecture seule comme les sauvegardes et l'analytique : il est très difficile de raisonner sur une requête dont les données changent pendant l'exécution. Supporté par PostgreSQL, MySQL avec InnoDB, Oracle, SQL Server, et d'autres.

### Implémentation : MVCC

Comme read committed, l'implémentation utilise des **verrous d'écriture** contre les écritures sales : une transaction qui écrit peut bloquer une autre qui écrit le même objet. Mais **les lectures n'ont besoin d'aucun verrou**. Principe clé : **les lecteurs ne bloquent jamais les écrivains, les écrivains ne bloquent jamais les lecteurs**. La base peut traiter de longues requêtes sur un instantané cohérent en même temps que des écritures, sans contention.

Pour cela, la base garde potentiellement **plusieurs versions validées d'un objet**, car des transactions en cours peuvent avoir besoin de voir l'état à des instants différents. D'où le nom de **contrôle de concurrence multi-versions** (MVCC). Si une base n'offrait que read committed, deux versions suffiraient (l'ancienne validée et la nouvelle pas encore validée). Les moteurs qui supportent l'isolation par instantané utilisent le MVCC aussi pour read committed : read committed prend **un instantané distinct pour chaque requête**, l'isolation par instantané **le même pour toute la transaction**.

Dans PostgreSQL, quand une transaction démarre, elle reçoit un **identifiant de transaction** (txid) unique, toujours croissant. Tout ce qu'elle écrit est marqué de cet identifiant. Chaque ligne d'une table a un champ **created_by** (la transaction qui l'a insérée) et un champ **deleted_by**, initialement vide. Supprimer une ligne ne la supprime pas vraiment : on renseigne `deleted_by`. Plus tard, quand il est certain qu'aucune transaction ne peut plus y accéder, un processus de **ramasse-miettes** supprime les lignes marquées et libère l'espace. Une **mise à jour** est traduite en suppression plus création. Exemple : la transaction 13 débite 100 € du compte 2 (500 → 400). La table contient alors deux lignes pour le compte 2 : celle à 500 € marquée supprimée par la 13, et celle à 400 € créée par la 13.

### Règles de visibilité

Quand une transaction lit, les identifiants servent à décider ce qu'elle peut voir :

1. au début de chaque transaction, la base dresse la liste de toutes les autres transactions **en cours** à cet instant. Leurs écritures sont **ignorées**, même si elles sont validées ensuite ;
2. les écritures des transactions **annulées** sont ignorées ;
3. les écritures des transactions avec un **identifiant plus grand** (démarrées après) sont ignorées, qu'elles soient validées ou non ;
4. toutes les autres écritures sont visibles.

Ces règles valent pour la création et la suppression. Autrement dit, un objet est visible si : (1) la transaction qui l'a créé était déjà validée quand la transaction du lecteur a démarré, et (2) l'objet n'est pas marqué supprimé, ou la transaction qui l'a supprimé n'avait pas encore validé à ce moment. Dans l'exemple, la transaction 12 lit le compte 2 et voit 500 € : la suppression est faite par la 13 (règle 3) et la création de 400 € n'est pas visible non plus.

Une transaction longue peut continuer à lire des valeurs qui, du point de vue des autres, ont été écrasées depuis longtemps. En ne mettant jamais à jour sur place mais en créant une nouvelle version à chaque changement, la base fournit un instantané cohérent avec un surcoût faible.


### Index et variantes

Comment les index fonctionnent-ils dans une base multi-versions ? Une option : l'index pointe vers **toutes les versions** d'un objet, et une requête d'index doit filtrer celles qui ne sont pas visibles. Quand le ramasse-miettes retire d'anciennes versions, leurs entrées d'index disparaissent aussi. PostgreSQL a des optimisations pour éviter les mises à jour d'index quand plusieurs versions tiennent sur la même page. Une autre approche (CouchDB, Datomic, LMDB) : un B-tree **en ajout seul / copy-on-write** : on ne modifie pas les pages, on crée une copie de chaque page modifiée et des parents jusqu'à la racine. Chaque transaction d'écriture crée une nouvelle racine, qui est un instantané cohérent de la base. Pas de filtre par identifiant, mais un processus de compactage et de ramasse-miettes est nécessaire.

### « Repeatable read » : un nom confus

Beaucoup de bases implémentent l'isolation par instantané sous un autre nom : **serializable** chez Oracle, **repeatable read** chez PostgreSQL et MySQL. La norme SQL n'a pas le concept d'instantané, car elle repose sur les niveaux de System R (1975), avant l'invention de l'isolation par instantané. Elle définit *repeatable read*, qui ressemble. PostgreSQL et MySQL l'emploient parce qu'ils satisfont ses exigences. La définition de la norme est ambiguë, et IBM DB2 utilise « repeatable read » pour la sérialisabilité. **Personne ne sait vraiment ce que repeatable read veut dire.**

## Pièges fréquents

- **Faire une sauvegarde ou un export sans instantané** : on obtient une copie incohérente.
- **Croire que « repeatable read » veut dire la même chose partout.**
- **Laisser une transaction très longue ouverte** : elle empêche le ramasse-miettes de supprimer les anciennes versions.
- **Oublier que l'instantané ne protège pas des écritures concurrentes** (leçons 4 et 5).

## À retenir

- Read skew : un état incohérent vu en deux lectures ; inacceptable pour sauvegardes et analytique.
- Isolation par instantané : lecture d'un instantané cohérent, via MVCC, sans verrous de lecture.
- Chaque version porte created_by et deleted_by ; quatre règles de visibilité par identifiant de transaction.
- Les noms (repeatable read, serializable) varient selon les bases : lire la documentation.
