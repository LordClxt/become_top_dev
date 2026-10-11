---
id: ddia-ch06-l01
title: "Plusieurs leaders : quand et pourquoi"
source: { chapter: 5, pages: "168-171" }
duration_min: 30
concepts:
  - id: ddia-multi-leader-replication
    label: "Réplication multi-leader : plusieurs nœuds acceptent les écritures, chacun est aussi le suiveur des autres"
  - id: ddia-multi-leader-multi-dc
    label: "Un leader par datacenter : écritures locales, pannes de datacenter et coupures réseau mieux tolérées"
  - id: ddia-offline-client-sync
    label: "Un client hors ligne avec sa base locale est un leader dont le « réseau » coupe des heures ou des jours"
  - id: ddia-collaborative-editing
    label: "L'édition collaborative en temps réel pose les mêmes problèmes que la réplication multi-leader"
  - id: ddia-multi-leader-dangers
    label: "Le multi-leader est souvent ajouté après coup et casse clés auto-incrémentées, triggers et contraintes"
glossary:
  - term: "multi-leader (master-master, active/active)"
    definition: "Configuration où plusieurs nœuds acceptent les écritures ; chacun transmet ses changements aux autres et applique les leurs."
  - term: "réplication inter-datacenter"
    definition: "Copie des données entre des sites géographiquement éloignés, en général asynchrone car la latence entre eux se compte en dizaines de millisecondes."
  - term: "client hors ligne (offline-first)"
    definition: "Application qui lit et écrit dans une base locale même sans réseau, puis se synchronise quand la connexion revient."
  - term: "édition collaborative en temps réel"
    definition: "Plusieurs personnes modifient le même document en même temps (Google Docs, Etherpad) ; chaque frappe est appliquée localement puis propagée."
visuals: []
labs: [ddia-ch06-l01-lab-multi-dc-design]
xp: 40
---

## Pourquoi c'est important

Au module précédent, un seul nœud, le **leader**, recevait toutes les écritures. C'est simple et sûr, mais c'est aussi un goulot : si le leader est à Francfort et ton utilisateur à Sydney, chaque écriture traverse la planète ; si le leader tombe ou si le lien vers lui est coupé, **plus personne n'écrit** jusqu'au basculement. La réplication **multi-leader** lève cette limite en autorisant plusieurs nœuds à accepter des écritures. Le prix est lourd : des **conflits** d'écriture deviennent possibles. Avant d'apprendre à les gérer (leçon suivante), il faut savoir **quand** ce prix vaut la peine d'être payé — la réponse est « rarement, mais dans trois situations précises ».

## Le principe

Avec un seul leader, l'écriture suit un chemin unique : client → leader → suiveurs. Avec plusieurs leaders, chaque leader :

1. accepte les écritures de ses clients ;
2. les transmet aux **autres leaders** (et à ses propres suiveurs) ;
3. applique les écritures qu'il reçoit des autres leaders, comme un suiveur.

On parle aussi de *master-master* ou d'*active/active*. La réplication entre leaders est presque toujours **asynchrone** : sinon, chaque écriture attendrait tous les leaders et l'on perdrait tout l'intérêt du dispositif.

Dans un seul datacenter, cela n'a guère de sens : la complexité ajoutée dépasse le bénéfice. Les trois cas où cela en a un sont les suivants.

## Cas 1 : plusieurs datacenters

Tu sers des clients en Europe et aux États-Unis, avec un datacenter de chaque côté. Avec la réplication multi-leader, tu places **un leader par datacenter**. À l'intérieur de chaque datacenter, c'est la réplication leader-suiveur classique ; **entre** datacenters, chaque leader envoie ses changements à l'autre, de façon asynchrone.

Comparons avec un seul leader (à Francfort, disons) sur trois critères.

| Critère | Un seul leader | Un leader par datacenter |
|---|---|---|
| Latence d'écriture | Un utilisateur américain paie l'aller-retour transatlantique (≈ 80-100 ms) à chaque écriture | L'écriture est traitée localement (quelques ms) ; la réplication vers l'autre site est masquée |
| Panne d'un datacenter | Si c'est celui du leader : basculement, promotion d'un suiveur de l'autre site, risques du module précédent | Chaque site continue seul ; le site tombé rattrape son retard quand il revient |
| Problème réseau entre sites | Les écritures américaines dépendent d'un lien Internet public, moins fiable que le réseau local ; en synchrone, la moindre perturbation bloque | La réplication asynchrone tolère mieux une coupure temporaire : les écritures continuent de chaque côté |

