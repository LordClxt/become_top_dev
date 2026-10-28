---
id: arch-ch02-l02
title: "Identifier les caractéristiques"
source: { chapter: 5, pages: "85-89" }
duration_min: 35
concepts:
  - id: arch-domain-translation
    label: "Traduire les préoccupations métier en -ilités (table de traduction)"
  - id: arch-missing-ingredient
    label: "Une préoccupation métier demande souvent plusieurs caractéristiques : en oublier une, c'est oublier la farine"
  - id: arch-short-list-top3
    label: "Garder la liste courte (le Vasa) et faire choisir le top 3 plutôt que tout prioriser"
  - id: arch-requirements-knowledge
    label: "Lire les exigences avec la connaissance du domaine (1 000 étudiants dans les 10 dernières minutes)"
  - id: arch-katas
    label: "Les katas d'architecture : description, utilisateurs, exigences, contexte additionnel"
glossary:
  - term: "préoccupation métier"
    definition: "Ce dont parle le métier : fusions, satisfaction utilisateur, time to market, avantage concurrentiel, budget."
  - term: "agilité"
    definition: "Capacité à changer vite. Ne suffit pas seule au time to market : il faut aussi testabilité et déployabilité."
  - term: "déployabilité"
    definition: "Facilité, fréquence et sûreté des mises en production."
  - term: "faisabilité"
    definition: "Ce qu'on peut réellement livrer avec le budget, le temps et les compétences disponibles."
  - term: "kata d'architecture"
    definition: "Exercice court et en équipe (Ted Neward) : on dérive caractéristiques et architecture d'un problème décrit en termes métier."
visuals: []
labs: [arch-ch02-l02-lab-translate-stakeholders]
xp: 35
---

## Pourquoi c'est important

Le directeur d'une société de gestion de fonds te dit : « Pour des raisons réglementaires, il est **impératif** que la valorisation de fin de journée des fonds soit terminée à l'heure. » Tu entends : *performance*. Tu optimises les calculs. Six mois plus tard, le calcul plante à 85 % un soir de forte activité, repart de zéro, et rate l'échéance. Le régulateur sanctionne.

Ce n'était pas un problème de vitesse. C'était un problème de **traduction** : une préoccupation métier recouvrait **six** caractéristiques, et tu n'en as retenu qu'une. Cette leçon apprend à faire cette traduction, et à garder une liste courte.

## Trois sources

Un architecte trouve les caractéristiques dans au moins trois sources :

1. les **préoccupations du domaine**, exprimées par les responsables métier ;
2. les **exigences**, quand elles les énoncent ;
3. la **connaissance implicite** du domaine (leçon précédente).

## Traduire le métier en -ilités

Architectes et métier ne parlent pas la même langue. L'un dit scalabilité, interopérabilité, tolérance aux pannes ; l'autre dit fusions-acquisitions, satisfaction utilisateur, time to market, avantage concurrentiel. Résultat : un problème de traduction où chacun ne comprend pas ce qui préoccupe l'autre. Heureusement, il existe des correspondances courantes :

| Préoccupation métier | Caractéristiques |
|---|---|
| Fusions et acquisitions | Interopérabilité, scalabilité, adaptabilité, extensibilité |
| Time to market | Agilité, testabilité, déployabilité |
| Satisfaction utilisateur | Performance, disponibilité, tolérance aux pannes, testabilité, déployabilité, agilité, sécurité |
| Avantage concurrentiel | Agilité, testabilité, déployabilité, scalabilité, disponibilité, tolérance aux pannes |
| Temps et budget | Simplicité, faisabilité |

### Ne pas oublier la farine

Le piège le plus courant : traduire une préoccupation par **une seule** caractéristique. Le time to market n'est **pas** l'agilité : c'est **agilité + testabilité + déployabilité**. Un code qu'on modifie vite mais qu'on met trois semaines à tester et à déployer n'arrive pas plus tôt sur le marché. Ne retenir qu'un ingrédient, c'est faire un gâteau en oubliant la farine.

Reprenons la valorisation des fonds :

- **Performance** : bien sûr, il faut finir à temps.
- **Disponibilité** : peu importe la vitesse si le système n'est pas là quand il faut.
- **Scalabilité** : le nombre de fonds augmente, le calcul doit encore finir à temps l'an prochain.
- **Fiabilité** : il ne doit pas planter pendant le calcul.
- **Recouvrabilité** : s'il plante à 85 %, il doit **reprendre là où il en était**, pas repartir de zéro.
- **Auditabilité** : rapide, oui, mais les prix calculés sont-ils **justes** ? Il faut pouvoir le prouver.

