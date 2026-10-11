---
id: ddia-ch04-l04
title: "Flux de données : bases, REST et RPC"
source: { chapter: 4, pages: "128-136" }
duration_min: 40
concepts:
  - id: ddia-dataflow-modes
    label: "Les données circulent d'un processus à l'autre par les bases, les appels de service ou les messages"
  - id: ddia-data-outlives-code
    label: "Les données survivent au code : une base contient des valeurs écrites il y a cinq ans comme il y a cinq millisecondes"
  - id: ddia-unknown-fields
    label: "Un ancien code qui relit puis réécrit un enregistrement doit conserver les champs inconnus"
  - id: ddia-rest-vs-soap
    label: "REST (principes de HTTP, formats simples) contre SOAP (XML, WSDL, WS-*)"
  - id: ddia-rpc-problems
    label: "Un appel réseau n'est pas un appel de fonction : perte, timeout, nouvel essai, latence variable, types différents"
  - id: ddia-service-evolution
    label: "Services : serveurs mis à jour avant clients, donc rétrocompatibilité des requêtes et compatibilité ascendante des réponses"
glossary:
  - term: "les données survivent au code (data outlives code)"
    definition: "Le code se remplace en quelques minutes, mais les données d'une base restent dans leur encodage d'origine tant qu'on ne les réécrit pas."
  - term: "service web"
    definition: "Un service dont le protocole sous-jacent est HTTP, qu'il serve des navigateurs, d'autres services de la même organisation ou d'autres organisations."
  - term: "REST"
    definition: "Philosophie de conception fondée sur HTTP : formats simples, URL pour identifier des ressources, fonctions HTTP pour le cache, l'authentification et la négociation de contenu."
  - term: "SOAP"
    definition: "Protocole XML d'appels réseau, décrit par WSDL, avec une multitude de standards associés (WS-*)."
  - term: "RPC (remote procedure call)"
    definition: "Modèle qui fait ressembler une requête réseau à un appel de fonction local (transparence de localisation)."
  - term: "idempotence"
    definition: "Propriété d'une opération qu'on peut rejouer sans effet supplémentaire : indispensable quand une réponse perdue provoque un nouvel essai."
visuals: []
labs: [ddia-ch04-l04-lab-dataflow-design]
xp: 40
---

## Pourquoi c'est important

La compatibilité, c'est une relation entre un processus qui **encode** et un autre qui **décode**. Mais ils ne se parlent pas toujours de la même façon : par une base de données, par un appel de service, par un message. Selon le cas, les hypothèses changent : qui est mis à jour en premier, combien de temps vivent les données. Cette leçon passe en revue les deux premiers modes, bases et services.

## Flux par les bases de données

Dans une base, le processus qui écrit encode, celui qui lit décode. Un seul processus peut accéder à la base : alors le lecteur est une version ultérieure du même processus. Stocker une donnée revient à **envoyer un message à ton futur toi**. La rétrocompatibilité est évidemment nécessaire : sinon, ton futur toi ne déchiffre pas ce que tu as écrit.

Mais souvent, **plusieurs processus** accèdent à la base en même temps : plusieurs applications, ou plusieurs instances du même service pendant une mise à jour progressive. Certains font tourner le nouveau code, d'autres l'ancien. Une valeur peut donc être écrite par un nouveau code et lue par un ancien : la **compatibilité ascendante** est aussi nécessaire.

### Le piège des champs inconnus

Une subtilité : le nouveau code ajoute un champ et l'écrit. Puis une **ancienne version** lit l'enregistrement, le modifie et le **réécrit**. Le comportement souhaité est que l'ancien code **conserve le champ nouveau**, même s'il ne sait pas l'interpréter.

Les formats d'encodage savent préserver les champs inconnus, mais il faut parfois **y veiller dans l'application**. Si tu décodes la valeur de la base en objets de ton modèle, puis les ré-encodes, le champ inconnu **disparaît** dans la traduction. Ce n'est pas difficile à corriger, il suffit d'y penser.

### Les données survivent au code

