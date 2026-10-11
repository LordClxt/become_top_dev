---
id: ddia-ch14-l01
title: "Événements, producteurs et systèmes de messagerie"
source: { chapter: 11, pages: "439-444" }
duration_min: 35
concepts:
  - id: ddia-event-stream-basics
    label: "Un événement est un petit objet immuable qui décrit ce qui s'est passé à un instant ; un flux est une suite d'événements rendue disponible au fil du temps"
  - id: ddia-polling-vs-notification
    label: "Interroger une base en boucle coûte cher et ajoute de la latence ; mieux vaut que le consommateur soit notifié"
  - id: ddia-producer-overload-choices
    label: "Producteur plus rapide que le consommateur : perdre des messages, les mettre en tampon ou exercer une contre-pression"
  - id: ddia-message-durability-tradeoff
    label: "Perdre des messages en cas de panne est acceptable ou non selon l'application ; la durabilité coûte des écritures disque et de la réplication"
  - id: ddia-direct-messaging
    label: "Messagerie directe (multicast UDP, ZeroMQ, StatsD, webhooks) : rapide, mais l'application doit gérer elle-même les pertes"
  - id: ddia-broker-vs-database
    label: "Un broker classique est une sorte de base optimisée pour les flux : il supprime le message une fois livré et ne permet pas de requêtes arbitraires"
glossary:
  - term: "événement (event)"
    definition: "Petit objet autonome et immuable qui décrit quelque chose qui s'est produit à un moment donné, en général avec un horodatage."
  - term: "producteur / consommateur"
    definition: "Le producteur (éditeur, émetteur) crée un événement ; un ou plusieurs consommateurs (abonnés, destinataires) le traitent."
  - term: "sujet (topic) ou flux"
    definition: "Regroupement nommé d'événements liés, sur lequel publient les producteurs et auquel s'abonnent les consommateurs."
  - term: "contre-pression (backpressure, flow control)"
    definition: "Empêcher le producteur d'envoyer plus de messages tant que le consommateur n'a pas suivi ; c'est ce que font les pipes Unix et TCP."
  - term: "messagerie directe"
    definition: "Le producteur envoie ses messages au consommateur par le réseau, sans intermédiaire qui les stocke."
  - term: "webhook"
    definition: "Un service enregistre l'URL d'un autre service, qu'il appelle par HTTP à chaque événement."
visuals: []
labs: [ddia-ch14-l01-lab-overload-design]
xp: 40
---

## Pourquoi c'est important

Le module « Traitement par lots » supposait une entrée **bornée** : un jeu de fichiers connu à l'avance, qu'on traite en entier puis qu'on recommence. Dans la réalité, les données arrivent sans fin : des clics, des paiements, des relevés de capteurs. Attendre la fin de la journée pour tout traiter, c'est accepter un jour de retard. Le **traitement de flux** traite chaque événement peu après son arrivée. Avant de calculer quoi que ce soit, il faut d'abord **transporter** ces événements d'un processus à un autre sans les perdre ni s'écrouler sous la charge. C'est l'objet de cette leçon, et la question qu'elle pose (que faire quand le producteur va plus vite que le consommateur ?) revient dans tout le chapitre.

## Événements, producteurs, consommateurs

Dans un traitement par lots, l'unité est un enregistrement d'un fichier. Dans un flux, c'est un **événement** : un petit objet **autonome et immuable** qui décrit ce qui s'est passé à un instant donné. « L'utilisateur 42 a ajouté le produit 981 à son panier à 10:14:03 » ; « le capteur T7 mesure 21,4 °C » ; « la ligne 1337 de la table `orders` est passée à `paid` ». Un événement porte en général un horodatage selon l'horloge de celui qui l'a produit (le module « Quand le réseau ment » a montré ce qu'il faut penser de ces horloges).

On l'encode comme n'importe quelle donnée : texte, JSON, ou un format binaire à schéma (module « Encodage et évolution des schémas »). Il est écrit **une fois** par un **producteur** et lu par un ou plusieurs **consommateurs**. Les événements liés sont regroupés dans un **sujet** (*topic*) ou **flux**, comme les enregistrements d'un même fichier dans un lot.

Rien n'empêche de faire transiter des événements par un fichier ou une base : le producteur écrit, chaque consommateur interroge régulièrement pour voir s'il y a du nouveau. Mais pour une faible latence, ce **sondage** (*polling*) devient ruineux : interroger 50 tables toutes les 100 ms, c'est 500 requêtes par seconde, presque toutes vides. Il vaut mieux que le consommateur soit **notifié** quand un événement arrive. Les bases relationnelles ont des **déclencheurs** (*triggers*), mais ils sont limités et ont été pensés après coup. Des outils spécialisés existent : les **systèmes de messagerie**.

## Deux questions pour classer un système de messagerie

Le principe est simple : un producteur envoie un message, le système le livre aux consommateurs. Un pipe Unix ou une connexion TCP font déjà cela, entre **un** émetteur et **un** destinataire. Un système de messagerie l'étend à plusieurs producteurs et plusieurs consommateurs d'un même sujet (modèle **publish/subscribe**). Pour comparer les implémentations, deux questions suffisent.

### 1. Que se passe-t-il si les producteurs vont plus vite que les consommateurs ?

Trois réponses possibles, et seulement trois :

- **perdre des messages** : le système jette ce qui dépasse ;
- **mettre en tampon** dans une file : le retard s'accumule, et il faut savoir ce qui arrive quand la file ne tient plus en mémoire (le processus plante ? il écrit sur disque, et alors à quelle vitesse ?) ;
- **exercer une contre-pression** (*backpressure*, *flow control*) : bloquer le producteur jusqu'à ce que le consommateur ait suivi. Un pipe Unix ou TCP font exactement cela : leur tampon est petit et fixe, et quand il est plein l'émetteur attend.

