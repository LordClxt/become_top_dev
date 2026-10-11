---
id: ddia-ch10-l01
title: "Pannes partielles et réseaux non fiables"
source: { chapter: 8, pages: "273-281" }
duration_min: 35
concepts:
  - id: ddia-partial-failure
    label: "Panne partielle : une partie du système est cassée pendant que le reste fonctionne, de façon non déterministe"
  - id: ddia-cloud-vs-hpc
    label: "Le calcul haute performance arrête tout et repart d'un point de reprise ; un service en ligne doit tolérer les pannes partielles"
  - id: ddia-unanswered-request
    label: "Sans réponse, impossible de savoir si la requête, le nœud ou la réponse s'est perdu"
  - id: ddia-network-faults-practice
    label: "Les pannes réseau sont fréquentes en pratique, y compris les partitions et les liens à sens unique"
  - id: ddia-fault-detection-signals
    label: "Quelques signaux explicites (connexion refusée, notification, ICMP) existent, mais seul un timeout couvre tous les cas"
glossary:
  - term: "panne partielle (partial failure)"
    definition: "Situation où certains composants d'un système distribué sont en panne et d'autres non ; le résultat d'une opération devient imprévisible."
  - term: "shared-nothing"
    definition: "Architecture où chaque machine a sa mémoire et ses disques, et ne communique avec les autres que par le réseau."
  - term: "réseau asynchrone par paquets"
    definition: "Réseau qui ne garantit ni l'arrivée d'un message ni le moment où il arrive (Internet, Ethernet de datacentre)."
  - term: "partition réseau (netsplit)"
    definition: "Une partie du réseau est coupée du reste à cause d'une panne réseau ; les nœuds continuent de tourner de chaque côté."
  - term: "point de reprise (checkpoint)"
    definition: "Sauvegarde de l'état d'un long calcul sur un stockage durable, d'où l'on repart après une panne."
  - term: "chaos engineering"
    definition: "Déclencher volontairement des pannes (comme Chaos Monkey) pour vérifier que le système y survit."
visuals: []
labs: [ddia-ch10-l01-lab-detect-design]
xp: 40
---

## Pourquoi c'est important

Jusqu'ici, les chapitres de réplication, de partitionnement et de transactions supposaient implicitement que les messages arrivaient et que les nœuds disaient la vérité. Ce chapitre retire ce confort. Un ingénieur qui conçoit un système distribué doit partir de l'idée inverse : **tout ce qui peut mal tourner tournera mal**, et souvent de façon que le programme ne peut même pas observer. Cette première leçon pose le problème de fond : sur un seul ordinateur, une panne est franche ; à plusieurs, elle devient partielle, et on ne sait plus ce qui s'est passé.

## Un ordinateur seul est déterministe, un réseau non

Sur ta machine, un programme correct donne le même résultat à chaque exécution. Quand le matériel a un problème (mémoire corrompue, connecteur desserré), la conséquence est en général une **panne totale** : écran bleu, *kernel panic*, arrêt. C'est un choix délibéré : un ordinateur est conçu pour **planter plutôt que renvoyer un résultat faux**, car un résultat faux est bien plus difficile à gérer. Le modèle mental est simple : ça marche ou ça ne marche pas.

Dès que plusieurs machines coopèrent par le réseau, ce modèle disparaît. Une partie du système peut être cassée pendant que le reste fonctionne : c'est une **panne partielle**. Et elle est **non déterministe** : la même opération sur plusieurs nœuds peut réussir une fois et échouer la fois suivante, sans que tu saches même si elle a réussi, car le message qui te l'aurait dit a pu se perdre lui aussi.

Exemples typiques : une coupure de courant qui ne touche qu'une partie d'un datacentre, un switch mal configuré qui isole quelques racks, un disque qui ralentit au lieu de tomber. Rien de tout cela n'arrête le système entier ; tout cela le rend imprévisible.

## Deux philosophies : calcul scientifique et cloud

Il existe deux extrêmes pour construire de grands systèmes :

