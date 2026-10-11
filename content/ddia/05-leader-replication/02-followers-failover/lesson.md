---
id: ddia-ch05-l02
title: "Nouveaux followers, rattrapage et failover"
source: { chapter: 5, pages: "155-158" }
duration_min: 40
concepts:
  - id: ddia-follower-bootstrap
    label: "Ajouter un follower : snapshot cohérent, copie, puis rattrapage depuis la position exacte du snapshot dans le log"
  - id: ddia-follower-catchup
    label: "Rattrapage : un follower redémarré reprend le log du leader à partir de la dernière position qu'il a appliquée"
  - id: ddia-leader-failover
    label: "Failover : détecter la panne du leader, choisir le follower le plus à jour, reconfigurer clients et followers"
  - id: ddia-failover-lost-writes
    label: "Après un failover asynchrone, les écritures que l'ancien leader n'avait pas transmises sont jetées"
  - id: ddia-failover-split-brain
    label: "Split brain : deux nœuds se croient leader et acceptent des écritures"
  - id: ddia-failover-timeout
    label: "Délai de détection : trop long retarde la reprise, trop court déclenche des failovers inutiles"
glossary:
  - term: "snapshot cohérent"
    definition: "Une image de la base à un instant précis, prise sans bloquer les écritures, associée à une position exacte dans le log de réplication."
  - term: "LSN (log sequence number)"
    definition: "Numéro de position dans le log de PostgreSQL. MySQL parle de coordonnées du binlog."
  - term: "rattrapage (catch-up recovery)"
    definition: "Un follower demande au leader tous les changements depuis la dernière position qu'il a appliquée."
  - term: "failover"
    definition: "Promotion d'un follower au rang de leader après la panne de l'ancien, puis reconfiguration du système autour de lui."
  - term: "split brain"
    definition: "Situation où deux nœuds se croient leader en même temps ; sans résolution des conflits, les données divergent ou se perdent."
  - term: "STONITH (Shoot The Other Node In The Head)"
    definition: "Mécanisme de fencing qui éteint de force l'autre nœud quand deux leaders sont détectés."
visuals: []
labs: [ddia-ch05-l02-lab-failover-design]
xp: 40
---

## Pourquoi c'est important

Une base répliquée n'est jamais statique. On ajoute des followers pour absorber la charge, on en redémarre pour appliquer un correctif du noyau, et un jour le leader tombe à 3 h du matin. L'objectif affiché est séduisant : **redémarrer n'importe quel nœud sans interruption de service**. Mais le failover est l'une des opérations les plus dangereuses d'un système de données. Bien des pannes célèbres ne viennent pas de la panne initiale, mais de la façon dont le système a réagi. Cette leçon décrit les mécanismes et, surtout, leurs pièges.

## Ajouter un follower

Copier les fichiers de données du leader ne suffit pas : pendant la copie, les clients continuent d'écrire, et chaque fichier serait copié à un instant différent. Verrouiller la base pendant la copie rendrait les écritures indisponibles. La procédure standard, sans interruption :

1. **Prendre un snapshot cohérent** du leader à un instant donné, sans verrouiller toute la base. La plupart des bases le savent déjà faire pour leurs sauvegardes ; pour MySQL on utilise parfois un outil tiers comme innobackupex.
2. **Copier le snapshot** sur le nouveau nœud.
3. Le follower se connecte au leader et **demande tous les changements survenus depuis le snapshot**. C'est possible parce que le snapshot est associé à une **position exacte** dans le log de réplication : le **LSN** (*log sequence number*) de PostgreSQL, les **coordonnées du binlog** de MySQL.
4. Quand il a appliqué tout l'arriéré, il a **rattrapé** le leader et suit désormais le flux en continu.

Exemple chiffré : un snapshot de 2 To est pris au LSN 8 400 000. La copie dure 3 heures, pendant lesquelles le leader écrit 1 500 changements par seconde, soit 16,2 millions de changements. Le follower demande « tout ce qui suit 8 400 000 », les applique, puis suit le flux. Sans la position, il ne saurait pas où reprendre : il rejouerait des changements déjà contenus dans le snapshot ou en sauterait.

## Panne d'un follower : le rattrapage

Chaque follower garde, sur son disque local, le log des changements reçus. S'il plante, redémarre, ou si le réseau le coupe du leader, il relit son log pour savoir **quelle est la dernière transaction appliquée**, puis demande au leader tout ce qui suit. Une fois l'arriéré appliqué, il reprend le flux normal. C'est exactement l'étape 3 ci-dessus, avec sa propre position à la place de celle du snapshot.

Un détail compte : l'application d'un changement doit pouvoir être **rejouée sans dommage**. Si le follower meurt après avoir appliqué le changement 900 mais avant d'avoir noté sa position, il redemandera le 900. Le comparer à la dernière position appliquée suffit à l'ignorer.

## Panne du leader : le failover

C'est plus délicat. Il faut **promouvoir** un follower, que les clients envoient leurs écritures au nouveau leader, et que les autres followers consomment ses changements. Ce **failover** peut être manuel (un administrateur reçoit l'alerte et agit) ou automatique. Un failover automatique enchaîne trois étapes :

