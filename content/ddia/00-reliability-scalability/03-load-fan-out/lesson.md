---
id: ddia-ch00-l03
title: "Décrire la charge : l'exemple du fan-out de Twitter"
source: { chapter: 1, pages: "32-35" }
duration_min: 30
concepts:
  - id: ddia-scalability-definition
    label: "La scalabilité se discute pour une croissance précise, pas comme une étiquette"
  - id: ddia-load-parameters
    label: "Les paramètres de charge : quelques nombres qui décrivent la charge"
  - id: ddia-fan-out
    label: "Le fan-out : un tweet, des millions d'écritures"
  - id: ddia-hybrid-approach
    label: "Approche hybride : traiter les cas extrêmes à part"
glossary:
  - term: "paramètre de charge"
    definition: "Nombre qui décrit la charge du système : requêtes par seconde, ratio lectures/écritures, utilisateurs actifs simultanés, taux de succès du cache…"
  - term: "fan-out"
    definition: "Nombre de requêtes ou d'écritures qu'il faut émettre pour servir une seule requête entrante (vient de l'électronique : combien d'entrées une sortie alimente)."
  - term: "timeline (fil d'accueil)"
    definition: "Liste des messages publiés par les comptes qu'un utilisateur suit, du plus récent au plus ancien."
  - term: "approche en lecture / en écriture"
    definition: "Faire le travail au moment où l'utilisateur lit (assembler à la demande) ou au moment où l'auteur écrit (préparer à l'avance)."
visuals: []
labs: [ddia-ch00-l03-lab-fanout-design]
xp: 30
---

## Pourquoi c'est important

Si ton système tient aujourd'hui, ce n'est pas une garantie pour demain : le trafic peut passer de 10 000 à 100 000 utilisateurs simultanés. La **scalabilité** est la capacité d'un système à faire face à une charge qui augmente. Mais « mon système est scalable » ne veut strictement rien dire. Cette leçon apprend à **mesurer la charge** et à raisonner sur sa croissance, avec l'exemple le plus célèbre du domaine.

## La scalabilité n'est pas une étiquette

> Il est vide de sens de dire « X est scalable » ou « Y ne passe pas à l'échelle ».

Parler de scalabilité, c'est se poser des questions précises :

- « Si le système grandit **de telle façon**, quelles sont nos options pour faire face à cette croissance ? »
- « Comment peut-on **ajouter des ressources de calcul** pour absorber la charge supplémentaire ? »

Avant d'en discuter, il faut **décrire la charge actuelle** avec quelques nombres, les **paramètres de charge**. Le bon choix dépend de l'architecture :

- requêtes par seconde sur un serveur web ;
- ratio lectures / écritures dans une base ;
- nombre d'utilisateurs actifs en même temps dans un salon de discussion ;
- taux de succès (*hit rate*) d'un cache ;
- ou autre chose. Peut-être que le cas moyen compte pour toi, ou peut-être que ton goulet d'étranglement est dominé par un petit nombre de cas extrêmes.

## L'exemple de Twitter (données de novembre 2012)

Deux opérations principales :

| Opération | Description | Volume |
|---|---|---|
| **Publier un tweet** | un utilisateur diffuse un message à ses abonnés | 4,6 k requêtes/s en moyenne, plus de 12 k/s en pointe |
| **Fil d'accueil** | un utilisateur consulte les tweets des comptes qu'il suit | 300 k requêtes/s |

Traiter 12 000 écritures par seconde serait plutôt facile. Le vrai défi de Twitter n'est pas le volume de tweets, c'est le **fan-out** : chaque utilisateur suit beaucoup de comptes et est suivi par beaucoup de comptes. Il existe deux grandes manières d'implémenter ces deux opérations.

### Approche 1 : assembler à la lecture

Publier un tweet l'insère simplement dans une collection globale. Quand un utilisateur demande son fil, on cherche les comptes qu'il suit, on récupère leurs tweets, et on les fusionne par date. En SQL :

