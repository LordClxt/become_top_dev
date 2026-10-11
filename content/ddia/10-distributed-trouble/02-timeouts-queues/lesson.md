---
id: ddia-ch10-l02
title: "Timeouts, files d'attente et délais sans borne"
source: { chapter: 8, pages: "281-287" }
duration_min: 40
concepts:
  - id: ddia-timeout-tradeoff
    label: "Un timeout court détecte vite mais accuse à tort ; un timeout long laisse les utilisateurs attendre"
  - id: ddia-unbounded-delay
    label: "Dans un réseau asynchrone, aucun délai maximal n'est garanti, donc aucun timeout n'est « correct »"
  - id: ddia-network-queueing
    label: "La variabilité des délais vient surtout des files d'attente : switch, OS, hyperviseur, contrôle de flux TCP"
  - id: ddia-adaptive-timeout
    label: "Mesurer la distribution des temps de réponse et ajuster le timeout automatiquement (détecteur phi accrual)"
  - id: ddia-circuit-vs-packet
    label: "Un circuit réserve une bande passante fixe et borne le délai ; un réseau par paquets optimise l'utilisation au prix de délais variables"
glossary:
  - term: "timeout"
    definition: "Délai au-delà duquel on cesse d'attendre une réponse et l'on considère, à tort ou à raison, qu'elle ne viendra pas."
  - term: "panne en cascade (cascading failure)"
    definition: "Déclarer un nœud mort transfère sa charge aux autres, qui ralentissent et sont déclarés morts à leur tour."
  - term: "gigue (jitter)"
    definition: "Variabilité des délais de transmission d'un message à l'autre."
  - term: "détecteur phi accrual"
    definition: "Détecteur de pannes qui estime, à partir de l'historique des battements de cœur, à quel point un silence est anormal (utilisé par Akka et Cassandra)."
  - term: "commutation de circuits"
    definition: "Réserver pour toute la durée d'une communication une bande passante fixe sur tout le trajet, comme un appel téléphonique classique."
  - term: "voisin bruyant (noisy neighbor)"
    definition: "Autre client d'un cloud partagé dont l'activité consomme les ressources communes et ralentit tes machines."