Fais le calcul une fois pour sentir l'enjeu : un producteur pousse 3 000 événements/s pendant un pic de 5 minutes, le consommateur n'en traite que 2 000/s. Le retard grandit de 1 000 messages par seconde, soit **300 000 messages** au bout du pic. À 1 Ko pièce, 300 Mo en mémoire. Si ensuite le producteur retombe à 1 500/s, le consommateur ne rattrape que 500 messages par seconde : il lui faut 600 s, dix minutes, pour revenir à jour. Le retard se résorbe plus lentement qu'il ne s'est formé.

### 2. Que se passe-t-il si un nœud plante ou se déconnecte ?

Un message est-il perdu ? Comme pour une base, la **durabilité** a un prix : écrire sur disque, répliquer, ou les deux. Si tu acceptes de perdre parfois des messages, tu obtiens plus de débit et moins de latence sur le même matériel.

La bonne réponse dépend de l'application. Pour des relevés de capteurs envoyés toutes les secondes et agrégés en moyennes, en perdre un de temps en temps ne fausse rien. Pour des événements que l'on **compte** (des paiements, des inscriptions), chaque perte est une erreur de comptabilité.

## La messagerie directe, sans intermédiaire

Beaucoup de systèmes relient producteurs et consommateurs directement par le réseau :

- **multicast UDP** dans la finance, pour les flux de cotations où chaque microseconde compte : UDP n'est pas fiable, donc le protocole applicatif doit redemander les paquets perdus (le producteur garde les derniers messages pour pouvoir les retransmettre) ;
- des bibliothèques **sans broker** comme ZeroMQ ou nanomsg, qui font du publish/subscribe sur TCP ou multicast ;
- **StatsD** et Brubeck, qui envoient des métriques par UDP : les compteurs ne sont exacts qu'approximativement, et c'est accepté ;
- les **webhooks** : si le consommateur expose un service, le producteur l'appelle directement en HTTP ou en RPC (module « Encodage » : flux de données par services).

Ces solutions sont rapides, mais leur tolérance aux pannes est limitée. Elles supposent que producteur et consommateur sont **en ligne en même temps**. Si le consommateur est déconnecté, il rate les messages envoyés pendant son absence. Le producteur peut réessayer, mais s'il plante lui-même, son tampon de messages à renvoyer disparaît avec lui. Le code de l'application doit donc connaître et gérer le risque de perte.

## Les brokers de messages

L'alternative courante est de passer par un **broker** (file de messages) : un serveur auquel producteurs et consommateurs se connectent comme clients. Le producteur écrit dans le broker ; le consommateur lit depuis le broker. En centralisant les données, on déplace la question de la durabilité **dans le broker**, qui peut garder les messages en mémoire seulement ou les écrire sur disque pour survivre à un crash. Face à un consommateur lent, il choisit en général la **mise en file sans borne** plutôt que la perte ou la contre-pression (avec la limite qu'on verra).

Conséquence : la consommation devient **asynchrone**. Le producteur attend seulement que le broker confirme avoir mis le message en tampon, pas que le consommateur l'ait traité. La livraison arrive « plus tard », souvent en une fraction de seconde, parfois beaucoup plus si une file s'est remplie.

### Broker ou base de données ?

Certains brokers savent participer à un commit en deux phases (on le reverra dans le module « Consensus »), ce qui les rapproche d'une base. Mais la philosophie diffère :

- une base **garde** les données jusqu'à ce qu'on les supprime ; un broker classique **supprime** un message dès qu'il est livré. Il ne convient pas au stockage long terme ;
- un broker suppose une **petite** file : si beaucoup de messages s'accumulent (consommateur lent), ils débordent sur disque et le débit global chute ;
- une base offre des index secondaires et des recherches ; un broker permet de **s'abonner** aux sujets qui correspondent à un motif ;
- une requête en base donne une photo à un instant, que le client ne voit pas changer ; un broker ne répond pas à des requêtes arbitraires, mais **notifie** les clients quand les données changent.

C'est la vision classique, standardisée par **JMS** et **AMQP** et implémentée par RabbitMQ, ActiveMQ, HornetQ, Qpid, TIBCO EMS, IBM MQ, Azure Service Bus ou Google Cloud Pub/Sub. La leçon 3 montrera une autre famille, fondée sur un **log**, qui efface cette différence.

## Pièges fréquents

- **Choisir un broker sans répondre aux deux questions** : que fait-il quand le consommateur est lent ? que perd-il en cas de crash ? La réponse est dans sa configuration, pas dans sa réputation.
- **Croire qu'une file non bornée résout le problème** : elle le repousse. Une file qui grossit de 1 000 messages/s finit par sortir de la mémoire, et le broker ralentit pour tout le monde.
- **Utiliser des webhooks pour des événements qu'on compte** : si le consommateur est en panne au mauvais moment, l'événement est perdu, sauf si le producteur garde et rejoue ce qu'il a envoyé.
- **Sonder une table toutes les 100 ms** : la plupart des requêtes ne trouvent rien, et la latence reste celle de l'intervalle de sondage.

## À retenir

- Un événement est immuable, horodaté, écrit une fois et lu par plusieurs consommateurs ; les événements liés forment un sujet.
- Producteur trop rapide : perdre, mettre en tampon, ou freiner le producteur. Il n'y a pas de quatrième option.
- La durabilité se paie ; la perte est acceptable pour des métriques, pas pour des événements comptés.
- La messagerie directe est rapide mais suppose que tout le monde est en ligne ; un broker centralise et rend la consommation asynchrone.
- Un broker classique efface ce qu'il a livré : c'est une file, pas un historique.