```sql
SELECT tweets.*, users.* FROM tweets
  JOIN users   ON tweets.sender_id    = users.id
  JOIN follows ON follows.followee_id = users.id
  WHERE follows.follower_id = current_user
```

### Approche 2 : préparer à l'écriture

On entretient, pour chaque utilisateur, un **cache de son fil d'accueil** : une boîte aux lettres de tweets. Quand quelqu'un publie, on retrouve tous ses abonnés et on insère le tweet dans chacun de leurs fils. Lire son fil devient bon marché : le résultat est déjà calculé.

### Laquelle choisir ?

La première version de Twitter utilisait l'approche 1, mais les requêtes de fil d'accueil étaient trop nombreuses pour tenir. Twitter est passé à l'approche 2, qui marche mieux parce que **le taux de tweets publiés est presque deux ordres de grandeur plus bas que le taux de lectures de fil** : il vaut mieux travailler davantage à l'écriture (rare) et moins à la lecture (fréquente).

Le prix à payer : publier un tweet demande beaucoup plus de travail. En moyenne, un tweet est livré à environ 75 abonnés, donc :

```
4,6 k tweets/s × 75 abonnés = 345 k écritures/s dans les fils
```

Et cette moyenne cache une réalité : le nombre d'abonnés varie énormément, et certains comptes ont plus de **30 millions d'abonnés**. Un seul tweet de l'un d'eux déclenche plus de 30 millions d'écritures. Twitter essaie de livrer en moins de cinq secondes : c'est un vrai défi.

> **Le vrai paramètre de charge.** La **distribution du nombre d'abonnés par utilisateur** (peut-être pondérée par la fréquence de publication) est ici *le* paramètre déterminant. Ton application aura d'autres caractéristiques, mais le raisonnement est le même.

### Le dénouement : une approche hybride

Maintenant que l'approche 2 est robuste, Twitter évolue vers un **mélange** des deux :

- pour la plupart des comptes, les tweets continuent d'être diffusés dans les fils à la publication ;
- pour une petite poignée de comptes à très grand nombre d'abonnés (les célébrités), **on ne fait pas le fan-out**. Leurs tweets sont récupérés à part et fusionnés dans le fil **à la lecture**, comme dans l'approche 1.

Cette approche hybride donne de bonnes performances de façon constante. L'idée générale : **quand une approche est excellente pour la majorité et catastrophique pour une minorité, traite la minorité à part.**

## Comment raisonner sur sa propre charge

1. Identifie les **opérations** de ton système (publier, lire, chercher).
2. Mesure leur **fréquence** et leur **coût en travail** (écritures, lectures, appels aux autres services).
3. Cherche les **distributions déséquilibrées** : le cas moyen peut masquer un cas extrême qui, lui, casse le système.
4. Demande-toi : de quel côté (lecture ou écriture) vaut-il mieux travailler, sachant le ratio entre les deux ?
5. Imagine la croissance : si la charge double, que doit-on doubler ?

Le TP de cette leçon te fait calculer le coût de ces trois stratégies sous des charges différentes, avec une distribution d'abonnés très déséquilibrée.

## Pièges fréquents

- **Se baser sur la moyenne.** 75 abonnés en moyenne cachent un compte à 30 millions.
- **Optimiser le mauvais côté.** Avant de choisir où travailler, compare le volume de lectures à celui d'écritures.
- **Ignorer les cas extrêmes** dans les estimations de capacité : ce sont eux qui font tomber le système.
- **Prévoir une croissance hypothétique** avant d'avoir compris la charge actuelle : dans une jeune entreprise, itérer vite sur le produit compte souvent plus que passer à l'échelle d'une charge imaginaire.

## À retenir

- La scalabilité ne se déclare pas : elle se discute pour une croissance donnée.
- On décrit la charge par quelques paramètres, choisis selon l'architecture.
- Un même service peut être servi en travaillant à la lecture ou à l'écriture ; le bon choix dépend du ratio entre les deux.
- Le fan-out multiplie le travail : un tweet peut déclencher des millions d'écritures.
- Une approche hybride traite à part les cas extrêmes qui cassent l'approche principale.
