---
id: ddia-ch00-l02
title: "Fiabilité : fautes, pannes et erreurs humaines"
source: { chapter: 1, pages: "28-32" }
duration_min: 30
concepts:
  - id: ddia-fault-vs-failure
    label: "Faute (fault) et panne (failure) ne sont pas la même chose"
  - id: ddia-hardware-faults
    label: "Pannes matérielles : aléatoires, indépendantes, et traitables par redondance"
  - id: ddia-software-faults
    label: "Erreurs logicielles : systématiques et corrélées entre les nœuds"
  - id: ddia-human-errors
    label: "Erreurs humaines : la première cause de pannes, à contenir par la conception"
  - id: ddia-availability-math
    label: "Calculer une disponibilité : composants en série et en parallèle, nombre de neuf"
glossary:
  - term: "faute (fault)"
    definition: "Un composant du système s'écarte de sa spécification."
  - term: "panne (failure)"
    definition: "Le système dans son ensemble cesse de fournir le service attendu à l'utilisateur."
  - term: "tolérance aux fautes (resilience)"
    definition: "Capacité à empêcher des fautes de provoquer des pannes. On ne tolère que certains types de fautes, jamais toutes."
  - term: "MTTF"
    definition: "Mean Time To Failure : durée moyenne avant la panne d'un composant. Pour un disque dur, de l'ordre de 10 à 50 ans."
  - term: "chaos engineering"
    definition: "Provoquer volontairement des fautes (tuer des processus au hasard) pour vérifier en continu que la tolérance aux fautes fonctionne."
  - term: "mise à jour progressive (rolling upgrade)"
    definition: "Mettre à jour les nœuds un par un, sans arrêter le système dans son ensemble."
visuals: []
labs: [ddia-ch00-l02-lab-sla]
xp: 30
---

## Pourquoi c'est important

Tout système tombe en panne, un jour. La vraie question n'est pas « est-ce que ça arrivera ? » mais « **qu'est-ce que l'utilisateur verra** quand ça arrivera ? ». La fiabilité, c'est l'ensemble des décisions de conception qui font que, malgré les ennuis, le service continue à faire la bonne chose.

## Ce qu'on attend d'un logiciel fiable

De façon intuitive, un logiciel fiable :

- fait ce que l'utilisateur attend ;
- tolère les erreurs de l'utilisateur et les usages inattendus ;
- offre des performances suffisantes pour le cas d'usage, sous la charge et le volume de données prévus ;
- empêche les accès non autorisés et les abus.

En résumé : **continuer à fonctionner correctement, même quand les choses tournent mal.**

## Faute et panne : deux choses différentes

- Une **faute** (*fault*) est un composant qui s'écarte de sa spécification : un disque meurt, un processus plante, une dépendance répond n'importe quoi.
- Une **panne** (*failure*) est le moment où le système dans son ensemble cesse de fournir le service.

On ne peut pas ramener la probabilité d'une faute à zéro. L'objectif est donc de concevoir des mécanismes de **tolérance aux fautes** qui empêchent les fautes de se transformer en pannes. On parle de systèmes *tolérants aux fautes* ou *résilients* ; le premier terme est un peu trompeur, car il suggère qu'on pourrait tolérer *toute* faute. Si la Terre entière était avalée par un trou noir, tolérer cette faute exigerait un hébergement dans l'espace : il n'a de sens de parler que de certains types de fautes.

### Provoquer les fautes soi-même

Dans un système tolérant aux fautes, il peut être judicieux d'**augmenter** volontairement le taux de fautes, par exemple en tuant des processus au hasard sans prévenir. Beaucoup de bugs graves viennent d'une mauvaise gestion d'erreur ; déclencher les fautes à dessein garantit que la machinerie de tolérance est exercée en permanence. C'est la méthode de Chaos Monkey chez Netflix, et le sujet du projet de ce module (injection de pannes sur un magasin clé-valeur).

Pour certaines menaces, la prévention vaut mieux que la guérison, parce qu'aucun remède n'existe. C'est le cas de la sécurité : une fois qu'un attaquant a pris connaissance de données sensibles, on ne peut plus l'annuler.

## Pannes matérielles

Disques durs qui meurent, RAM défectueuse, coupure de courant, mauvais câble réseau débranché : avec beaucoup de machines, ces événements arrivent tout le temps. Un disque a un MTTF d'environ 10 à 50 ans. Donc, sur un cluster de **10 000 disques, on s'attend à en voir mourir environ un par jour**.

La première réponse est la **redondance** : disques en RAID, double alimentation, processeurs remplaçables à chaud, batteries et groupes électrogènes. Quand un composant meurt, son remplaçant prend le relais pendant qu'on répare. Ça ne supprime pas toutes les pannes, mais c'est bien maîtrisé et peut garder une machine en marche des années.

Les choses ont changé :

- Avec plus de données et plus de calcul, on utilise **plus de machines**, ce qui multiplie proportionnellement le taux de fautes matérielles.
- Dans certains clouds, il est courant qu'une instance disparaisse sans préavis : ces plateformes privilégient la flexibilité sur la fiabilité d'une seule machine.

