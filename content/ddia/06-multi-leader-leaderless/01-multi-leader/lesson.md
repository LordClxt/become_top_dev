---
id: ddia-ch06-l01
title: 'Plusieurs leaders : pourquoi et quand'
source:
  chapter: 5
  pages: 168-171
duration_min: 30
concepts:
- id: ddia-multi-leader
  label: 'Multi-leader : plusieurs nœuds acceptent les écritures et se les transmettent, chacun étant follower des autres'
- id: ddia-multi-dc
  label: 'Multi-datacenter : latence locale, tolérance à la panne d''un datacenter, tolérance aux problèmes réseau'
- id: ddia-offline-clients
  label: 'Clients hors-ligne : chaque appareil est un leader, la synchronisation est une réplication multi-leader'
- id: ddia-collab-editing
  label: 'Édition collaborative : sans verrou, c''est de la réplication multi-leader avec résolution de conflits'
- id: ddia-multi-leader-danger
  label: 'Le multi-leader est souvent retrofité : clés auto-incrémentées, triggers, contraintes posent problème'
glossary:
- term: multi-leader (master-master, active/active)
  definition: Plusieurs nœuds acceptent les écritures ; chaque leader est aussi follower des autres.
- term: datacenter
  definition: Un site physique qui héberge des machines, avec un réseau local rapide et fiable.
- term: conflit d'écriture
  definition: Deux leaders modifient la même donnée en même temps ; le conflit n'est vu que plus tard, de façon asynchrone.
visuals: []
labs:
- ddia-ch06-l01-lab-use-cases-design
- ddia-ch06-l01-lab-multi-dc-design
extra: false
xp: 30
---

## Pourquoi c'est important

Dans le module précédent, un seul nœud accepte les écritures. C'est simple, mais c'est aussi un défaut : si tu ne peux pas joindre le leader (coupure réseau entre toi et lui), **tu ne peux plus écrire**. Une extension naturelle : laisser **plusieurs nœuds** accepter les écritures. C'est la réplication **multi-leader** (aussi *master-master* ou *active/active*). La réplication fonctionne comme avant : chaque nœud qui traite une écriture la transmet à tous les autres. Chaque leader est donc **aussi follower des autres leaders**.

À l'intérieur d'un seul datacenter, ça a rarement du sens : les bénéfices dépassent rarement la complexité ajoutée. Mais dans certaines situations, la configuration se justifie.

## Cas 1 : plusieurs datacenters

Tu as des réplicas dans plusieurs datacenters, pour survivre à la perte de l'un d'eux ou pour te rapprocher des utilisateurs. Avec un seul leader, il vit dans un datacenter et **toutes** les écritures passent par lui. Avec un leader par datacenter, chaque datacenter garde sa réplication leader-follower en interne, et chaque leader réplique ses changements vers les leaders des autres. Comparons les deux configurations :

- **Performance.** Avec un seul leader, chaque écriture traverse Internet jusqu'au datacenter du leader : latence importante, ce qui va à l'encontre du but d'avoir plusieurs sites. Avec plusieurs leaders, l'écriture est traitée **localement** et répliquée en asynchrone : le délai inter-datacenters est caché aux utilisateurs.
- **Tolérance à la panne d'un datacenter.** Un seul leader : failover vers un autre datacenter. Multi-leader : chaque datacenter continue seul, et la réplication rattrape son retard au retour du datacenter en panne.
- **Tolérance aux problèmes réseau.** Le trafic entre datacenters passe souvent par Internet, moins fiable que le réseau local. Un seul leader y est très sensible, car les écritures traversent ce lien. Un multi-leader asynchrone encaisse mieux une coupure temporaire.

Certaines bases le proposent nativement ; d'autres s'appuient sur des outils externes (Tungsten Replicator pour MySQL, BDR pour PostgreSQL, GoldenGate pour Oracle). Le gros inconvénient : **les mêmes données peuvent être modifiées en même temps dans deux datacenters**, et ces **conflits d'écriture** doivent être résolus (leçon suivante). Comme c'est souvent une fonction ajoutée après coup, il y a des pièges de configuration et des interactions surprenantes avec d'autres fonctions : clés auto-incrémentées, triggers, contraintes d'intégrité. Le multi-leader est souvent considéré comme un terrain dangereux, à éviter si possible.


## Cas 2 : les clients hors-ligne

Une application doit continuer à marcher sans Internet. Pense aux agendas de ton téléphone et de ton ordinateur : tu dois voir tes rendez-vous et en créer à tout moment, connecté ou non. Les changements faits hors-ligne sont synchronisés plus tard avec le serveur et tes autres appareils. Ici, **chaque appareil a une base locale qui est un leader** (elle accepte les écritures), et la synchronisation est une réplication multi-leader asynchrone, dont le retard peut atteindre des heures ou des jours selon l'accès Internet. C'est le cas précédent poussé à l'extrême : chaque appareil est un « datacenter » et le réseau entre eux est extrêmement peu fiable. L'histoire des synchronisations d'agenda ratées montre à quel point c'est difficile. Des outils comme CouchDB sont conçus pour ce mode.

## Cas 3 : l'édition collaborative

Etherpad ou Google Docs laissent plusieurs personnes modifier un document simultanément. On n'y pense pas comme à de la réplication, mais c'est très proche du cas hors-ligne : quand une personne modifie, le changement s'applique instantanément à son réplica local (l'état du document dans son navigateur) puis se réplique en asynchrone vers le serveur et les autres éditeurs.

Pour garantir **zéro conflit**, l'application doit prendre un **verrou** sur le document avant l'édition : les autres attendent qu'elle ait validé et libéré. Ce modèle équivaut à de la réplication à un leader avec des transactions sur le leader. Pour une collaboration rapide, on veut une unité de changement minuscule (une frappe) et **pas de verrou** : plusieurs personnes éditent en même temps, mais on récupère tous les défis du multi-leader, dont la résolution de conflits.

## Pièges fréquents

- **Choisir multi-leader dans un seul datacenter** « pour la disponibilité » : la complexité dépasse le gain.
- **Oublier les clés auto-incrémentées** : deux leaders peuvent générer le même identifiant.
- **Sous-estimer le retard hors-ligne** : il se mesure en heures ou jours, pas en secondes.
- **Croire qu'un verrou distribué résout l'édition collaborative sans conséquence** : il retire la fluidité.

## À retenir

- Multi-leader : plusieurs nœuds acceptent les écritures ; chacun réplique vers les autres.
- Il se justifie pour le multi-datacenter, le hors-ligne et l'édition collaborative, rarement dans un seul datacenter.
- Gain : latence locale, résilience aux pannes de site et de réseau. Prix : les conflits d'écriture.
