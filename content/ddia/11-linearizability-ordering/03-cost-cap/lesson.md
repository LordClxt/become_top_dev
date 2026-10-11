---
id: ddia-ch11-l03
title: "Le prix de la linéarisabilité : CAP et latence"
source: { chapter: 9, pages: "335-338" }
duration_min: 35
concepts:
  - id: ddia-lin-partition-tradeoff
    label: "Pendant une coupure réseau, un réplica coupé du leader doit choisir : rester linéarisable et refuser, ou répondre et ne plus l'être"
  - id: ddia-cap-theorem-precise
    label: "CAP bien compris : quand le réseau est coupé, il faut choisir entre linéarisabilité et disponibilité ; ce n'est pas « 2 parmi 3 »"
  - id: ddia-multicore-memory-not-linearizable
    label: "La RAM d'un processeur multicœur n'est pas linéarisable, par choix de performance et non de tolérance aux pannes"
  - id: ddia-lin-latency-cost
    label: "Le temps de réponse d'une opération linéarisable est au moins proportionnel à l'incertitude des délais réseau"
glossary:
  - term: "partition réseau (network partition)"
    definition: "Une coupure qui sépare les nœuds en groupes qui ne peuvent plus communiquer, alors qu'ils fonctionnent encore."
  - term: "théorème CAP"
    definition: "Formulé par Eric Brewer (2000), prouvé formellement par Gilbert et Lynch (2002) : un système ne peut être à la fois cohérent (linéarisable) et disponible pendant une partition réseau."
  - term: "disponibilité (au sens CAP)"
    definition: "Tout nœud qui fonctionne répond à toute requête. Définition plus stricte que la haute disponibilité au sens courant."
  - term: "barrière mémoire (memory barrier, fence)"
    definition: "Instruction qui force un processeur à rendre ses écritures visibles aux autres cœurs avant de continuer ; elle rend l'accès à la mémoire linéarisable, au prix de la vitesse."
visuals: []
labs: [ddia-ch11-l03-lab-cap-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente disait où la linéarisabilité est indispensable. Celle-ci dit ce qu'elle coûte, et c'est la raison pour laquelle tant de systèmes y renoncent. Tu as sans doute déjà entendu « CAP : choisis 2 parmi 3 ». Cette formule est trompeuse, et un ingénieur qui la cite en entretien ou en revue d'architecture perd en crédibilité. Le vrai message est plus étroit et plus utile : **quand le réseau se coupe**, il faut choisir entre une copie unique et des réponses. Et même sans coupure, la linéarisabilité ralentit chaque opération.

## Deux datacenters et une coupure

Reprends la réplication sur plusieurs datacenters (modules 05 et 06). Une entreprise a un datacenter à Paris et un à Montréal. Le réseau entre eux est coupé, mais chaque datacenter continue de fonctionner et d'être joignable par ses propres clients.

- **Multi-leader** : chaque datacenter a son leader, il accepte les écritures localement, et les réplique plus tard. Pendant la coupure, les deux continuent de servir lectures et écritures ; les écritures sont simplement mises en file et échangées quand le lien revient. Le système reste **disponible**, mais il n'est **pas linéarisable**.
- **Leader unique**, à Paris : toutes les écritures et les lectures linéarisables doivent passer par Paris. Pendant la coupure, les clients de Montréal ne peuvent **ni écrire, ni lire de façon linéarisable**. Ils peuvent lire leur réplica local, mais ces lectures sont potentiellement obsolètes. L'application est **indisponible** pour eux tant que la coupure dure (sauf s'ils peuvent joindre Paris directement).

Ce n'est pas propre au leader unique. **Tout** système linéarisable est dans la même situation : un réplica coupé des autres ne peut pas savoir si une écriture plus récente a eu lieu ailleurs. Il doit choisir.

## Le théorème CAP, bien compris

Le compromis se résume ainsi :

- si l'application **exige** la linéarisabilité, et que des réplicas sont coupés des autres, ces réplicas ne peuvent pas traiter les requêtes : ils attendent la fin de la coupure ou renvoient une erreur. Ils sont **indisponibles** ;
- si l'application **n'exige pas** la linéarisabilité, chaque réplica peut traiter les requêtes indépendamment, même coupé. L'application reste **disponible**, mais n'est pas linéarisable.

