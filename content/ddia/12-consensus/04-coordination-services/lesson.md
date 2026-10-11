---
id: ddia-ch12-l04
title: "Services de coordination : ZooKeeper et etcd"
source: { chapter: 9, pages: "370-373" }
duration_min: 35
concepts:
  - id: ddia-coord-service-features
    label: "ZooKeeper et etcd : peu de données en mémoire, répliquées par diffusion à ordre total ; opérations atomiques linéarisables, ordre total, détection de pannes, notifications"
  - id: ddia-coord-fencing-zxid
    label: "L'ordre total des opérations fournit des jetons de clôture croissants (zxid, version)"
  - id: ddia-coord-work-allocation
    label: "Allocation du travail : élire un leader, attribuer les partitions, rééquilibrer, en sous-traitant le consensus à 3 ou 5 nœuds"
  - id: ddia-coord-slow-changing-data
    label: "Un service de coordination stocke des données qui changent lentement, pas l'état applicatif à haut débit"
  - id: ddia-coord-service-discovery
    label: "Découverte de services : s'enregistrer au démarrage ; le DNS suffit souvent, le consensus sert à trouver le leader"
  - id: ddia-coord-membership
    label: "Services d'appartenance : s'accorder sur les nœuds vivants, même au risque de déclarer mort un nœud vivant"
  - id: ddia-consensus-equivalence
    label: "Bilan : CAS linéarisable, commit atomique, diffusion à ordre total, verrous et baux, unicité sont réductibles au consensus"
glossary:
  - term: "service de coordination"
    definition: "Petit magasin clé-valeur répliqué par consensus (ZooKeeper, etcd), conçu pour coordonner d'autres systèmes."
  - term: "nœud éphémère (ephemeral node)"
    definition: "Entrée ZooKeeper liée à la session d'un client : elle disparaît quand la session expire."
  - term: "watch"
    definition: "Abonnement d'un client aux changements d'une clé : il est notifié au lieu de devoir interroger sans cesse."
  - term: "zxid"
    definition: "Identifiant de transaction ZooKeeper, croissant selon l'ordre total des opérations ; utilisable comme jeton de clôture."
  - term: "observer"
    definition: "Réplica ZooKeeper en lecture seule : il reçoit le log des décisions sans voter."
  - term: "Chubby"
    definition: "Service de verrous de Google qui a inspiré ZooKeeper et etcd."
visuals: []
labs: [ddia-ch12-l04-lab-coordination-design]
xp: 40
---

## Pourquoi c'est important

HBase, Hadoop YARN, OpenStack Nova, Kafka (avant KRaft) s'appuient sur ZooKeeper ; Kubernetes stocke tout son état dans etcd. Ces systèmes n'implémentent pas eux-mêmes le consensus : ils le **sous-traitent** à un service spécialisé. C'est ainsi que tu utiliseras le consensus dans la vraie vie, rarement en l'écrivant, souvent en appelant l'API d'un service de coordination. Encore faut-il savoir ce qu'il fait bien… et ce qu'il ne faut surtout pas lui confier.

## Un drôle de magasin clé-valeur

On décrit souvent ZooKeeper et etcd comme des « magasins clé-valeur distribués » ou des « services de coordination et de configuration ». Leur API ressemble à celle d'une base : lire et écrire la valeur d'une clé, parcourir des clés. Mais ils sont conçus pour des **petites quantités de données qui tiennent entièrement en mémoire** (écrites sur disque pour la durabilité, tout de même). Ces données sont répliquées sur tous les nœuds par un algorithme de **diffusion à ordre total tolérant aux pannes** (Zab pour ZooKeeper, Raft pour etcd). Ils s'inspirent du service de verrous **Chubby** de Google.

ZooKeeper offre, en plus de la diffusion à ordre total, quatre fonctions qui le rendent utile :

