---
id: arch-ch10-l01
title: "Événements et topologie broker"
source: { chapter: 14, pages: "199-205" }
duration_min: 45
concepts:
  - id: arch-request-vs-event
    label: "Modèle par requêtes (déterministe, orienté données) contre modèle par événements (réagir à une situation)"
  - id: arch-broker-components
    label: "Topologie broker : événement initiateur, broker (topics), processeurs, événements de traitement"
  - id: arch-advertise
    label: "Toujours annoncer ce qu'on a fait, même si personne n'écoute : l'extensibilité"
  - id: arch-relay-race
    label: "La course de relais : chaque processeur passe le témoin et passe à autre chose ; scalabilité indépendante"
  - id: arch-broker-drawbacks
    label: "Limites du broker : pas de contrôle du workflow, gestion d'erreurs difficile, pas de reprise, incohérence des données"
glossary:
  - term: "architecture event-driven"
    definition: "Style distribué asynchrone fait de processeurs d'événements découplés qui reçoivent et traitent des événements."
  - term: "événement initiateur"
    definition: "L'événement qui déclenche tout le flux (placer une enchère, passer commande)."
  - term: "processeur d'événements"
    definition: "Composant qui réagit à un événement en accomplissant une tâche précise."
  - term: "événement de traitement"
    definition: "Événement émis par un processeur pour annoncer ce qu'il vient de faire (order-created, payment-applied)."
  - term: "broker d'événements"
    definition: "Intermédiaire de messagerie léger (RabbitMQ, ActiveMQ…), souvent fédéré par domaine, qui porte les topics."
  - term: "back-pressure (point de contre-pression)"
    definition: "Endroit où les messages s'accumulent quand un consommateur ralentit, sans bloquer le producteur."
visuals: []
labs: [arch-ch10-l01-lab-warmup-request-or-event, arch-ch10-l01-lab-stuck-orders]
xp: 45
---

## Pourquoi c'est important

Deux demandes arrivent au même système de vente : « afficher l'historique de mes commandes des six derniers mois », et « une enchère vient d'être placée sur le lot 42 ». La première est une **question** posée au système : on sait exactement quoi faire, dans quel ordre, et quoi répondre. La seconde est un **fait** qui vient de se produire : il faut **réagir**, la comparer aux autres enchères arrivées au même moment, prévenir les autres enchérisseurs, peut-être déclencher une alerte de fraude.

L'architecture **event-driven** est construite pour le second cas. C'est un style distribué **asynchrone**, populaire pour produire des applications très **scalables** et **performantes**, qui s'adapte aussi bien aux petites applications qu'aux grandes. On peut l'utiliser seule ou l'intégrer à un autre style (des microservices événementiels, par exemple).

## Requêtes ou événements

- **Modèle par requêtes** : les demandes vont à un **orchestrateur de requêtes** (en général l'interface, parfois une couche d'API ou un bus), qui les dirige de façon **déterministe** et **synchrone** vers des processeurs de requêtes, qui lisent ou mettent à jour une base. L'historique des commandes en est l'exemple type : une demande **orientée données**, dans un contexte précis.
- **Modèle par événements** : le système **réagit** à une situation. Placer une enchère n'est pas une demande faite au système, c'est un **événement** qui survient après l'annonce du prix courant ; le système doit y répondre en la comparant aux autres.

Deux topologies principales : le **médiateur**, quand il faut **contrôler** le workflow d'un événement (leçon suivante), et le **broker**, quand il faut beaucoup de **réactivité** et un contrôle **dynamique** du traitement.

## La topologie broker

Pas de médiateur central : le flux de messages est **distribué** entre les processeurs, en chaîne, par diffusion, via un **broker léger** (RabbitMQ, ActiveMQ, HornetQ…). Elle convient quand le flux est relativement simple et ne demande pas d'orchestration centrale.

Quatre composants :

1. l'**événement initiateur**, qui démarre tout le flux (placer une enchère ; ou, dans un système d'avantages sociaux, changer d'emploi, se marier) ;
2. le **broker d'événements**, qui reçoit l'événement initiateur sur un **canal** ;
3. le **processeur d'événements** : comme personne ne contrôle le flux, **un seul** processeur accepte l'événement initiateur et accomplit sa tâche ;
4. l'**événement de traitement** : ce processeur **annonce de façon asynchrone ce qu'il a fait** au reste du système. D'autres processeurs l'écoutent, réagissent, annoncent à leur tour ce qu'ils ont fait… jusqu'à ce que plus personne ne s'intéresse au dernier événement.

Le broker est en général **fédéré** (plusieurs instances en cluster, par domaine), chacune contenant tous les canaux du flux de son domaine. Comme la diffusion est découplée, asynchrone, « tire et oublie », on utilise des **topics** (ou des *topic exchanges* AMQP) en **publish/subscribe**.

### Toujours annoncer ce qu'on a fait

