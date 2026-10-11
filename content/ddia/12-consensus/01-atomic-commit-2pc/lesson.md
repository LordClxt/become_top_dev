---
id: ddia-ch12-l01
title: "Commit atomique et validation en deux phases"
source: { chapter: 9, pages: "352-359" }
duration_min: 35
concepts:
  - id: ddia-consensus-problem
    label: "Le consensus : faire décider la même chose à plusieurs nœuds (élection de leader, commit atomique), et l'impossibilité FLP"
  - id: ddia-atomic-commit-distributed
    label: "Commit atomique sur plusieurs nœuds : tous valident ou tous annulent, et un commit ne se reprend jamais"
  - id: ddia-2pc-protocol
    label: "Validation en deux phases : un coordinateur envoie « prepare », recueille les votes, puis « commit » ou « abort »"
  - id: ddia-2pc-points-of-no-return
    label: "Les deux promesses de 2PC : le participant qui vote oui renonce à annuler ; la décision journalisée du coordinateur est définitive"
  - id: ddia-2pc-coordinator-failure
    label: "Panne du coordinateur : un participant qui a voté oui reste en doute et ne peut qu'attendre la reprise"
  - id: ddia-3pc-nonblocking
    label: "La validation en trois phases n'est non bloquante que si les délais réseau sont bornés et la détection de pannes parfaite"
glossary:
  - term: "consensus"
    definition: "Problème où plusieurs nœuds proposent des valeurs et doivent en décider une seule, la même pour tous."
  - term: "commit atomique"
    definition: "Garantie qu'une transaction qui touche plusieurs nœuds est soit validée partout, soit annulée partout."
  - term: "2PC (two-phase commit)"
    definition: "Validation en deux phases : préparation et vote, puis décision. À ne pas confondre avec 2PL, le verrouillage en deux phases."
  - term: "coordinateur (transaction manager)"
    definition: "Composant qui pilote 2PC : il envoie les « prepare », recueille les votes, journalise la décision et la diffuse."
  - term: "transaction en doute (in doubt)"
    definition: "Transaction qu'un participant a préparée (vote oui) sans connaître la décision du coordinateur."
  - term: "FLP"
    definition: "Résultat de Fischer, Lynch et Paterson : dans un modèle asynchrone sans horloge, aucun algorithme ne garantit le consensus si un nœud peut tomber."
visuals: []
labs: [ddia-ch12-l01-lab-2pc-timeline]
xp: 40
---

## Pourquoi c'est important

Ton service de paiement débite un compte dans la partition 3 et crédite un autre compte dans la partition 8. Si la partition 3 valide et la partition 8 plante avant de valider, 100 € viennent de disparaître. Dès qu'une transaction touche plusieurs nœuds, il faut qu'ils **se mettent d'accord** : tous valident, ou personne. C'est un cas particulier du problème le plus central des systèmes distribués, le **consensus**. Cette leçon montre l'algorithme le plus répandu pour y répondre, la validation en deux phases, et surtout l'endroit précis où il casse.

## Le consensus, en une phrase

Plusieurs nœuds doivent **décider de la même chose**. Ça paraît simple, et beaucoup de systèmes ont été construits sur la croyance naïve que ça l'était. Deux situations le réclament sans cesse :

- **l'élection de leader** : en réplication avec leader (chapitre « Réplication avec leader »), tous les nœuds doivent s'accorder sur qui est le leader. Deux nœuds qui se croient leaders, c'est le *split brain*, et des écritures divergentes ;
- **le commit atomique** : une transaction qui touche plusieurs nœuds doit être validée partout ou nulle part.

Un résultat théorique célèbre, l'**impossibilité FLP** (Fischer, Lynch, Paterson), dit qu'aucun algorithme ne peut **toujours** atteindre le consensus si un nœud risque de tomber. Mais il vaut dans un modèle **asynchrone** très restrictif, sans horloge ni délai d'attente. Dès qu'un algorithme a le droit d'utiliser des timeouts pour soupçonner une panne (même s'il se trompe parfois) ou des nombres aléatoires, le consensus redevient soluble. On se souvient du chapitre « Quand le réseau ment » : en pratique, c'est exactement ce qu'on fait.

## Le commit atomique sur un nœud, puis sur plusieurs

Sur **un seul nœud**, l'atomicité est l'affaire du moteur de stockage. Il écrit d'abord les données de la transaction (dans le WAL), puis un **enregistrement de commit**. Si le nœud plante avant d'avoir écrit cet enregistrement, la transaction est annulée à la reprise ; s'il l'a écrit, elle est validée. Tout se joue sur **un seul disque**, à un instant précis.

Sur **plusieurs nœuds**, il ne suffit pas d'envoyer « commit » à tout le monde. Imagine trois partitions :

- la partition A valide sans problème ;
- la partition B détecte une violation de contrainte d'unicité et doit annuler ;
- le message vers la partition C se perd, elle annule au bout d'un délai.

Résultat : A a validé, les autres non, et A ne peut pas revenir en arrière. Pourquoi ? Parce qu'**une transaction validée ne se reprend jamais** : dès qu'elle est validée, d'autres transactions ont pu lire ses données (c'est le principe de *read committed*) et agir dessus. Si on veut défaire ses effets, il faut une **transaction de compensation**, qui est une nouvelle transaction aux yeux de la base, gérée par l'application.

Conclusion : un nœud ne doit valider que lorsqu'il est **certain** que tous les autres valideront aussi.

## La validation en deux phases (2PC)