1. **Constater que le leader est en panne.** Crash, coupure de courant, réseau : impossible de savoir ce qui s'est passé. Les nœuds s'envoient des messages de vie, et un nœud qui ne répond pas pendant un certain **délai** (disons 30 secondes) est déclaré mort. Si c'est une maintenance planifiée, on n'a évidemment pas besoin de deviner.
2. **Choisir un nouveau leader.** Par une élection (la majorité des réplicas restants choisit), ou par un **nœud contrôleur** désigné à l'avance. Le meilleur candidat est le réplica qui a les **changements les plus récents**, pour minimiser la perte. Faire accepter ce choix par tous est un problème de **consensus** (module 12).
3. **Reconfigurer le système.** Les clients doivent envoyer leurs écritures au nouveau leader. Et si l'ancien leader revient, il croit peut-être encore être leader : le système doit le forcer à devenir **follower** et à reconnaître le nouveau.

## Tout ce qui peut mal tourner

### Les écritures perdues

En réplication asynchrone, le nouveau leader n'a peut-être pas reçu les dernières écritures de l'ancien. Si l'ancien revient, que faire de ses écritures orphelines ? Le nouveau leader a pu recevoir entre-temps des écritures **en conflit**. La solution la plus courante consiste à **jeter** les écritures non répliquées de l'ancien leader, ce qui revient à trahir la promesse de durabilité faite aux clients.

### Quand d'autres systèmes en dépendent : l'incident GitHub

Jeter des écritures est encore plus dangereux quand d'autres systèmes de stockage se coordonnent avec la base. Lors d'un incident chez GitHub, un follower MySQL **en retard** a été promu leader. La base attribuait les clés primaires avec un **compteur auto-incrémenté**. Le compteur du nouveau leader était en retard sur celui de l'ancien : il a donc **réattribué** des clés primaires déjà utilisées. Or ces clés servaient aussi dans un stockage Redis. Résultat : des incohérences entre MySQL et Redis, et des données privées montrées à de mauvais utilisateurs.

Leçon : une écriture « perdue » n'est pas seulement absente. Ses effets (un identifiant, un e-mail envoyé, une ligne dans un cache) peuvent survivre ailleurs et entrer en collision avec ce que le nouveau leader produit.

### Le split brain

Dans certains scénarios de panne, **deux** nœuds se croient leader. Si les deux acceptent des écritures, sans mécanisme de résolution des conflits, les données sont perdues ou corrompues. Comme garde-fou, certains systèmes éteignent l'un des deux nœuds quand ils détectent deux leaders (**fencing**, ou STONITH : *Shoot The Other Node In The Head*). Mal conçu, ce mécanisme peut **éteindre les deux**.

### Le bon délai

Combien de temps attendre avant de déclarer le leader mort ?

- **Trop long** : la reprise est lente. Avec un délai de 60 s, tout le trafic d'écriture est en échec pendant au moins une minute.
- **Trop court** : failovers inutiles. Un pic de charge qui fait passer le temps de réponse à 4 s, ou un incident réseau d'une seconde, suffit à déclencher une promotion. Et si le système souffrait déjà d'une forte charge, un failover inutile (copie, reconfiguration, caches froids) **aggrave** la situation.

Il n'existe pas de solution simple à ces problèmes. C'est pourquoi certaines équipes d'exploitation préfèrent un **failover manuel**, même quand le logiciel sait le faire seul.

Ces questions (pannes de nœuds, réseau peu fiable, compromis entre cohérence, durabilité, disponibilité et latence) sont les problèmes fondamentaux des systèmes distribués. On les retrouve en profondeur aux modules 10 à 12.

### Aller plus loin (au-delà du livre) : le numéro d'époque

Les systèmes à consensus évitent le split brain en numérotant les mandats : Raft parle de *term*, ZooKeeper d'*epoch*, Kafka de *leader epoch*. Chaque promotion **incrémente** ce numéro, et chaque écriture répliquée le porte. Un follower qui a vu l'époque 7 **rejette** tout changement estampillé 6 : un ancien leader qui se réveille ne peut plus rien imposer. Le livre détaille cette idée au chapitre 8 (*fencing tokens*). C'est ce que tu implémenteras dans le projet Tinybase de ce module.

## Pièges fréquents

- **Copier les fichiers d'un leader en marche** sans snapshot cohérent : la copie mélange plusieurs instants et ne correspond à aucune position du log.
- **Promouvoir le premier follower venu** plutôt que le plus avancé : on augmente la quantité d'écritures perdues.
- **Laisser l'ancien leader revenir comme leader** : sans rétrogradation forcée, c'est le split brain.
- **Réutiliser des identifiants** générés par un leader dont les écritures ont été jetées : c'est l'incident GitHub.
- **Régler le délai de détection sans regarder la latence au p99** (module 00) : si le p99 dépasse parfois 10 s sous charge, un délai de 5 s déclenchera des failovers en pleine tempête.

## À retenir

- Nouveau follower : snapshot cohérent associé à une position du log (LSN, coordonnées du binlog), copie, puis rattrapage depuis cette position.
- Follower en panne : il relit sa dernière position appliquée et demande la suite.
- Failover : détecter (délai), choisir le follower le plus à jour (consensus), reconfigurer clients, followers et ancien leader.
- Pièges : écritures jetées (et leurs effets ailleurs), split brain, délai trop court ou trop long. Beaucoup d'équipes préfèrent un failover manuel.
