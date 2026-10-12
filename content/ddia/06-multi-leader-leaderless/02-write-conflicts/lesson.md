---
id: ddia-ch06-l02
title: Les conflits d'écriture et leur résolution
source:
  chapter: 5
  pages: 171-175
duration_min: 40
concepts:
- id: ddia-write-conflict
  label: 'Un conflit : deux leaders modifient la même donnée concurremment ; il n''est détecté qu''en asynchrone, après coup'
- id: ddia-conflict-avoidance
  label: 'Éviter les conflits : acheminer toutes les écritures d''une donnée vers le même leader (datacenter d''origine)'
- id: ddia-convergence
  label: Tous les réplicas doivent converger vers la même valeur finale, quel que soit l'ordre d'arrivée
- id: ddia-lww
  label: Dernier écrivain gagne (LWW) et ID de réplica convergent mais perdent des données
- id: ddia-custom-resolution
  label: 'Résolution personnalisée : à l''écriture (handler) ou à la lecture (conserver les versions, résoudre au prochain accès)'
- id: ddia-crdt-ot
  label: 'CRDT, structures persistantes fusionnables, transformation opérationnelle : résolution automatique'
glossary:
- term: LWW (last write wins)
  definition: Chaque écriture porte un horodatage ; on garde la plus grande et on jette les autres.
- term: convergence
  definition: Quand tous les changements ont été répliqués, tous les réplicas ont la même valeur finale.
- term: CRDT
  definition: Famille de structures de données (ensembles, compteurs, listes) qui fusionnent automatiquement des modifications concurrentes.
- term: transformation opérationnelle (OT)
  definition: Algorithme de résolution derrière Etherpad et Google Docs, conçu pour l'édition de listes ordonnées, comme le texte.
visuals: []
labs:
- ddia-ch06-l02-lab-conflict-resolution-design
extra: false
xp: 40
---

## Pourquoi c'est important

Le gros problème du multi-leader, ce sont les **conflits d'écriture**. Exemple : une page de wiki modifiée par deux personnes en même temps. L'utilisateur 1 change le titre de A en B, l'utilisateur 2 de A en C. Chaque changement est accepté par son leader local. Quand ils sont répliqués en asynchrone, **le conflit apparaît**. Cela n'arrive pas dans une base à un seul leader.

## Détection : synchrone contre asynchrone

Dans une base mono-leader, le second écrivain **attend** que le premier ait fini ou voit sa transaction **annulée** (il doit réessayer). En multi-leader, **les deux écritures réussissent** et le conflit n'est détecté qu'**après coup**, trop tard pour demander à l'utilisateur de trancher. En théorie, on pourrait rendre la détection synchrone : attendre que l'écriture soit répliquée partout avant de répondre. Mais on perdrait l'avantage principal du multi-leader (chaque réplica accepte les écritures indépendamment). Autant utiliser un mono-leader.

## Éviter les conflits

La stratégie la plus simple : **les éviter**. Si l'application garantit que toutes les écritures d'une donnée passent par le même leader, il n'y a pas de conflit. Beaucoup d'implémentations gèrent mal les conflits, donc cette approche est très recommandée. Exemple : un utilisateur modifie ses propres données ; ses requêtes vont toujours au même datacenter, son « datacenter d'origine » (choisi, par exemple, par proximité). De son point de vue, la configuration est **mono-leader**. Mais si un datacenter tombe, ou si l'utilisateur déménage, l'évitement s'effondre : il faut gérer des écritures concurrentes sur des leaders différents.

## Converger vers un état cohérent

Dans une base mono-leader, les écritures s'appliquent dans un ordre séquentiel : la dernière écriture détermine la valeur. En multi-leader, **il n'y a pas d'ordre défini**. Dans l'exemple du titre, le leader 1 voit B puis C ; le leader 2 voit C puis B. Si chaque réplica appliquait simplement les écritures dans l'ordre où il les reçoit, le leader 1 finirait avec C et le leader 2 avec B : **inacceptable**. Tout schéma de réplication doit garantir la **convergence** : tous les réplicas arrivent à la même valeur finale quand tous les changements sont répliqués. Plusieurs moyens :