- **des opérations atomiques linéarisables** : avec un compare-and-set atomique, tu implémentes un verrou. Si plusieurs nœuds tentent la même opération, une seule réussit. Le consensus garantit que l'opération reste atomique et linéarisable même si des nœuds tombent ou si le réseau coupe. Un verrou distribué s'implémente en général comme un **bail** (*lease*) qui expire, pour être libéré si son détenteur meurt ;
- **un ordre total des opérations** : chaque opération reçoit un identifiant de transaction croissant (**zxid**) et un numéro de version. Rappel du chapitre « Quand le réseau ment » : un détenteur de verrou en pause peut se croire encore détenteur ; un **jeton de clôture** croissant permet au stockage de rejeter ses écritures. Le zxid joue ce rôle ;
- **la détection de pannes** : chaque client maintient une **session** longue avec les serveurs et échange des battements de cœur. Si la session expire (plus de battements pendant plus que le délai de session), les verrous qu'elle détenait peuvent être libérés automatiquement : ce sont les **nœuds éphémères** ;
- **les notifications de changement** : un client peut lire les verrous et valeurs posés par d'autres, et **surveiller** (*watch*) leurs changements. Il apprend qu'un client a rejoint le cluster (nouvelle valeur) ou qu'un client est mort (session expirée, nœud éphémère supprimé) sans interroger en boucle.

Seules les opérations atomiques linéarisables exigent vraiment le consensus. C'est la **combinaison** des quatre qui rend ces services si pratiques pour la coordination.

## Allouer le travail aux nœuds

Deux usages reviennent sans cesse :

- **élire un leader** parmi plusieurs instances d'un processus ou d'un service : le planificateur de tâches dont une seule instance doit être active, le leader d'une base ;
- **attribuer des partitions** : quand une ressource est partitionnée (base, flux de messages, stockage de fichiers), décider quelle partition va à quel nœud, puis **rééquilibrer** quand un nœud rejoint le cluster ou tombe (chapitre « Partitionnement »).

Les opérations atomiques, les nœuds éphémères et les notifications font exactement ce travail. Exemple : un cluster de 40 nœuds de stockage et 400 partitions. Chaque nœud crée au démarrage un nœud éphémère `/members/node-17`. Un rééquilibreur surveille `/members` ; quand `node-17` meurt, sa session expire, l'entrée disparaît, le rééquilibreur est notifié et réattribue ses 10 partitions en écrivant `/partitions/123 → node-04` par compare-and-set. Bien fait, l'application se rétablit seule, sans intervention humaine. Ce n'est pas trivial même avec ZooKeeper, d'où des bibliothèques comme **Apache Curator** qui fournissent ces recettes toutes faites.

Le point clé : ZooKeeper tourne en général sur un **nombre fixe** de nœuds, **3 ou 5**, qui votent par majorité, tout en servant un nombre potentiellement **très grand** de clients. Les 40 nœuds de stockage n'ont pas à faire de consensus entre eux : ils **sous-traitent** la coordination à 3 ou 5 nœuds.

## Des données qui changent lentement

Ce que ZooKeeper gère change **lentement** : « le nœud 10.1.1.23 est leader de la partition 7 », une information qui bouge à l'échelle de la minute ou de l'heure. Il n'est **pas** fait pour l'état applicatif à l'exécution, qui peut changer des milliers ou des millions de fois par seconde. Si tu dois répliquer ce genre d'état, d'autres outils existent (Apache BookKeeper, par exemple).

Ordre de grandeur : 50 000 écritures par seconde passées par un vote de majorité sur 5 nœuds, c'est le meilleur moyen d'effondrer le service dont dépend tout ton cluster.

## Découverte de services

On utilise aussi ZooKeeper, etcd ou Consul pour la **découverte de services** : trouver l'adresse IP où joindre un service donné. Dans un datacenter cloud, les machines virtuelles vont et viennent, et on ne connaît pas ces adresses à l'avance. On configure donc chaque service pour qu'il **enregistre** son point d'accès dans un registre au démarrage ; les autres l'y trouvent.

