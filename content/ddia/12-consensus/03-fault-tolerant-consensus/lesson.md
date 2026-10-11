---
id: ddia-ch12-l03
title: "Consensus tolérant aux pannes : propriétés, époques et quorums"
source: { chapter: 9, pages: "364-370" }
duration_min: 40
concepts:
  - id: ddia-consensus-properties
    label: "Les quatre propriétés : accord uniforme, intégrité, validité (sûreté) et terminaison (vivacité)"
  - id: ddia-consensus-majority
    label: "La terminaison exige une majorité de nœuds vivants : 2f + 1 nœuds tolèrent f pannes"
  - id: ddia-consensus-total-order-broadcast
    label: "VSR, Paxos, Raft et Zab décident une suite de valeurs : c'est la diffusion à ordre total, des consensus répétés"
  - id: ddia-consensus-leader-paradox
    label: "Réplication avec leader et consensus : élire un leader exige un consensus, et le consensus semble exiger un leader"
  - id: ddia-consensus-epochs
    label: "Numéros d'époque (ballot, view, term) : un leader unique par époque, l'époque la plus haute l'emporte"
  - id: ddia-consensus-quorum-overlap
    label: "Deux votes par quorums qui se chevauchent : élire le leader, puis approuver chacune de ses propositions"
  - id: ddia-consensus-limits
    label: "Limites : réplication synchrone, majorité stricte, membres fixes, timeouts et élections intempestives"
glossary:
  - term: "accord uniforme (uniform agreement)"
    definition: "Deux nœuds ne décident jamais de valeurs différentes."
  - term: "terminaison"
    definition: "Tout nœud qui ne tombe pas finit par décider une valeur. Propriété de vivacité."
  - term: "numéro d'époque"
    definition: "Entier croissant attaché à chaque élection : ballot number (Paxos), view number (VSR), term (Raft)."
  - term: "quorum"
    definition: "Ensemble de nœuds dont l'accord suffit pour une décision, en général une majorité."
  - term: "Multi-Paxos"
    definition: "Optimisation de Paxos qui décide efficacement une suite de valeurs plutôt qu'une seule."
  - term: "faute byzantine"
    definition: "Nœud qui envoie des messages contradictoires ou malveillants ; exclue du modèle des algorithmes présentés ici."
visuals: []
labs: [ddia-ch12-l03-lab-quorum-epochs]
xp: 40
---

## Pourquoi c'est important

2PC a montré le défaut à éviter : un seul nœud, le coordinateur, dont la panne bloque tout. Les algorithmes de **consensus tolérants aux pannes** (Paxos, Raft, Zab…) progressent tant qu'une **majorité** de nœuds répond. Ils sont au cœur d'etcd, de ZooKeeper, de Consul, de Kafka (mode KRaft), de CockroachDB. Tu n'en écriras sans doute jamais un en production, mais tu en utiliseras tous les jours : il faut savoir ce qu'ils garantissent, combien de pannes ils supportent, et pourquoi ils deviennent parfois lents.

## Ce qu'un consensus doit garantir

Formellement, un ou plusieurs nœuds **proposent** des valeurs, et l'algorithme en **décide** une. Exemple : trois clients veulent réserver le dernier siège d'un vol ; chacun propose son nom, et le consensus doit choisir **un seul** client. Quatre propriétés :

1. **accord uniforme** : deux nœuds ne décident jamais différemment ;
2. **intégrité** : aucun nœud ne décide deux fois ;
3. **validité** : si un nœud décide `v`, alors `v` a été proposée par un nœud ;
4. **terminaison** : tout nœud qui ne tombe pas finit par décider.

