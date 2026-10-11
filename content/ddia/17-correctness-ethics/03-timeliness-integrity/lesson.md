---
id: ddia-ch17-l03
title: "Opportunité, intégrité et contraintes souples"
source: { chapter: 12, pages: "524-530" }
duration_min: 35
concepts:
  - id: ddia-correct-timeliness
    label: "Opportunité (timeliness) : l'utilisateur voit un état à jour ; sa violation est temporaire (« cohérence à terme »)"
  - id: ddia-correct-integrity
    label: "Intégrité : aucune donnée perdue, contradictoire ou fausse ; sa violation est permanente (« incohérence perpétuelle »)"
  - id: ddia-correct-dataflow-integrity
    label: "Un système de flux garantit l'intégrité sans opportunité : écriture en un message, dérivation déterministe, identifiant transmis, messages immuables"
  - id: ddia-correct-apologies
    label: "Contraintes souples : écrire d'abord, vérifier ensuite, et compenser par une excuse quand le coût est acceptable"
  - id: ddia-correct-coordination-avoidance
    label: "Éviter la coordination : intégrité forte, opportunité faible, coordination synchrone seulement là où elle paie"
glossary:
  - term: "opportunité (timeliness)"
    definition: "Propriété d'un système dont les lectures reflètent un état à jour ; une violation se corrige en attendant."
  - term: "intégrité (integrity)"
    definition: "Absence de corruption : pas de donnée perdue, contradictoire ou fausse, et des données dérivées exactes."
  - term: "transaction de compensation"
    definition: "Action qui corrige après coup l'effet d'une erreur : remboursement, excuse, geste commercial."
  - term: "surréservation (overbooking)"
    definition: "Vendre plus de places qu'il n'en existe, en comptant sur les absents, et compenser si trop de clients se présentent."
  - term: "système sans coordination (coordination-avoiding)"
    definition: "Système qui préserve l'intégrité sans commit atomique ni linéarisabilité ni coordination synchrone entre partitions."
visuals: []
labs: [ddia-ch17-l03-lab-apology-design]
xp: 40
---

## Pourquoi c'est important

On dit « cohérence » pour beaucoup de choses. Ici, ce mot cache **deux exigences très différentes**, et les confondre conduit à payer très cher (coordination partout) une garantie dont on n'a pas besoin, ou à négliger la seule qui compte vraiment. Cette leçon sépare les deux, puis montre qu'une bonne partie des contraintes métier sont plus souples qu'on ne le croit : on peut souvent écrire d'abord et s'excuser ensuite.

## Deux exigences sous un même mot

**L'opportunité** (*timeliness*) : les utilisateurs observent le système dans un état **à jour**. Si une réplique est en retard, tu lis une donnée périmée ; mais l'incohérence est **temporaire** : attends et réessaie, elle disparaît. C'est ce qu'on appelle « cohérence à terme ». La linéarisabilité est la forme la plus forte d'opportunité ; la lecture de ses propres écritures en est une forme plus faible.

**L'intégrité** (*integrity*) : **absence de corruption**. Aucune donnée perdue, aucune donnée contradictoire ou fausse. Un index secondaire doit refléter exactement la table ; une vue matérialisée doit être le résultat exact de sa requête. Une violation d'intégrité ne se résorbe **pas** en attendant : elle est **permanente**, il faut la détecter et la réparer explicitement.

Kleppmann résume : une violation d'opportunité, c'est de la « cohérence à terme » ; une violation d'intégrité, c'est de l'« incohérence perpétuelle ».

