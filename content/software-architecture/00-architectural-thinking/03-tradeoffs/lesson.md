---
id: arch-ch00-l03
title: "Penser en trade-offs"
source: { chapter: 2, pages: "43-56" }
duration_min: 40
concepts:
  - id: arch-vs-design
    label: "Architecture et design forment un cycle : l'architecte travaille dans l'équipe, pas au-dessus"
  - id: arch-knowledge-pyramid
    label: "Pyramide du savoir : profondeur pour le développeur, largeur pour l'architecte"
  - id: arch-frozen-caveman
    label: "Anti-pattern Frozen Caveman : un risque perçu, hérité d'un traumatisme, traité comme réel"
  - id: arch-topic-vs-queue
    label: "Topic (pub/sub) vs files point-à-point : extensibilité et découplage contre sécurité, contrats et scalabilité"
  - id: arch-competing-consumers
    label: "Deux consommateurs sur une même file se partagent les messages au lieu de les recevoir chacun"
  - id: arch-business-drivers
    label: "Traduire les moteurs métier en caractéristiques d'architecture"
glossary:
  - term: "largeur technique"
    definition: "Ce que tu sais exister, sans le maîtriser en détail. Pour un architecte, elle compte plus que la profondeur."
  - term: "Frozen Caveman"
    definition: "Anti-pattern comportemental : ramener chaque architecture à une peur irrationnelle née d'un incident passé."
  - term: "topic"
    definition: "Canal publish/subscribe : chaque abonné reçoit sa propre copie de chaque message."
  - term: "file (queue)"
    definition: "Canal point-à-point : chaque message est remis à un seul consommateur."
  - term: "consommateurs concurrents"
    definition: "Plusieurs consommateurs sur une même file : ils se répartissent les messages (utile pour paralléliser un même traitement)."
  - term: "contrat"
    definition: "Le format des données échangées entre producteur et consommateur."
visuals: [arch-ch00-topic-vs-queues]
labs: [arch-ch00-l03-lab-queues-or-topic, arch-ch00-l03-lab-lost-bids]
xp: 40
---

## Pourquoi c'est important

Le site d'enchères tourne. On te demande d'ajouter **Bid History** : l'historique de toutes les offres de chaque enchérisseur. Ton collègue propose : « Facile, je branche Bid History sur la file de Bid Analytics. » Deux jours plus tard, les analystes signalent que **la moitié des enchères a disparu** de leurs tableaux de bord. Personne n'a touché à Analytics.

Ce bug est le symptôme d'un trade-off mal compris. Cette leçon couvre la manière de penser d'un architecte : comment il collabore avec le design, pourquoi il privilégie la largeur, et surtout comment il **analyse les deux côtés** d'une solution, sur l'exemple exact de ce site d'enchères.

## Architecture et design : un cycle, pas une flèche

Le modèle traditionnel : l'architecte analyse les exigences, choisit un style, découpe en composants, puis **remet** tout aux développeurs qui font les classes, les écrans et le code. Le livre est formel : **c'est exactement pour ça que l'architecture échoue**. La flèche est à sens unique. Les décisions de l'architecte n'arrivent pas toujours jusqu'au code, et les choix des développeurs qui modifient l'architecture ne remontent jamais.

La solution : architecte et développeurs dans la **même équipe virtuelle**, avec une communication dans les deux sens, du mentorat et du coaching. Où finit l'architecture et où commence le design ? **Nulle part** : les deux évoluent à chaque itération et doivent rester synchronisés.

## Largeur plutôt que profondeur

Découpe tout le savoir technique du monde en trois parts : **ce que tu sais**, **ce que tu sais ne pas savoir** (tu as entendu parler de Clojure, tu ne sais pas l'écrire), et **ce que tu ne sais pas ne pas savoir** (la solution parfaite dont tu ignores l'existence).

- En début de carrière, on élargit le sommet : la **profondeur**, l'expertise. Mais elle s'entretient : un expert Rails qui délaisse Rails deux ans ne l'est plus.
- Pour un architecte, la valeur est dans la **largeur** : savoir que **cinq solutions** existent pour un problème vaut plus qu'en maîtriser une. Le bon choix : sacrifier un peu d'expertise durement acquise pour élargir son portefeuille.

