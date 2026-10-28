---
id: arch-ch01-l01
title: "Modularité et cohésion"
source: { chapter: 3, pages: "57-64" }
duration_min: 35
concepts:
  - id: arch-modularity
    label: "La modularité est un regroupement logique de code ; sans énergie, elle se dégrade (entropie)"
  - id: arch-cohesion-types
    label: "Les sept niveaux de cohésion, de fonctionnelle (la meilleure) à coïncidente (la pire)"
  - id: arch-cohesion-tradeoff
    label: "Diviser un module cohésif augmente le couplage : découper est un trade-off"
  - id: arch-lcom
    label: "LCOM mesure le manque de cohésion structurelle : des groupes de méthodes qui ne partagent aucun champ"
glossary:
  - term: "module"
    definition: "Regroupement logique de code lié : classes, fonctions… Pas forcément une séparation physique."
  - term: "cohésion"
    definition: "Le degré auquel les parties d'un module ont leur place ensemble."
  - term: "cohésion fonctionnelle"
    definition: "Toutes les parties du module sont liées, et il contient tout ce qui est nécessaire à sa fonction."
  - term: "cohésion logique"
    definition: "Des opérations apparentées mais fonctionnellement différentes, comme une classe StringUtils."
  - term: "cohésion coïncidente"
    definition: "Des éléments sans autre lien que d'être dans le même fichier : la pire forme."
  - term: "LCOM"
    definition: "Lack of Cohesion in Methods (Chidamber et Kemerer) : mesure structurelle du manque de cohésion d'une classe."
visuals: []
labs: [arch-ch01-l01-lab-warmup-cohesion, arch-ch01-l01-lab-lcom-split]
xp: 35
---

## Pourquoi c'est important

Ton monolithe a un fichier `utils.ts` de 2 000 lignes. Il formate des dates, calcule la TVA, envoie des e-mails et parse des CSV. Le jour où l'on veut extraire la facturation dans son propre service, on découvre que **tout** importe `utils.ts`. Impossible de l'emporter sans emmener la moitié de l'application.

Personne n'avait demandé un « bon découpage » dans les exigences. C'est pourtant ce qui rend un code base évolutif. Cette leçon donne les outils pour en parler précisément : **modularité**, **cohésion** et une métrique qui la mesure, **LCOM**.

## La modularité : un principe d'organisation

Glenford Myers notait déjà en 1978 que l'on vante beaucoup la modularité sans jamais dire **comment** l'obtenir. Le livre en donne une définition simple : un **module** est un **regroupement logique** de code lié, qu'il s'agisse de classes, de fonctions ou de tout autre groupement.

- **Logique, pas forcément physique.** Mettre beaucoup de classes dans un seul monolithe peut être pratique. Mais si le découpage logique est flou, le couplage qu'il laisse s'installer bloquera le jour où il faudra **séparer** physiquement les morceaux.
- **Entropie.** Un système logiciel, comme un système physique, tend vers le désordre. Il faut **dépenser de l'énergie** en continu pour préserver la structure ; elle ne se maintient jamais par accident.
- **Caractéristique implicite.** Presque aucun projet n'exige explicitement « une bonne modularité », et pourtant aucun code base durable ne s'en passe.

Un détour historique explique la profusion de mécanismes : après la lettre de Dijkstra contre le `GOTO` (1968), la programmation structurée (Pascal, C) a donné naissance aux langages modulaires (Modula, Ada), vite éclipsés par l'objet, qui a gardé les modules sous forme de *packages* et de *namespaces*. En TypeScript, un fichier est un module, un dossier avec un `index.ts` forme souvent un *package* logique, et un paquet npm un composant déployable.

## La cohésion : ce qui va ensemble

La **cohésion** mesure à quel point les parties d'un module ont leur place ensemble. Larry Constantine l'a résumé ainsi : *tenter de diviser un module cohésif ne fait qu'augmenter le couplage et diminuer la lisibilité.*

Du meilleur au pire :

1. **Fonctionnelle** : chaque partie est liée aux autres et le module contient tout ce qui est nécessaire à sa fonction. Exemple : un module `pricing` qui calcule un prix, ses remises et ses taxes.
2. **Séquentielle** : la sortie de l'un est l'entrée de l'autre (`parse` puis `validate`).
3. **Communicationnelle** : une chaîne qui travaille sur la même information, par exemple enregistrer une commande puis envoyer l'e-mail de confirmation.
4. **Procédurale** : des parties qui doivent s'exécuter dans un certain ordre.
5. **Temporelle** : liées par le **moment** ; typiquement, tout ce qu'on initialise au démarrage.
6. **Logique** : opérations apparentées mais fonctionnellement différentes. L'archétype : `StringUtils`, des fonctions statiques qui manipulent des chaînes sans autre lien.
7. **Coïncidente** : aucun lien, sinon d'être dans le même fichier. Notre `utils.ts`.

