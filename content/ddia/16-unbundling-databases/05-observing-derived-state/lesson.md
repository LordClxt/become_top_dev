---
id: ddia-ch16-l05
title: "Observer l'état dérivé : du chemin d'écriture jusqu'à l'écran"
source: { chapter: 12, pages: "509-514" }
duration_min: 40
concepts:
  - id: ddia-write-read-path
    label: "Chemin d'écriture (calcul anticipé) contre chemin de lecture (calcul paresseux) : le dérivé est leur point de rencontre"
  - id: ddia-materialized-view-cache-tradeoff
    label: "Index, cache et vue matérialisée déplacent la frontière : plus de travail à l'écriture, moins à la lecture"
  - id: ddia-offline-clients
    label: "Un client avec état hors ligne : l'appareil garde un cache de l'état serveur, l'écran est une vue matérialisée"
  - id: ddia-push-to-clients
    label: "Pousser les changements jusqu'au client (WebSocket, server-sent events) : prolonger le chemin d'écriture"
  - id: ddia-reads-as-events
    label: "Les lectures sont aussi des événements : jointure flux-table, traçabilité de ce que l'utilisateur a vu"
  - id: ddia-multi-partition-dataflow
    label: "Traiter une requête qui touche plusieurs partitions comme un flux : portée d'une URL, score de fraude"
glossary:
  - term: "chemin d'écriture (write path)"
    definition: "Tout le travail fait de façon anticipée quand une donnée arrive, quelle que soit la demande future : mise à jour des index, caches et vues."
  - term: "chemin de lecture (read path)"
    definition: "Le travail fait seulement quand quelqu'un demande quelque chose : lire le dérivé et calculer la réponse."
  - term: "server-sent events"
    definition: "API du navigateur (EventSource) qui garde une connexion HTTP ouverte pour recevoir des messages du serveur."
  - term: "WebSocket"
    definition: "Canal de communication bidirectionnel et persistant entre un navigateur et un serveur."
  - term: "provenance des données"
    definition: "La trace de ce dont un résultat ou une décision dépend, par exemple ce que l'utilisateur voyait au moment de cliquer."
visuals: []
labs: [ddia-ch16-l05-lab-push-design]
xp: 40
---

## Pourquoi c'est important

On a vu comment des données dérivées sont **maintenues**. Mais à quoi servent-elles ? À être **lues**. Cette leçon regarde l'autre bout du pipeline et pose une question d'architecture très concrète : quelle part du travail faire **quand la donnée arrive**, et quelle part **quand quelqu'un la demande** ? La réponse décide de tes index, de tes caches, et même de la façon dont ton application mobile se met à jour.

## Chemin d'écriture, chemin de lecture

Prends un moteur de recherche. Un nouveau document arrive :

- **chemin d'écriture** : le document est découpé en mots, et l'index est mis à jour **tout de suite**, même si personne ne cherchera jamais ces mots. C'est un calcul **anticipé** (*eager*) ;
- **chemin de lecture** : quand une requête arrive, on lit l'index, on intersecte les listes de documents, on classe. C'est un calcul **paresseux** (*lazy*), fait seulement à la demande.