D'où le mouvement vers des systèmes qui **tolèrent la perte de machines entières** grâce à des techniques logicielles, en plus de la redondance matérielle. Avantage opérationnel : un système mono-serveur impose un arrêt planifié pour redémarrer (correctif de sécurité de l'OS). Un système qui tolère la perte d'un nœud se met à jour **nœud par nœud**, sans interruption : c'est la *rolling upgrade* (voir module sur l'évolution des schémas).

### Le calcul de disponibilité

La **disponibilité** est la proportion du temps où le service est opérationnel. Deux règles de base :

- Des composants **en série** (tous nécessaires) : on multiplie. Trois services à 99,9 % chacun donnent environ **99,7 %**.
- Des composants **en parallèle** (un seul suffit) : on multiplie les probabilités de panne. Deux serveurs à 90 % donnent `1 − 0,1 × 0,1 = 99 %`.

On exprime souvent le résultat en **« neuf »** : 99 % (deux neuf) tolère 3,65 jours d'arrêt par an ; 99,9 % (trois neuf), 8 h 45 ; 99,99 %, 52 minutes. Le TP de cette leçon fait ces calculs.

> **Attention.** La formule en parallèle suppose que les pannes sont **indépendantes**. C'est vrai pour des disques, rarement pour du logiciel, comme on va le voir.

## Erreurs logicielles

Les pannes matérielles sont plutôt aléatoires et indépendantes : le disque qui meurt dans une machine n'implique pas que celui d'une autre va mourir. Il existe une autre classe de fautes : les **erreurs systématiques**, **corrélées entre les nœuds**, donc bien plus dangereuses :

- un bug qui fait planter *toutes* les instances d'un serveur d'application sur une entrée particulière (la seconde intercalaire du 30 juin 2012 a fait se bloquer d'un coup de nombreuses applications à cause d'un bug du noyau Linux) ;
- un processus fou qui épuise une ressource partagée (processeur, mémoire, disque, bande passante) ;
- un service dont on dépend qui devient lent, ne répond plus, ou renvoie des réponses corrompues ;
- une **défaillance en cascade** : une petite faute dans un composant en déclenche une autre dans un second, qui en déclenche d'autres.

Ces bugs restent souvent dormants jusqu'à ce qu'un enchaînement inhabituel les révèle : le logiciel faisait une hypothèse sur son environnement, généralement vraie, qui a fini par ne plus l'être.

Il n'y a pas de solution rapide. Beaucoup de petites choses aident : réfléchir aux hypothèses et aux interactions, tester soigneusement, isoler les processus, laisser les processus planter et redémarrer, mesurer et analyser le comportement en production. Si le système doit offrir une garantie (par exemple, dans une file : autant de messages en sortie qu'en entrée), il peut **se vérifier lui-même** en continu et alerter à la moindre divergence.

## Erreurs humaines

Ce sont des humains qui conçoivent les systèmes, et des humains qui les exploitent. Une étude sur de grands services internet a trouvé que les **erreurs de configuration des opérateurs** étaient la première cause de pannes, alors que les pannes matérielles n'intervenaient que dans 10 à 25 % d'entre elles.

Comment rendre un système fiable malgré des humains peu fiables ? Les meilleurs systèmes combinent plusieurs approches :

1. **Minimiser les occasions d'erreur** : de bonnes abstractions, API et interfaces d'administration rendent facile de faire la bonne chose et décourageante de faire la mauvaise. (Trop restrictives, les interfaces seront contournées.)
2. **Découpler les endroits où l'on fait le plus d'erreurs de ceux où elles font des dégâts** : fournir des environnements bac à sable complets, hors production, avec des données réelles.
3. **Tester à tous les niveaux**, des tests unitaires aux tests d'intégration et manuels. L'automatisation couvre bien les cas rares.
4. **Permettre une récupération rapide** : retour arrière rapide des configurations, déploiement progressif du code (un bug ne touche qu'une fraction des utilisateurs), outils pour recalculer des données.
5. **Surveiller en détail** : métriques de performance et taux d'erreur (la télémétrie), qui donnent des signaux d'alerte précoces et aident au diagnostic.
6. **Former et organiser** (hors du périmètre du livre, mais essentiel).

## Quelle importance a la fiabilité ?

Pas seulement pour les centrales nucléaires : des bugs dans une application de gestion font perdre de la productivité (et créent des risques juridiques si des chiffres sont faux), et une panne de site marchand coûte du chiffre d'affaires et de la réputation. Même une application « non critique » a une responsabilité envers ses utilisateurs : pense au parent qui garde toutes les photos de ses enfants dans ton application.

On peut choisir de sacrifier la fiabilité pour réduire un coût (un prototype pour un marché non éprouvé, un service à très faible marge), mais **en connaissance de cause**.

## Pièges fréquents

- **Confondre faute et panne.** Avoir une faute n'implique pas d'avoir une panne ; c'est tout l'art de la tolérance.
- **Supposer des pannes indépendantes** pour des composants qui partagent un logiciel, une configuration ou une dépendance.
- **Se reposer sur la redondance matérielle seule** pour un service qui doit rester disponible lors des mises à jour.
- **Penser que la fiabilité est un luxe** : c'est la qualité qu'on remarque seulement quand elle manque.
- **Négliger les erreurs de configuration**, première cause de pannes.

## À retenir

- Une faute est un composant qui dévie ; une panne est le service qui s'arrête. La tolérance aux fautes empêche l'un de causer l'autre.
- Les pannes matérielles sont aléatoires et indépendantes : redondance, puis tolérance logicielle à la perte de machines.
- Les erreurs logicielles sont systématiques et corrélées : bien plus dangereuses, pas de remède unique.
- Les erreurs humaines sont la première cause de pannes : bonnes abstractions, bac à sable, tests, retour arrière rapide, télémétrie.
- Composants en série : on multiplie les disponibilités ; en parallèle : on multiplie les indisponibilités (si les pannes sont indépendantes).