Mais la découverte de services exige-t-elle un consensus ? Pas forcément. Le **DNS** est la méthode traditionnelle : il utilise plusieurs couches de cache, ses lectures ne sont pas linéarisables, et c'est en général sans gravité qu'une réponse ait quelques secondes de retard. Il est plus important que le DNS soit disponible et robuste aux coupures réseau.

En revanche, **l'élection de leader** exige un consensus. Si ton système de consensus sait déjà qui est le leader, autant qu'il aide les autres à le trouver. Certains systèmes de consensus ont pour cela des **réplicas en lecture seule** (les *observers* de ZooKeeper) : ils reçoivent le log de toutes les décisions sans participer au vote, et servent les lectures qui n'ont pas besoin d'être linéarisables.

## Services d'appartenance

ZooKeeper et ses semblables descendent d'une longue lignée de recherche sur les **services d'appartenance** (*membership services*), qui remonte aux années 1980 et a servi à des systèmes très fiables, comme le contrôle du trafic aérien.

Un service d'appartenance détermine quels nœuds sont **actuellement membres actifs** du cluster. Les délais réseau étant illimités, impossible de détecter une panne avec certitude. Mais en couplant la détection de pannes et le consensus, les nœuds peuvent au moins **s'accorder** sur qui est vivant.

Il peut encore arriver qu'un nœud soit déclaré mort à tort, alors qu'il est vivant. C'est quand même très utile qu'on soit tous d'accord : par exemple, choisir comme leader le membre actif de **plus petit numéro** devient trivial, alors que sans vue commune, chaque nœud pourrait désigner un leader différent.

## Bilan : tout se ramène au consensus

Le chapitre se clôt sur une idée forte : une série de problèmes sont **équivalents** au consensus. Si tu sais résoudre l'un, tu sais résoudre les autres :

- un registre **compare-and-set linéarisable** ;
- le **commit atomique** d'une transaction ;
- la **diffusion à ordre total** ;
- les **verrous et baux** ;
- un **service d'appartenance et de coordination** ;
- une **contrainte d'unicité** (deux personnes ne prennent pas le même nom d'utilisateur).

Avec un seul leader, tout est simple… jusqu'à sa panne. Trois options alors : **attendre** qu'il revienne (c'est ce que fait 2PC ; pas de terminaison), **basculer à la main** (un opérateur choisit le nouveau leader et reconfigure le système), ou **élire automatiquement** un nouveau leader avec un algorithme de consensus. Et tous les systèmes n'en ont pas besoin : la réplication multi-leader et sans leader (chapitre « Multi-leader et sans leader ») s'en passe, au prix de conflits à résoudre.

## Pièges fréquents

- **Stocker l'état applicatif à haut débit dans ZooKeeper ou etcd** : ils sont faits pour des données qui changent lentement.
- **Agrandir l'ensemble ZooKeeper pour servir plus de clients** : plus de votants ralentit les écritures ; ajoute plutôt des observers pour les lectures.
- **Mettre le consensus dans la découverte de services quand le DNS suffit** : des lectures légèrement en retard sont souvent acceptables.
- **Utiliser un verrou ZooKeeper sans jeton de clôture** : un détenteur en pause écrira après l'expiration de son bail.
- **Réinventer les recettes** : élection et verrous sont subtils ; Curator ou les primitives d'etcd existent pour ça.

## À retenir

- ZooKeeper/etcd : peu de données, en mémoire, répliquées par diffusion à ordre total ; opérations atomiques linéarisables, ordre total (zxid), sessions et nœuds éphémères, notifications.
- Usages : élection de leader, attribution et rééquilibrage de partitions, découverte de services, appartenance.
- 3 ou 5 nœuds votent, des milliers de clients en profitent : on sous-traite le consensus.
- Données lentes seulement ; pas d'état applicatif à haut débit.
- CAS linéarisable, commit atomique, ordre total, verrous, appartenance et unicité sont tous équivalents au consensus.