## Une liste courte : la leçon du Vasa

Le **Vasa** était un navire de guerre suédois construit de 1626 à 1628 pour un roi qui voulait le plus magnifique bâtiment jamais construit. À l'époque, un navire transportait des troupes **ou** portait des canons : le Vasa ferait les deux. Les navires avaient un pont de batterie : il en aurait deux. Les canons seraient deux fois plus gros. Les charpentiers ont eu des doutes, mais n'ont pas su dire non. Le jour de son lancement, le Vasa tire une salve d'honneur d'un côté… et chavire, trop lourd du haut. Il a coulé dans le port.

Une architecture qui veut tout supporter est un Vasa. L'anti-pattern consiste à concevoir une architecture **générique** qui prend en charge toutes les caractéristiques : on accumule la complexité **avant même** d'avoir attaqué le problème métier. Le but n'est pas un nombre magique de caractéristiques, mais la **simplicité** du design.

### Le top 3, pas le classement complet

Faire prioriser **toute** la liste par les parties prenantes est presque toujours une perte de temps et une source de conflits : personne ne s'accorde sur l'ordre exact de douze critères. Le livre propose mieux : faire choisir **les trois plus importantes, dans n'importe quel ordre**. Le consensus est bien plus facile, la discussion porte sur l'essentiel, et l'architecte sait quoi privilégier quand deux caractéristiques s'opposent.

## Lire les exigences avec ce qu'on sait du domaine

Certaines caractéristiques sont écrites noir sur blanc (« 10 000 utilisateurs »). D'autres se cachent dans le domaine. Exemple : une application d'inscription aux cours pour **1 000 étudiants** avec **10 heures** d'ouverture. Faut-il dimensionner pour une charge régulière (100 inscriptions par heure) ? Toute personne qui connaît les étudiants sait qu'ils seront **1 000 dans les 10 dernières minutes**. Aucun document ne le dira ; c'est pourtant ce qui décide de l'architecture.

### Sous le capot : le calcul que personne n'écrit

```typescript
const students = 1000;
const steady = students / (10 * 60);  // charge régulière, par minute
const rush = students / 10;           // tout le monde dans les 10 dernières minutes
console.log(steady.toFixed(1), rush, (rush / steady).toFixed(0) + '×');
// 1.7 100 60×
```

Un facteur **60** entre les deux hypothèses : ce n'est pas un réglage, c'est un choix d'architecture (élasticité, file d'attente, ou autre).

## Les katas d'architecture

Fred Brooks : *comment obtenir de grands concepteurs ? Les grands concepteurs conçoivent.* Mais un architecte conçoit peut-être une demi-douzaine de systèmes dans sa carrière. Ted Neward a donc inventé les **katas d'architecture** (le mot vient des arts martiaux : un exercice individuel où compte la forme). Le principe : un problème décrit en termes métier, de petites équipes, **45 minutes** pour concevoir, puis présentation et vote.

Chaque kata a quatre sections : **description** (le problème), **utilisateurs** (combien, lesquels), **exigences** (telles que les exprimerait le métier) et **contexte additionnel** (ce qui n'est pas dans les exigences mais pèse sur la conception). Tout ce cours en est une suite : la leçon suivante déroule le premier, Silicon Sandwiches.

## Pièges fréquents

- **Une préoccupation = une caractéristique** : oublier la farine.
- **Prioriser toute la liste** avec les parties prenantes : interminable, conflictuel, inutile.
- **Prendre les chiffres des exigences au pied de la lettre** : 1 000 étudiants en 10 heures ne sont pas 100 par heure.
- **Accumuler les caractéristiques « au cas où »** : le Vasa.

## À retenir

- Trois sources : **préoccupations métier**, **exigences**, **connaissance du domaine**.
- Traduis avec la table, et cherche **tous** les ingrédients (time to market = agilité + testabilité + déployabilité).
- Liste **courte** ; fais choisir le **top 3**, dans n'importe quel ordre.
- Le domaine révèle ce que les exigences taisent : la forme de la charge.
- Un **kata** = description, utilisateurs, exigences, contexte additionnel ; on progresse en concevant.