- donner à chaque écriture un **identifiant unique** (horodatage, long nombre aléatoire, UUID, hachage de la clé et de la valeur), garder celle de plus grand identifiant et jeter les autres. Avec un horodatage, c'est le **dernier écrivain gagne** (LWW). Populaire, mais **dangereusement exposé à la perte de données** ;
- donner un identifiant à chaque **réplica** et faire gagner les écritures du réplica au plus grand numéro : perte de données aussi ;
- **fusionner** les valeurs d'une manière ou d'une autre (les trier par ordre alphabétique et les concaténer : « B/C ») ;
- **enregistrer le conflit** dans une structure explicite qui conserve toute l'information et écrire du code applicatif qui le résout plus tard (peut-être en demandant à l'utilisateur).

### Résolution personnalisée

Le bon choix dépend de l'application, donc la plupart des outils laissent écrire la logique de résolution. Elle s'exécute :

- **à l'écriture** : dès que le système détecte un conflit dans le log de réplication, il appelle un gestionnaire. Il ne peut en général pas interroger un utilisateur : il tourne en arrière-plan et doit être rapide (Bucardo permet d'y mettre un bout de Perl) ;
- **à la lecture** : quand un conflit est détecté, toutes les versions conflictuelles sont stockées. À la prochaine lecture, l'application les reçoit, peut demander à l'utilisateur ou résoudre seule, puis réécrit le résultat. CouchDB fonctionne ainsi.

La résolution s'applique généralement à une **ligne ou un document**, pas à une transaction entière : dans une transaction qui écrit plusieurs choses atomiquement, chaque écriture est traitée séparément.

### Résolution automatique

Les règles de résolution deviennent vite complexes, et le code maison est source d'erreurs. Un exemple cité : à une époque, chez Amazon, la logique de conflit du panier **préservait les articles ajoutés mais pas ceux retirés** : des clients voyaient réapparaître des articles retirés. Des recherches visent à résoudre automatiquement :

- les **CRDT** (*conflict-free replicated datatypes*) : ensembles, dictionnaires, listes ordonnées, compteurs modifiables concurremment, avec une fusion sensée automatique. Certains existent dans Riak 2.0 ;
- les **structures de données persistantes fusionnables** : elles gardent l'historique comme Git et utilisent une fusion à **trois voies** (les CRDT utilisent une fusion à deux voies) ;
- la **transformation opérationnelle** (OT), derrière Etherpad et Google Docs, conçue pour l'édition concurrente d'une liste ordonnée comme les caractères d'un texte.

Ces algorithmes sont encore jeunes dans les bases de données, mais pourraient simplifier la synchronisation multi-leader.

### Qu'est-ce qu'un conflit ?

Certains sont évidents : deux écritures modifient le même champ du même enregistrement avec deux valeurs. D'autres sont subtils. Un système de réservation de salles ne doit jamais permettre deux réservations qui se chevauchent pour la même salle. Même si l'application vérifie la disponibilité avant d'accepter, deux réservations faites **sur deux leaders différents** créent un conflit. Il n'y a pas de réponse prête à l'emploi ; les chapitres suivants (transactions, module 08) fournissent des outils pour y réfléchir.

> **Au-delà du livre.** LWW est le seul mode de résolution de Cassandra, et il est facile de perdre des données quand les horloges dérivent d'une seconde seulement. La parade recommandée : ne jamais modifier une clé, utiliser un UUID par écriture.

## Pièges fréquents

- **Utiliser LWW « parce que c'est simple »** quand chaque écriture compte.
- **Oublier de gérer le cas du déménagement ou de la panne** quand on a basé l'évitement sur un datacenter d'origine.
- **Écrire un gestionnaire de conflit qui garde les ajouts mais pas les suppressions.**
- **Croire que la validation avant écriture suffit** (réservation de salle) : chaque leader valide sur sa vue locale.

## À retenir

- En multi-leader, les deux écritures réussissent et le conflit est détecté plus tard ; la meilleure stratégie est de les éviter.
- Les réplicas doivent converger. LWW et ID de réplica convergent mais perdent des données ; fusion et conservation des conflits préservent l'information.
- Résolution : à l'écriture ou à la lecture, en code maison ou avec des CRDT / OT.
