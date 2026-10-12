---
id: ddia-ch05-l02
title: Nouveaux followers, pannes et failover
source:
  chapter: 5
  pages: 155-158
duration_min: 40
concepts:
- id: ddia-new-follower
  label: 'Ajouter un follower : instantané cohérent, position dans le log, puis rattrapage'
- id: ddia-follower-catch-up
  label: Un follower qui redémarre se rattrape depuis la dernière transaction de son propre log
- id: ddia-failover
  label: 'Failover : détecter la panne, choisir le nouveau leader, reconfigurer le système'
- id: ddia-failover-pitfalls
  label: Écritures perdues, clés réutilisées (incident GitHub), split brain et choix du timeout
- id: ddia-fencing-stonith
  label: Le fencing (STONITH) éteint l'ancien leader pour éviter deux leaders
glossary:
- term: LSN (log sequence number)
  definition: Position exacte d'une entrée dans le log de réplication ; MySQL parle de coordonnées du binlog.
- term: rattrapage (catch-up)
  definition: Le follower demande tout ce qui s'est passé depuis sa dernière position, puis suit le flux.
- term: failover
  definition: Promotion d'un follower en leader quand le leader tombe.
- term: split brain
  definition: Deux nœuds se croient leader en même temps.
- term: STONITH (fencing)
  definition: '« Shoot The Other Node In The Head » : éteindre l''ancien leader pour qu''il ne puisse plus écrire.'
visuals: []
labs:
- ddia-ch05-l02-lab-failover-design
extra: false
xp: 40
---

## Pourquoi c'est important

N'importe quel nœud peut tomber : par accident, mais aussi à cause d'une opération planifiée, comme redémarrer une machine pour appliquer un correctif de sécurité. Pouvoir redémarrer chaque nœud **sans interrompre le service** est un avantage énorme pour l'exploitation. Cette leçon explique comment on ajoute un follower, comment il se remet d'une panne, et surtout comment on survit à la panne du **leader**, là où les choses se compliquent.

## Mettre en place un nouveau follower

Pour ajouter un réplica ou en remplacer un, il faut qu'il ait une copie exacte des données. Copier simplement les fichiers ne marche pas : les clients écrivent en permanence, la copie verrait des parties de la base à des instants différents. Verrouiller la base empêcherait d'écrire, ce qui va contre la haute disponibilité. On procède donc en quatre étapes, sans interruption :

1. prendre un **instantané cohérent** du leader à un instant donné, idéalement sans verrou global (les bases savent le faire pour les sauvegardes) ;
2. copier l'instantané sur le nouveau nœud ;
3. le follower se connecte au leader et demande **tout ce qui a changé depuis l'instantané**. Cela exige que l'instantané soit associé à une **position exacte dans le log** : le *log sequence number* (LSN) chez PostgreSQL, les coordonnées du *binlog* chez MySQL ;
4. quand il a traité cet arriéré, il est **rattrapé** et suit le flux en direct.

Retiens la structure : **instantané + position + rattrapage**. On la retrouvera pour les index dérivés et le change data capture.

## Panne d'un follower : se rattraper

Chaque follower garde sur son disque le log des changements reçus. S'il redémarre, ou si le réseau est coupé un moment, il sait quelle est la dernière transaction qu'il a traitée. Il se reconnecte au leader, demande tout ce qui s'est passé depuis, l'applique, puis reprend le flux. C'est simple.

## Panne du leader : le failover

Une panne du leader est plus délicate : il faut **promouvoir** un follower, **reconfigurer** les clients pour qu'ils écrivent sur lui, et dire aux autres followers de suivre le nouveau. C'est le **failover**, manuel (un administrateur est prévenu et fait le nécessaire) ou automatique. Un failover automatique suit trois étapes.

1. **Détecter la panne.** Il n'existe pas de méthode infaillible ; presque tous utilisent un **timeout** : si un nœud ne répond pas pendant, disons, 30 secondes, on le considère mort (sauf arrêt volontaire pour maintenance).
2. **Choisir un nouveau leader.** Par élection (majorité des réplicas restants) ou par un contrôleur déjà élu. Le meilleur candidat est celui qui a **le plus de changements de l'ancien leader**, pour perdre le moins de données. Que tous s'accordent sur le même leader est un problème de **consensus** (module 12).
3. **Reconfigurer.** Les clients écrivent désormais au nouveau leader. Si l'ancien revient, il peut se croire toujours leader : le système doit le rétrograder en follower.

### Tout ce qui peut mal tourner

- **Écritures perdues.** En asynchrone, le nouveau leader peut ne pas avoir reçu toutes les écritures de l'ancien. Si l'ancien revient, que faire de ces écritures ? Le plus souvent, on les **jette**, ce qui viole la durabilité attendue par les clients.
- **Incohérence avec d'autres systèmes.** Jeter des écritures est particulièrement dangereux quand d'autres systèmes en dépendent. Incident chez GitHub : un follower MySQL en retard a été promu ; son compteur d'auto-incrément était en retard sur celui de l'ancien leader, donc il a **réutilisé des clés primaires** déjà attribuées. Ces clés servaient aussi dans un Redis : des données privées ont été montrées à de mauvais utilisateurs.
- **Split brain.** Dans certaines pannes, deux nœuds se croient leader. Si les deux acceptent des écritures sans résolution de conflit, des données seront perdues ou corrompues. Certains systèmes éteignent un des deux (**fencing**, ou STONITH), mais mal conçu, ce mécanisme peut éteindre **les deux**.
- **Quel timeout ?** Long : la reprise après une vraie panne est lente. Court : failovers inutiles lors d'un pic de charge ou d'un paquet retardé. Et un failover inutile sur un système déjà surchargé **aggrave** la situation.

Aucune solution simple : c'est pourquoi certaines équipes préfèrent un failover **manuel**, même si le logiciel sait le faire seul. Ces problèmes (pannes de nœuds, réseaux peu fiables, compromis entre cohérence, durabilité, disponibilité et latence) sont fondamentaux ; les modules 10 à 12 les creusent.

## Pièges fréquents

- **Promouvoir le premier follower venu.** Il faut le plus à jour, comparé à la position dans le log.
- **Oublier ce qui dépend des identifiants** (clés auto-incrémentées, caches, index externes) : un leader en retard peut les réutiliser.
- **Un timeout figé à 30 s sans lien avec la charge réelle.**
- **Ne pas prévoir quoi faire de l'ancien leader** quand il revient.

## À retenir

- Nouveau follower = instantané cohérent + position dans le log + rattrapage.
- Follower en panne : il reprend depuis sa dernière entrée. Leader en panne : failover en trois étapes (détecter, élire, reconfigurer).
- Le failover asynchrone perd des écritures, réutilise des identifiants, peut créer un split brain, et son timeout est un compromis.
