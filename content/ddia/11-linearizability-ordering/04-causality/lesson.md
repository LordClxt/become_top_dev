---
id: ddia-ch11-l04
title: "Ordre et causalité"
source: { chapter: 9, pages: "339-343" }
duration_min: 35
concepts:
  - id: ddia-causal-order
    label: "Causalité : la cause précède l'effet (question avant réponse, création avant mise à jour, lecture avant l'écriture qu'elle motive)"
  - id: ddia-total-vs-partial-order
    label: "Ordre total : deux éléments toujours comparables ; ordre causal : partiel, deux événements concurrents sont incomparables"
  - id: ddia-lin-implies-causal
    label: "Un système linéarisable respecte forcément la causalité, mais la linéarisabilité n'est pas le seul moyen de la respecter"
  - id: ddia-causal-consistency
    label: "La cohérence causale est le modèle le plus fort qui ne ralentit pas avec les délais réseau et reste disponible pendant une coupure"
  - id: ddia-capturing-causal-deps
    label: "Respecter la causalité exige de savoir quelle version chaque nœud a lue avant d'écrire (vecteurs de versions)"
glossary:
  - term: "cohérent avec la causalité (causally consistent)"
    definition: "Un système qui respecte l'ordre imposé par la causalité ; par exemple, un instantané qui contient un effet contient aussi sa cause."
  - term: "ordre total"
    definition: "Ordre où deux éléments quelconques sont toujours comparables (comme les nombres entiers)."
  - term: "ordre partiel"
    definition: "Ordre où certains éléments sont incomparables (comme les ensembles {a, b} et {b, c})."
  - term: "concurrent"
    definition: "Se dit de deux opérations dont aucune ne précède l'autre : ni l'une ne connaissait l'autre au moment de s'exécuter."
  - term: "vecteur de versions (version vector)"
    definition: "Un compteur par réplique, transmis avec les données, qui permet de savoir si une version précède, suit ou est concurrente d'une autre."
visuals: []
labs: [ddia-ch11-l04-lab-causality-design]
xp: 40
---

## Pourquoi c'est important

La linéarisabilité ordonne tout, mais elle coûte cher. Or, beaucoup d'applications n'ont pas besoin de **tout** ordonner : elles ont besoin que les **effets ne précèdent jamais leurs causes**. Une réponse affichée avant sa question, une mise à jour appliquée à une ligne qui n'existe pas encore : voilà ce qui casse vraiment. Cette leçon isole cette exigence, la **causalité**, et montre qu'on peut la garantir sans payer le prix de la linéarisabilité. C'est l'un des résultats les plus utiles du chapitre.

## La causalité était déjà partout

L'ordre est un fil rouge du livre. Tu l'as déjà croisé plusieurs fois sans le nommer :

- en **réplication avec leader** (module 05), le leader fixe l'ordre des écritures dans le journal de réplication ; les followers l'appliquent dans cet ordre. Le **préfixe cohérent** (module 05) exigeait de ne jamais voir une réponse avant sa question ;
- en **multi-leader et sans leader** (module 06), la relation « s'est produit avant » (*happened-before*) distinguait une écriture qui en remplace une autre d'écritures **concurrentes** qu'il faut fusionner ; une mise à jour arrivée avant l'insertion de la ligne était un problème de causalité ;
- en **isolation par instantané** (module 08), « cohérent » voulait dire **cohérent avec la causalité** : si l'instantané contient une réponse, il doit contenir la question. Lire tout l'état à un instant précis, c'est voir les effets de tout ce qui s'est passé avant, et rien d'après ;
- le **write skew** (module 09) entre deux médecins de garde était une dépendance causale : Alice décide de partir **parce qu'elle a lu** que Bob était de garde. La SSI détecte justement ces dépendances lecture → écriture ;
- dans la **première leçon** de ce module, l'exemple d'Alice et Bob et du score de football est aussi une violation de causalité : Bob a entendu le résultat (effet) avant de pouvoir le lire.

Une conclusion se dégage : un système qui respecte l'ordre imposé par la causalité est dit **cohérent avec la causalité** (*causally consistent*).

## Ordre total, ordre partiel

Un **ordre total** permet de comparer deux éléments quelconques : 5 < 13, toujours. Les ensembles mathématiques, eux, ne sont pas totalement ordonnés : `{a, b}` est-il plus grand que `{b, c}` ? Aucun ne contient l'autre, ils sont **incomparables**. C'est un **ordre partiel**.