### La cohésion est un jugement

La cohésion est moins précise que le couplage. Le livre prend l'exemple d'un module **Customer Maintenance** : ajouter, modifier, lire et notifier un client… et aussi **lire et annuler ses commandes**. Faut-il sortir ces deux dernières opérations dans un module **Order Maintenance** ? **Ça dépend** :

- Si ce sont les **seules** opérations sur les commandes, un module de deux fonctions n'apporte rien : on les laisse.
- Si Customer Maintenance va **beaucoup grossir**, extraire maintenant évite un module obèse.
- Si les opérations sur les commandes ont besoin d'**énormément** d'informations client, les séparer créerait un couplage fort entre les deux modules : c'est exactement l'avertissement de Constantine.

Ces trois questions sont le type d'analyse de trade-offs qui fait le métier.

## LCOM : mesurer le manque de cohésion

Étonnamment, malgré cette subjectivité, on sait mesurer la cohésion **structurelle**. La suite de métriques de Chidamber et Kemerer contient **LCOM** (*Lack of Cohesion in Methods*). Ses formules officielles sont obscures, et les auteurs eux-mêmes préfèrent cette définition :

> **LCOM** : la somme des ensembles de méthodes qui ne sont pas reliées entre elles par des champs partagés.

Concrètement : relie deux méthodes si elles utilisent au moins un **champ commun**, puis compte les **groupes** obtenus.

```typescript
class Checkout {
  private cart: string[] = [];
  private discount = 0;
  private smtpHost = 'mail.local';

  add(item: string) { this.cart.push(item); }
  total() { return this.cart.length * 10 * (1 - this.discount); }
  applyCode(code: string) { this.discount = code === 'VIP' ? 0.2 : 0; }
  sendReceipt(to: string) { return `${this.smtpHost} → ${to}`; }
}
```

`add` et `total` partagent `cart` ; `total` et `applyCode` partagent `discount` : ces trois méthodes forment **un groupe**. `sendReceipt` n'utilise que `smtpHost`, qu'aucune autre ne touche : **un second groupe**. Deux groupes signalent une classe qui en contient deux. On pourrait extraire `ReceiptSender` sans rien changer au comportement.

Le livre illustre trois cas : une classe où toutes les méthodes se tiennent par leurs champs (LCOM bas, bonne cohésion), une classe où chaque couple champ/méthode pourrait vivre seul (LCOM haut), et un cas mixte où un dernier couple champ/méthode mérite d'être extrait.

### Sous le capot : des composantes connexes

Ce calcul est un problème de graphe classique : les méthodes sont des nœuds, une arête relie deux méthodes qui partagent un champ, et le nombre de **composantes connexes** donne le score (c'est la variante appelée LCOM4 dans la littérature, hors livre). Un *union-find* le calcule en quasi temps linéaire ; tu l'implémenteras dans le projet archkit de ce module.

### À quoi sert LCOM… et ce qu'il ne voit pas

LCOM est précieux quand on **migre d'un style à un autre** : les classes utilitaires partagées sont l'un des pires casse-têtes d'une migration, et LCOM repère celles qui sont **couplées par accident** et n'auraient jamais dû être une seule classe.

Mais LCOM ne voit que la **structure**. Deux méthodes qui ne partagent aucun champ peuvent appartenir logiquement au même concept (un module de pure fonctions de calcul de prix a un LCOM « mauvais » et une cohésion fonctionnelle parfaite). C'est encore la deuxième loi : la métrique montre le **comment**, à toi de juger le **pourquoi**.

## Pièges fréquents

- **Découper pour découper** : séparer un module cohésif crée du couplage entre les morceaux.
- **Le dossier `utils`/`common`/`helpers`** : il attire la cohésion logique puis coïncidente, et devient le point de couplage de tout le système.
- **Lire LCOM sans jugement** : une classe de fonctions pures sans état a beaucoup de « groupes » et peut être parfaitement cohésive.
- **Confondre logique et physique** : un monolithe peut être très modulaire, et des microservices très mal découpés.

## À retenir

- Un **module** est un regroupement **logique** ; sa qualité se dégrade sans effort continu.
- Cohésion, du meilleur au pire : **fonctionnelle**, séquentielle, communicationnelle, procédurale, temporelle, **logique**, **coïncidente**.
- Découper un module cohésif **augmente le couplage** : c'est un trade-off, pas une hygiène.
- **LCOM** = nombre de groupes de méthodes reliées par des champs partagés ; utile pour repérer les classes à scinder, aveugle au sens métier.
