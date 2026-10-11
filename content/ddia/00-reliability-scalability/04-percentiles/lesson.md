---
id: ddia-ch00-l04
title: "Performance : temps de réponse, percentiles et latence de queue"
source: { chapter: 1, pages: "35-39" }
duration_min: 35
concepts:
  - id: ddia-response-time
    label: "Le temps de réponse est une distribution, pas un nombre"
  - id: ddia-percentiles
    label: "Médiane et percentiles (p50, p95, p99, p999)"
  - id: ddia-slo-sla
    label: "SLO et SLA exprimés en percentiles"
  - id: ddia-tail-amplification
    label: "Amplification de la latence de queue quand une requête fait plusieurs appels"
  - id: ddia-merge-histograms
    label: "On agrège des histogrammes, jamais des percentiles"
glossary:
  - term: "débit (throughput)"
    definition: "Nombre d'enregistrements ou de requêtes traités par seconde. Mesure importante pour un traitement par lots."
  - term: "temps de réponse"
    definition: "Durée que voit le client entre l'envoi d'une requête et la réception de la réponse : temps de service + attentes réseau + attente en file."
  - term: "latence"
    definition: "Durée pendant laquelle une requête attend d'être traitée (elle est « latente »). Différent du temps de réponse."
  - term: "percentile (p95, p99…)"
    definition: "Seuil en dessous duquel se trouvent 95 %, 99 %… des requêtes. Le p50 est la médiane."
  - term: "latence de queue (tail latency)"
    definition: "Les temps de réponse des percentiles élevés (p99, p999) : les rares requêtes les plus lentes."
  - term: "head-of-line blocking"
    definition: "Quelques requêtes lentes bloquent les requêtes rapides qui suivent, parce que le serveur ne peut en traiter qu'un petit nombre en parallèle."
  - term: "SLO / SLA"
    definition: "Objectif (SLO) ou contrat (SLA) de niveau de service : performance et disponibilité attendues, souvent exprimées en percentiles."
visuals: [ddia-ch00-tail-amplification]
labs: [ddia-ch00-l04-lab-percentiles-design]
xp: 35
---

## Pourquoi c'est important

« Notre temps de réponse moyen est de 120 ms. » Voilà une phrase qui rassure et qui ne dit presque rien : combien d'utilisateurs ont attendu trois secondes ? La **moyenne** cache les cas qui font fuir les clients. Cette leçon t'apprend à décrire la performance honnêtement, avec des **percentiles**, et à voir comment une petite proportion de requêtes lentes devient, dans un système composé de nombreux services, la **norme**.

## Débit et temps de réponse

Une fois la charge décrite, on regarde ce qui se passe quand elle augmente, de deux façons :

1. Si j'augmente un paramètre de charge **sans changer les ressources**, comment la performance change-t-elle ?
2. Si j'augmente un paramètre de charge, **de combien dois-je augmenter les ressources** pour garder la même performance ?

Il faut des chiffres de performance. Selon le type de système :

- Un **traitement par lots** (Hadoop) s'intéresse au **débit** : combien d'enregistrements par seconde, ou le temps total pour un jeu de données d'une taille donnée.
- Un **système en ligne** s'intéresse au **temps de réponse** : la durée entre l'envoi de la requête par le client et la réception de la réponse.

> **Latence ≠ temps de réponse.** Le temps de réponse est ce que **voit le client** : le temps de traitement réel (*service time*) plus les délais réseau et les attentes en file. La latence est la durée pendant laquelle la requête **attend** d'être prise en charge : elle est « latente ».

## Une distribution, pas un nombre

Même en refaisant exactement la même requête, le temps de réponse change à chaque essai : un changement de contexte vers un processus d'arrière-plan, un paquet réseau perdu et retransmis, une pause du ramasse-miettes, un défaut de page qui force une lecture disque, même des vibrations mécaniques dans la baie de serveurs. Il faut donc penser le temps de réponse comme une **distribution de valeurs** que l'on mesure.

### La moyenne, un mauvais indicateur

La moyenne arithmétique ne te dit pas combien d'utilisateurs ont réellement subi un délai. Utilise plutôt les **percentiles**. Trie les temps de réponse du plus rapide au plus lent :

- le **milieu** est la **médiane** (p50) : si elle vaut 200 ms, la moitié des requêtes répond en moins de 200 ms, l'autre moitié en plus. C'est une bonne mesure de « combien un utilisateur typique attend » ;
- le **p95** est le seuil sous lequel 95 requêtes sur 100 sont servies : 5 sur 100 prennent ce temps ou plus ;
- le **p99** et le **p999** (99,9 %) se lisent de la même façon.

La médiane parle d'**une seule requête**. Si un utilisateur en fait plusieurs (une session, ou une page qui charge plusieurs ressources), la probabilité qu'**au moins une** soit plus lente que la médiane est bien supérieure à 50 %.

### Pourquoi se soucier des percentiles élevés

