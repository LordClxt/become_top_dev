---
id: ddia-ch16-l04
title: "Concevoir l'application autour du flux de données"
source: { chapter: 12, pages: "504-509" }
duration_min: 35
concepts:
  - id: ddia-derivation-function
    label: "Le code applicatif comme fonction de dérivation : index, recherche, modèle de ML, cache"
  - id: ddia-code-state-separation
    label: "Séparer code et état : serveurs sans état, base comme variable partagée qu'on ne peut pas observer"
  - id: ddia-state-change-dataflow
    label: "Penser en flux : un changement d'état ici déclenche du code qui change l'état ailleurs, dans un ordre stable"
  - id: ddia-stream-vs-rpc-services
    label: "Services par flux plutôt que par appels synchrones : s'abonner aux taux de change au lieu de les demander"
glossary:
  - term: "fonction de dérivation"
    definition: "Le code qui transforme un jeu de données en un autre (index, document de recherche, modèle, page en cache)."
  - term: "programmation par flux de données (dataflow)"
    definition: "Style où les calculs se déclenchent quand leurs entrées changent, comme les formules d'un tableur."
  - term: "serveur sans état (stateless)"
    definition: "Un serveur applicatif qui ne garde aucun état persistant entre deux requêtes : il le lit dans une base à chaque fois."
  - term: "jointure flux-table"
    definition: "Enrichir chaque événement d'un flux avec l'état courant d'une table maintenue localement à partir d'un autre flux."
visuals: []
labs: [ddia-ch16-l04-lab-dataflow-design]
xp: 40
---

## Pourquoi c'est important

Si index, caches et vues sont des données dérivées maintenues par des consommateurs d'un log, alors une bonne partie de **ton code applicatif** est, elle aussi, une fonction de dérivation. Ce changement de regard modifie la façon de découper les services : au lieu de services qui s'appellent les uns les autres en synchrone (et tombent ensemble), on obtient des services qui **s'abonnent** aux changements qui les intéressent. Le livre l'illustre avec un exemple de taux de change que tu croiseras dans n'importe quel système de paiement.

## Le code applicatif comme fonction de dérivation

Quand un jeu de données est dérivé d'un autre, il passe par une fonction de transformation. Exemples :

- **index secondaire** : choisir les valeurs d'une colonne et les trier ; une fonction si standard que toutes les bases l'intègrent (`CREATE INDEX`) ;
- **index plein texte** : découper en mots, appliquer racinisation et synonymes, construire la liste des documents par terme ; en partie standard, en partie propre à la langue et au domaine ;
- **modèle de machine learning** : dérivé des données d'entraînement par extraction de caractéristiques et analyse statistique ; très spécifique à l'application ;
- **cache** : une agrégation des données sous la forme exacte qu'affichera l'interface ; elle dépend entièrement de l'écran.

Plus la fonction est spécifique, plus elle relève du **code applicatif**. Or les bases relationnelles accueillent mal ce code : déclencheurs, procédures stockées et fonctions définies par l'utilisateur existent, mais comme un **ajout tardif**. Ils s'intègrent mal à la gestion des dépendances, au contrôle de version, au déploiement, à la supervision et à la montée en charge d'aujourd'hui.

## Séparer le code de l'état

Les outils modernes de déploiement (Kubernetes, Docker, YARN…) sont faits pour exécuter du **code** : packages, mises à jour progressives, montée en charge. Les bases sont faites pour gérer de l'**état durable**. Il est sain de laisser chaque outil faire ce qu'il fait bien. D'où la pratique courante : des serveurs applicatifs **sans état**, qui gardent l'état persistant dans une base. Le livre parle, en plaisantant, de la séparation de l'Église et de l'État.

Le problème : dans ce modèle, la base joue le rôle d'une **variable partagée mutable**, accessible par le réseau, que tu peux lire et écrire, mais **pas observer**. Pour savoir si quelque chose a changé, tu dois **interroger** périodiquement (polling). Dans la plupart des langages, on ne peut pas non plus s'abonner aux changements d'une variable, alors qu'on en a souvent besoin.