Une base permet de modifier n'importe quelle valeur à tout moment : certaines ont été écrites il y a cinq millisecondes, d'autres il y a cinq ans. Une application serveur se remplace par la nouvelle version en quelques minutes ; les **données de la base de l'an dernier restent dans leur encodage d'origine** tant qu'on ne les a pas réécrites. On le résume en disant que **les données survivent au code**.

Migrer (réécrire) les données dans un nouveau schéma est possible mais **coûteux** sur un gros jeu : la plupart des bases l'évitent. Beaucoup de bases relationnelles autorisent des changements simples, comme ajouter une colonne avec défaut `null`, **sans réécrire** les lignes existantes : à la lecture d'une ancienne ligne, la base remplit `null` pour la colonne manquante. (MySQL réécrit souvent toute la table sans nécessité.) Espresso, la base de documents de LinkedIn, stocke en Avro et profite des règles d'évolution d'Avro. L'évolution de schéma permet ainsi à toute la base de paraître encodée avec un seul schéma, alors que le stockage contient des versions historiques.

### Stockage d'archives

Quand tu prends un instantané de la base (sauvegarde, chargement dans un entrepôt), le dump est le plus souvent encodé avec le **schéma le plus récent**, même si la base d'origine mélange plusieurs époques : puisqu'on copie de toute façon, autant encoder de façon cohérente. Le dump est écrit d'un coup puis **immuable** : les fichiers conteneur Avro conviennent bien, et c'est l'occasion d'utiliser un format **en colonnes** comme Parquet, utile à l'analyse.

## Flux par les services : REST et RPC

Le montage le plus courant a deux rôles : **clients** et **serveurs**. Les serveurs exposent une API réseau, les clients s'y connectent. Le web fonctionne ainsi : GET pour télécharger HTML, CSS, JavaScript, images ; POST pour envoyer des données. Un client peut aussi être une application mobile ou du JavaScript dans un navigateur (Ajax) ; la réponse est alors rarement du HTML, plutôt des données dans un format facile à traiter (JSON). Un serveur peut lui-même être client d'un autre service (une application web est client de la base).

Cette approche, qui découpe une grosse application en services par domaine fonctionnel, s'est appelée **architecture orientée services** (SOA), reformulée en **microservices**. Un but central : faciliter le changement en rendant les services **déployables et évolutifs indépendamment**, chacun géré par une équipe qui peut le publier souvent sans coordination. Les anciennes et les nouvelles versions de serveurs et de clients tournent en même temps, donc l'encodage des échanges doit rester compatible entre les versions de l'API.

Quand HTTP est le protocole sous-jacent, on parle de **service web**, qu'il s'agisse d'un client sur la machine d'un utilisateur, d'un service qui appelle un autre service de la même organisation (middleware), ou d'un service qui appelle celui d'une autre organisation (API publiques de paiement, OAuth).

### REST et SOAP

Deux approches presque opposées :

- **REST** n'est pas un protocole mais une philosophie fondée sur HTTP : formats simples, **URL** pour identifier des ressources, fonctions HTTP pour le cache, l'authentification et la négociation de contenu. Une API qui suit ces principes est dite *RESTful*. On la décrit avec OpenAPI (Swagger).
- **SOAP** est un protocole XML d'appels réseau, qui cherche à être indépendant de HTTP et en évite la plupart des fonctions. Il vient avec une multitude de standards (WS-*), et son API se décrit avec **WSDL**, qui permet la génération de code. Les messages sont trop complexes pour s'écrire à la main : on dépend de l'outillage, et l'interopérabilité entre éditeurs pose problème. Il survit surtout dans les grandes entreprises.

