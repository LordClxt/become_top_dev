---
id: arch-ch06-l02
title: "Les erreurs du distribué (1) : le réseau"
source: { chapter: 9, pages: "144-147" }
duration_min: 45
concepts:
  - id: arch-fallacy-reliable
    label: "Erreur 1 : le réseau est fiable. Parades : timeouts, retries, circuit breakers"
  - id: arch-fallacy-latency
    label: "Erreur 2 : la latence est nulle. Les chaînes d'appels s'additionnent et la queue (p95-p99) tue la performance"
  - id: arch-fallacy-bandwidth
    label: "Erreur 3 : la bande passante est infinie. Le couplage de tampon (stamp coupling) et ses parades"
  - id: arch-fallacy-secure
    label: "Erreur 4 : le réseau est sûr. Chaque endpoint doit être sécurisé, la surface d'attaque explose"
glossary:
  - term: "erreurs du calcul distribué"
    definition: "Huit hypothèses fausses énoncées par L. Peter Deutsch et ses collègues de Sun Microsystems en 1994."
  - term: "timeout"
    definition: "Durée maximale d'attente d'une réponse, au-delà de laquelle l'appelant abandonne."
  - term: "circuit breaker"
    definition: "Disjoncteur : après trop d'échecs, on cesse d'appeler un service pendant un temps, au lieu de s'acharner."
  - term: "couplage de tampon (stamp coupling)"
    definition: "Transmettre une grosse structure dont le destinataire n'utilise qu'une petite partie."
  - term: "contrat piloté par le consommateur"
    definition: "Consumer-driven contract : le consommateur déclare ce dont il a besoin, et le fournisseur s'engage sur cela."
visuals: [arch-ch06-fallacy-chain]
labs: [arch-ch06-l02-lab-chain-and-stamp]
xp: 45
---

## Pourquoi c'est important

Dans le monolithe, `getCustomerName(id)` coûtait quelques microsecondes, ne pouvait pas « ne pas répondre », et ne transférait que ce qu'on lui demandait. Le même appel, devenu un appel REST vers un service Profil, peut expirer, prendre 400 ms une fois sur vingt, renvoyer 500 Ko et être appelé par n'importe qui sur le réseau. Le code n'a presque pas changé ; **tout** le reste, si.

En 1994, L. Peter Deutsch et ses collègues de Sun Microsystems ont listé **huit erreurs du calcul distribué** : des choses que l'on croit vraies et qui ne le sont pas. Toutes s'appliquent encore aujourd'hui à **toutes** les architectures distribuées. Cette leçon couvre les quatre qui concernent directement le réseau.

## Erreur 1 : le réseau est fiable

Les réseaux sont plus fiables qu'avant, mais ils restent **globalement non fiables**. Le service B peut être en parfaite santé et le service A incapable de le joindre ; pire, A envoie une requête que B traite, et la réponse se perd. C'est pour cela qu'existent les **timeouts** et les **circuit breakers** entre services. Et plus un système dépend du réseau (les microservices au premier chef), plus il devient potentiellement **moins fiable**.

### Sous le capot : timeout, retry, disjoncteur

- Un **timeout** borne l'attente : sans lui, un appelant peut rester bloqué indéfiniment, et toutes ses ressources avec.
- Un **retry** retente un appel qui a échoué ; avec un **backoff exponentiel** (attendre 100, 200, 400 ms…) et du **jitter** (un aléa), pour ne pas que mille clients retentent tous à la même milliseconde.
- Un **circuit breaker** compte les échecs : au-delà d'un seuil, il **s'ouvre** et fait échouer immédiatement les appels pendant un temps, au lieu d'accabler un service déjà mal en point ; puis il laisse passer **un essai** (demi-ouvert) pour voir si le service est revenu.

Attention : un retry n'est sûr que si l'opération est **idempotente** (la rejouer ne change rien), sinon on débite deux fois la carte. Le projet archkit de ce module implémente les trois mécanismes avec une horloge simulée.

## Erreur 2 : la latence est nulle

Un appel local se mesure en **nanosecondes ou microsecondes** ; le même appel par REST, messagerie ou RPC se mesure en **millisecondes**. `t_distant` est toujours plus grand que `t_local`.