Bonne pratique : chaque processeur **annonce** ce qu'il a fait, **même si personne n'écoute**. Le processeur Notification envoie un e-mail, puis publie `email-sent` sur un topic que personne n'écoute : le message disparaît. Gaspillage ? Non : le jour où l'on veut **analyser les e-mails envoyés**, le nouvel analyseur s'abonne au topic, **sans** nouvelle infrastructure et **sans** toucher aux autres processeurs. C'est de l'**extensibilité** architecturale (exactement l'avantage du topic vu au module 00).

## La commande, en broker

Le flux de prise de commande d'une librairie en ligne :

- **OrderPlacement** reçoit l'événement initiateur `PlaceOrder`, insère la commande, renvoie un identifiant au client, et publie **`order-created`**.
- Trois processeurs l'écoutent et travaillent **en parallèle** :
  - **Notification** envoie un e-mail au client et publie `email-sent` (personne n'écoute : c'est le point d'extension) ;
  - **Inventory** décrémente le stock et publie `inventory-updated`, que **Warehouse** écoute pour gérer les entrepôts et réapprovisionner ;
  - **Payment** débite la carte et publie **`payment-applied`** ou **`payment-denied`** ; Notification écoute `payment-denied` pour demander au client un autre moyen de paiement.
- **OrderFulfillment** écoute `payment-applied`, prépare la commande, publie `order-fulfilled`.
- **Notification** (prévenir le client) et **Shipping** (choisir un transporteur) écoutent `order-fulfilled` ; Shipping expédie et publie `order-shipped`, que Notification écoute aussi.

### La course de relais

Tous les processeurs sont très **découplés** et **indépendants**. La meilleure image est une **course de relais** : chaque coureur porte le témoin sur sa distance, le passe au suivant, et **quitte la course**. Un processeur qui a passé l'événement n'est plus concerné par lui, et peut réagir à d'autres. Chacun peut **monter en charge indépendamment**. Et les topics jouent le rôle de **point de contre-pression** : si un processeur tombe ou ralentit, les messages l'attendent.

### Sous le capot : un mini broker

```typescript
type Handler = (event: string) => void;
const topics = new Map<string, Handler[]>();
const subscribe = (topic: string, h: Handler) => topics.set(topic, [...(topics.get(topic) ?? []), h]);
const publish = (topic: string, event: string) => (topics.get(topic) ?? []).forEach((h) => h(event));

const log: string[] = [];
subscribe('order-created', (e) => { log.push(`payment(${e})`); publish('payment-applied', e); });
subscribe('order-created', (e) => { log.push(`inventory(${e})`); publish('inventory-updated', e); });
subscribe('payment-applied', (e) => log.push(`fulfillment(${e})`));
publish('order-created', 'o-1');      // personne n'écoute inventory-updated : c'est normal
console.log(log.join(' → '));
// payment(o-1) → fulfillment(o-1) → inventory(o-1)
```

OrderPlacement ne connaît ni Payment ni Inventory : il publie. Le projet archkit de ce module en fait un vrai broker, avec files, acquittements et redistribution.

## Le revers du broker

La performance, la réactivité et la scalabilité sont de grands atouts. Mais :

- **Pas de contrôle du workflow.** Le flux est très dynamique ; **personne** ne sait vraiment quand la transaction métier « passer commande » est terminée.
- **La gestion d'erreurs est un défi.** Sans médiateur, si **Payment plante** sans finir sa tâche, **personne ne le sait**. Le processus métier reste bloqué, sans intervention automatique ou manuelle. Et les autres continuent comme si de rien n'était : **Inventory décrémente quand même** le stock.
- **Pas de reprise (*recoverability*) ni de redémarrage.** D'autres actions ont déjà été prises de façon asynchrone : on ne peut pas resoumettre l'événement initiateur. Aucun composant ne connaît ni ne **possède** l'état de la demande d'origine, donc personne n'est chargé de la relancer là où elle s'est arrêtée.

| Avantages | Inconvénients |
|---|---|
| Processeurs très découplés | Contrôle du workflow |
| Haute scalabilité | Gestion d'erreurs |
| Haute réactivité | Reprise (recoverability) |
| Haute performance | Capacité de redémarrage |
| Haute tolérance aux pannes | Incohérence des données |

## Pièges fréquents

- **Utiliser des événements pour une requête déterministe** (l'historique de commandes) : on perd le contrôle pour rien.
- **Ne pas publier « ce qu'on a fait »** parce que personne n'écoute aujourd'hui : on supprime le point d'extension de demain.
- **Croire qu'un flux broker s'arrête proprement en cas d'erreur** : il continue ailleurs, en silence.
- **Chercher qui « possède » la commande** en broker : personne.

## À retenir

- **Requêtes** : déterministe, orienté données. **Événements** : réagir à une situation.
- Broker : **événement initiateur** → **broker** (topics, fédéré) → **processeurs** → **événements de traitement**, en chaîne.
- **Annonce toujours ce que tu as fait** : c'est l'extensibilité.
- La **course de relais** : découplage, scalabilité indépendante, topics comme point de contre-pression.
- Prix : **pas de contrôle du workflow**, **erreurs silencieuses**, **pas de reprise**, **incohérence des données**.
