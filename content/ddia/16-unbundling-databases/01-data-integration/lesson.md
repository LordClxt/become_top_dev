---
id: ddia-ch16-l01
title: "Intégrer des données : dériver plutôt qu'écrire partout"
source: { chapter: 12, pages: "490-494" }
duration_min: 35
concepts:
  - id: ddia-data-integration-tools
    label: "Aucun outil ne sert tous les usages : une application combine base, index de recherche, cache, entrepôt…"
  - id: ddia-dataflow-reasoning
    label: "Raisonner sur le flux de données : un système de référence, un ordre unique des écritures, tout le reste dérivé"
  - id: ddia-derived-vs-distributed-tx
    label: "Données dérivées par un log contre transactions distribuées : ordre, atomicité, isolation et tolérance aux pannes"
  - id: ddia-total-order-limits
    label: "Un ordre total des événements exige un seul nœud ou du consensus : il ne passe ni à l'échelle ni la géographie"
  - id: ddia-causal-event-ordering
    label: "Capturer la causalité sans ordre total : identifiants d'état lu, événements autosuffisants, résolution de conflits"
glossary:
  - term: "système de référence (system of record)"
    definition: "La source qui détient la version faisant foi d'une donnée ; tout le reste en est dérivé et peut être reconstruit."
  - term: "donnée dérivée"
    definition: "Résultat d'une transformation d'autres données (index, cache, vue, agrégat) : si on la perd, on la recalcule depuis la source."
  - term: "double écriture (dual write)"
    definition: "Le code applicatif écrit lui-même dans deux systèmes ; sans coordination, les deux peuvent recevoir les écritures dans un ordre différent."
  - term: "ordre total"
    definition: "Un ordre où tous les événements sont comparables deux à deux ; le log d'un leader unique en fournit un."
  - term: "dépendance causale"
    definition: "Un événement B dépend de A si B a été produit en connaissant A (par exemple « envoyer un message » après « retirer un ami »)."
visuals: []
labs: [ddia-ch16-l01-lab-integration-design]
xp: 40
---

## Pourquoi c'est important

Le dernier chapitre du livre change de ton : il ne décrit plus comment fonctionnent les systèmes existants, il propose une **manière de les assembler**. Le constat de départ est simple : dans une vraie application, une seule base ne suffit jamais. Tu as une base OLTP, un index plein texte, un cache, un entrepôt pour l'analytique, peut-être un modèle de recommandation. La question n'est plus « quelle base choisir ? » mais « **comment garder tous ces systèmes d'accord entre eux** ? ». Cette leçon pose la réponse du livre : un log ordonné et des données dérivées, plutôt que des écritures dispersées.

## Combiner des outils spécialisés

Chaque chapitre précédent montrait un compromis : LSM ou B-tree, ligne ou colonne, leader unique ou sans leader. Chaque outil fait un choix et sert bien **certains** schémas d'accès. Conséquence : plus une application a des usages variés, plus elle combine d'outils. Même un logiciel apparemment simple en assemble plusieurs.

Exemple : une boutique en ligne de 2 millions de produits.

- la fiche produit et le stock vivent dans **PostgreSQL** (transactions, contraintes) ;
- la recherche « chaussures trail imperméables » passe par **Elasticsearch**, que PostgreSQL fait mal ;
- les pages les plus vues sont servies par un **cache** ;
- les ventes partent dans un **entrepôt en colonnes** pour l'analytique (chapitre 3, deuxième moitié) ;
- un service de recommandation entraîne un modèle à partir des clics.

Le livre insiste sur un point d'humilité : ce qui te semble « inutile » dans un outil (une fonctionnalité dont tu ne vois pas l'intérêt) est souvent vital pour quelqu'un d'autre. Inutile de juger un outil hors de son contexte d'usage.

## Raisonner sur le flux de données

Quand une même donnée existe sous plusieurs formes (ligne SQL, document indexé, entrée de cache), il faut savoir **d'où viennent les données et où elles vont**. Le livre propose une discipline :

1. désigner un **système de référence** qui reçoit les écritures en premier ;
2. fixer **l'ordre** de ces écritures à un seul endroit ;
3. dériver tout le reste (index, cache, vues) **dans ce même ordre**.

Pourquoi l'ordre est-il crucial ? Reprends la **double écriture** du chapitre sur les logs : le service écrit dans la base puis dans l'index. Deux clients modifient le même produit, presque en même temps : le client A écrit « prix 50 », le client B écrit « prix 45 ». La base reçoit A puis B (prix final 45) ; l'index, à cause d'un délai réseau, reçoit B puis A (prix final 50). Aucune erreur n'est levée, et les deux systèmes divergent **pour toujours**.

Avec la **capture de changements** (CDC) ou un **journal d'événements**, la base décide d'un ordre, l'écrit dans son log, et l'index applique les changements **dans cet ordre-là**. Plus de divergence possible : si l'index applique le même log dans le même ordre, il obtient le même résultat. C'est l'idée de la réplication par machine à états (chapitre sur le consensus), appliquée entre systèmes différents.

