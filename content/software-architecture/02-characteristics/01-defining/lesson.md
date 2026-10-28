---
id: arch-ch02-l01
title: "Qu'est-ce qu'une caractéristique d'architecture ?"
source: { chapter: 4, pages: "75-84" }
duration_min: 35
concepts:
  - id: arch-char-three-criteria
    label: "Trois critères : considération hors domaine, influence sur la structure, critique pour le succès"
  - id: arch-char-implicit-explicit
    label: "Caractéristiques implicites (jamais écrites mais indispensables) et explicites (dans les exigences)"
  - id: arch-char-categories
    label: "Catégories : opérationnelles, structurelles, transverses"
  - id: arch-char-ambiguity
    label: "Les termes sont ambigus : il faut un langage ubiquitaire et des définitions partagées"
  - id: arch-least-worst
    label: "Les caractéristiques interagissent : viser l'architecture la moins mauvaise, pas la meilleure"
glossary:
  - term: "caractéristique d'architecture"
    definition: "Critère de succès hors domaine qui influence la structure du système et compte vraiment pour sa réussite."
  - term: "caractéristique implicite"
    definition: "Rarement écrite dans les exigences mais nécessaire : disponibilité, fiabilité, sécurité…"
  - term: "caractéristique explicite"
    definition: "Écrite dans les exigences : « 10 000 utilisateurs simultanés »."
  - term: "langage ubiquitaire"
    definition: "Vocabulaire partagé et défini en commun par une équipe (notion du Domain-Driven Design)."
  - term: "Italy-ility"
    definition: "Exemple de caractéristique propre à une organisation : un mélange de disponibilité, de recouvrabilité et de résilience né d'un incident."
visuals: [arch-ch02-helicopter]
labs: [arch-ch02-l01-lab-warmup-is-it-a-characteristic]
xp: 35
---

## Pourquoi c'est important

Le cahier des charges d'une application de prise de rendez-vous médicaux fait 80 pages. Il décrit chaque écran, chaque règle de réservation, chaque e-mail. Il ne dit **rien** de ce qui va réellement faire tomber le projet : que se passe-t-il le lundi à 8 h quand 50 000 patients se connectent en même temps ? Combien de temps peut-on rester hors ligne ? Qui a le droit de voir un dossier médical ?

Ce qui manque, ce sont les **caractéristiques d'architecture**. Les identifier est l'une des responsabilités centrales de l'architecte, et c'est ce qui distingue l'architecture du code et du design.

## Pourquoi pas « exigences non fonctionnelles » ?

Beaucoup d'organisations parlent d'**exigences non fonctionnelles**. Les auteurs refusent le terme : il est **auto-dévalorisant**. Comment convaincre une équipe de prendre au sérieux quelque chose de « non fonctionnel » ? Ils écartent aussi **attributs qualité**, qui évoque une évaluation **après coup** plutôt qu'un travail de conception. *Caractéristiques d'architecture* dit ce que c'est : des préoccupations critiques pour le succès de l'architecture, donc du système.

Une solution logicielle combine donc deux choses : les **exigences du domaine** (ce que le système fait) et les **caractéristiques d'architecture** (les critères qui disent s'il réussit).

## Les trois critères

Une caractéristique d'architecture remplit **trois** critères, qui se tiennent comme les côtés d'un triangle :

1. **Elle porte sur une considération hors domaine.** Les exigences disent *quoi* faire ; la caractéristique dit *comment* le faire réussir et *pourquoi* certains choix ont été faits. Aucun cahier des charges n'écrit « éviter la dette technique », et pourtant c'est une préoccupation de conception permanente.
2. **Elle influence un aspect structurel de la conception.** C'est le critère qui fait la différence. La sécurité concerne tous les projets, mais elle ne devient une caractéristique d'architecture que si elle exige **une structure particulière**. Le livre oppose deux cas :
   - **Paiement délégué à un prestataire** : une hygiène standard (chiffrement, hachage) suffit, aucune structure spéciale.
   - **Paiement traité dans l'application** : l'architecte isole le traitement dans un module, un composant ou un service dédié. Là, la sécurité façonne l'architecture.
3. **Elle est critique ou importante pour le succès.** Un système pourrait prendre en charge des dizaines de caractéristiques… mais chacune ajoute de la complexité. L'architecte choisit **le moins possible** de caractéristiques, pas le plus possible.

### Implicites et explicites

- **Explicites** : elles figurent dans les exigences (« 10 000 utilisateurs simultanés »).
- **Implicites** : presque jamais écrites, mais indispensables : **disponibilité**, **fiabilité**, **sécurité**. Dans une société de trading haute fréquence, personne n'écrit « faible latence » dans chaque spécification, et pourtant tout le monde sait que c'est vital. C'est la **connaissance du domaine** qui permet à l'architecte de les débusquer.

## Une liste (forcément partielle)

