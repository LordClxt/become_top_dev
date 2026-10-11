---
id: ddia-ch05-l04
title: "Retard de réplication et lecture de ses propres écritures"
source: { chapter: 5, pages: "161-164" }
duration_min: 35
concepts:
  - id: ddia-replication-lag
    label: "Retard de réplication : le délai entre une écriture sur le leader et son application sur un follower"
  - id: ddia-lag-eventual-consistency
    label: "Cohérence à terme : sans nouvelle écriture, les followers finissent par rattraper, mais sans limite de délai"
  - id: ddia-lag-read-your-writes
    label: "Read-your-writes : un utilisateur voit toujours ses propres écritures après les avoir soumises"
  - id: ddia-lag-ryw-techniques
    label: "Garantir read-your-writes : lire au leader ce que l'utilisateur a pu modifier, fenêtre après écriture, position minimale du réplica"
  - id: ddia-lag-cross-device
    label: "Read-your-writes entre appareils : centraliser la position de la dernière écriture et router vers le même datacenter"
glossary:
  - term: "retard de réplication (replication lag)"
    definition: "Le temps entre une écriture sur le leader et son application sur un follower donné."
  - term: "architecture de lecture à l'échelle (read-scaling)"
    definition: "Beaucoup de followers asynchrones pour absorber une charge surtout composée de lectures."
  - term: "cohérence à terme (eventual consistency)"
    definition: "Garantie que, si les écritures s'arrêtent, tous les réplicas finiront par converger. Elle ne dit pas quand."
  - term: "read-your-writes (read-after-write consistency)"
    definition: "Garantie qu'un utilisateur qui relit après avoir écrit voit sa propre écriture. Elle ne dit rien des écritures des autres."
  - term: "horodatage logique"
    definition: "Une valeur qui ordonne les écritures sans horloge murale, comme la position dans le log (LSN)."
visuals: []
labs: [ddia-ch05-l04-lab-read-your-writes]
xp: 40
---

## Pourquoi c'est important

Le chapitre 1 l'annonçait : on réplique aussi pour le **débit de lecture**. Une application web typique lit bien plus qu'elle n'écrit : on met donc beaucoup de followers et on y envoie les lectures. Cette architecture ne tient qu'en **asynchrone** : avec 20 followers synchrones, une seule panne bloquerait tout. Mais en asynchrone, un follower peut **avoir du retard**. Lire sur lui, c'est risquer de voir des données périmées, et l'utilisateur le voit très bien quand c'est sa propre écriture qui disparaît. Cette leçon donne le nom de ces anomalies et les techniques concrètes pour les éviter.

## Le retard de réplication

Lance la même requête au même moment sur le leader et sur un follower : les résultats peuvent différer, parce que certaines écritures ne sont pas encore arrivées sur le follower. C'est une incohérence **temporaire** : si tu arrêtes d'écrire et que tu attends, les followers finissent par rattraper. On parle de **cohérence à terme** (*eventual consistency*).

Le problème est dans le mot « terme » : il est volontairement vague. Il n'y a **aucune limite** au retard. En fonctionnement normal, le **retard de réplication** est d'une fraction de seconde, imperceptible. Mais si le système tourne près de sa capacité, ou si le réseau a un problème, il peut monter à plusieurs secondes, voire plusieurs minutes. À ce stade, l'incohérence n'est plus théorique : c'est un vrai problème pour les applications.

Ordre de grandeur : un follower qui applique 4 000 changements par seconde alors que le leader en produit 5 000 pendant un pic accumule 1 000 changements de retard **chaque seconde**. Au bout de 2 minutes de pic, il a 120 000 changements de retard.

## Lire ses propres écritures

Scénario : tu postes un commentaire. L'écriture part au leader. Une demi-seconde plus tard, la page se recharge et lit sur un follower qui a 2 secondes de retard. **Ton commentaire n'apparaît pas.** Tu crois qu'il est perdu, tu le reposte, et tu obtiens un doublon.

La garantie qui manque s'appelle **read-your-writes** (ou *read-after-write consistency*) : si un utilisateur recharge la page, il voit **toujours** les modifications qu'il a lui-même soumises. Elle ne promet **rien** sur les écritures des autres utilisateurs : elles peuvent apparaître un peu plus tard. Ce n'est pas une garantie forte, et c'est exactement pour cela qu'elle est bon marché.