Deux dysfonctionnements guettent : vouloir rester expert partout (et s'épuiser), et l'**expertise périmée**, l'impression que des connaissances anciennes sont encore à la pointe.

### Anti-pattern : le Frozen Caveman

Une équipe présente une architecture centralisée. Le client répond, à chaque fois : « Et si on perd l'Italie ? » Des années plus tôt, une panne de communication rarissime avait coupé le siège de ses magasins italiens. Depuis, cette peur pilote toutes les décisions. C'est l'architecte **homme des cavernes congelé** : il ramène chaque architecture à un traumatisme passé. L'évaluation du risque est essentielle, mais elle doit distinguer le **risque réel** du **risque perçu** (le module 15 donne une méthode).

## L'architecture, c'est ce qu'on ne peut pas googler

Toute question d'architecture appelle la réponse « **ça dépend** » : de l'environnement de déploiement, des moteurs métier, de la culture, du budget, des délais, des compétences de l'équipe. Neal Ford : *il n'y a pas de bonne ou de mauvaise réponse en architecture, seulement des trade-offs.*

### Le cas d'école : diffuser une enchère

Le service **Bid Producer** reçoit une offre et doit la transmettre à trois services : **Bid Capture**, **Bid Tracking** et **Bid Analytics**. Deux options :

1. **Un topic** (publish/subscribe) : le producteur publie une fois ; chaque abonné reçoit sa **copie**.
2. **Trois files** (point-à-point) : le producteur envoie dans trois files ; chaque file a **son** consommateur.

**Les avantages du topic sautent aux yeux.**

- **Extensibilité** : pour ajouter Bid History, on l'abonne au topic. **Aucune** modification de l'existant. Avec des files, il faut créer une file et **modifier le producteur**.
- **Découplage** : le producteur ignore qui consomme et ce qu'on fait de ses offres. Avec des files, il connaît chaque destinataire.

Rich Hickey (créateur de Clojure) : *les programmeurs connaissent les bénéfices de tout et les trade-offs de rien ; les architectes doivent connaître les deux.* Regardons donc **le revers**.

- **Sécurité et accès aux données** : n'importe qui peut s'abonner à un topic et écouter les offres sans que personne ne s'en aperçoive. Sur une file, un espion **vole** les messages : le vrai consommateur ne les reçoit plus, la perte est détectée, l'alerte part. Il est facile de mettre un topic sur écoute, pas une file.
- **Contrats hétérogènes** : sur un topic, tous les abonnés reçoivent le **même** contrat. Si Bid History a besoin du prix demandé en plus de l'offre, on modifie le contrat de tout le monde. Avec des files, chaque canal a son contrat.
- **Supervision et scalabilité** : on peut mesurer la profondeur de **chaque file** et faire monter en charge **chaque consommateur indépendamment**. Un topic ne le permet pas aussi simplement. (Ce point dépend de la techno : AMQP sépare l'*exchange*, où l'on publie, des files, où l'on consomme, et récupère cette capacité.)

| Topic : avantages | Topic : inconvénients |
|---|---|
| Extensibilité de l'architecture | Accès aux données et sécurité |
| Découplage des services | Pas de contrats hétérogènes |
| | Supervision et scalabilité par consommateur |

Alors, laquelle ? **Ça dépend** : *qu'est-ce qui compte le plus ici, l'extensibilité ou la sécurité ?* C'est la question que pose un architecte. Pour un site d'enchères où l'on soupçonne la fraude, la sécurité pèse peut-être plus. Pour un produit qui ajoute un consommateur chaque trimestre, l'extensibilité gagne. Et rien n'interdit un **mélange** : des files pour les flux sensibles, un topic pour l'analytique.

### Sous le capot : file partagée = consommateurs concurrents

Revenons au bug du début. Une **file** remet chaque message à **un seul** consommateur. Quand deux consommateurs lisent la même file, le broker ne duplique rien : il **répartit** les messages entre eux (en général à tour de rôle). C'est le pattern des **consommateurs concurrents**, très utile pour paralléliser *le même traitement* (trois instances d'Analytics pour absorber la charge). Mais brancher un **autre** service sur cette file, c'est lui voler la moitié des messages.

```typescript
// Une file : chaque message va à UN consommateur, à tour de rôle.
function deliver(messages: string[], consumers: string[]) {
  const received: Record<string, string[]> = {};
  for (const c of consumers) received[c] = [];
  messages.forEach((m, i) => received[consumers[i % consumers.length]!]!.push(m));
  return received;
}
console.log(deliver(['b1', 'b2', 'b3', 'b4'], ['analytics', 'history']));
// { analytics: [ 'b1', 'b3' ], history: [ 'b2', 'b4' ] }
```

Le bon correctif n'est pas de « réparer Analytics » : c'est de donner à Bid History **son propre canal** (une nouvelle file, ou un abonnement à un topic). C'est l'objet du TP d'enquête de cette leçon.

## Des moteurs métier aux caractéristiques

Penser en architecte, c'est aussi traduire ce que veut le métier (« on ne doit plus perdre d'enchères », « on lance trois nouveaux marchés cette année ») en **caractéristiques** : fiabilité, extensibilité, scalabilité… C'est tout le sujet des modules 02 à 04. Dans l'exemple : « on ajoutera souvent des consommateurs » pousse vers le topic ; « le régulateur exige de détecter toute écoute » pousse vers les files.

::visual{id="arch-ch00-topic-vs-queues"}

## Pièges fréquents

- **Ne lister que les avantages** d'une solution : c'est penser en programmeur, pas en architecte.
- **Brancher un nouveau service sur une file existante** : il devient consommateur concurrent et vole des messages.
- **Chercher « la » bonne réponse en ligne** : elle dépend de ton contexte.
- **Laisser un vieux traumatisme décider** (Frozen Caveman).
- **Remettre l'architecture aux devs et partir** : la flèche à sens unique.

## À retenir

- Architecture et design forment un **cycle** ; l'architecte est **dans** l'équipe.
- Pour l'architecte, **largeur > profondeur** ; l'expertise se périme.
- **Topic** : extensible et découplé, mais écoutable, contrat unique, scalabilité par consommateur plus difficile. **Files** : l'inverse.
- Une file partagée par deux services = **consommateurs concurrents** = messages répartis, pas dupliqués.
- La question d'architecte : *qu'est-ce qui compte le plus ici ?* La réponse vient des **moteurs métier**.
