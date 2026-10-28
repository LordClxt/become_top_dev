---
id: arch-ch10-l04
title: "Diffusion, request-reply, et choisir l'événementiel"
source: { chapter: 14, pages: "223-230" }
duration_min: 40
concepts:
  - id: arch-broadcast
    label: "La diffusion : le producteur ignore qui reçoit et ce qu'on en fait ; le plus haut niveau de découplage"
  - id: arch-request-reply
    label: "Request-reply : une file de requête, une file de réponse ; identifiant de corrélation (recommandé) ou file temporaire"
  - id: arch-choose-event-model
    label: "Requêtes pour le structuré et le contrôlé ; événements pour la réactivité, l'échelle et le dynamique ; et les hybrides"
  - id: arch-eda-ratings
    label: "Notes : partitionné techniquement, 1 à n quanta ; cinq étoiles en performance, scalabilité, tolérance aux pannes, évolutivité ; simplicité et testabilité faibles"
glossary:
  - term: "diffusion (broadcast)"
    definition: "Publier un message sans savoir qui le recevra ni ce qu'il en fera."
  - term: "request-reply"
    definition: "Communication pseudo-synchrone par messagerie : une requête dans une file, une réponse attendue dans une autre."
  - term: "identifiant de corrélation"
    definition: "Champ de la réponse qui reprend l'identifiant du message de requête, pour que le demandeur reconnaisse sa réponse."
  - term: "sélecteur de messages"
    definition: "Filtre qui ne laisse lire, dans une file, que les messages dont un en-tête correspond (ici, l'identifiant de corrélation)."
  - term: "consommateurs concurrents"
    definition: "Plusieurs instances d'un processeur sur une même file, ajoutées par programme quand la charge monte."
  - term: "arbre d'événements"
    definition: "Le graphe de tous les enchaînements possibles d'événements : il peut compter des milliers de scénarios."
visuals: []
labs: [arch-ch10-l04-lab-correlation]
xp: 40
---

## Pourquoi c'est important

On commande un livre : il faut un **numéro de commande** tout de suite, pour l'afficher. On réserve un vol : il faut un **numéro de confirmation**. Ces besoins sont synchrones, dans une architecture entièrement asynchrone. Et de l'autre côté, certains messages n'ont aucun destinataire connu : un cours de bourse qui change, et que cent services exploitent chacun à sa façon. Cette leçon couvre ces deux extrêmes, puis le choix d'ensemble : quand l'architecture événementielle vaut son prix, et ce que dit son bulletin.

## La diffusion

L'architecture event-driven peut **diffuser** des événements **sans savoir** qui (s'il y a quelqu'un) les reçoit, ni ce qu'ils en font : un producteur publie, plusieurs abonnés reçoivent le même message. C'est sans doute le **plus haut niveau de découplage** entre processeurs. La diffusion est au cœur de la **cohérence à terme**, du **traitement d'événements complexes** (CEP) et de bien d'autres patterns.

Exemple : les cours des instruments en bourse. Chaque nouveau cours d'une action (*ticker*) peut influencer beaucoup de choses ; le service qui publie le dernier cours le diffuse simplement, sans savoir comment il sera utilisé.

## Request-reply

Pour les besoins synchrones, l'architecture event-driven utilise le **request-reply** (parfois appelé communication **pseudo-synchrone**). Chaque canal comporte **deux files** : une **file de requête** et une **file de réponse**.

1. Le producteur envoie la requête, de façon asynchrone, dans la file de requête ; il récupère la main.
2. Il fait une **attente bloquante** sur la file de réponse.
3. Le consommateur reçoit la requête, la traite, envoie la réponse dans la file de réponse.
4. Le producteur reçoit la réponse.

### Première technique : l'identifiant de corrélation (recommandée)

Plusieurs producteurs attendent sur la même file de réponse : comment chacun trouve-t-il **sa** réponse ? Par un **identifiant de corrélation** (CID) dans l'en-tête, qui reprend l'**identifiant du message de requête**.

1. Le producteur envoie la requête (ID **124**) et retient cet identifiant. Le CID de la requête est vide.
2. Il attend sur la file de réponse avec un **sélecteur** : « CID = 124 ». Les messages déjà présents (ID 855 avec CID 120, ID 856 avec CID 122) ne sont **pas** pour lui ; il ne les prend pas.
3. Le consommateur reçoit la requête 124 et la traite.
4. Il crée la réponse, avec **CID = 124**.
5. Il envoie la réponse (ID 857) dans la file de réponse.
6. Le producteur la reçoit : son CID correspond au sélecteur.

### Seconde technique : la file temporaire

Le producteur crée une **file temporaire**, dédiée à cette requête, et passe son nom dans l'en-tête **`reply-to`**. Il attend sur cette file : pas besoin de sélecteur, tout ce qui y arrive est pour lui. Le consommateur répond dans la file nommée par `reply-to` ; le producteur reçoit la réponse et **supprime** la file temporaire.

Plus simple, mais le broker doit **créer et détruire une file par requête** : à fort volume, cela ralentit nettement le broker, sa performance et sa réactivité. D'où la recommandation du livre : **l'identifiant de corrélation**.

