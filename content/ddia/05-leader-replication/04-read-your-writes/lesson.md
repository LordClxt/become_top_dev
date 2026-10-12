---
id: ddia-ch05-l04
title: Le retard de réplication et lire ses propres écritures
source:
  chapter: 5
  pages: 161-164
duration_min: 35
concepts:
- id: ddia-read-scaling
  label: On passe à l'échelle en lecture en ajoutant des followers, mais seulement en asynchrone
- id: ddia-eventual-consistency
  label: 'Cohérence à terme : sans écriture, les followers finissent par rattraper ; « à terme » n''est pas borné'
- id: ddia-replication-lag
  label: Le retard de réplication peut monter à des secondes ou des minutes sous charge ou panne
- id: ddia-read-your-writes
  label: 'Lire ses écritures (read-after-write) : un utilisateur voit toujours ce qu''il a lui-même soumis'
- id: ddia-cross-device
  label: 'Entre appareils, retenir l''horodatage localement ne suffit plus : la métadonnée doit être centralisée'
glossary:
- term: cohérence à terme (eventual consistency)
  definition: Si on cesse d'écrire et qu'on attend, tous les réplicas finissent par converger. La durée n'est pas bornée.
- term: retard de réplication (replication lag)
  definition: Le délai entre une écriture sur le leader et sa visibilité sur un follower.
- term: read-after-write (read-your-writes)
  definition: 'Garantie : si l''utilisateur recharge la page, il voit ses propres mises à jour.'
visuals: []
labs:
- ddia-ch05-l04-lab-read-your-writes-design
- ddia-ch05-l04-lab-routing-design
extra: false
xp: 35
---

## Pourquoi c'est important

Tolérer les pannes n'est qu'une raison de répliquer. Il y a aussi le **passage à l'échelle** et la **latence**. Pour les charges composées surtout de lectures (le cas courant sur le web), on crée beaucoup de followers et on répartit les lectures : on allège le leader, et les lectures sont servies près des utilisateurs. Mais ce montage ne tient que si la réplication est **asynchrone** (avec des followers synchrones, une panne ou une coupure réseau bloquerait toutes les écritures, et plus il y a de nœuds, plus c'est probable).

Hélas, quand une application lit sur un follower asynchrone qui a pris du retard, elle peut voir des **informations périmées**. La même requête sur le leader et sur un follower, au même instant, peut donner deux résultats différents.

## La cohérence à terme

Ce désaccord est **temporaire** : si on arrête d'écrire et qu'on attend un peu, les followers rattrapent le leader et deviennent cohérents. D'où le nom de **cohérence à terme** (*eventual consistency*). Ce n'est pas propre aux bases NoSQL : des followers d'une base relationnelle asynchrone ont les mêmes caractéristiques.

« À terme » est volontairement flou : rien ne borne le retard. En régime normal, il est d'une fraction de seconde. Mais si le système tourne près de sa capacité ou si le réseau a un problème, il monte facilement à plusieurs secondes, voire minutes. Alors, les incohérences ne sont plus théoriques. On regarde trois anomalies ; la première dans cette leçon, les deux autres dans la suivante.

## Lire ses écritures

Beaucoup d'applications laissent l'utilisateur envoyer des données puis les voir : une fiche client, un commentaire sous un article. L'écriture va au leader ; la lecture peut aller à un follower (adapté quand les données sont beaucoup lues et rarement écrites). Avec la réplication asynchrone, si l'utilisateur regarde juste après avoir écrit, la nouvelle donnée n'est peut-être pas arrivée sur le follower : **elle semble perdue**. Il faut la garantie de **lecture de ses propres écritures** (*read-after-write consistency*). Elle assure que l'utilisateur voit toujours ses mises à jour. Elle ne promet rien pour celles des autres.

### Comment l'obtenir avec un leader

Plusieurs techniques :

- **lire depuis le leader ce que l'utilisateur peut avoir modifié**, et depuis un follower le reste. Ça demande de savoir sans interroger si une donnée a pu être modifiée. Exemple : son propre profil est lu sur le leader, celui des autres sur un follower ;
- si presque tout est modifiable par l'utilisateur, cette règle annule le gain de la lecture sur les followers. On peut alors lire sur le leader pendant, par exemple, **une minute après la dernière modification**, ou surveiller le retard des followers et écarter ceux qui ont plus d'une minute de retard ;
- **le client retient l'horodatage de sa dernière écriture** : le système garantit que le réplica qui sert ses lectures reflète les mises à jour au moins jusqu'à ce point. Si un réplica n'est pas assez à jour, on lit un autre, ou on attend qu'il rattrape. Ce « timestamp » peut être **logique** (un numéro d'ordre comme le LSN) ou l'horloge système (alors la synchronisation des horloges devient critique, module 10) ;
- si les réplicas sont répartis entre plusieurs datacenters, toute requête qui doit atteindre le leader doit être routée vers le datacenter qui le contient.

### Plusieurs appareils

La même personne utilise un navigateur de bureau et une application mobile. On veut une cohérence **entre appareils** : ce qu'elle saisit sur l'un, elle le voit sur l'autre. Deux difficultés :

- retenir l'horodatage de la dernière écriture devient plus dur, car le code d'un appareil ignore ce que l'autre a fait. La métadonnée doit être **centralisée** ;
- si les réplicas sont dans plusieurs datacenters, rien ne garantit que les connexions des deux appareils aboutissent au même datacenter (box à la maison d'un côté, 4G de l'autre). Si ton approche exige de lire sur le leader, il faut d'abord **router toutes les requêtes d'un utilisateur vers le même datacenter**.

> **Au-delà du livre.** Le LSN comme jeton de session est ce que font en pratique plusieurs systèmes : la requête porte « je veux au moins la position X » (PostgreSQL `pg_last_wal_replay_lsn()`, jetons de cohérence dans certains bases cloud). Tu implémentes cette idée dans le projet du module.

## Pièges fréquents

- **Lire toujours sur un follower** par défaut : l'utilisateur ne verra pas ce qu'il vient d'écrire.
- **Tout lire sur le leader** « pour être sûr » : on perd l'intérêt des followers.
- **Utiliser l'horloge locale du client** comme jeton : les horloges ne sont pas synchronisées (module 10).
- **Oublier l'autre appareil** : le jeton doit vivre côté serveur ou dans une session partagée.

## À retenir

- Passer à l'échelle en lecture suppose des followers asynchrones, donc du retard et de la cohérence à terme (non bornée).
- Lire ses écritures : lire sur le leader ce que l'utilisateur peut avoir modifié, ou exiger un réplica au moins aussi avancé que sa dernière écriture (LSN).
- Entre appareils, la position de la dernière écriture doit être centralisée et les requêtes routées de façon cohérente.