2PC ajoute un acteur : le **coordinateur** (*transaction manager*), souvent une bibliothèque dans le processus de l'application, parfois un service séparé. Les bases qui portent les données sont les **participants**. Attention au nom : 2PC (*two-phase commit*, commit atomique) n'a rien à voir avec 2PL (*two-phase locking*, isolation sérialisable).

Le déroulé, en suivant notre virement de 100 € :

1. L'application obtient du coordinateur un **identifiant de transaction global**, par exemple `tx-8812`.
2. Elle ouvre une transaction locale sur chaque participant (partitions 3 et 8), étiquetée `tx-8812`, et y fait ses lectures et écritures. Si quelque chose échoue à ce stade, n'importe qui peut encore annuler.
3. **Phase 1, préparation** : le coordinateur envoie `prepare(tx-8812)` à chaque participant. Chacun vérifie qu'il pourra valider quoi qu'il arrive : il écrit toutes les données de la transaction sur disque, contrôle les contraintes, et répond **oui** ou **non**.
4. Le coordinateur reçoit les réponses. Si tous ont dit oui, il décide **commit** ; si un seul a dit non ou n'a pas répondu à temps, il décide **abort**. Il **écrit sa décision dans son journal sur disque**. C'est le **point de commit**.
5. **Phase 2** : il envoie `commit(tx-8812)` (ou `abort`) à tous. Si un envoi échoue, il **réessaie indéfiniment**, jusqu'à réussir.

L'image du livre est celle d'un mariage : chaque futur époux dit « oui », puis l'officier prononce l'union. Une fois le « oui » donné, impossible de se rétracter en attendant la suite.

## Deux promesses, deux points de non-retour

Pourquoi 2PC réussit là où « envoyer commit à tout le monde » échoue ? Parce qu'il repose sur **deux promesses irrévocables** :

- **le participant qui vote oui** renonce à son droit d'annuler. Il n'a pas encore validé, mais il garantit qu'il le pourra, même après un crash et un redémarrage. C'est pour cela qu'il a tout écrit sur disque avant de répondre ;
- **le coordinateur qui journalise sa décision** la rend définitive. Si un participant plante avant de recevoir le commit, il le recevra à sa reprise, car le coordinateur réessaie sans fin. Et ce participant, ayant promis, ne peut pas refuser.

Remarque fine : le point de commit de 2PC, c'est une **écriture atomique sur un seul nœud**, celui du coordinateur. On a ramené le problème distribué au cas mono-nœud qu'on sait résoudre.

## Quand le coordinateur tombe

Tout dépend du moment de la panne :

- **avant d'avoir envoyé les « prepare »** : un participant peut annuler sans risque, personne n'a rien promis ;
- **après qu'un participant a voté oui** : ce participant est **en doute** (*in doubt*, *uncertain*). Il ne peut ni valider (peut-être qu'un autre a voté non) ni annuler (peut-être que le coordinateur a déjà décidé commit et qu'un autre participant a validé). Attendre un timeout n'aide pas : quelle que soit sa décision unilatérale, il risque de contredire les autres.

Scénario concret : le coordinateur écrit « commit » dans son journal, envoie le commit à la partition 3, puis plante avant d'atteindre la partition 8. La partition 3 a validé. La partition 8, en doute, ne doit surtout pas annuler. Les participants pourraient en théorie se parler pour reconstituer la décision, mais ce n'est pas prévu par le protocole.

La seule issue : **attendre que le coordinateur revienne**. À sa reprise, il relit son journal : toute transaction avec une décision est relancée ; toute transaction **sans** décision dans le journal est **annulée**. D'où l'ordre impératif : écrire la décision sur disque **avant** de l'envoyer. C'est pour cela qu'on dit que 2PC est un protocole **bloquant**.

## Et la validation en trois phases ?

On a proposé une **validation en trois phases** (3PC), conçue pour être **non bloquante**. Mais elle suppose un réseau aux **délais bornés** et des nœuds aux **temps de réponse bornés**. Dans un vrai système, où les délais réseau et les pauses de processus sont illimités (chapitre « Quand le réseau ment »), elle ne garantit plus l'atomicité. Un commit atomique non bloquant exige un **détecteur de pannes parfait**, capable de dire avec certitude qu'un nœud est mort, et un timeout n'en est pas un. Voilà pourquoi 2PC reste utilisé, malgré son défaut connu.

## Pièges fréquents

- **Confondre 2PC et 2PL** : l'un est un protocole de commit atomique entre nœuds, l'autre une technique de verrouillage pour l'isolation.
- **Envoyer la décision avant de l'avoir journalisée** : si le coordinateur plante entre les deux, il oubliera qu'il a décidé commit, et annulera à sa reprise ce qu'un participant a déjà validé.
- **Laisser un participant préparé annuler sur timeout** : il casse l'atomicité si le coordinateur avait décidé commit.
- **Croire qu'une compensation annule un commit** : c'est une nouvelle transaction ; entre-temps, d'autres ont vu les données.
- **Prendre FLP pour une interdiction pratique** : avec des timeouts, le consensus est soluble ; FLP dit seulement qu'il n'existe pas de garantie dans un modèle sans horloge.

## À retenir

- Commit atomique distribué : un nœud ne valide que s'il est sûr que tous valideront ; un commit ne se reprend jamais.
- 2PC : phase 1 « prepare » et votes, décision journalisée par le coordinateur, phase 2 « commit » ou « abort » réessayée sans fin.
- Deux points de non-retour : le vote oui du participant, la décision écrite du coordinateur.
- Si le coordinateur tombe après les votes, les participants restent **en doute** et attendent ; à la reprise, sans décision journalisée, on annule.
- 3PC n'est non bloquant qu'avec des délais bornés : en pratique, on garde 2PC.