C'est l'idée qu'Eric Brewer a popularisée en 2000 sous le nom de **CAP** (cohérence, disponibilité, tolérance aux partitions). Elle a eu un mérite historique : encourager les bases à explorer d'autres conceptions que les systèmes à disque partagé. Mais la formule « choisis 2 parmi 3 » égare : les **partitions ne sont pas un choix**. Ce sont des pannes, elles arriveront que tu le veuilles ou non (module 10). La lecture juste est : **cohérent ou disponible quand le réseau est coupé**. Quand le réseau fonctionne, on peut avoir les deux.

Le théorème, tel que prouvé, a aussi une portée très étroite :

- il ne considère qu'**un** modèle de cohérence (la linéarisabilité) ;
- et qu'**une** sorte de panne (la partition réseau) ;
- il ne dit **rien** des délais réseau, des nœuds morts, ni des autres compromis.

Il a beaucoup servi, mais il n'aide guère à concevoir un système réel. Et les définitions de C, A et P varient d'un auteur à l'autre, ce qui rend la plupart des étiquettes « CP » ou « AP » discutables. Le livre conseille de l'éviter et de parler directement des garanties précises.

## Même sans panne : la latence

Si peu de systèmes sont linéarisables, ce n'est souvent **pas** pour la tolérance aux pannes, mais pour la **performance**.

Un exemple surprenant : la mémoire de ton ordinateur. Sur un processeur multicœur, si un thread écrit une variable et qu'un autre la lit juste après sur un autre cœur, il peut lire l'**ancienne** valeur, sauf si une **barrière mémoire** (*fence*) est utilisée. Chaque cœur a ses propres caches et tampons d'écriture, synchronisés avec la mémoire principale de façon asynchrone. La RAM d'un multicœur n'est donc pas linéarisable. Pourtant, personne ne s'attend à ce qu'un cœur continue de tourner « coupé » des autres : il n'y a pas de partition ici. La raison est uniquement la vitesse. En Go, c'est exactement pourquoi le modèle mémoire impose des synchronisations (`sync.Mutex`, channels, `sync/atomic`) pour qu'une écriture soit garantie visible par une autre goroutine.

Il en va de même pour les bases distribuées : elles renoncent à la linéarisabilité pour la vitesse. Et ce n'est pas une affaire d'implémentation paresseuse. Attiya et Welch ont prouvé que, pour un stockage linéarisable, le temps de réponse des lectures et des écritures est **au moins proportionnel à l'incertitude des délais réseau**. Or, sur un réseau aux délais très variables (module 10), cette incertitude est grande. Il n'existe pas d'algorithme linéarisable plus rapide ; des modèles plus faibles, eux, peuvent répondre beaucoup plus vite.

### Un ordre de grandeur

Avec un leader à Paris et un aller-retour de 90 ms vers Montréal :

- une écriture linéarisable d'un client de Montréal coûte **au moins un aller-retour**, soit 90 ms, avant même le travail du serveur ;
- une écriture acceptée par un leader local de Montréal (multi-leader) coûte quelques millisecondes, disons 2 ms : 45 fois moins.

Multiplie par les 5 requêtes séquentielles d'une page, et la différence devient visible pour l'utilisateur : 450 ms contre 10 ms. Les systèmes sensibles à la latence choisissent donc souvent des garanties plus faibles, et le chapitre montre ensuite qu'il existe un modèle fort qui évite ce piège : la cohérence causale.

## Pièges fréquents

- **Dire « on a choisi AP » ou « CP »** sans préciser quelle garantie et quelle panne : ces étiquettes sont floues. Décris le comportement réel pendant une coupure.
- **Croire qu'on peut « renoncer à P »** : les partitions arrivent ; renoncer à P n'a de sens que sur un seul nœud.
- **Croire qu'un système non linéarisable est mal conçu** : c'est souvent un choix délibéré de latence, comme pour la RAM de ton processeur.
- **Oublier la latence en temps normal** : même sans coupure, chaque opération linéarisable paie l'incertitude du réseau.

## À retenir

- Pendant une coupure, un réplica isolé doit choisir : rester linéarisable et refuser, ou répondre et ne plus l'être.
- CAP : « cohérent ou disponible quand le réseau est coupé », pas « 2 parmi 3 ». Portée étroite : un modèle, une panne.
- La RAM multicœur n'est pas linéarisable, pour la vitesse : il faut des barrières mémoire.
- Le temps de réponse d'un stockage linéarisable est au moins proportionnel à l'incertitude des délais réseau : la latence est le vrai prix, même sans panne.