(SOAP n'est pas nécessaire à SOA : l'un est une technologie, l'autre une approche.)

### Les problèmes des appels de procédure distants (RPC)

Les services web sont la dernière incarnation d'une longue lignée (EJB, RMI, DCOM, CORBA), tous fondés sur le **RPC** : faire ressembler une requête réseau à un appel de fonction locale (**transparence de localisation**). Pratique en apparence, fondamentalement défectueux, car un appel réseau est très différent :

- un appel local est **prévisible** (il réussit ou échoue selon des paramètres que tu contrôles) ; une requête réseau peut être perdue, le serveur peut être lent ou en panne, et tu n'y peux rien ;
- un appel local retourne un résultat, lève une exception, ou ne revient jamais ; une requête réseau a une **quatrième issue : le délai dépassé**. Tu ne sais pas si la requête est arrivée ;
- si tu **réessaies**, la requête a peut-être déjà abouti et c'est la **réponse** qui s'est perdue. Sans mécanisme de déduplication (**idempotence**), l'action est exécutée plusieurs fois ;
- un appel local dure à peu près le même temps ; la latence d'une requête réseau **varie énormément** (moins d'une milliseconde ou plusieurs secondes) ;
- on passe des références locales à une fonction ; sur le réseau, il faut **encoder** tous les paramètres en octets, ce qui devient pénible pour de gros objets ;
- client et serveur peuvent être dans des **langages différents** : traduire les types est délicat (les entiers de plus de 2⁵³ en JavaScript).

Il est donc vain de faire ressembler un service distant à un objet local. Une partie de l'attrait de REST est justement de **ne pas cacher** qu'on utilise un protocole réseau.

### Les directions actuelles du RPC

Le RPC ne disparaît pas : Thrift et Avro ont leur RPC, gRPC utilise protobuf, Finagle utilise Thrift, Rest.li utilise JSON sur HTTP. La nouvelle génération est plus explicite sur la différence avec un appel local : les **futures (promesses)** encapsulent une action asynchrone qui peut échouer et simplifient les requêtes parallèles ; gRPC gère des **flux** (une série de requêtes et de réponses). Certains frameworks offrent la **découverte de service** (trouver l'adresse IP et le port d'un service).

Un RPC avec encodage binaire peut être plus rapide que JSON sur REST. Mais REST a de gros avantages : on l'explore avec un navigateur ou `curl` sans génération de code, il est supporté par tous les langages, et son écosystème est immense (caches, load balancers, proxys, pare-feu, supervision…). REST domine donc les **API publiques** ; le RPC sert surtout aux requêtes **entre services d'une même organisation**, souvent dans un même datacenter.

### Encodage et évolution pour le RPC

Pour l'évolutivité, clients et serveurs doivent pouvoir changer et se déployer indépendamment. Hypothèse simplificatrice : **tous les serveurs sont mis à jour avant les clients**. Il suffit alors de la **rétrocompatibilité sur les requêtes** (le nouveau serveur lit les requêtes des anciens clients) et de la **compatibilité ascendante sur les réponses** (l'ancien client lit les réponses du nouveau serveur).

La compatibilité hérite de l'encodage : Thrift, gRPC et Avro RPC suivent les règles de leur format. Les API REST renvoient le plus souvent du JSON sans schéma formel : ajouter un paramètre de requête optionnel et ajouter un champ à une réponse sont considérés comme compatibles.

Enfin, quand le fournisseur d'un service ne contrôle pas ses clients (et ne peut pas les forcer à migrer), la compatibilité doit être maintenue **très longtemps**, parfois indéfiniment. Si un changement cassant s'impose, on maintient souvent **plusieurs versions de l'API côte à côte**. Pas de consensus sur le versionnement : numéro dans l'URL, ou dans l'en-tête HTTP `Accept` ; ou, avec des clés d'API, la version demandée stockée côté serveur et modifiable via une interface d'administration.

## Pièges fréquents

- **Décoder puis ré-encoder en perdant les champs inconnus** : un vieux service efface le travail du nouveau.
- **Traiter un appel distant comme une fonction locale** : pas de timeout, pas de nouvel essai, pas d'idempotence.
- **Réessayer sans idempotence** : une réponse perdue entraîne un double paiement ou un double envoi.
- **Changer une API publique de façon cassante** sans garder l'ancienne version.

## À retenir

- Trois modes de flux : bases, services (REST/RPC), messages ; chacun a ses hypothèses de mise à jour.
- Base : rétro et ascendante, car les données survivent au code ; conserve les champs inconnus.
- RPC : un appel réseau n'est pas un appel local (timeout, nouvel essai, idempotence, latence variable).
- Services : serveurs d'abord, clients ensuite → rétrocompatibilité des requêtes, compatibilité ascendante des réponses.
- REST domine les API publiques ; le RPC, les échanges internes.
