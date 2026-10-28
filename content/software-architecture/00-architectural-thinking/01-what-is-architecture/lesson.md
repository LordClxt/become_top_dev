---
id: arch-ch00-l01
title: "Ce qu'est (vraiment) une architecture"
source: { chapter: 1, pages: "21-28, 39-40" }
duration_min: 30
concepts:
  - id: arch-four-dimensions
    label: "Une architecture = structure + caractéristiques + décisions + principes de design"
  - id: arch-decision-vs-principle
    label: "Une décision est une règle ; un principe est un guide qui laisse choisir"
  - id: arch-variance
    label: "Une variance est une exception à une décision, accordée sur justification"
  - id: arch-laws
    label: "Première loi : tout est un trade-off. Deuxième loi : le pourquoi compte plus que le comment"
  - id: arch-context
    label: "Toute architecture est le produit de son contexte"
glossary:
  - term: "style d'architecture"
    definition: "La forme globale du système (en couches, microkernel, microservices…). C'est la dimension « structure »."
  - term: "caractéristique d'architecture"
    definition: "Un critère de succès du système qui ne dépend pas de ses fonctionnalités : disponibilité, scalabilité, sécurité… (les « -ilités »)."
  - term: "décision d'architecture"
    definition: "Une règle de construction du système : ce qui est permis et ce qui ne l'est pas."
  - term: "principe de design"
    definition: "Une préférence qui guide les équipes sans les contraindre : elles peuvent s'en écarter si le contexte le justifie."
  - term: "variance"
    definition: "Exception accordée à une décision d'architecture, après analyse des justifications et des trade-offs, par un comité (ARB) ou l'architecte en chef."
  - term: "ARB"
    definition: "Architecture Review Board : comité qui valide les décisions importantes et instruit les demandes de variance."
visuals: [arch-ch00-four-dimensions]
labs: [arch-ch00-l01-lab-warmup-dimensions]
xp: 30
---

## Pourquoi c'est important

Lundi matin, un nouveau collègue te demande : « C'est quoi, l'architecture de notre plateforme ? » Tu réponds : « Des microservices. » Il hoche la tête… puis, dans la semaine, il branche son nouveau service **directement sur la base d'un autre service**, appelle en synchrone un service qui met deux secondes à répondre, et ajoute un cache partagé entre trois équipes. Rien dans ta réponse ne lui disait que c'était interdit, ni pourquoi.

Ton « microservices » ne décrivait qu'**une dimension sur quatre**. Cette leçon donne une définition opérationnelle de l'architecture : de quoi elle est faite, et ce qu'il faut dire pour qu'un développeur puisse construire sans la casser.

## Pas de définition officielle… mais une définition utile

L'industrie n'a jamais trouvé de définition consensuelle. La plus célèbre est une pirouette de Ralph Johnson : *l'architecture, c'est ce qui est important… quoi que ce soit*. Les auteurs refusent eux aussi de définir le **rôle** d'architecte (il va de l'expert programmeur au stratège technique), mais ils proposent une définition **analysable** du système :

> Une architecture logicielle, c'est la **structure** du système, combinée aux **caractéristiques** qu'il doit tenir, aux **décisions** d'architecture et aux **principes de design**.

Reprenons chacune avec un exemple concret : une boutique en ligne.

### 1. La structure : le style

C'est le ou les **styles** dans lesquels le système est bâti : en couches, microkernel, microservices, event-driven… Pour la boutique : « une application en couches, une base PostgreSQL ».

C'est la dimension que tout le monde cite… et la moins suffisante. Dire « c'est du microservices », c'est décrire la charpente d'une maison sans dire combien de personnes elle doit abriter ni où passent les murs porteurs.

### 2. Les caractéristiques : les critères de succès

Ce sont les **« -ilités »** : disponibilité, scalabilité, élasticité, sécurité, testabilité, déployabilité… Elles définissent ce que « ça marche » veut dire, **indépendamment des fonctionnalités**. Remarque clé : aucune ne nécessite de savoir *ce que fait* le système. Que la boutique vende des chaussures ou des billets d'avion, « supporter 10× le trafic le jour des soldes » est un critère de succès d'un autre ordre que « ajouter au panier ».

Elles ont trois chapitres à elles (modules 02 à 04) : ce sont elles qui, au final, dictent le style.

### 3. Les décisions : les règles

Une décision d'architecture est une **règle** de construction. Exemple classique : *dans l'architecture en couches, seules les couches métier et services accèdent à la base ; la présentation n'a pas le droit de lui parler directement.* Les décisions forment les **contraintes** du système : elles disent aux équipes ce qui est permis et ce qui ne l'est pas.