Les percentiles élevés, ou **latences de queue**, touchent directement l'expérience : Amazon exprime les exigences de ses services internes en p99,9, alors qu'il ne concerne qu'une requête sur 1 000. Pourquoi ? Les clients aux requêtes les plus lentes sont souvent ceux qui ont le plus de données (le plus d'achats) : **les clients les plus précieux**. Amazon a aussi observé qu'une hausse de 100 ms du temps de réponse réduit les ventes de 1 %.

À l'inverse, optimiser le p99,99 (une requête sur 10 000) a été jugé trop coûteux pour son bénéfice : ces extrêmes dépendent d'événements aléatoires hors de ton contrôle, et les gains diminuent.

### SLO et SLA

Les percentiles servent à écrire des **objectifs** (SLO) et des **contrats** (SLA) de niveau de service. Par exemple : « le service est considéré comme *up* si son temps de réponse médian est inférieur à 200 ms et son p99 inférieur à 1 s, et s'il est *up* au moins 99,9 % du temps. » Si la réponse est trop lente, autant qu'elle soit absente. Ces mesures fixent des attentes aux clients, qui peuvent demander un remboursement en cas de non-respect.

## L'attente en file domine les percentiles élevés

Un serveur ne traite qu'un petit nombre de choses en parallèle (limité par ses cœurs). Il suffit de quelques requêtes lentes pour retarder toutes celles qui suivent : c'est le **head-of-line blocking**. Même rapides à traiter, ces requêtes verront un temps de réponse lent à cause de l'attente.

Deux conséquences pratiques :

1. **Mesure le temps de réponse côté client**, pas seulement côté serveur : celui-ci ne voit pas l'attente en file.
2. **Quand tu génères de la charge pour un test**, le client doit envoyer ses requêtes **indépendamment du temps de réponse** (boucle ouverte). S'il attend la réponse à la requête précédente avant d'envoyer la suivante (boucle fermée), il garde artificiellement les files courtes et fausse les mesures. Tu le simuleras dans la leçon suivante.

## Les percentiles en pratique

### Amplification de la latence de queue

Les percentiles élevés comptent encore plus pour les services appelés **plusieurs fois** pour servir **une seule** requête d'utilisateur. Même en parallèle, la requête attend le **plus lent** des appels. Il suffit d'un appel lent pour que toute la requête le soit. Même si seule une petite proportion d'appels est lente, la probabilité d'en rencontrer un grandit avec le nombre d'appels, et une plus grande proportion de requêtes finit lente. C'est l'**amplification de la latence de queue**.

::visual{id="ddia-ch00-tail-amplification"}

La probabilité qu'au moins un appel soit lent vaut **1 − (1 − p)ⁿ**, avec *p* la part d'appels lents et *n* le nombre d'appels. Avec p = 1 % et 100 appels backend par requête, **près de deux requêtes sur trois** sont touchées par un appel lent.

### Calculer des percentiles efficacement

Pour afficher des percentiles sur un tableau de bord, il faut les calculer en continu. Par exemple sur une **fenêtre glissante** des 10 dernières minutes : chaque minute, on calcule la médiane et les percentiles des valeurs de la fenêtre.

- L'implémentation naïve garde la liste de tous les temps de réponse de la fenêtre et la trie chaque minute. C'est ce que tu fais dans le TP (la fenêtre glissante).
- Si c'est trop lent, des algorithmes calculent une **bonne approximation** à coût minimal : *forward decay*, *t-digest*, *HdrHistogram*.

### Ne jamais moyenner des percentiles

> Moyenner des percentiles (pour réduire la résolution temporelle ou combiner des machines) n'a **aucun sens mathématique**.

La bonne façon d'agréger des temps de réponse est d'**additionner les histogrammes**. Un histogramme compte combien de requêtes tombent dans chaque tranche de durée (0-10 ms, 10-100 ms…). Deux histogrammes de mêmes tranches s'additionnent case par case, et le percentile de la somme est exact (à la précision des tranches). Dans le TP, tu constateras l'écart avec la moyenne des p95.

> **Au-delà du livre.** Les systèmes de métriques modernes (Prometheus, OpenTelemetry) fournissent des histogrammes à tranches fixes ou à échelle logarithmique pour cette raison précise. Quand on te propose un « p99 moyen sur 5 minutes », demande comment il a été calculé.

## Pièges fréquents

- **Présenter la moyenne** comme « le temps de réponse typique ».
- **Moyenner des percentiles** de plusieurs serveurs ou de plusieurs minutes.
- **Mesurer côté serveur uniquement** : l'attente en file est invisible.
- **Tester avec une charge en boucle fermée** : les files restent artificiellement courtes.
- **Oublier l'amplification** : 1 % d'appels lents devient 63 % de requêtes lentes à 100 appels par requête.

## À retenir

- Le temps de réponse est une distribution ; on la résume par des percentiles (p50, p95, p99, p999).
- Les latences de queue touchent souvent les clients les plus précieux et dominent l'expérience.
- Les SLO et SLA s'écrivent en percentiles et en disponibilité.
- Mesure côté client et génère la charge en boucle ouverte.
- Avec plusieurs appels par requête, la probabilité d'être lent est `1 − (1 − p)ⁿ`.
- Pour agréger : additionne des histogrammes, ne moyenne jamais des percentiles.