## Données dérivées contre transactions distribuées

L'autre manière classique de garder deux systèmes cohérents, c'est la **transaction distribuée** (validation en deux phases, XA, chapitre sur le consensus). Le livre compare les deux approches point par point :

| | Transactions distribuées | Log + données dérivées |
|---|---|---|
| Ordre des écritures | verrous (verrouillage à deux phases) | ordre du log |
| Atomicité (tout ou rien) | validation atomique (2PC) | événement écrit une fois, consommateurs déterministes et idempotents qui réessaient |
| Lecture de ses propres écritures | oui, linéarisable | non par défaut : le dérivé est en **retard** (asynchrone) |
| Couplage / pannes | un participant lent bloque tout, mauvaise tolérance aux pannes | un consommateur lent prend du retard sans bloquer les autres |

La transaction distribuée offre des garanties plus fortes (en particulier la lecture de ses écritures), mais XA amplifie les pannes et tolère mal les hétérogénéités. Le log offre moins (il est asynchrone), mais il **isole** les pannes. L'auteur juge que, pour intégrer des systèmes différents, le log est l'approche la plus prometteuse, à condition de traiter son retard (la leçon 5 et le chapitre suivant reviennent sur les garanties).

## Les limites d'un ordre total

Un log donne un **ordre total** des événements. Mais construire cet ordre suppose que **tous** les événements passent par un seul nœud (le leader qui ordonne le log). Cela coince dans plusieurs cas :

- **débit** : quand les événements dépassent la capacité d'une machine, il faut partitionner, et l'ordre entre partitions devient ambigu ;
- **géographie** : avec un datacenter en Europe et un autre aux États-Unis, chacun a souvent son leader ; l'ordre entre deux événements de continents différents n'est pas défini (les envoyer tous au même leader coûte un aller-retour transatlantique) ;
- **microservices** : chaque service a sa propre base et son propre état ; il n'y a pas d'ordre défini entre des événements nés dans deux services ;
- **clients hors ligne** : une app mobile modifie son état local sans connexion ; le serveur et le client voient alors les événements dans des ordres différents.

Décider d'un ordre total, c'est résoudre le **consensus** (diffusion à ordre total équivalente au consensus, chapitre précédent). Or la plupart des algorithmes de consensus supposent qu'un seul nœud absorbe tout le flux : ils ne passent pas à l'échelle au-delà. Faire mieux est un problème de recherche ouvert.

## Ordonner pour capturer la causalité

Souvent, on n'a pas besoin d'un ordre total : seule compte la **causalité**. L'exemple du livre : un réseau social. Alice **retire** Bob de ses amis, puis envoie un message moqueur à ses autres amis. Si les deux événements sont stockés dans des systèmes différents (amitiés et messages) et que le service de notification voit le message avant le retrait, Bob reçoit le message. C'est une dépendance causale entre deux événements de systèmes différents, et rien ne la protège.

Pistes du livre (aucune n'est parfaite) :

- **horodatages logiques** (Lamport) : ils donnent un ordre total sans coordination, mais imposent de transporter des métadonnées et ne disent pas à un destinataire qu'il lui manque un événement ;
- **identifiant de l'état lu** : quand un utilisateur prend une décision, on enregistre l'identifiant (l'offset) de l'état qu'il avait sous les yeux ; un événement ultérieur peut citer cet identifiant ;
- **résolution de conflits** (chapitre sur la réplication multi-leader) : utile pour un état, mais pas pour des effets externes comme une notification déjà envoyée.

### Aller plus loin
La technique « enregistrer l'état lu » ressemble aux **dépendances explicites** des systèmes à cohérence causale (COPS, Eiger) et aux **vecteurs de version** : chaque écriture porte ce dont elle dépend, et un réplica ne la rend visible qu'une fois ses dépendances arrivées.

## Pièges fréquents

- **Écrire « en parallèle » dans la base et dans l'index** : pas d'ordre commun, divergence silencieuse et permanente.
- **Croire qu'un log partitionné donne un ordre global** : l'ordre ne vaut qu'à l'intérieur d'une partition.
- **Choisir le log en pensant obtenir la lecture de ses propres écritures** : le dérivé est asynchrone, il est en retard.
- **Réclamer un ordre total partout** : c'est du consensus, donc un goulot ; demande-toi si la causalité suffit.

## À retenir

- Une application réelle combine plusieurs outils ; il faut les garder d'accord.
- Un système de référence + un ordre unique (log) + des dérivations déterministes ⇒ pas de divergence.
- Log : isole les pannes mais asynchrone. Transactions distribuées : garanties fortes mais pannes amplifiées.
- L'ordre total exige un nœud unique ou du consensus ; souvent, seule la causalité compte.
