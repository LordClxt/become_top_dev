---
id: ddia-ch04-l05
title: "Messages, brokers et acteurs"
source: { chapter: 4, pages: "136-139" }
duration_min: 25
concepts:
  - id: ddia-message-broker
    label: "Un broker stocke temporairement les messages entre l'émetteur et le destinataire : tampon, redistribution, découplage"
  - id: ddia-queue-topic
    label: "Envoi vers une file ou un sujet nommé ; un ou plusieurs consommateurs ; flux à sens unique"
  - id: ddia-broker-encoding
    label: "Un broker n'impose aucun modèle de données : l'encodage compatible garde les éditeurs et consommateurs indépendants"
  - id: ddia-actor-model
    label: "Modèle d'acteurs : état local, messages asynchrones sans garantie de livraison, un message à la fois"
  - id: ddia-ch04-summary
    label: "Bilan : avec un peu de soin, compatibilité et mises à jour progressives sont à portée"
glossary:
  - term: "message broker (file de messages, message-oriented middleware)"
    definition: "Intermédiaire qui stocke temporairement les messages entre un émetteur et un ou plusieurs destinataires."
  - term: "file / sujet (queue / topic)"
    definition: "Destination nommée où l'émetteur publie ; le broker livre à un ou plusieurs consommateurs ou abonnés."
  - term: "acteur"
    definition: "Unité de logique qui représente un client ou une entité, garde un état local et communique par messages asynchrones, un message à la fois."
  - term: "framework d'acteurs distribué"
    definition: "Intègre un broker et le modèle d'acteurs ; le même mécanisme de message sert sur un nœud ou entre nœuds."
visuals: []
labs: [ddia-ch04-l05-lab-broker-design]
xp: 25
---

## Pourquoi c'est important

Entre l'appel de service (une requête, une réponse, tout de suite) et la base de données (un processus écrit, un autre lit plus tard) existe un troisième mode : le **message asynchrone**. Il est partout dans les architectures modernes (files de tâches, journaux d'événements). Cette dernière leçon du chapitre te dit ce que le broker apporte, ce qu'il n'impose pas, et ce qui reste à ta charge.

## Entre RPC et base de données

Le passage de messages ressemble au RPC : la requête de l'émetteur (un *message*) est livrée à un autre processus avec une faible latence. Et à une base de données : le message ne passe pas par une connexion directe, mais par un intermédiaire, le **broker** (*file de messages*, *message-oriented middleware*), qui le **stocke temporairement**.

Avantages par rapport à un RPC direct :

- il sert de **tampon** si le destinataire est indisponible ou surchargé, ce qui améliore la fiabilité ;
- il peut **redistribuer** automatiquement un message à un processus qui a planté, évitant les pertes ;
- l'émetteur n'a **pas besoin de connaître l'adresse IP et le port** du destinataire (précieux dans le cloud, où les machines virtuelles vont et viennent) ;
- un message peut aller à **plusieurs destinataires** ;
- il **découple logiquement** l'émetteur du destinataire : l'émetteur publie sans se soucier de qui consomme.

Différence avec le RPC : la communication est généralement **à sens unique**. L'émetteur n'attend pas de réponse (un processus peut en envoyer une, mais sur un canal séparé). Et elle est **asynchrone** : l'émetteur n'attend pas la livraison, il envoie et oublie.

## Les brokers

Autrefois dominés par des logiciels commerciaux (TIBCO, IBM WebSphere, webMethods), les brokers sont aujourd'hui souvent open source : RabbitMQ, ActiveMQ, HornetQ, NATS, Apache Kafka. Les sémantiques de livraison varient selon l'implémentation et la configuration, mais l'usage est semblable : un processus envoie un message à une **file** ou un **sujet** nommé, et le broker le livre à un ou plusieurs **consommateurs** ou **abonnés**. Il peut y avoir plusieurs producteurs et plusieurs consommateurs sur un même sujet.

Un sujet n'offre qu'un flux à **sens unique**. Mais un consommateur peut lui-même publier sur un autre sujet (on enchaîne alors les traitements), ou sur une **file de réponse** consommée par l'émetteur d'origine, ce qui reproduit un dialogue requête/réponse à la manière du RPC.