Question qui fâche : connais-tu la latence aller-retour **moyenne** d'un appel REST dans ta production ? 60 ms ? 500 ms ? Il faut la connaître : c'est le seul moyen de juger si une architecture distribuée est **faisable**, surtout en microservices, où les services sont fins et bavards. À 100 ms par appel, une fonction métier qui **enchaîne 10 appels** ajoute **une seconde** à la requête.

Plus important encore que la moyenne : le **p95 à p99**. Une moyenne de 60 ms peut cacher un p95 de 400 ms. C'est cette **longue traîne** qui tue la performance d'une architecture distribuée. (Les valeurs, on les obtient souvent auprès d'un administrateur réseau, ce qui mène à l'erreur 6.)

### Sous le capot : la queue s'amplifie avec la longueur de la chaîne

```typescript
// Chaque service a 1 % de chances d'être « lent » (son p99).
// Probabilité qu'une requête qui traverse N services en rencontre au moins un lent :
for (const n of [1, 5, 10, 20]) console.log(n, (1 - 0.99 ** n).toFixed(3));
// 1 0.010 · 5 0.049 · 10 0.096 · 20 0.182
```

Avec 10 services en chaîne, presque **une requête sur dix** subit au moins une latence de p99 : ce qui était un cas rare pour chaque service devient le quotidien de l'utilisateur. Le p99 de bout en bout d'une chaîne est bien pire que le p99 de chaque maillon.

## Erreur 3 : la bande passante est infinie

Dans un monolithe, une requête une fois entrée ne consomme presque pas de bande passante. Découpé en services, le système fait circuler des données **entre** eux, ce qui ralentit le réseau, donc dégrade la latence (erreur 2) et la fiabilité (erreur 1).

L'exemple du livre : un service **Liste de souhaits** doit afficher le **nom** du client, qu'il n'a pas ; il appelle le service **Profil client**, qui renvoie **45 attributs** pour un total de **500 Ko**, alors que le nom fait **200 octets**. Les listes de souhaits sont demandées **2 000 fois par seconde**. Cet unique appel inter-services consomme donc 2 000 × 500 Ko = **1 Go par seconde**. Avec seulement le nom : 2 000 × 200 octets = **400 Ko par seconde**.

C'est le **couplage de tampon** (*stamp coupling*) : passer une grosse structure dont on n'utilise qu'une partie. Les parades :

- des **endpoints REST privés**, taillés pour un consommateur ;
- des **sélecteurs de champs** dans le contrat (`?fields=name`) ;
- **GraphQL**, pour découpler les contrats ;
- des **contrats pilotés par les valeurs** avec des **contrats pilotés par le consommateur** (CDC) ;
- des **endpoints de messagerie internes**.

Quelle que soit la technique, le principe : **ne faire circuler que le minimum de données**.

## Erreur 4 : le réseau est sûr

À force de VPN, de réseaux de confiance et de pare-feu, on oublie que le réseau **n'est pas sûr**. En distribué, **chaque endpoint** de chaque unité de déploiement doit être sécurisé, y compris pour la communication **entre services**, pour que des requêtes inconnues ou malveillantes n'atteignent pas le service. La **surface d'attaque** augmente de plusieurs ordres de grandeur en passant du monolithe au distribué. Et sécuriser chaque appel est une raison de plus pour laquelle les architectures synchrones très distribuées (microservices, service-based) sont plus lentes.

::visual{id="arch-ch06-fallacy-chain"}

## Pièges fréquents

- **Appeler un service sans timeout** : un service lent bloque tous ses appelants.
- **Retenter sans backoff ni jitter**, ou retenter une opération non idempotente.
- **Raisonner sur la moyenne** de latence au lieu du p95-p99, et sur un service au lieu de la chaîne.
- **Renvoyer tout le profil** quand le consommateur veut un champ.
- **Faire confiance au réseau interne** et laisser des endpoints sans authentification.

## À retenir

- **Réseau fiable ?** Non : timeouts, retries (backoff + jitter, idempotence), circuit breakers.
- **Latence nulle ?** Non : connais ta latence réelle et surtout ton **p95-p99** ; 10 appels à 100 ms = 1 s ; la queue s'amplifie le long d'une chaîne.
- **Bande passante infinie ?** Non : le **couplage de tampon** (500 Ko × 2 000/s = 1 Go/s) ; transmets le minimum.
- **Réseau sûr ?** Non : sécurise **chaque endpoint**, la surface d'attaque explose.