- le **calcul haute performance** (*supercalculateurs*) : des milliers de CPU pour des calculs longs (météo, dynamique moléculaire). Le travail enregistre régulièrement un **point de reprise**. Si un nœud tombe, on **arrête tout le cluster** et on repart du dernier point de reprise. La panne partielle est transformée en panne totale : on se retrouve dans le cas d'un seul gros ordinateur ;
- le **cloud** et les services Internet : des machines ordinaires, un réseau Ethernet/IP, et des applications **en ligne** qui doivent répondre avec une faible latence à tout moment. Arrêter tout pour réparer est hors de question.

Pourquoi le cloud ne peut-il pas faire comme le supercalculateur ? Plusieurs raisons :

- **Disponibilité** : un service web ne peut pas s'arrêter pendant que l'on répare un nœud.
- **Matériel ordinaire** : des machines bon marché, avec des taux de panne plus élevés, mais bien moins chères à performance égale.
- **Réseau** : les supercalculateurs utilisent des topologies spécialisées (maillages multidimensionnels, tores) ; les datacentres utilisent des réseaux IP/Ethernet en topologie de Clos, conçus pour une forte bande passante entre tous les nœuds.
- **Taille** : avec des milliers de nœuds, **quelque chose est toujours cassé**. Une stratégie « tout arrêter à chaque panne » passerait son temps arrêtée.
- **Mises à jour progressives** (ch04) : remplacer un nœud à la fois suppose de tolérer qu'un nœud soit absent.
- **Géographie** : un système réparti sur plusieurs régions communique par Internet, lent et peu fiable comparé à un réseau local.

Un chiffre pour sentir l'effet d'échelle : une requête qui touche **40 machines**, chacune indisponible **0,1 %** du temps de façon indépendante, rencontre au moins une machine indisponible avec une probabilité de 1 − 0,999⁴⁰ ≈ **3,9 %**. À 1 000 machines, c'est 63 %. Le cas « tout va bien » devient l'exception.

D'où la ligne directrice du chapitre : **construire un système fiable à partir de composants non fiables**. Ce n'est pas un paradoxe : TCP construit un flux fiable au-dessus d'IP, qui perd des paquets ; les codes correcteurs construisent une transmission fiable sur un canal bruité. Mais la fiabilité obtenue a toujours une limite (TCP masque les pertes, pas les délais).

## Le réseau ne garantit rien

Les systèmes de ce cours sont *shared-nothing* : chaque machine a sa mémoire et ses disques, et le seul moyen de communiquer est le réseau. Ce réseau est **asynchrone par paquets** : un nœud envoie un message, mais rien ne garantit **ni qu'il arrivera, ni quand**.

Imagine que ton service envoie « débite 50 € du compte 42 » et attend. Pas de réponse. Que s'est-il passé ? Six possibilités, toutes plausibles :

1. la requête s'est **perdue** (câble débranché, paquet jeté) ;
2. la requête **attend dans une file** et sera traitée plus tard (réseau ou destinataire surchargé) ;
3. le nœud distant est **tombé** (crash, coupure de courant) ;
4. le nœud distant s'est **arrêté temporairement** (une pause de ramasse-miettes, leçon 4) et répondra plus tard ;
5. le nœud a **traité la requête**, mais la **réponse** s'est perdue (switch mal configuré) ;
6. le nœud a répondu, mais la réponse **est retardée** et arrivera plus tard.

Du point de vue de l'émetteur, ces six cas sont **indiscernables** : il ne voit qu'un silence. Le cas 5 est le plus traître : le débit a eu lieu. Réessayer sans précaution débite deux fois. On retrouve la leçon RPC du ch04 : un nouvel essai n'est sûr que si l'opération est **idempotente**.

La réponse habituelle est le **timeout** : au-delà d'un certain délai, on abandonne et on considère que la réponse ne viendra pas. Mais même après un timeout, tu ne sais toujours pas si la requête a été reçue. Le timeout ne te dit pas ce qui s'est passé ; il te dit seulement que tu as cessé d'attendre.

## Les pannes réseau en pratique

On pourrait croire qu'un réseau de datacentre, géré par des professionnels, est fiable. Les études citées par le livre disent le contraire :