Les brokers n'imposent **aucun modèle de données** : un message est une suite d'octets avec des métadonnées. On peut donc utiliser n'importe quel encodage. Si cet encodage est rétro et ascendant compatible, tu peux changer éditeurs et consommateurs **indépendamment** et les déployer dans n'importe quel ordre. Et si un consommateur republie des messages sur un autre sujet, il faut **préserver les champs inconnus**, comme pour les bases de données.

## Les frameworks d'acteurs distribués

Le **modèle d'acteurs** est un modèle de programmation de la concurrence **dans un seul processus**. Au lieu de manipuler des threads (avec conditions de course, verrous et interblocages), la logique est encapsulée dans des **acteurs**. Chaque acteur représente souvent un client ou une entité, a un **état local** (non partagé), et communique par **messages asynchrones**. La livraison n'est pas garantie : dans certains cas d'erreur, des messages sont perdus. Chaque acteur traite **un seul message à la fois**, sans se soucier des threads ; le framework planifie chacun indépendamment.

Dans un **framework d'acteurs distribué**, ce modèle fait passer l'application à l'échelle sur plusieurs nœuds. Le même mécanisme de message sert que l'émetteur et le destinataire soient sur le même nœud ou sur des nœuds différents ; dans le second cas, le message est encodé en octets, envoyé et décodé de l'autre côté. La transparence de localisation y marche mieux qu'avec le RPC, car le modèle suppose déjà que des messages peuvent se perdre, même localement. En pratique, un tel framework **intègre un broker et le modèle d'acteurs**.

Mais pour une mise à jour progressive, il faut quand même la compatibilité : un message peut aller d'un nœud nouveau vers un nœud ancien et inversement. Trois frameworks :

- **Akka** utilise par défaut la sérialisation intégrée de Java (sans compatibilité) ; on peut la remplacer par Protocol Buffers pour gagner les mises à jour progressives ;
- **Orleans** utilise par défaut un format maison qui ne permet pas de mise à jour progressive : il faut déployer un nouveau cluster, y basculer le trafic, puis arrêter l'ancien ;
- **Erlang OTP** rend les changements de schéma d'enregistrement étonnamment difficiles ; les mises à jour progressives sont possibles mais demandent un plan soigné.

## Bilan du chapitre

Les détails d'un encodage ne touchent pas seulement l'efficacité, mais surtout l'**architecture** et les **options de déploiement**. Les mises à jour progressives rendent les versions plus fréquentes, plus petites et moins risquées (un déploiement défectueux est détecté et annulé avant d'atteindre beaucoup d'utilisateurs). Pour cela, **tout ce qui circule** doit offrir rétro et ascendante :

- formats propres à un langage : limités à un langage, rarement compatibles ;
- formats textuels (JSON, XML, CSV) : compatibilité selon l'usage, flous sur les types ;
- formats binaires à schéma (Thrift, protobuf, Avro) : compacts, compatibilité bien définie, mais illisibles sans décodage.

Et trois modes de flux : **bases** (l'écrivain encode, le lecteur décode), **RPC/REST** (le client encode la requête, le serveur la décode et encode la réponse), **messages** (encodés par l'émetteur, décodés par le destinataire). Avec un peu de soin, la compatibilité et les mises à jour progressives sont à portée.

## Pièges fréquents

- **Croire que le broker résout la compatibilité** : il transporte des octets, c'est à toi de choisir un encodage compatible.
- **Attendre une réponse d'un sujet** : il est à sens unique ; la réponse passe par une autre file.
- **Supposer que chaque message arrive exactement une fois** : un acteur ou une file peut perdre ou redélivrer.
- **Perdre les champs inconnus en republiant** : un consommateur qui re-publie doit les conserver.

## À retenir

- Un broker stocke le message le temps du transit : tampon, redélivrance, découplage, plusieurs destinataires.
- Sens unique et asynchrone : l'émetteur envoie et oublie.
- L'encodage reste un choix de l'application : compatible ou non, il décide de l'indépendance de déploiement.
- Acteurs : état local, un message à la fois, livraison non garantie ; en distribué, mêmes questions d'encodage.
