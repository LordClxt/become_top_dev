---
id: ddia-ch06-l02
title: "Conflits d'écriture et topologies"
source: { chapter: 5, pages: "171-177" }
duration_min: 40
concepts:
  - id: ddia-write-conflict-detection
    label: "En multi-leader, un conflit n'est détecté qu'après coup, quand la réplication asynchrone apporte l'autre écriture"
  - id: ddia-conflict-avoidance
    label: "Éviter les conflits : faire passer toutes les écritures d'un enregistrement par le même leader"
  - id: ddia-conflict-convergence
    label: "Converger : tous les réplicas doivent aboutir à la même valeur (identifiant gagnant, fusion, ou conflit conservé)"
  - id: ddia-custom-conflict-resolution
    label: "Résolution par l'application : à l'écriture (gestionnaire en arrière-plan) ou à la lecture (versions présentées au code)"
  - id: ddia-replication-topologies
    label: "Topologies circulaire, en étoile et all-to-all : chemins de propagation et tolérance aux pannes"
  - id: ddia-topology-causality
    label: "En all-to-all, des messages se doublent : une mise à jour peut arriver avant l'insertion qu'elle modifie"
glossary:
  - term: "conflit d'écriture"
    definition: "Deux écritures concurrentes, acceptées par deux leaders différents, qui modifient le même enregistrement de façon incompatible."
  - term: "LWW (last write wins)"
    definition: "Règle de convergence qui garde l'écriture au plus grand horodatage et jette silencieusement les autres."
  - term: "topologie de réplication"
    definition: "Graphe des chemins par lesquels les écritures se propagent d'un leader à l'autre."
  - term: "CRDT (conflict-free replicated datatype)"
    definition: "Structure de données (ensemble, compteur, liste…) conçue pour que des modifications concurrentes fusionnent toujours automatiquement et de façon cohérente."
  - term: "transformation opérationnelle (OT)"
    definition: "Algorithme de fusion des éditions concurrentes d'une liste ordonnée (les caractères d'un texte), utilisé par Etherpad et Google Docs."
visuals: []
labs: [ddia-ch06-l02-lab-conflict-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente a montré **pourquoi** on accepte plusieurs leaders. Cette leçon traite de **ce que cela coûte** : deux personnes modifient la même donnée en même temps sur deux leaders différents, et chacune reçoit « OK ». Que doit contenir la base ensuite ? Si tu ne réponds pas explicitement à cette question, ta base y répond pour toi — souvent en **jetant une écriture sans prévenir personne**. Savoir reconnaître, éviter, puis résoudre ces conflits est ce qui sépare une architecture multi-leader qui fonctionne d'une source de pertes de données silencieuses.

## Un conflit, concrètement

Une page de wiki s'appelle « A ». Alice la renomme « B » ; elle est connectée au leader 1. Au même moment, Bob la renomme « C » via le leader 2. Chaque leader valide localement, chaque utilisateur voit son titre. Quelques dizaines de millisecondes plus tard, la réplication asynchrone apporte au leader 1 l'écriture de Bob, et au leader 2 celle d'Alice : **conflit**.

### Détection synchrone ou asynchrone

Avec un seul leader, ce conflit ne peut pas arriver ainsi : la seconde écriture attend la première ou est annulée, et l'utilisateur peut réessayer. En multi-leader, les deux écritures ont **déjà réussi** quand on découvre le conflit ; il est trop tard pour demander à Alice ou Bob de recommencer.

On pourrait rendre la détection synchrone : attendre que l'écriture soit répliquée sur tous les leaders avant de répondre. Mais on perd alors l'avantage principal (chaque leader écrit seul). Autant prendre un leader unique.

## Stratégie 1 : éviter les conflits

La plus simple, et la plus recommandée : faire en sorte que **toutes les écritures d'un même enregistrement passent par le même leader**. Exemple : chaque utilisateur a un datacenter « maison » (le plus proche de chez lui), et toutes les modifications de son profil y sont routées. Du point de vue de cet utilisateur, c'est un leader unique.

La stratégie casse quand il faut **changer de leader désigné** : le datacenter maison est en panne, ou l'utilisateur a déménagé de Lyon à Montréal. Pendant la bascule, deux leaders peuvent recevoir des écritures concurrentes pour le même enregistrement, et l'on retombe dans le cas général.

## Stratégie 2 : converger

Avec un leader unique, l'ordre des écritures est défini et la dernière gagne. En multi-leader, **il n'y a pas d'ordre défini** : le leader 1 voit B puis C, le leader 2 voit C puis B. Si chacun appliquait simplement les écritures dans l'ordre d'arrivée, le leader 1 finirait sur C et le leader 2 sur B : les réplicas **divergeraient pour toujours**. Toute stratégie doit donc être **convergente** : quand tous les changements sont répliqués, tous les réplicas ont la même valeur.

Quatre façons d'y arriver :

1. **Un identifiant unique par écriture**, et l'identifiant le plus grand gagne. Si c'est un horodatage, c'est le **LWW** (*last write wins*). Très répandu, et **pertes de données garanties** : l'écriture de Bob a été acquittée, puis elle disparaît.
2. **Un identifiant unique par réplica**, et le réplica au plus grand numéro gagne. Même défaut.
3. **Fusionner les valeurs** : par exemple les trier et les concaténer, ce qui donne le titre « B/C ».
4. **Conserver le conflit** dans une structure explicite qui garde toutes les écritures, et laisser du code applicatif le résoudre plus tard, éventuellement en demandant à l'utilisateur.

Chiffrons le coût du LWW : un service reçoit 50 000 écritures par jour sur des enregistrements partagés, dont 0,2 % entrent en conflit. LWW fait perdre **100 écritures acquittées par jour**, sans erreur ni trace.

## Stratégie 3 : du code de résolution

La plupart des outils multi-leader te laissent écrire ta propre logique. Elle peut s'exécuter à deux moments :

- **à l'écriture** : dès que la base repère un conflit dans le flux de changements répliqués, elle appelle ton gestionnaire. Bucardo, par exemple, accepte un bout de Perl. Le gestionnaire tourne **en arrière-plan** et doit être rapide ; il ne peut **pas** demander à l'utilisateur ;
- **à la lecture** : la base stocke toutes les versions en conflit ; la prochaine lecture les renvoie toutes, et l'application les résout (seule ou en demandant à l'utilisateur), puis réécrit le résultat. C'est le fonctionnement de **CouchDB**.