- dans un datacentre de taille moyenne, environ **12 pannes réseau par mois**, dont la moitié isolent une seule machine et l'autre moitié **un rack entier** ;
- la redondance du matériel réseau réduit moins les pannes qu'espéré, car elle ne protège pas contre la cause principale : **l'erreur humaine** (switch mal configuré) ;
- dans les clouds publics, les **coupures réseau transitoires** sont fréquentes ;
- des causes exotiques existent : mise à jour logicielle d'un switch qui déclenche une reconfiguration du réseau, pendant laquelle des paquets sont retardés de plus d'une minute, requins qui mordent des câbles sous-marins ;
- une interface réseau peut **jeter tous les paquets entrants tout en envoyant correctement les sortants** : un lien qui marche dans un seul sens. Le nœud parle, mais n'entend rien.

Quand une partie du réseau est coupée du reste, on parle de **partition réseau** (*netsplit*). Ce chapitre dit simplement « panne réseau » ; le point important est qu'**il n'y a pas d'option « pas de partition »**. Même si les pannes sont rares, ton logiciel doit savoir y réagir. Sinon il peut faire n'importe quoi : un cluster qui se bloque définitivement, ou qui supprime toutes ses données. Le réflexe d'ingénieur : **provoquer ces pannes exprès** en test (chaos engineering, Chaos Monkey) et vérifier le comportement. Réagir ne veut pas dire tout masquer : envoyer une erreur claire à l'utilisateur pendant une coupure peut être un choix parfaitement acceptable.

## Détecter qu'un nœud est mort

Beaucoup de mécanismes ont besoin de savoir qu'un nœud est en panne :

- un **répartiteur de charge** doit arrêter d'envoyer des requêtes à un serveur mort ;
- en **réplication avec leader** (ch05), si le leader tombe, il faut promouvoir un suiveur.

Parfois, tu reçois un **signal explicite** :

- la machine répond mais **aucun processus n'écoute** le port : l'OS renvoie un refus de connexion (paquet RST). Attention : si le processus a planté **au milieu** d'une requête, tu ne sais pas jusqu'où il l'a traitée ;
- le processus est mort mais l'OS tourne : un **script local** peut prévenir les autres nœuds, qui prennent le relais sans attendre de timeout (HBase procède ainsi) ;
- si tu as accès aux **interfaces de gestion des switchs**, tu peux détecter une coupure de lien au niveau matériel (impossible depuis Internet ou dans un cloud partagé) ;
- un **routeur** qui sait que l'adresse est injoignable peut renvoyer un paquet ICMP *Destination Unreachable*.

Ces signaux sont utiles, mais **aucun n'est garanti** : un nœud complètement débranché n'envoie rien du tout. Et même un signal positif reste partiel : savoir que le paquet est arrivé ne dit pas que l'application l'a traité. Si tu veux être sûr qu'une requête a réussi, il te faut une **réponse positive de l'application elle-même**.

Conclusion : il faut **toujours** un timeout en dernier recours. On réessaie quelques fois (au niveau TCP de façon transparente, ou au niveau applicatif), on attend, puis on **déclare** le nœud mort. Déclarer, pas constater. La leçon suivante montre pourquoi le choix de ce délai est un vrai compromis.

## Pièges fréquents

- **Conclure d'un timeout que l'action n'a pas eu lieu** : la requête a peut-être été traitée, seule la réponse manque.
- **Croire que la redondance réseau supprime les pannes** : elle ne protège pas d'un switch mal configuré par un humain.
- **Supposer que les liens sont symétriques** : un nœud peut envoyer sans jamais recevoir.
- **Copier la stratégie « tout arrêter et repartir » d'un batch** dans un service en ligne : à grande échelle, il y a toujours quelque chose de cassé.
- **Ne jamais tester la coupure réseau** : le premier test aura lieu en production.

## À retenir

- Panne partielle = une partie cassée, le reste vivant, issue non déterministe : c'est la difficulté propre aux systèmes distribués.
- Le calcul haute performance transforme la panne partielle en panne totale (points de reprise) ; un service en ligne doit la tolérer.
- Un silence peut venir de six causes indiscernables, dont « traité mais réponse perdue ».
- Les pannes réseau sont fréquentes, souvent humaines, parfois à sens unique.
- Les signaux explicites aident, mais seul le timeout couvre tous les cas, et il ne fait que **soupçonner**.