Dans la plupart des applications, **l'intégrité compte bien plus**. Exemple : ta carte bancaire. Qu'un paiement d'hier n'apparaisse pas encore sur le relevé en ligne, c'est normal ; les banques réconcilient de façon asynchrone. Mais que le solde ne soit pas égal à la somme des opérations, ou qu'on te débite sans que le commerçant soit payé (de l'argent qui disparaît), ce serait inacceptable.

## Ce que garantissent les systèmes de flux

Les transactions ACID offrent **les deux** d'un coup : la linéarisabilité (opportunité) et le commit atomique (intégrité). C'est confortable, et c'est pourquoi la distinction passe inaperçue.

Les systèmes de flux d'événements, eux, **découplent** les deux. Ils ne promettent pas l'opportunité : les consommateurs sont asynchrones par conception, sauf si tu construis explicitement un consommateur qui attend un message avant de répondre (comme le client qui guette l'issue de sa demande de nom). Mais l'**intégrité** est au cœur de leur conception. La sémantique « exactement une fois » (ou « effectivement une fois ») est justement un mécanisme de préservation de l'intégrité.

Les ingrédients, que tu as tous déjà rencontrés :

1. représenter l'écriture comme **un seul message**, écrit de façon atomique (l'esprit de l'event sourcing) ;
2. dériver toutes les autres mises à jour d'état par des **fonctions déterministes**, comme des procédures stockées ;
3. faire **passer l'identifiant de requête** généré par le client à travers tous les niveaux de traitement, pour la déduplication de bout en bout et l'idempotence ;
4. rendre les messages **immuables** et permettre de **retraiter** les données dérivées, pour pouvoir réparer après un bug.

Cette combinaison donne une intégrité solide **sans** commit atomique ni transaction distribuée, et c'est elle que tu construiras dans le projet du chapitre.

## Les contraintes interprétées avec souplesse

Une unicité stricte exige un consensus. Mais beaucoup d'applications réelles se contentent d'une version plus faible :

- deux personnes obtiennent le même nom ou la même réservation : on envoie un **message d'excuse** à l'une d'elles et on lui demande de choisir autre chose. C'est une **transaction de compensation** ;
- on a vendu plus d'articles que le stock : on recommande, on prévient du retard, on offre une réduction. C'est exactement ce qu'il faudrait faire si un chariot élévateur écrasait des cartons dans l'entrepôt ; le processus d'excuse **existe déjà** pour d'autres raisons ;
- les compagnies aériennes **surréservent** volontairement, en comptant sur les absents, et indemnisent quand trop de passagers se présentent. Les hôtels font de même ;
- un client retire plus que son solde : la banque facture des agios et demande le remboursement. Limiter le retrait total par jour borne le risque.

Le coût d'une excuse acceptable est une **décision métier**. S'il est acceptable, on peut **écrire d'abord et vérifier ensuite** : une approche optimiste. La contrainte est imposée, mais **pas avant** l'écriture.

Ce qui reste non négociable, c'est l'**intégrité** : ne pas perdre de réservation, ne pas créer d'argent en débitant d'un côté sans créditer de l'autre. La correction a lieu après coup, mais elle a lieu.

Exemple chiffré : un vol de 180 sièges, avec 8 % de passagers absents en moyenne. Vendre 195 billets fait en moyenne 195 × 0,92 ≈ 179 présents. Les jours où plus de 180 personnes se présentent, la compagnie paie quelques indemnités ; le reste du temps, elle remplit un avion qui partirait avec des sièges vides. Elle a calculé que les excuses coûtent moins que les places perdues.

## Des systèmes qui évitent la coordination

Deux observations se combinent :

- les systèmes de flux maintiennent l'intégrité des données dérivées **sans** commit atomique, sans linéarisabilité et sans coordination synchrone entre partitions ;
- beaucoup d'applications se satisfont de contraintes souples, vérifiées après coup avec compensation.

Conséquence : on peut concevoir des systèmes **sans coordination** qui offrent de bonnes performances et une bonne tolérance aux pannes. Ils peuvent fonctionner sur **plusieurs datacenters** en multi-leader, avec une réplication asynchrone entre régions : chaque région continue d'avancer seule si le lien tombe. Opportunité faible (rien n'est linéarisable sans coordination), mais intégrité forte.

Les transactions sérialisables ne disparaissent pas : elles restent utiles pour maintenir un état dérivé, **à petite échelle**, là où elles marchent bien. Les transactions distribuées hétérogènes comme XA, elles, ne sont pas nécessaires. Et rien n'empêche d'introduire une coordination synchrone **ponctuellement**, là où une excuse serait impossible (on ne s'excuse pas d'avoir vendu deux fois le même lit d'hôpital).

Une autre façon de le dire : la coordination et les contraintes **réduisent le nombre d'excuses** à présenter, au prix des performances et de la disponibilité (donc, peut-être, d'autres excuses pour cause de panne). Aucun réglage ne supprime toutes les excuses ; l'objectif est le **meilleur compromis**, ni trop peu de coordination, ni trop.

## Pièges fréquents

- **Exiger la linéarisabilité partout « pour la cohérence »** alors que seule l'intégrité est critique : on paie la coordination pour rien.
- **Croire qu'une violation d'intégrité finira par se résorber** : elle est perpétuelle tant qu'on ne la détecte pas.
- **Assouplir une contrainte sans prévoir la compensation** : écrire d'abord n'est acceptable que si le processus d'excuse existe et que son coût est connu.
- **Assouplir l'intégrité en même temps que l'opportunité** : la vérification peut être tardive, la perte ou la création d'argent jamais.

## À retenir

- Opportunité = voir un état à jour (violation temporaire) ; intégrité = pas de corruption (violation permanente). L'intégrité compte presque toujours plus.
- Les systèmes de flux garantissent l'intégrité sans opportunité : un message par écriture, dérivation déterministe, identifiant transmis, messages immuables et retraitables.
- Beaucoup de contraintes acceptent d'être vérifiées après coup, avec une excuse dont le coût est une décision métier.
- Éviter la coordination permet le multi-datacenter et la tolérance aux pannes ; on garde la coordination synchrone pour les rares cas où l'excuse est impossible.