Chiffrons le premier point. Une application de réservation fait 6 écritures séquentielles par parcours utilisateur. Avec un leader unique à 90 ms d'aller-retour, un client américain attend au moins 6 × 90 = **540 ms** de réseau pur ; avec un leader local à 2 ms, 12 ms.

Des outils existent pour la plupart des bases : **Tungsten Replicator** pour MySQL, **BDR** pour PostgreSQL, **GoldenGate** pour Oracle. Certaines bases le proposent en option dans leur version commerciale.

### Le revers

Le grand défaut : **la même donnée peut être modifiée en même temps dans deux datacenters**, et ces conflits devront être résolus (leçon 2). Il y a pire : le multi-leader est souvent une fonctionnalité **greffée après coup**, qui interagit mal avec d'autres :

- **clés auto-incrémentées** : deux leaders attribuent le même identifiant 1042 à deux commandes différentes ;
- **triggers** : un trigger s'exécute sur chaque leader, ou deux fois, ou sur des données pas encore répliquées ;
- **contraintes d'intégrité** : une contrainte d'unicité vérifiée sur chaque site séparément laisse passer deux lignes qui la violent ensemble.

D'où le conseil du livre : le multi-leader est un **terrain dangereux**, à éviter si l'on peut.

## Cas 2 : les clients hors ligne

Ton application d'agenda tourne sur téléphone, ordinateur portable et web. Tu veux pouvoir **consulter et créer des rendez-vous dans le train, sans réseau**, et retrouver tes changements partout une fois reconnecté.

La seule solution : chaque appareil a une **base locale** qui accepte les écritures — un **leader** — et une synchronisation asynchrone multi-leader entre tous les appareils et le serveur. Du point de vue de l'architecture, **chaque appareil est un « datacenter »**, relié aux autres par un réseau extraordinairement peu fiable : le délai de réplication peut atteindre des **heures ou des jours** (le portable resté fermé tout un week-end).

Conséquence directe : avec 4 appareils, tu as 4 leaders, et la probabilité qu'un même rendez-vous soit modifié sur deux appareils entre deux synchronisations n'a rien de théorique. L'historique montre que ce n'est pas simple à réussir ; certains systèmes ont été conçus exprès pour ce mode de fonctionnement, comme **CouchDB**.

## Cas 3 : l'édition collaborative

Google Docs, Etherpad : plusieurs personnes tapent dans le même document. On ne pense pas d'habitude à de la réplication de base de données, mais c'est le même problème : la frappe s'applique **tout de suite** à la copie locale (dans le navigateur), puis est propagée **de façon asynchrone** au serveur et aux autres éditeurs.

Deux choix possibles :

- **verrouiller** le document (ou le paragraphe) avant de le modifier : un seul éditeur à la fois, les autres attendent. C'est l'équivalent d'un **leader unique** avec des transactions sur le leader ;
- pour une collaboration fluide, rendre l'**unité de changement minuscule** (une frappe) et **ne pas verrouiller**. On obtient alors tous les défis du multi-leader, à commencer par la résolution de conflits : Alice et Bob modifient le même mot au même instant.

## Rappel : ce que tu sais déjà

Les anomalies de **délai de réplication** du module précédent (relire ses propres écritures, lectures monotones, préfixe cohérent) existent toujours ici, et en pire : avec plusieurs leaders asynchrones, ce que tu viens d'écrire à Paris peut ne pas être visible à New York pendant plusieurs centaines de millisecondes — ou plusieurs jours pour un appareil hors ligne.

## Pièges fréquents

- **Choisir le multi-leader « pour la disponibilité » dans un seul datacenter** : on paie les conflits sans gagner de latence. Un leader avec basculement suffit en général.
- **Garder des identifiants auto-incrémentés** : deux leaders produiront les mêmes. Préfère des UUID, ou des plages d'identifiants réservées par leader.
- **Oublier que les contraintes ne sont vérifiées que localement** : une unicité « nom d'utilisateur » peut être violée par deux inscriptions simultanées sur deux sites.
- **Croire que l'application hors ligne est un simple cache** : c'est un leader à part entière, et ses écritures entreront en conflit.

## À retenir

- Multi-leader : plusieurs nœuds acceptent les écritures, chacun est aussi le suiveur des autres, la réplication entre eux est asynchrone.
- Trois cas d'usage : **plusieurs datacenters** (latence, panne de site, coupure réseau), **clients hors ligne** (chaque appareil est un leader), **édition collaborative** (chaque frappe est une écriture locale).
- Le défaut majeur : les **conflits d'écriture** ; les défauts secondaires : clés auto-incrémentées, triggers, contraintes.
- À éviter tant qu'un seul leader suffit.