Et si une règle ne peut pas s'appliquer quelque part ? On ne la viole pas en silence : on demande une **variance**. La plupart des organisations ont un processus pour cela, instruit par un **comité d'architecture (ARB)** ou par l'architecte en chef, qui accepte ou refuse l'exception **selon ses justifications et ses trade-offs**. Une variance accordée est tracée ; une violation silencieuse est de la dette invisible. Tu coderas ce mécanisme dans le projet de ce module.

### 4. Les principes de design : les guides

Un principe est une **préférence**, pas une loi. Exemple : *entre services, préférer la messagerie asynchrone pour améliorer les performances.* Une règle ne peut jamais prévoir tous les cas de communication entre services ; le principe donne la direction et laisse le développeur choisir REST ou gRPC quand un cas particulier le justifie.

**Le test pour les distinguer** : si s'en écarter demande une autorisation (une variance), c'est une **décision** ; si s'en écarter demande seulement une bonne raison, c'est un **principe**.

## Revenons au collègue du lundi

Une réponse complète aurait été :

- **Structure** : microservices, une base par service.
- **Caractéristiques** : élasticité au moment des soldes, disponibilité du paiement, déployabilité (dix mises en production par jour).
- **Décisions** : aucun service ne lit la base d'un autre ; tout appel externe passe par la gateway.
- **Principes** : asynchrone entre services quand c'est possible ; pas de cache partagé entre équipes.

Avec ça, il aurait su que son raccourci vers la base voisine violait une règle, et qu'avant de partager un cache il devait argumenter.

## Les deux lois de l'architecture logicielle

Le livre ramène ce champ immense à deux lois.

> **Première loi** : *tout*, en architecture logicielle, est un **trade-off**.
>
> **Corollaire** : si tu crois avoir trouvé quelque chose qui n'est pas un trade-off, c'est que tu n'as **pas encore identifié** le trade-off.

Un cache accélère les lectures… et introduit de l'incohérence et de la mémoire à gérer. Les microservices rendent le déploiement indépendant… et transforment chaque appel de fonction en appel réseau qui peut échouer. Quand quelqu'un présente une solution « sans inconvénient », ta question réflexe devient : *qu'est-ce qu'on paie, et qui le paie ?*

> **Deuxième loi** : le **pourquoi** est plus important que le **comment**.

Les auteurs l'ont découvert en conservant les travaux d'ateliers : ils gardaient les diagrammes (le *comment*), jamais les raisons. Des mois plus tard, impossible de comprendre pourquoi une équipe avait choisi un style plutôt qu'un autre. Face à un système inconnu, on peut retrouver *comment* il est structuré en lisant le code ; on ne retrouvera jamais *pourquoi*. C'est le rôle des **ADR** (Architecture Decision Records), que tu écriras au module 14.

## Toute architecture est le produit de son contexte

Imagine que tu entres en 2002 dans une salle serveurs et proposes : « Chaque service sur sa propre machine, avec sa propre base. Il me faut 50 licences Windows, 30 licences de serveur d'application et 50 de base de données. » On t'aurait raccompagné à la porte. Les microservices étaient **inconcevables** économiquement à l'époque ; l'open source et DevOps les ont rendus raisonnables.

Conséquences pratiques :

- Une architecture qui te paraît absurde a souvent été **rationnelle dans son contexte** (licences chères, ops externalisées). Avant de la juger, reconstitue ce contexte.
- Les « axiomes » changent : « l'architecture, c'est ce qui coûte cher à changer » n'est plus vrai pour un système conçu pour changer par petits morceaux… au prix d'autres trade-offs, comme le couplage réseau.

::visual{id="arch-ch00-four-dimensions"}

## Pièges fréquents

- **Réduire l'architecture au style.** « On fait des microservices » ne dit rien des règles, des critères de succès ni des préférences.
- **Écrire un principe comme une décision** (« on DOIT utiliser l'asynchrone ») : les équipes contourneront la règle dès le premier cas où elle est absurde, et l'architecture perd sa crédibilité.
- **Écrire une décision comme un principe** (« éviter si possible d'accéder à la base depuis l'UI ») : personne ne la respectera sous la pression d'un délai.
- **Contourner une décision sans variance** : l'exception devient invisible et se recopie.
- **Juger une architecture héritée sans son contexte.**

## À retenir

- Architecture = **structure + caractéristiques + décisions + principes**. Le style seul ne suffit pas.
- **Décision** = règle (exception par variance) ; **principe** = guide (écart sur bonne raison).
- **Tout est un trade-off** ; si tu n'en vois pas, cherche encore.
- **Le pourquoi > le comment** : on peut relire le comment dans le code, jamais le pourquoi.
- Une architecture se comprend **dans son contexte**, qui change avec le temps.