visuals: []
labs: [ddia-ch10-l02-lab-timeout-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente concluait : seul un timeout permet de déclarer un nœud mort. Reste à choisir sa valeur, et c'est là que tout se complique. Un timeout mal réglé est la cause d'innombrables incidents : basculements de leader inutiles, doubles exécutions, effondrements en cascade. Cette leçon explique **d'où vient l'incertitude sur les délais** et pourquoi elle n'est pas une fatalité physique mais un **choix économique**.

## Le dilemme du timeout

Un timeout **long** veut dire attendre longtemps avant de déclarer un nœud mort. Pendant ce temps, les utilisateurs patientent ou reçoivent des erreurs.

Un timeout **court** détecte les pannes plus vite, mais il risque de déclarer mort un nœud qui n'était que **ralenti** (pic de charge, pause passagère). Et une déclaration prématurée a des coûts réels :

- si le nœud était en train d'exécuter une action (envoyer un e-mail, débiter un compte), un autre nœud la reprend et **l'action est exécutée deux fois** ;
- reprendre la responsabilité d'un nœud **ajoute de la charge** aux autres. Si le nœud lent l'était justement parce que le système était surchargé, le déclarer mort aggrave la surcharge. Les autres ralentissent, sont déclarés morts à leur tour : **panne en cascade**. Dans le pire cas, tous les nœuds se déclarent morts les uns les autres et plus rien ne marche.

### Le calcul idéal, et pourquoi il ne marche pas

Imagine un réseau qui garantit que tout paquet est livré en au plus **d**, ou perdu, et un serveur qui traite toujours une requête en au plus **r**. Alors toute réponse arrive en au plus **2d + r** (aller, traitement, retour). Avec d = 5 ms et r = 20 ms, un timeout de 30 ms serait parfait : au-delà, le nœud est certainement en panne.

Le problème : ces deux garanties **n'existent pas** dans les systèmes que nous utilisons. Les réseaux asynchrones ont des **délais non bornés** : ils essaient de livrer vite, mais rien ne fixe de limite. Et la plupart des serveurs ne garantissent pas un temps de traitement maximal (la leçon 4 montrera pourquoi). Un timeout trop court ne demande qu'un pic passager pour faire basculer tout le système.

## D'où vient la variabilité : les files d'attente

Comme les voitures sur une route, les paquets voient leur temps de trajet varier surtout à cause des **bouchons**. Et les bouchons se forment dans des **files d'attente** :

- **Dans le switch** : si plusieurs nœuds envoient en même temps vers la même destination, le switch met les paquets en file avant de les envoyer un à un sur le lien de sortie. Si la file déborde, le paquet est **jeté**, et il faudra le renvoyer, même si le réseau fonctionne parfaitement.
- **Dans le système d'exploitation** : si tous les cœurs de la machine destinataire sont occupés, la requête attend que l'OS la passe à l'application. Le délai dépend de la charge de la machine.
- **Dans l'hyperviseur** : une machine virtuelle est souvent **mise en pause** quelques dizaines de millisecondes pendant qu'une autre utilise le cœur. Pendant ce temps, elle ne peut rien consommer, et l'hyperviseur met ses données entrantes en tampon.
- **Chez l'émetteur** : TCP pratique le **contrôle de flux** (évitement de congestion, *backpressure*) : un nœud limite lui-même son débit pour ne pas saturer le réseau ou le destinataire. Les données attendent donc avant même d'entrer sur le réseau.

S'ajoute la **retransmission** : TCP considère un paquet comme perdu s'il n'est pas acquitté dans un certain délai, et le renvoie. L'application ne voit pas la perte, mais elle voit le **délai** qui en résulte.

> **TCP ou UDP ?** Pour une visioconférence ou de la voix sur IP, un paquet en retard est inutile : la conversation est passée. Ces applications utilisent UDP, qui ne retransmet pas, et préfèrent un court silence dans l'audio à un retard qui s'accumule. Mais attention : UDP supprime la retransmission, pas les files des switchs. Les délais restent variables.

Toutes ces files grandissent quand le système approche de sa capacité. Sur un réseau peu chargé, elles sont presque vides ; en pleine charge, elles explosent. Dans un cloud partagé, la situation est pire : les ressources (liens, switchs, cartes réseau, CPU) sont partagées avec d'autres clients. Un **voisin bruyant** qui lance un gros traitement peut ralentir tes machines sans que tu n'y puisses rien. Rappel du ch01 : c'est le même mécanisme de file qui crée la longue traîne des percentiles élevés.

## Choisir un timeout : mesurer, puis s'adapter

Puisqu'aucune valeur n'est correcte a priori, il faut **l'expérimenter**. Mesure la distribution des temps aller-retour sur une longue période et sur de nombreuses machines, pour connaître la variabilité attendue. Ensuite, en tenant compte des exigences de l'application, choisis un compromis entre délai de détection et risque de fausse alerte.

Mieux encore : au lieu d'une constante, laisse le système **mesurer en continu** les temps de réponse et leur **gigue**, et ajuster le timeout tout seul. C'est le principe du **détecteur de pannes phi accrual**, utilisé par Akka et Cassandra. Au lieu de répondre « mort / vivant », il calcule un niveau de suspicion : plus le silence actuel est improbable au regard de l'historique des battements de cœur, plus la suspicion est forte. Les timeouts de retransmission de TCP suivent une idée voisine.

Un exemple chiffré. Un nœud envoie un battement de cœur toutes les 100 ms. Sur les dernières minutes, l'intervalle observé a une moyenne de 100 ms et un écart-type de 5 ms : un silence de 200 ms est très anormal. Sur un autre nœud, plus chargé, l'intervalle moyen est de 150 ms avec un écart-type de 80 ms : un silence de 200 ms est banal. Une règle simple comme « moyenne + 4 écarts-types » donne 120 ms pour le premier et 470 ms pour le second. Le même timeout fixe aurait été soit trop lent pour l'un, soit trop nerveux pour l'autre. Le projet du chapitre te fait coder ce détecteur adaptatif.

## Réseaux synchrones et asynchrones

Pourquoi ne pas construire des réseaux qui **garantissent** un délai, comme le téléphone fixe ? Un appel téléphonique classique établit un **circuit** : une bande passante fixe est réservée sur tout le trajet pour toute la durée de l'appel. Dans le réseau numérique RNIS, par exemple, le réseau tourne à 4 000 trames par seconde, et un appel reçoit 16 bits dans chaque trame, dans chaque sens, soit 64 kbit/s. L'espace est réservé ; il n'y a **pas de file**, donc le délai de bout en bout est **borné**. On parle de **réseau synchrone**.

Les réseaux de datacentre et Internet font l'inverse : la **commutation de paquets**. La raison est économique : ils sont optimisés pour un **trafic en rafales**. Un appel vocal a besoin d'un débit fixe et connu. Une requête web, un e-mail ou un transfert de fichier n'ont pas de débit requis : on veut qu'ils se terminent le plus vite possible. Avec un circuit, il faudrait deviner la bande passante à réserver. Trop petite, le transfert est inutilement lent ; trop grande, le circuit ne peut même pas s'établir. TCP, lui, **s'adapte** dynamiquement à la bande passante disponible.

Il y a eu des tentatives hybrides (ATM dans les années 1980, InfiniBand aujourd'hui, la qualité de service et le contrôle d'admission), mais elles ne sont pas disponibles dans les datacentres multi-clients ni sur Internet.

Le fond du problème est un compromis entre **latence** et **utilisation des ressources** :

- **partage statique** (circuit, ou un cœur réservé à chaque thread) : délai garanti, mais une partie de la capacité reste inutilisée quand un client n'a rien à envoyer ;
- **partage dynamique** (paquets, ordonnanceur de threads) : la capacité est utilisée au mieux, donc moins chère par octet, mais les délais deviennent variables.

La conclusion du livre est importante : **les délais variables ne sont pas une loi de la nature, mais la conséquence d'un compromis coût/bénéfice**. Tant qu'on veut le coût bas du partage dynamique, il faut accepter des délais non bornés, donc des timeouts déterminés par l'expérience.

## Pièges fréquents

- **Choisir un timeout « au doigt mouillé »** (1 s partout) sans mesurer la distribution réelle des délais.
- **Raccourcir un timeout pour basculer plus vite** sans voir que cela multiplie les fausses alertes, donc les doubles exécutions et les cascades.
- **Croire que passer à UDP rend les délais prévisibles** : UDP supprime la retransmission, pas les files des switchs.
- **Supposer qu'un réseau peu chargé en test se comportera pareil en production** : les files explosent près de la capacité.
- **Ignorer les voisins bruyants** dans un cloud partagé.

## À retenir

- Timeout court : détection rapide mais accusations à tort, doubles exécutions, cascades ; timeout long : attente.
- La formule 2d + r suppose des bornes qu'un réseau asynchrone et un serveur ordinaire ne donnent pas.
- La variabilité vient des files : switch, OS, hyperviseur, contrôle de flux TCP, plus les retransmissions.
- Mesure la distribution, puis adapte le timeout en continu (phi accrual).
- Circuit = délai borné mais capacité gaspillée ; paquets = capacité optimisée mais délais non bornés. C'est un choix économique.