### Les techniques

Avec la réplication par leader, plusieurs façons de l'obtenir :

1. **Lire au leader ce que l'utilisateur a pu modifier, le reste sur un follower.** Il faut savoir, sans interroger la base, ce qui a pu changer. Exemple : un profil de réseau social n'est modifiable que par son propriétaire. Règle simple : **son propre profil se lit toujours au leader**, les profils des autres sur un follower.
2. **Une fenêtre après la dernière écriture.** Si presque tout est modifiable, la règle 1 enverrait presque toutes les lectures au leader. On peut plutôt noter l'heure de la dernière mise à jour de l'utilisateur et, pendant **une minute** après, lire au leader. On peut aussi surveiller le retard de chaque follower et **écarter** tout follower qui a plus d'une minute de retard.
3. **Le client retient la position de sa dernière écriture.** Le système vérifie que le réplica qui sert la lecture a appliqué **au moins** jusqu'à cette position. Sinon, il lit sur un autre réplica, ou attend que celui-ci rattrape. La position peut être un **horodatage logique** (comme le LSN) ou une heure réelle ; dans ce cas, la synchronisation des horloges devient critique (module 10).
4. **Plusieurs datacenters** : si les réplicas sont répartis géographiquement, toute requête qui doit être servie par le leader doit être **routée vers le datacenter du leader**.

Comparons la technique 3 sur un exemple. Ton écriture a reçu le LSN 51 200. Trois followers sont aux positions 51 090, 51 260 et 51 200. Deux d'entre eux (51 260 et 51 200) peuvent servir ta lecture ; celui à 51 090 non. La règle est précise et ne dépend d'aucune horloge, contrairement à la fenêtre d'une minute, qui est trop longue en temps normal et peut être trop courte pendant une tempête.

### Entre plusieurs appareils

Variante : l'utilisateur écrit depuis son téléphone et lit depuis son ordinateur portable. Il doit aussi voir son écriture. Deux difficultés supplémentaires :

- Retenir la date de la dernière écriture **dans l'appareil** ne marche plus : le portable ne sait pas ce que le téléphone a écrit. Cette information doit être **centralisée** côté serveur.
- Si les réplicas sont dans plusieurs datacenters, rien ne garantit que les deux appareils passent par le même : le portable est sur la fibre de la maison, le téléphone sur le réseau mobile, avec des routes différentes. Si ta technique lit au leader, il faut d'abord **router toutes les requêtes d'un même utilisateur vers le même datacenter**.

### Aller plus loin (au-delà du livre)

PostgreSQL expose la position appliquée par chaque réplica (`pg_last_wal_replay_lsn()`) : un routeur peut comparer cette valeur au LSN renvoyé par l'écriture, c'est la technique 3 en production. MySQL offre un mécanisme voisin avec ses GTID (`WAIT_FOR_EXECUTED_GTID_SET`). Côté cloud, Azure Cosmos DB propose un niveau de cohérence « session » qui offre notamment read-your-writes et les lectures monotones (leçon suivante), grâce à un jeton de session renvoyé au client ; Amazon Aurora a un réglage voisin pour ses lectures sur réplicas (`aurora_replica_read_consistency = SESSION`).

## Pièges fréquents

- **Tester en local avec un retard nul** : l'anomalie n'apparaît qu'en production, sous charge, le jour où le retard atteint plusieurs secondes.
- **Envoyer toutes les lectures au leader « pour être sûr »** : on perd tout l'intérêt de la réplication pour le débit de lecture.
- **Garder la date de dernière écriture dans un cookie** quand l'utilisateur a plusieurs appareils.
- **Confondre read-your-writes et cohérence forte** : la première ne dit rien des écritures des autres utilisateurs.
- **Oublier les datacenters** : lire au « leader » ne sert à rien si la requête arrive dans un datacenter qui ne l'héberge pas.

## À retenir

- Read-scaling = beaucoup de followers asynchrones ; leur retard est sans borne en théorie (cohérence à terme).
- Read-your-writes : l'utilisateur voit toujours ses propres écritures, sans promesse sur celles des autres.
- Techniques : lire au leader ce qu'on a pu modifier, fenêtre après écriture, position minimale du réplica (LSN), routage vers le datacenter du leader.
- Entre appareils : centraliser la position de la dernière écriture et router l'utilisateur vers un même datacenter.