Il n'existe aucun standard universel ; chaque organisation a ses interprétations, et l'écosystème en invente sans cesse. Trois grandes familles aident à s'y retrouver.

**Opérationnelles** (proches des préoccupations d'exploitation et DevOps) : disponibilité, continuité (reprise après sinistre), performance, recouvrabilité (en combien de temps on revient en ligne), fiabilité/sûreté (si ça tombe, des vies ou beaucoup d'argent sont-ils en jeu ?), robustesse (conditions limites, coupures), scalabilité.

**Structurelles** (qualité du code et de sa structure) : configurabilité (par l'utilisateur final), extensibilité (brancher de nouvelles fonctionnalités), installabilité, réutilisation, localisation (langues, devises, unités), maintenabilité, portabilité, supportabilité (logs, outils de diagnostic), capacité de mise à jour.

**Transverses** (qui échappent aux catégories) : accessibilité, archivabilité (données à archiver ou supprimer après un délai), authentification, autorisation, contraintes légales (RGPD, Sarbanes-Oxley…), confidentialité (cacher les transactions même aux employés, DBA compris), sécurité, utilisabilité.

Et chaque organisation peut inventer les siennes. L'histoire de l'**Italy-ility** : un client exigeait de chaque architecture qu'elle réponde à « et si on perd l'Italie ? », depuis qu'une panne de communication avait coupé le siège de ses agences italiennes. L'équipe a fini par nommer ce besoin : un mélange précis de disponibilité, de recouvrabilité et de résilience. (C'est le même incident que le Frozen Caveman du module 00 ; ici, le besoin a été **nommé et défini**, ce qui permet d'en discuter.)

## Le vrai problème : l'ambiguïté

Beaucoup de termes sont imprécis ou se recouvrent :

- **Interopérabilité vs compatibilité** : l'interopérabilité suppose une intégration facile avec d'autres systèmes, donc des API publiées et documentées ; la compatibilité concerne les standards du secteur.
- **Apprenabilité** : la facilité pour un utilisateur d'apprendre le logiciel… ou la capacité du système à apprendre de son environnement (machine learning) pour s'auto-configurer.
- **Disponibilité vs fiabilité** : elles semblent toujours aller ensemble. Pourtant **UDP** est disponible sur IP sans être fiable : les paquets arrivent dans le désordre ou pas du tout.

L'ISO 25010 propose une liste (efficacité de performance, compatibilité, utilisabilité, fiabilité, sécurité, maintenabilité, portabilité), utile mais incomplète. Les auteurs en retirent un élément : l'**adéquation fonctionnelle** (complétude, exactitude, pertinence des fonctions), qui n'est pas une caractéristique d'architecture mais la raison même de construire le logiciel.

La parade pratique vient du Domain-Driven Design : un **langage ubiquitaire**, des définitions écrites et partagées au sein de l'organisation. « Disponibilité », chez nous, veut dire *telle* chose, mesurée *ainsi* (le module 03 apprend à rendre ces définitions mesurables).

## Tout interagit : viser le moins mauvais

Chaque caractéristique demande un effort de conception et parfois une structure dédiée. Surtout, elles **interagissent** : améliorer la sécurité dégrade presque toujours la performance (chiffrement à la volée, indirections pour cacher les secrets…).

La métaphore du livre : les pilotes peinent à apprendre l'hélicoptère, parce que chaque main et chaque pied commandent quelque chose, et que bouger une commande affecte toutes les autres. Choisir des caractéristiques, c'est piloter un hélicoptère.

> **Ne vise jamais la meilleure architecture, mais la moins mauvaise.**

Trop de caractéristiques mènent à une solution **générique** qui veut résoudre tous les problèmes, et qui ne marche presque jamais parce que sa conception devient ingérable. La conséquence : rendre l'architecture aussi **itérative** que possible, pour ne pas avoir à tout trouver du premier coup.

::visual{id="arch-ch02-helicopter"}

## Pièges fréquents

- **Appeler « caractéristique » ce qui ne touche pas la structure** : la sécurité d'un paiement délégué est de l'hygiène, pas de l'architecture.
- **Oublier les implicites** : personne n'écrira « disponible », tout le monde le supposera.
- **Employer un terme sans le définir** : deux équipes peuvent mettre deux réalités derrière « fiabilité ».
- **Tout vouloir** : chaque caractéristique ajoutée complique toutes les autres.

## À retenir

- Une caractéristique : **hors domaine**, **influence la structure**, **critique**. Les trois à la fois.
- **Implicites** (disponibilité, fiabilité, sécurité) et **explicites** ; le domaine révèle les premières.
- Trois familles : **opérationnelles**, **structurelles**, **transverses**.
- Les termes sont ambigus : écris des définitions communes (**langage ubiquitaire**).
- Elles interagissent comme les commandes d'un hélicoptère : vise **la moins mauvaise** architecture, et garde-la itérative.