Attention : la résolution se fait **enregistrement par enregistrement**, pas transaction par transaction. Une transaction qui modifie trois lignes de façon cohérente peut voir chacune de ses lignes résolue séparément, et l'atomicité d'ensemble est perdue.

Le code de résolution est un nid à bogues. Exemple cité dans le livre : pendant un temps, la fusion du panier d'Amazon **conservait les articles ajoutés mais pas les articles retirés** ; des clients voyaient réapparaître des articles qu'ils avaient supprimés.

### Aller plus loin : la résolution automatique

Le livre signale des recherches prometteuses pour éviter d'écrire ce code soi-même :

- les **CRDT** (*conflict-free replicated datatypes*) : ensembles, compteurs, dictionnaires, listes ordonnées qui fusionnent toujours sans conflit (Riak 2.0 en propose) ;
- les **structures persistantes fusionnables**, qui gardent l'historique comme Git et font une fusion à trois voies ;
- la **transformation opérationnelle**, derrière Etherpad et Google Docs, conçue pour les éditions concurrentes d'une liste ordonnée de caractères.

Depuis, des bibliothèques comme Automerge ou Yjs ont popularisé les CRDT pour les applications collaboratives hors ligne.

## Qu'est-ce qu'un conflit ?

Certains sont évidents (deux titres différents pour la même page). D'autres sont subtils : un système de réservation de salles. Alice réserve la salle Turing de 14 h à 15 h sur le leader 1 ; Bob réserve la même salle de 14 h 30 à 15 h 30 sur le leader 2. Chaque leader a vérifié localement que la salle était libre. Les deux réservations sont des **lignes différentes**, aucune n'écrase l'autre, et pourtant la règle métier est violée. Ce genre de conflit reviendra au module sur l'isolation.

## Topologies de réplication

Avec deux leaders, il n'y a qu'un chemin possible. Au-delà, la **topologie** décrit qui envoie ses écritures à qui :

- **circulaire** : chaque nœud reçoit les écritures d'un voisin et les transmet, avec les siennes, au suivant (topologie par défaut de MySQL) ;
- **en étoile** : un nœud racine reçoit tout et redistribue à tous les autres (généralisable en arbre) ;
- **all-to-all** : chaque leader envoie à tous les autres.

En circulaire et en étoile, une écriture traverse plusieurs nœuds. Pour éviter qu'elle tourne en boucle, chaque nœud a un identifiant, et chaque écriture du flux porte la **liste des nœuds déjà traversés** ; un nœud ignore une écriture qui porte déjà le sien.

Le défaut de ces deux topologies : **un nœud en panne interrompt la propagation**. Sur un anneau de 4 nœuds, si le nœud 2 tombe, les écritures du nœud 1 n'atteignent plus ni 3 ni 4 tant qu'on n'a pas reconfiguré l'anneau, souvent à la main. En étoile, la racine est un point unique de défaillance. L'all-to-all tolère mieux les pannes, car les messages ont plusieurs chemins.

### Le piège de l'all-to-all

Certains liens sont plus rapides que d'autres : un message peut en **doubler** un autre. Un client insère une ligne sur le leader 1 ; un autre client la modifie aussitôt sur le leader 3. Le leader 2 peut recevoir la **mise à jour avant l'insertion** : il doit modifier une ligne qui n'existe pas encore. C'est un problème de **causalité**, cousin des lectures de préfixe cohérent du module précédent. Les horodatages ne suffisent pas à remettre de l'ordre, car les horloges des leaders ne sont pas assez synchronisées ; il faut des **vecteurs de versions** (leçon 5).

Le livre note que la détection de conflits est mal implémentée dans beaucoup de systèmes multi-leader : PostgreSQL BDR ne garantit pas l'ordre causal des écritures, et Tungsten Replicator pour MySQL ne tente même pas de détecter les conflits. Lis la documentation, et **teste** ta base dans ces scénarios.

## Pièges fréquents

- **Laisser le LWW par défaut** sur des données dont la perte compte : chaque conflit efface une écriture acquittée.
- **Supposer que « lignes différentes » veut dire « pas de conflit »** : les réservations qui se chevauchent prouvent le contraire.
- **Écrire un gestionnaire de conflit qui « garde les ajouts »** sans penser aux suppressions : les articles retirés ressuscitent.
- **Croire qu'un anneau est robuste** parce que chaque nœud a deux voisins : une seule panne coupe la propagation.
- **Remettre de l'ordre avec des horodatages** entre leaders dont les horloges dérivent.

## À retenir

- En multi-leader, les conflits sont découverts **après** que les deux écritures ont réussi.
- Le mieux est de les **éviter** (un leader par enregistrement) ; sinon il faut **converger** : identifiant gagnant (LWW, avec pertes), fusion, ou conflit conservé et résolu par l'application, **à l'écriture** ou **à la lecture**.
- Topologies : circulaire et étoile fragiles aux pannes ; all-to-all plus robuste mais exposé aux messages qui se doublent, que seuls des vecteurs de versions remettent dans l'ordre causal.
