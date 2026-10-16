---
id: ts-ch00-l05
title: "Limiter l'usage du type any"
source: { chapter: 1, pages: "22-26" }
duration_min: 25
concepts:
  - id: ts-any-no-safety
    label: "any désactive la vérification : n'importe quelle valeur est acceptée, n'importe quelle opération est autorisée"
  - id: ts-any-contracts
    label: "any permet de violer le contrat d'une fonction (un argument de mauvais type passe, un retour de mauvais type aussi)"
  - id: ts-any-language-services
    label: "Aucun service d'éditeur pour any : pas d'autocomplétion, pas de renommage fiable"
  - id: ts-any-masks-refactoring
    label: "any masque les bugs lors des refactorisations : renommer ou changer un type ne produit aucune erreur"
  - id: ts-any-hides-design
    label: "any cache la conception des types et mine la confiance dans le système de types"
glossary:
  - term: "any"
    definition: "Type spécial qui échappe à la vérification : assignable depuis et vers tout, avec toutes les opérations permises."
  - term: "services du langage"
    definition: "Autocomplétion, aide contextuelle, aller à la définition, renommage : fournis par l'éditeur grâce aux types."
visuals: []
labs: [ts-ch00-l05-lab-tame-any]
extra: false
xp: 25
---

## Pourquoi c'est important

Le système de types de TypeScript est **graduel** : tu peux le désactiver, valeur par valeur, avec `any`. C'est précieux pour migrer du JavaScript ; c'est aussi la première cause de bugs qui « passent le vérificateur ». Si tu veux écrire du TypeScript fiable, tu dois savoir exactement ce que coûte un `any`, pour ne le garder que quand il est nécessaire.

## Le concept

### 1. Aucune sûreté de type

```ts
let age: number;
age = '12';        // erreur : string n'est pas number
age = '12' as any; // OK : le vérificateur se tait
age += 1;          // age vaut '121' (la chaîne), alors qu'on s'attend à 13
```

Un `any` dans une expression fait taire le vérificateur pour tout ce qui l'entoure. Le calcul ci-dessus donne `'121'`, un résultat faux qu'aucun avertissement ne signale.

### 2. Il permet de casser un contrat

Une signature est une promesse :

```ts
function calculateAge(birthDate: Date): number {
  // ...
}
```

L'appelant promet un `Date`, la fonction promet un `number`. Avec `any`, ces promesses se rompent sans erreur : on peut passer une chaîne, ou renvoyer une chaîne. Si tu écris `getBirthDate(): any`, l'appelant qui compte sur un `Date` n'est plus protégé, même si ta fonction se met un jour à renvoyer du texte.

### 3. Aucun service de langage pour `any`

Avec un type précis, l'éditeur propose l'autocomplétion, la documentation au survol et surtout le **renommage** de propriétés dans tout le projet. Une valeur `any` n'a rien de tout cela : tu tapes `person.` et tu obtiens une liste vide. Un `person.fisrtName` mal orthographié restera invisible jusqu'à l'exécution.

### 4. Il masque les bugs quand on refactorise

```ts
interface ComponentProps {
  onSelectItem: (item: any) => void;
}

function renderSelector(props: ComponentProps) { /* ... */ }

let selectedId = 0;
function handleSelectItem(item: any) {
  selectedId = item.id;
}
renderSelector({ onSelectItem: handleSelectItem });
```

Un jour, tu décides que le composant doit envoyer seulement l'identifiant : `onSelectItem: (id: number) => void`. Rien ne casse, puisque `item: any` accepte un nombre. Mais `item.id` vaut maintenant `undefined`, et `selectedId` aussi. Avec un type précis (`item: Item`), l'erreur apparaît dès le changement d'interface.

### 5. Il cache ta conception et mine la confiance

Un type est de la documentation vérifiée : `Item`, `Person`, `Order` disent ce que ton programme manipule. Du code plein de `any` ne dit rien de son modèle. Et comme chaque `any` est un trou potentiel, tu ne peux plus te fier au verdict du vérificateur : l'outil qui devait te rassurer devient une source de doute. Un `any` est **contagieux** : il se propage à tout ce qu'il touche.

### Quand l'utiliser quand même

Parfois c'est la bonne réponse : une migration en cours, une bibliothèque mal typée, un cas où tu sais mieux que le vérificateur. Alors :

- garde-le **local** (une valeur, pas une fonction entière) ;
- préfère `unknown` quand tu ne connais vraiment pas le type (module 07) ;
- documente pourquoi.

Les chapitres 5 et 7 reviendront en détail sur la portée minimale, les variantes plus précises d'`any`, et la façon de mesurer les `any` qui restent dans un projet.

## Pièges fréquents

- **Écrire `: any` pour « débloquer » une erreur de type** : tu remplaces une information par du silence.
- **Retourner `any` d'une fonction** : tous les appelants héritent du trou.
- **Croire qu'un seul `any` est inoffensif** : il se propage par l'inférence aux variables et aux résultats qu'il alimente.
- **Utiliser `any` comme documentation de l'incertain** (« je ne sais pas ce que c'est ») : `unknown` exprime ça sans désactiver les contrôles.

## À retenir

- `any` éteint la vérification de types pour tout ce qu'il touche.
- Il autorise les violations de contrat et masque les bugs pendant les refactorisations.
- Il prive l'éditeur de ses services (autocomplétion, renommage).
- Il cache la conception des types et fragilise la confiance dans le vérificateur.
- Quand il faut un `any`, confine-le au plus petit périmètre possible.