La différence entre les deux modèles de cohérence se lit exactement là :

- **Linéarisabilité → ordre total.** Le système se comporte comme une copie unique, chaque opération est atomique : pour deux opérations quelconques, on peut toujours dire laquelle s'est produite d'abord. Il n'y a **pas de concurrence** dans un stockage linéarisable : une seule ligne de temps.
- **Causalité → ordre partiel.** Deux événements sont ordonnés s'ils sont causalement liés (l'un s'est produit avant l'autre), mais **incomparables** s'ils sont concurrents.

Le contrôle de version Git en donne une image : l'historique n'est pas une ligne mais un **graphe**, où un commit suit ses parents, et où deux branches développées en parallèle sont concurrentes jusqu'à la fusion. L'historique d'un système causal ressemble à ça : des lignes qui se séparent et se rejoignent.

## La linéarisabilité est plus forte que la causalité

Un système linéarisable respecte **forcément** la causalité : si l'opération A s'est terminée avant que B commence, A est avant B dans l'ordre total, quels que soient les canaux de communication, même indirects. C'est ce qui rend la linéarisabilité si simple à utiliser, et si attirante.

Mais la linéarisabilité n'est **pas le seul** moyen de respecter la causalité. Et elle a les coûts vus à la leçon précédente. Bonne nouvelle : la **cohérence causale** est le modèle de cohérence le plus fort qui :

- ne ralentit **pas** à cause des délais réseau ;
- reste **disponible** pendant une coupure réseau.

Dans beaucoup de cas, les systèmes qui semblent exiger la linéarisabilité n'exigent en réalité que la cohérence causale, qui peut être implémentée bien plus efficacement. La recherche (au moment du livre) explorait encore de nouvelles bases qui la garantissent, avec des performances proches des systèmes à cohérence à terme ; elles n'étaient pas encore courantes en production.

## Capturer les dépendances causales

Pour garantir la causalité, il faut savoir **quelle opération s'est produite avant quelle autre**. Concrètement :

- si une réplique traite une opération, elle doit s'assurer que toutes les opérations **causalement antérieures** (tout ce qui s'est produit avant) ont déjà été traitées ; sinon, elle attend ;
- pour cela, chaque écriture doit transporter **ce que l'écrivain savait** au moment d'écrire. Quand un client lit une donnée puis écrit, la base doit savoir **quelle version il a lue**.

C'est une généralisation de ce que tu as vu au module 06 pour détecter les écritures concurrentes sur une même clé : les **vecteurs de versions**. Pour la causalité, il faut suivre les dépendances sur **toute la base**, pas sur une seule clé. Exemple : un client lit la version `{A: 3, B: 5}` d'un panier, puis écrit. Son écriture porte ce vecteur ; une réplique qui n'a appliqué que `{A: 3, B: 4}` doit attendre la 5ᵉ écriture de B avant d'appliquer celle-ci. Le numéro de version lu est renvoyé à l'écriture, exactement comme la SSI (module 09) suivait les lectures pour détecter les conflits.

Le coût : avec beaucoup de clients et de répliques, suivre explicitement toutes les dépendances peut devenir lourd. D'où l'idée de la leçon suivante : les **numéros de séquence** et les **horloges de Lamport**, une manière compacte d'obtenir un ordre compatible avec la causalité.

## Pièges fréquents

- **Exiger la linéarisabilité par réflexe** alors que seule la causalité compte : tu paies latence et indisponibilité pour rien.
- **Confondre « concurrent » et « simultané »** : deux opérations à une heure d'écart sont concurrentes si aucune ne connaissait l'autre.
- **Croire qu'un ordre partiel est un défaut** : c'est l'information exacte ; un ordre total sur des événements concurrents est un choix arbitraire.
- **Oublier la lecture** : l'écriture d'Alice dépend de ce qu'elle a lu ; sans suivre la version lue, la dépendance est perdue.

## À retenir

- La causalité impose un **ordre partiel** : la cause avant l'effet ; les événements concurrents sont incomparables.
- La linéarisabilité impose un **ordre total**, donc implique la causalité ; il n'y a pas de concurrence dans un stockage linéarisable.
- La cohérence causale est le modèle le plus fort qui reste rapide malgré les délais réseau et disponible pendant une coupure.
- Pour la garantir, il faut savoir quelle version chaque écrivain a lue : vecteurs de versions étendus à toute la base.