### Sous le capot : le sélecteur

```typescript
type Msg = { id: number; cid: number | null; body: string };
const replyQueue: Msg[] = [{ id: 855, cid: 120, body: 'pour 120' }, { id: 856, cid: 122, body: 'pour 122' }];
const takeReply = (cid: number) => {
  const i = replyQueue.findIndex((m) => m.cid === cid);
  return i < 0 ? undefined : replyQueue.splice(i, 1)[0];
};
const request: Msg = { id: 124, cid: null, body: 'commande 1 livre' };
replyQueue.push({ id: 857, cid: request.id, body: 'commande ORD-42' }); // le consommateur répond
console.log(takeReply(124)?.body, replyQueue.length);
// commande ORD-42 2
```

Les réponses destinées à d'autres restent dans la file, intactes. Le projet archkit implémente ce mécanisme dans son broker.

## Requêtes ou événements : choisir

Les deux modèles sont viables, et le bon choix est essentiel.

- **Modèle par requêtes** : pour des demandes **bien structurées**, **orientées données** (lire le profil d'un client), quand il faut **certitude** et **contrôle** du workflow.
- **Modèle par événements** : pour des actions **flexibles** qui exigent beaucoup de **réactivité** et d'**échelle**, avec un traitement **complexe et dynamique**.

| Avantages des événements | Trade-offs |
|---|---|
| Meilleure réponse au contenu dynamique | Seulement de la cohérence à terme |
| Meilleures scalabilité et élasticité | Moins de contrôle du flux |
| Meilleures agilité et gestion du changement | Moins de certitude sur l'issue du flux |
| Meilleures adaptabilité et extensibilité | Difficile à tester et à déboguer |
| Meilleures réactivité et performance | |
| Meilleures décisions en temps réel | |
| Meilleure réaction à la situation | |

### Les hybrides

L'event-driven sert souvent **à l'intérieur** d'un autre style : **microservices**, **space-based**, mais aussi microkernel ou pipeline événementiels. Ajouter de l'événementiel à n'importe quel style aide à **lever des goulots**, fournit un **point de contre-pression** quand les requêtes s'accumulent, et apporte une **réactivité** introuvable ailleurs. Microservices et space-based utilisent la messagerie pour des **pompes de données** (envoyer en asynchrone des données à un processeur qui met à jour une base), et pour la scalabilité par programme.

## Le bulletin de notes

- **Partitionné techniquement** : un domaine est réparti entre plusieurs processeurs, reliés par des médiateurs, des files et des topics. Changer un domaine touche en général beaucoup de processeurs et d'artefacts de messagerie.
- **Quanta : de un à plusieurs**, selon les interactions avec la base et le request-reply. Même si toute la communication est asynchrone, des processeurs qui **partagent une base** sont dans le **même quantum**. Et le **request-reply** les lie aussi : si un processeur attend un numéro de commande d'un autre, et que cet autre est en panne, le premier ne peut pas continuer ; ils partagent les mêmes caractéristiques, bien qu'ils échangent des messages asynchrones.
- **Cinq étoiles** en **performance** (asynchrone + traitement très parallèle), **scalabilité** (répartition par programme : les **consommateurs concurrents** qu'on ajoute quand la charge monte), **tolérance aux pannes** (processeurs découplés et asynchrones, cohérence et traitement à terme ; si l'appelant n'a pas besoin de réponse immédiate, promesses et *futures* permettent de traiter plus tard quand l'aval revient), et **évolutivité** (ajouter une fonctionnalité en branchant un processeur sur des messages déjà publiés, surtout en broker).
- **Simplicité** et **testabilité** **faibles** : les flux sont non déterministes et dynamiques. On ne sait pas toujours comment les processeurs réagiront ni quels messages ils produiront. Les **arbres d'événements** peuvent compter des centaines, voire des milliers de scénarios, très difficiles à gouverner et à tester.

## Pièges fréquents

- **Faire du request-reply partout** : on retrouve le couplage synchrone (et un seul quantum), avec la complexité de la messagerie en plus.
- **Une file temporaire par requête à fort volume** : le broker s'effondre.
- **Prendre la première réponse de la file** sans sélecteur : on lit la réponse d'un autre.
- **Croire que tout asynchrone veut dire plusieurs quanta** : une base partagée ou un request-reply les soude.
- **Sous-estimer le test** : prévoir des outils de traçage et des tests de flux dès le départ.

## À retenir

- **Diffusion** : le plus haut découplage (cours de bourse, CEP, cohérence à terme).
- **Request-reply** : file de requête + file de réponse ; **identifiant de corrélation** et sélecteur (recommandé), ou **file temporaire** (`reply-to`, coûteuse à fort volume).
- **Requêtes** pour le structuré et le contrôlé ; **événements** pour la réactivité, l'échelle, le dynamique ; souvent en **hybride**.
- Notes : **technique**, **1 à n quanta** (base partagée et request-reply soudent), **cinq étoiles** en performance, scalabilité, tolérance aux pannes, évolutivité ; **simplicité et testabilité faibles**.