Le contre-exemple, c'est le **tableur** : quand tu changes une cellule, toutes les formules qui en dépendent se recalculent seules. On veut la même chose pour un système de données : si un enregistrement change, tous les index, caches et agrégats qui en dépendent se mettent à jour **automatiquement**. C'est l'idée de la programmation par flux de données (*dataflow*), pensée depuis longtemps mais restée en marge.

## Changements d'état et code : un flux

Penser une application en *dataflow*, c'est voir l'interaction entre état et code ainsi : **un changement d'état à un endroit déclenche du code qui produit des changements d'état ailleurs**. Le code n'est pas un appel qui lit puis écrit une base ; il est un **opérateur** branché sur un flux.

Dans une base dégroupée, ces opérateurs maintiennent des données dérivées. Deux exigences en découlent, plus fortes que celles d'une messagerie classique :

- **l'ordre des changements doit être stable** : une file de messages classique peut relivrer dans le désordre un message non acquitté (chapitre sur les logs) ; pour maintenir un dérivé, l'ordre compte ;
- **la tolérance aux pannes** : perdre un seul message rend le dérivé faux pour toujours ; il faut des consommateurs idempotents et un traitement exactly-once (même résultat qu'en l'absence de panne).

Un log partitionné à la Kafka fournit les deux ; c'est pour cela qu'il est au cœur du dégroupement.

## Processeurs de flux et services

Le style dominant aujourd'hui, ce sont les **microservices** : chaque service encapsule son état et répond à des requêtes **synchrones** (REST, RPC, chapitre sur l'encodage). Le *dataflow* compose aussi des services indépendants, mais ils communiquent par des **flux de messages à sens unique**, asynchrones.

Exemple du livre : un client achète un article dont le prix est en dollars, et paie en euros. Il faut le taux de change courant.

- **Approche microservice** : à chaque achat, le service d'achat **appelle** le service de taux de change. Si ce service est lent ou en panne, l'achat l'est aussi.
- **Approche dataflow** : le service d'achat s'est **abonné** au flux des mises à jour de taux, et garde le dernier taux de chaque devise dans une base **locale**. À l'achat, il fait une simple lecture locale.

La seconde est **plus rapide** (pas d'aller-retour réseau sur le chemin critique) et **plus robuste** (la panne du service de taux ne bloque pas les achats ; au pire, le taux local a quelques secondes de retard). Le livre va jusqu'à dire que le traitement le plus rapide et le plus fiable, c'est **pas de requête réseau du tout**.

C'est une **jointure flux-table** (chapitre sur le traitement de flux) : le flux des achats est joint à la table des taux maintenue localement. Attention à la **dépendance au temps** : si tu retraites les achats plus tard, il faut le taux **au moment de l'achat**, pas le taux d'aujourd'hui. On garde donc l'historique des taux, ou on enregistre l'identifiant de la version du taux utilisée dans l'événement d'achat.

## Pièges fréquents

- **Mettre la logique de dérivation dans des déclencheurs** : difficile à versionner, tester, déployer et faire monter en charge.
- **Interroger la base en boucle pour détecter un changement** : abonne-toi au flux de changements.
- **Utiliser une file qui relivre dans le désordre pour maintenir un dérivé** : l'ordre des changements doit être stable.
- **Rejouer une jointure avec l'état d'aujourd'hui** : le résultat change ; joins avec l'état valable à la date de l'événement.

## À retenir

- Index, modèle, cache : tout dérivé passe par une fonction ; plus elle est spécifique, plus c'est du code applicatif.
- Code sans état, état dans la base… mais la base est une variable qu'on ne peut pas observer : on veut un tableur.
- En dataflow, un changement d'état déclenche du code qui change l'état ailleurs, dans un ordre stable et sans perte.
- S'abonner aux taux plutôt que les demander : plus rapide, plus robuste ; attention au temps de la jointure.
