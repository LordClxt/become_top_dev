---
id: ddia-ch06-l03
title: Topologies de réplication multi-leader
source:
  chapter: 5
  pages: 175-177
duration_min: 25
concepts:
- id: ddia-topology
  label: 'Topologie : chemins par lesquels les écritures circulent entre leaders (circulaire, étoile, tous-vers-tous)'
- id: ddia-loop-prevention
  label: Chaque écriture est marquée des identifiants des nœuds traversés pour éviter les boucles infinies
- id: ddia-topology-fault
  label: 'Circulaire et étoile : une panne coupe la circulation ; tous-vers-tous offre plusieurs chemins'
- id: ddia-message-overtaking
  label: 'Dans un tous-vers-tous, des messages peuvent en doubler d''autres : violation de la causalité'
glossary:
- term: topologie de réplication
  definition: Les chemins de communication le long desquels les écritures se propagent d'un nœud à l'autre.
- term: tous-vers-tous (all-to-all)
  definition: Chaque leader envoie ses écritures à tous les autres.
visuals: []
labs:
- ddia-ch06-l03-lab-topologies-design
- ddia-ch06-l03-lab-ring-design
extra: false
xp: 25
---

## Pourquoi c'est important

Avec deux leaders, il n'existe qu'une topologie plausible : le leader 1 envoie tout au leader 2 et inversement. Dès qu'il y en a **plus de deux**, plusieurs chemins sont possibles, et leur choix décide de ta résilience aux pannes... et de bugs de causalité subtils.

## Trois topologies

Une **topologie de réplication** décrit les chemins de communication le long desquels les écritures se propagent.

- **Tous-vers-tous** (*all-to-all*) : chaque leader envoie ses écritures à tous les autres. C'est la plus générale.
- **Circulaire** (*ring*) : chaque nœud reçoit les écritures d'un nœud et les transmet, avec les siennes, à un seul autre. MySQL ne supportait par défaut que celle-là.
- **Étoile** (*star*) : un nœud racine désigné transmet les écritures à tous les autres. L'étoile se généralise en **arbre**.

Dans les topologies circulaire et étoile, une écriture peut traverser plusieurs nœuds avant d'atteindre tous les réplicas. Chaque nœud doit donc **retransmettre** les changements reçus des autres. Pour éviter les **boucles de réplication infinies**, chaque nœud a un identifiant unique et chaque écriture est **marquée des identifiants de tous les nœuds qu'elle a traversés**. Quand un nœud reçoit un changement marqué de son propre identifiant, il l'ignore : il l'a déjà traité.

## Résistance aux pannes

Dans les topologies circulaire et étoile, **un seul nœud en panne interrompt la circulation** des messages entre les autres, qui ne peuvent plus communiquer jusqu'à sa réparation. On peut reconfigurer la topologie pour contourner le nœud en panne, mais la plupart du temps cela se fait à la main. Une topologie plus dense (tous-vers-tous) est plus tolérante : les messages empruntent des chemins différents, sans point unique de défaillance.

## Les messages qui se doublent

Les topologies tous-vers-tous ont leurs propres problèmes : certains liens réseau sont plus rapides que d'autres (congestion), si bien que **certains messages en dépassent d'autres**. Exemple : le client A insère une ligne sur le leader 1 ; le client B met à jour cette ligne sur le leader 3. Mais le leader 2 peut recevoir **d'abord la mise à jour** (une mise à jour d'une ligne qui n'existe pas encore pour lui) et **ensuite l'insertion**, qui aurait dû la précéder.

C'est un problème de **causalité** semblable aux lectures de préfixe cohérent : la mise à jour dépend de l'insertion, il faut que tous les nœuds traitent d'abord l'insertion. **Attacher un horodatage à chaque écriture ne suffit pas**, car on ne peut pas faire assez confiance aux horloges pour ordonner correctement ces événements (module 10). Pour les ordonner, on utilise les **vecteurs de version** (leçon 7).

Les techniques de détection de conflits sont mal implémentées dans beaucoup de systèmes multi-leader : à l'époque du livre, PostgreSQL BDR ne fournissait pas d'ordre causal des écritures, et Tungsten Replicator pour MySQL n'essayait même pas de détecter les conflits. Si tu utilises un système multi-leader, lis la documentation et **teste** les garanties que tu crois avoir.


## Pièges fréquents

- **Oublier de marquer les nœuds traversés** : une écriture tourne indéfiniment.
- **Choisir un anneau pour la simplicité** et subir une panne qui coupe tout.
- **Faire confiance aux horodatages pour ordonner insertion et mise à jour.**
- **Ne pas tester le comportement sur messages dans le désordre.**

## À retenir

- Topologies : tous-vers-tous, circulaire, étoile (et arbre).
- Marquer chaque écriture des nœuds traversés évite les boucles.
- Anneau et étoile tombent sur un seul nœud en panne ; le tous-vers-tous est plus résistant mais les messages peuvent se doubler.
- Pour la causalité, il faut des vecteurs de version, pas des horodatages.