L'accord et l'intégrité sont le cœur de l'idée : tout le monde décide la même chose, et on ne change pas d'avis. La validité exclut les solutions triviales (décider toujours `null` respecterait l'accord). Sans la terminaison, il suffirait de désigner un « dictateur » qui décide tout… mais s'il tombe, plus personne ne décide. C'est exactement le cas de 2PC : il respecte accord, intégrité et validité, **pas la terminaison**.

Les trois premières sont des propriétés de **sûreté** (rien de mal n'arrive) ; la terminaison est une propriété de **vivacité** (quelque chose de bien finit par arriver), dans le vocabulaire du chapitre « Quand le réseau ment ».

## Combien de pannes ?

Le modèle suppose qu'un nœud qui tombe disparaît et ne revient jamais (pense à un datacenter détruit). Un algorithme qui attendrait son retour ne satisferait donc pas la terminaison. Mais aucun algorithme ne peut progresser si tous les nœuds sont morts : il faut une **majorité** de nœuds vivants qui communiquent. Avec **2f + 1** nœuds, on tolère **f** pannes :

| Nœuds | Majorité | Pannes tolérées |
|---|---|---|
| 3 | 2 | 1 |
| 4 | 3 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

Note la ligne 4 : passer de 3 à 4 nœuds n'ajoute aucune tolérance, d'où les clusters impairs. Et la plupart des implémentations garantissent la **sûreté même si une majorité tombe** : le système s'arrête, mais ne décide jamais n'importe quoi.

Ces algorithmes supposent l'absence de **fautes byzantines** : un nœud peut se taire, pas mentir. Un consensus robuste aux fautes byzantines existe, à condition que moins d'**un tiers** des nœuds soient fautifs.

## Les algorithmes : une suite de décisions

Les algorithmes connus sont **VSR** (*Viewstamped Replication*), **Paxos**, **Raft** et **Zab** (celui de ZooKeeper). Ils se ressemblent plus qu'ils ne diffèrent, et les détails sont subtils. Point important : aucun ne s'arrête à une seule valeur. Ils décident une **suite** de valeurs, ce qui en fait des algorithmes de **diffusion à ordre total** (vue au chapitre « Linéarisabilité et ordre »).

La diffusion à ordre total équivaut à des **tours de consensus répétés**, chaque tour décidant du message suivant :

- accord → tous les nœuds délivrent les mêmes messages, dans le même ordre ;
- intégrité → aucun message n'est dupliqué ;
- validité → aucun message n'est inventé ou corrompu ;
- terminaison → aucun message n'est perdu.

VSR, Raft et Zab implémentent directement la diffusion à ordre total, parce que c'est plus efficace que des tours séparés ; pour Paxos, cette optimisation s'appelle **Multi-Paxos**.

## Le paradoxe du leader

La réplication avec leader (chapitre « Réplication avec leader ») envoie toutes les écritures au leader, qui les applique dans le même ordre aux followers : c'est de la diffusion à ordre total. Pourquoi n'en a-t-on pas parlé comme d'un consensus ? Parce que le leader y était souvent **choisi à la main** par un opérateur : un consensus de type « dictateur », qui ne satisfait pas la terminaison (le leader tombe → plus de progrès jusqu'à l'intervention humaine).

Avec un **basculement automatique**, il faut élire un nouveau leader… et pour s'accorder sur le leader, il faut un consensus. Or les algorithmes de consensus utilisent eux-mêmes un leader. Pour élire un leader, il faut un leader ? On sort du cercle avec les époques.

## Époques et quorums

Ces protocoles ne garantissent pas un leader unique **dans l'absolu**. Ils garantissent plus faible : un leader unique **par époque**. Le **numéro d'époque** s'appelle *ballot number* dans Paxos, *view number* dans VSR, *term* dans Raft.

- Quand on pense que le leader est mort, les nœuds lancent un vote pour élire un nouveau leader, avec une époque **incrémentée**. Les époques sont totalement ordonnées et croissantes.
- Si deux leaders d'époques différentes se disputent (l'ancien n'était pas vraiment mort), **l'époque la plus haute l'emporte**.

Mais comment un leader sait-il qu'il n'a pas été remplacé à son insu ? Rappel du chapitre « Quand le réseau ment » : un nœud ne peut pas se fier à son propre jugement, la vérité est définie par la majorité. D'où **deux tours de vote** :

1. **élire le leader** : un quorum de nœuds vote pour lui, pour une époque donnée ;
2. **approuver chaque proposition** : pour décider une valeur, le leader l'envoie aux autres et attend un **quorum** de réponses. Un nœud ne vote pour la proposition que s'il ne connaît aucun leader d'époque plus élevée.

Les deux quorums doivent **se chevaucher** : avec des majorités, au moins un nœud a participé aux deux votes. Si l'approbation d'une proposition ne révèle aucune époque plus haute, le leader peut conclure qu'aucune élection plus récente n'a eu lieu, donc qu'il est toujours leader, et décider sans risque.

Exemple sur 5 nœuds L, A, B, C et E : le leader L de l'époque 7 propose une écriture. Pendant ce temps, B, C et E (une majorité) ont élu E pour l'époque 8. L envoie sa proposition aux quatre autres : B, C et E connaissent l'époque 8 et refusent ; seul A accepte. L ne réunit que 2 voix (A et lui-même) sur les 3 nécessaires : il échoue, apprend l'existence de l'époque 8 et s'efface.

Ça ressemble à 2PC, avec trois différences : le coordinateur de 2PC n'est pas élu ; le consensus se contente d'une **majorité** quand 2PC exige le oui de **chaque** participant ; et le consensus prévoit une **procédure de reprise** qui remet les nœuds dans un état cohérent après l'élection d'un nouveau leader.

## Les limites du consensus

Ces garanties ont un prix :

- **réplication synchrone** : chaque décision attend un quorum de votes. Beaucoup de bases préfèrent la réplication asynchrone, plus rapide, en acceptant de perdre des écritures confirmées lors d'un basculement ;
- **majorité stricte** : 3 nœuds pour 1 panne, 5 pour 2. Si le réseau coupe le cluster en deux, seule la partie majoritaire progresse ;
- **membres fixes** : la plupart des algorithmes supposent un ensemble fixe de nœuds. Les extensions à appartenance dynamique existent mais sont moins bien comprises ;
- **timeouts** : la détection de panne passe par des délais. Avec des délais réseau très variables (systèmes répartis sur plusieurs régions), des élections intempestives éclatent, et le système peut passer plus de temps à élire des leaders qu'à travailler ;
- **sensibilité au réseau** : Raft a des cas limites connus. Si tout le réseau fonctionne sauf **un lien** constamment instable, le leadership peut rebondir sans fin entre deux nœuds, ou le leader être sans cesse forcé à démissionner.

## Pièges fréquents

- **Déployer 4 nœuds pour « plus de sécurité »** : la majorité passe à 3, la tolérance reste 1 panne.
- **Croire qu'un consensus garantit un leader unique à tout instant** : il garantit un leader unique **par époque**. Un ancien leader peut encore se croire leader ; ce sont les votes (et les jetons de clôture) qui le neutralisent.
- **Confondre la diffusion à ordre total et une simple réplication asynchrone** : sans quorum, rien n'empêche deux leaders d'écrire.
- **Régler des timeouts d'élection trop courts sur un réseau inter-régions** : élections à répétition, débit effondré.
- **Penser que 2PC est un algorithme de consensus complet** : il ne satisfait pas la terminaison.

## À retenir

- Accord uniforme, intégrité, validité (sûreté) ; terminaison (vivacité) si une majorité vit : 2f + 1 nœuds tolèrent f pannes.
- VSR, Paxos (Multi-Paxos), Raft et Zab décident une suite de valeurs : diffusion à ordre total = consensus répétés.
- Un leader unique par époque ; l'époque la plus haute gagne.
- Deux votes par quorums qui se chevauchent : élire le leader, puis approuver chacune de ses propositions.
- Prix : votes synchrones, majorité stricte, membres fixes, dépendance aux timeouts et au réseau.