Le jeu de données dérivé (l'index) est l'endroit où les deux chemins **se rencontrent**. Et cette frontière est un **choix** :

- **aucun index** : le chemin d'écriture ne fait presque rien, mais chaque requête doit parcourir tous les documents (un `grep`), ce qui ne tient pas avec 10 millions de documents ;
- **précalculer toutes les réponses possibles** : la lecture devient une simple consultation, mais l'écriture devrait mettre à jour une infinité de requêtes : impossible ;
- **l'index**, et éventuellement un **cache** des 10 000 requêtes les plus fréquentes : un compromis entre les deux.

Rappel du chapitre 1 : la chronologie de Twitter. Calculer la chronologie à la lecture (jointure à la demande) ou la pousser dans la boîte de chaque abonné à l'écriture (fan-out) ; pour les comptes à 30 millions d'abonnés, on mélange. C'est exactement ce déplacement de frontière.

## Vues matérialisées et caches

Index, caches et vues matérialisées font tous la même chose : ils **déplacent la frontière** vers l'écriture. On fait plus de travail quand la donnée arrive pour en faire moins quand on la lit. Le bon emplacement dépend du rapport entre lectures et écritures et de la latence exigée.

Exemple chiffré : une page produit lue **5 000 fois** pour chaque modification. Si l'assemblage de la page coûte 40 ms, la calculer à chaque lecture coûte 200 s de CPU par modification ; la précalculer une fois coûte 40 ms. Inversement, un compteur écrit 1 000 fois par seconde et lu une fois par jour gagne à être calculé à la lecture.

## Des clients avec état, hors ligne

Les clients ont changé. Une application web monopage ou une app mobile garde beaucoup d'**état local**, et doit souvent fonctionner **hors ligne** (dans le métro, en avion), puis se synchroniser en arrière-plan. C'est le cas extrême du chapitre sur la réplication multi-leader : chaque appareil est un « datacenter » dont la connexion au réseau est très peu fiable.

Le livre propose de voir l'état local de l'appareil comme un **cache de l'état du serveur**. Et les pixels à l'écran ? Une **vue matérialisée** des objets du modèle côté client, eux-mêmes une copie locale de l'état d'un datacenter lointain.

## Pousser l'état vers les clients

Une page web classique affiche des données **figées** au moment de son chargement : si elles changent sur le serveur, le navigateur ne le sait pas avant de **ré-interroger**. C'est le modèle requête-réponse.

Les protocoles récents permettent au serveur de **pousser** des messages : **server-sent events** (EventSource) et **WebSockets** gardent une connexion ouverte. Le serveur peut alors envoyer chaque changement d'état au client, qui met à jour sa copie locale.

Vu sous l'angle de la leçon : on **prolonge le chemin d'écriture jusqu'à l'utilisateur**. Une écriture déclenche la mise à jour des index, des caches, puis de l'état de l'appareil, puis de l'écran.

Et quand le client était hors ligne ? Il se comporte comme un **consommateur de log** (chapitre sur les logs) : il retient le dernier offset reçu et, à la reconnexion, demande tout ce qui a eu lieu depuis. Les mêmes techniques qu'un consommateur Kafka, au bout du réseau.

### Des flux de bout en bout
Côté interface, des outils comme React avec Flux ou Redux gèrent déjà l'état du client comme un **flux d'événements**, très proche de l'event sourcing. Il serait naturel d'étendre ce modèle jusqu'au serveur : un client qui envoie ses actions comme des événements et reçoit l'état comme un flux. Le frein, c'est que la plupart des bases et bibliothèques supposent encore des requêtes-réponses sans état ; passer à la publication-abonnement est un changement profond.

## Les lectures sont aussi des événements

D'habitude, les **écritures** passent par le log et les **lectures** sont des requêtes éphémères envoyées directement au nœud qui stocke les données. Rien n'oblige à cela. On peut représenter **une lecture comme un événement** dans un flux, que le processeur de flux traite en renvoyant le résultat sur un flux de sortie. C'est une **jointure flux-table** entre le flux des requêtes et la base.

Avantage : **enregistrer les lectures** permet de tracer les dépendances causales et la **provenance** des données. Exemple : un client a vu « livraison demain » puis a commandé ; si la promesse n'est pas tenue, savoir précisément ce qu'il a lu aide à comprendre la décision. C'est la technique « enregistrer l'état lu » de la leçon 1. Le coût : du stockage et des entrées-sorties en plus. Certaines entreprises le font déjà pour les pages de leurs services : journaliser ce que l'utilisateur a vu.

## Traiter des données sur plusieurs partitions

Pour une requête qui touche **une** partition, passer par un flux est excessif. Mais pour une requête qui en touche **beaucoup**, l'infrastructure de messages, de regroupement et de jointure d'un processeur de flux devient utile. Deux exemples du livre :

- **combien de personnes ont vu cette URL sur Twitter ?** C'est l'union des abonnés de tous ceux qui l'ont tweetée ; les ensembles d'abonnés vivent sur des partitions différentes. Storm proposait pour cela un « RPC distribué » ;
- **score de fraude d'un achat** : on évalue la réputation de l'adresse IP, de l'e-mail, de l'adresse de facturation et de celle de livraison ; chaque base de réputation est **partitionnée différemment**. Le flux route chaque sous-requête vers la bonne partition et regroupe les réponses.

Les bases MPP (chapitre sur l'analytique) font déjà ce genre de jointure interne. Le livre ne prétend pas que le flux est toujours meilleur, juste qu'il permet d'implémenter ces requêtes réparties avec des briques existantes.

## Pièges fréquents

- **Précalculer « tout »** : certaines frontières sont impossibles côté écriture (toutes les requêtes possibles).
- **Interroger en boucle depuis le client** : chaque client génère du trafic même sans changement ; pousse plutôt les changements.
- **Oublier l'offset du client** : à la reconnexion, il ne sait plus ce qu'il a manqué.
- **Journaliser toutes les lectures sans mesurer** : utile pour la provenance, mais le volume des lectures dépasse souvent celui des écritures.

## À retenir

- Le dérivé est la rencontre du chemin d'écriture (anticipé) et du chemin de lecture (paresseux).
- Index, caches, vues : plus de travail à l'écriture, moins à la lecture ; le bon point dépend du rapport lectures/écritures.
- L'appareil est un cache de l'état serveur ; l'écran, une vue matérialisée.
- Pousser les changements (WebSocket, SSE) prolonge le chemin d'écriture jusqu'à l'utilisateur ; le client reprend à son offset.
- Les lectures peuvent devenir des événements : traçabilité, requêtes multi-partitions.
